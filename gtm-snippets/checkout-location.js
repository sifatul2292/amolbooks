/* Checkout: the delivery charge follows the customer's district (owner, 2026-11-14: "customers are
   wrongly selecting dhaka even if they are outside of dhaka"; then: a dropdown is too slow for
   people in a hurry, so it fills itself from the address and is otherwise a search box).
   One box under the address: every district, and for Dhaka the city areas (inside) and the
   outskirts (outside). It is filled from the address when the address names a place ("Dhaka" alone
   counts as Dhaka city); otherwise the customer types a few letters (Bengali or English) and taps
   the match. The "ঢাকা সিটির ভেতর / বাইরে" choice is set from it and can no longer be changed by
   hand; the order is not sent without a district, and an address that names another district asks
   once before sending. The order carries deliveryLocation (the API sets the charge from it again,
   api/src/shared/delivery-zone) and city (the district as Meta's town, which the storefront's
   purchase tracking sends as user_data.city); the town is also kept, hashed, for this visitor's
   other Meta events (meta-match-data.html).
   Served after gtm-snippets/delivery-zone-core.js (window.AbDeliveryZone) by
   /api/storefront-page/checkout-location.js, loaded on /checkout by checkout-location-loader.html. */
(function () {
  'use strict';
  var Z = window.AbDeliveryZone;
  if (!Z || window.__abCheckoutLocation) return;
  window.__abCheckoutLocation = true;

  var STORE = 'ab-delivery-location-v1';
  var ORDER_URL = /\/api\/order\/add-order-by-(?:user|anonymous)(?:[?#]|$)/;
  var SHOWN = 8;
  var CITY_OTHER = 'dhaka-city-other';

  // ---------- the places a customer can pick ----------
  var PLACES = [];
  var BY_KEY = {};
  // weakNames match at weakScale of the score (an area also answers to "Dhaka", but less well).
  function addPlace(district, area, label, hint, names, weakNames, weakScale) {
    var item = {
      key: district + '|' + area, district: district, area: area, label: label, hint: hint,
      names: names.map(Z.norm).filter(Boolean), weak: (weakNames || []).map(Z.norm).filter(Boolean),
      weakScale: weakScale || 0.25,
    };
    PLACES.push(item);
    BY_KEY[item.key] = item;
  }
  function byBengali(a, b) { return a[1].localeCompare(b[1], 'bn'); }
  var DHAKA_NAMES = Z.district('dhaka').slice(1);
  addPlace('dhaka', CITY_OTHER, 'ঢাকা সিটি', 'Dhaka city', DHAKA_NAMES.concat(['Dhaka city', 'ঢাকা সিটি', 'ঢাকা শহর']));
  Z.DHAKA_CITY.filter(function (a) { return a[0] !== CITY_OTHER; }).sort(byBengali).forEach(function (a) {
    addPlace('dhaka', a[0], a[1] + ', ঢাকা', a[2] + ' · ঢাকা সিটি', a.slice(1), DHAKA_NAMES);
  });
  // Typing "Dhaka" lists these right after Dhaka city, so Savar or Keraniganj is not missed.
  Z.DHAKA_OUTER.slice().sort(byBengali).forEach(function (a) {
    addPlace('dhaka', a[0], a[1] + ', ঢাকা', a[2] + ' · ঢাকা সিটির বাইরে', a.slice(1), DHAKA_NAMES, 0.5);
  });
  // A district also answers to its upazilas ("gafargaon" finds ময়মনসিংহ), a little less well.
  var UPAZILA_NAMES = {};
  Z.UPAZILAS.forEach(function (u) { (UPAZILA_NAMES[u[0]] = UPAZILA_NAMES[u[0]] || []).push(u[1], u[2]); });
  Z.DISTRICTS.filter(function (d) { return d[0] !== 'dhaka'; }).sort(byBengali).forEach(function (d) {
    addPlace(d[0], '', d[1], d[2], d.slice(1), UPAZILA_NAMES[d[0]], 0.6);
  });
  // Shown before anything is typed.
  var POPULAR = ['dhaka|' + CITY_OTHER, 'chattogram|', 'gazipur|', 'narayanganj|', 'dhaka|savar', 'cumilla|', 'sylhet|', 'rajshahi|'];

  function nameScore(name, query) {
    if (name === query) return 100;
    if (name.indexOf(query) === 0) return 70;
    if (name.indexOf(' ' + query) !== -1) return 50;
    if (query.length >= 3 && name.indexOf(query) !== -1) return 30;
    return 0;
  }
  function placeScore(place, query) {
    var best = 0;
    place.names.forEach(function (name) { best = Math.max(best, nameScore(name, query)); });
    place.weak.forEach(function (name) { best = Math.max(best, nameScore(name, query) * place.weakScale); });
    return best;
  }
  // Typos ("comila", "kumilla", "sylet"): one letter off (two for long names), whole name or its start.
  function typoScore(place, query) {
    if (query.length < 4) return 0;
    var allowed = query.length >= 7 ? 2 : 1;
    var best = 0;
    place.names.forEach(function (name) {
      if (Z.editDistance(name, query) <= allowed) best = Math.max(best, 40);
      else if (name.length > query.length && Z.editDistance(name.slice(0, query.length), query) <= 1) best = Math.max(best, 25);
    });
    return best;
  }
  // Best matches first. Several words ("mirpur dhaka") add up, so the area beats plain Dhaka.
  function search(text) {
    var query = Z.norm(text);
    if (!query) return POPULAR.map(function (key) { return { place: BY_KEY[key], score: 0 }; }).filter(function (r) { return r.place; });
    var words = query.split(' ').filter(function (word) { return word.length > 1; });
    var found = [];
    PLACES.forEach(function (place, index) {
      var score = placeScore(place, query) * 1.5;
      if (words.length > 1) {
        var sum = words.reduce(function (total, word) { return total + placeScore(place, word); }, 0);
        score = Math.max(score, sum);
      }
      if (score > 0) found.push({ place: place, score: score, index: index });
    });
    if (!found.length) {
      PLACES.forEach(function (place, index) {
        var score = typoScore(place, query);
        if (score > 0) found.push({ place: place, score: score, index: index });
      });
    }
    found.sort(function (a, b) { return b.score - a.score || a.index - b.index; });
    return found;
  }

  // ---------- what the customer picked ----------
  var state = { district: '', area: '', manual: false, auto: false, confirmed: '', address: null };
  function setPlace(district, area) {
    state.district = district || '';
    state.area = state.district === 'dhaka' ? (area || CITY_OTHER) : '';
  }
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved && Z.district(saved.district)) setPlace(saved.district, Z.area(saved.area) ? saved.area : '');
  } catch (error) { /* Starts empty without storage. */ }

  function selectedKey() { return state.district ? state.district + '|' + state.area : ''; }
  function selected() { return BY_KEY[selectedKey()] || null; }
  function zone() { return Z.zoneFor(state.district, state.area); }
  function remember() {
    try { localStorage.setItem(STORE, JSON.stringify({ district: state.district, area: state.area })); } catch (error) { /* Optional. */ }
    refreshIncomplete();
  }

  // ---------- abandoned checkouts (Incomplete Orders) ----------
  // The storefront saves the form as an incomplete order when the phone or address changes and
  // when the customer leaves (a keepalive fetch on tab close). Those requests now carry the
  // district, and a district picked later is sent to the saved row too, so staff see it and the
  // order made from it keeps it. The API sets the row's charge for the district
  // (OrderService.addIncompleteOrder / updateIncompleteOrderById / addOrderAdmin).
  var INCOMPLETE_URL = /^(.*?)\/api\/order\/(?:add-incomplete-order-by-(?:user|anonymous)|update-incomplete-order-by-id\/([^/?#]+))(?:[?#]|$)/;
  var incomplete = { id: '', base: '', sent: '' };
  function placeFields() {
    return { deliveryLocation: { district: state.district, area: state.area }, city: Z.district(state.district)[2] };
  }
  function withPlaceIncomplete(body) {
    if (!onCheckout() || !state.district || typeof body !== 'string') return body;
    try {
      var data = JSON.parse(body);
      if (!data || typeof data !== 'object' || Array.isArray(data)) return body;
      var fields = placeFields();
      data.deliveryLocation = fields.deliveryLocation;
      data.city = fields.city;
      incomplete.sent = selectedKey();
      return JSON.stringify(data);
    } catch (error) {
      return body;
    }
  }
  function noteIncomplete(url, responseText) {
    var match = INCOMPLETE_URL.exec(String(url || ''));
    if (!match) return;
    incomplete.base = match[1];
    if (match[2]) incomplete.id = decodeURIComponent(match[2]);
    try {
      var result = JSON.parse(responseText || 'null');
      if (result && result.data && result.data._id) incomplete.id = String(result.data._id);
    } catch (error) { /* No id in this answer. */ }
  }
  var refreshTimer = null;
  function refreshIncomplete() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      if (!incomplete.id || !state.district || incomplete.sent === selectedKey() || !onCheckout()) return;
      var request = new XMLHttpRequest();
      request.open('PUT', incomplete.base + '/api/order/update-incomplete-order-by-id/' + encodeURIComponent(incomplete.id));
      request.setRequestHeader('Content-Type', 'application/json');
      request.send(JSON.stringify(placeFields())); // gets the place added on the way out, like the storefront's own
    }, 800);
  }

  // The district as this visitor's town for their Meta events (meta-match-data.html keeps a hash).
  var metaCitySent = '';
  function rememberForMeta() {
    var city = Z.metaCity(state.district);
    if (!city || city === metaCitySent || typeof window.__amolRememberMetaCustomer !== 'function') return;
    metaCitySent = city;
    try {
      var pending = window.__amolRememberMetaCustomer({ city: city });
      if (pending && typeof pending.catch === 'function') pending.catch(function () {});
    } catch (error) { /* Tracking never blocks checkout. */ }
  }
  function onCheckout() {
    return /^\/checkout(?:\/|$)/.test(location.pathname) && location.pathname.indexOf('order-success') === -1;
  }
  function esc(text) {
    return String(text).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  // ---------- the box ----------
  var SEARCH_ICON = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='6.5' fill='none' stroke='%236b7280' stroke-width='2'/%3E%3Cpath d='m16 16 4.5 4.5' stroke='%236b7280' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E\")";
  var CHECK_ICON = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%231f8f4a'/%3E%3Cpath d='m7.5 12.3 3 3 6-6.3' fill='none' stroke='%23fff' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
  var STYLE = [
    '#ab-delivery-location{display:grid;gap:10px;margin:2px 0 18px;font-family:inherit}',
    '#ab-delivery-location [hidden]{display:none!important}',
    '#ab-delivery-location label{font-weight:600;font-size:16px;line-height:1.4;color:#24392c}',
    '#ab-delivery-location .ab-dl-combo{position:relative}',
    '#ab-dl-input{box-sizing:border-box;width:100%;height:52px;padding:0 44px 0 16px;border:1px solid rgba(0,0,0,.38);border-radius:4px;',
    'background:#fff ' + SEARCH_ICON + ' no-repeat right 14px center/20px 20px;color:#111827;font:inherit;font-size:16px;-webkit-appearance:none;appearance:none}',
    '#ab-dl-input::placeholder{color:#8a9099}',
    '#ab-delivery-location .ab-dl-combo.is-set #ab-dl-input{background-image:' + CHECK_ICON + ';font-weight:600}',
    '#ab-dl-input:focus{outline:2px solid #1f8f4a;outline-offset:1px;border-color:#1f8f4a}',
    '#ab-dl-input.ab-dl-invalid{border-color:#d93025;box-shadow:0 0 0 1px #d93025}',
    '#ab-dl-list{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:40;box-sizing:border-box;max-height:330px;margin:0;padding:4px 0;overflow-y:auto;',
    'list-style:none;background:#fff;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 12px 28px rgba(15,23,42,.16)}',
    '#ab-dl-list li[role="option"]{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;padding:8px 14px;cursor:pointer;color:#111827;font-size:16px;line-height:1.35}',
    '#ab-dl-list li[role="option"] small{flex:0 1 auto;color:#6b7280;font-size:13px;text-align:right}',
    '#ab-dl-list li[aria-selected="true"]{background:#edf7ef}',
    '#ab-dl-list li.is-chosen span{font-weight:700;color:#1f5131}',
    '#ab-dl-list .ab-dl-caption,#ab-dl-list .ab-dl-none{padding:8px 14px;color:#6b7280;font-size:13px;line-height:1.4}',
    '#ab-delivery-location .ab-dl-error{margin:0;color:#c5221f;font-size:14px;line-height:1.4;font-weight:500}',
    '#ab-delivery-location .ab-dl-result{margin:0;padding:8px 10px;border-radius:8px;background:#edf7ef;color:#1f5131;font-size:14px;line-height:1.5;font-weight:500}',
    '#ab-delivery-location .ab-dl-result small{display:block;color:#3d6b4c;font-size:13px;font-weight:400}',
    '#ab-delivery-location .ab-dl-warn{margin:0;padding:10px 12px;border:1px solid #f0c36d;border-radius:8px;background:#fff7e6;color:#6b4300;font-size:14px;line-height:1.5}',
    '#ab-delivery-location .ab-dl-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}',
    '#ab-delivery-location .ab-dl-actions button{min-height:40px;padding:0 14px;border:1px solid #b7791f;border-radius:6px;background:#fff;color:#6b4300;font:inherit;font-size:14px;font-weight:600;cursor:pointer}',
    '#ab-delivery-location .ab-dl-actions .ab-dl-yes{border-color:#1f8f4a;background:#1f8f4a;color:#fff}',
    'app-checkout [formcontrolname="deliveryOptions"].ab-dl-locked{pointer-events:none}',
    'app-checkout [formcontrolname="deliveryOptions"].ab-dl-locked .mat-mdc-radio-button:not(.mat-mdc-radio-checked){opacity:.45}',
    'app-checkout .ab-dl-note{margin:6px 0 0;color:#4b5563;font-size:13px;line-height:1.4}',
    'app-checkout .ab-delivery-waived .ab-dl-note{visibility:hidden}',
  ].join('');

  var shown = [];
  var active = -1;
  function box() { return document.getElementById('ab-delivery-location'); }
  function input() { var b = box(); return b && b.querySelector('#ab-dl-input'); }

  function build() {
    if (!document.getElementById('ab-dl-style')) {
      var style = document.createElement('style');
      style.id = 'ab-dl-style';
      style.textContent = STYLE;
      document.head.appendChild(style);
    }
    var root = document.createElement('div');
    root.id = 'ab-delivery-location';
    root.innerHTML =
      '<label for="ab-dl-input">জেলা *</label>' +
      '<div class="ab-dl-combo">' +
        '<input id="ab-dl-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"' +
          ' role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="ab-dl-list"' +
          ' aria-describedby="ab-dl-result ab-dl-error" placeholder="জেলার নাম লিখুন, যেমন: ফেনী / Feni / মিরপুর">' +
        '<ul id="ab-dl-list" role="listbox" aria-label="জেলা" hidden></ul>' +
      '</div>' +
      '<p class="ab-dl-error" id="ab-dl-error" role="alert" hidden></p>' +
      '<p class="ab-dl-result" id="ab-dl-result" aria-live="polite" hidden></p>' +
      '<div class="ab-dl-warn" role="alert" hidden><span></span>' +
        '<div class="ab-dl-actions"><button type="button" class="ab-dl-yes"></button>' +
        '<button type="button" class="ab-dl-change">জেলা বদলান</button></div>' +
      '</div>';
    var field = root.querySelector('#ab-dl-input');
    var list = root.querySelector('#ab-dl-list');
    field.addEventListener('focus', function () {
      var current = selected();
      openList(current && field.value === current.label ? '' : field.value);
      try { field.select(); } catch (error) { /* Some phones refuse. */ }
      // On a phone the keyboard covers the lower half: bring the box up so the matches show.
      if (window.innerWidth < 768) {
        setTimeout(function () {
          var top = root.getBoundingClientRect().top;
          if (top > window.innerHeight * 0.3) window.scrollBy({ top: top - 90, behavior: 'smooth' });
        }, 250);
      }
    });
    field.addEventListener('input', function () {
      // Typing starts a new choice; an empty box lets the address fill it again.
      if (state.district) { setPlace('', ''); state.auto = false; remember(); }
      state.manual = !!field.value.trim();
      clearError();
      sync();
      openList(field.value);
    });
    field.addEventListener('keydown', function (event) {
      var key = event.key;
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        event.preventDefault();
        if (list.hidden) openList(field.value);
        if (!shown.length) return;
        active = key === 'ArrowDown' ? Math.min(active + 1, shown.length - 1) : Math.max(active - 1, 0);
        markActive();
      } else if (key === 'Enter') {
        event.preventDefault(); // never sends the order from this box
        if (!list.hidden && shown.length && (active >= 0 || shown.length === 1)) choose(shown[Math.max(active, 0)].place, 'user');
        else pickTyped();
      } else if (key === 'Escape') {
        closeList();
      } else if (key === 'Tab' && !list.hidden && active >= 0 && shown[active]) {
        choose(shown[active].place, 'user');
      }
    });
    field.addEventListener('blur', function () {
      setTimeout(function () {
        if (document.activeElement === field) return;
        closeList();
        pickTyped();
        sync();
      }, 160);
    });
    // Keep the box focused while a match is tapped, then take the tap.
    list.addEventListener('mousedown', function (event) { event.preventDefault(); });
    list.addEventListener('click', function (event) {
      var item = event.target.closest && event.target.closest('li[data-key]');
      if (!item || !BY_KEY[item.getAttribute('data-key')]) return;
      choose(BY_KEY[item.getAttribute('data-key')], 'user');
      field.blur();
    });
    root.querySelector('.ab-dl-yes').addEventListener('click', function () {
      state.confirmed = mismatchKey();
      root.querySelector('.ab-dl-warn').hidden = true;
      var submit = submitButton();
      if (submit) submit.click();
    });
    root.querySelector('.ab-dl-change').addEventListener('click', function () {
      root.querySelector('.ab-dl-warn').hidden = true;
      field.focus();
    });
    return root;
  }

  function openList(text) {
    var b = box();
    if (!b) return;
    var list = b.querySelector('#ab-dl-list');
    var field = b.querySelector('#ab-dl-input');
    var query = Z.norm(text);
    var results = search(text);
    shown = results.slice(0, SHOWN);
    active = query && shown.length ? 0 : -1;
    var chosen = selectedKey();
    list.innerHTML = (query ? '' : '<li class="ab-dl-caption" role="presentation">নাম লিখে খুঁজুন, অথবা বেছে নিন:</li>') +
      (shown.length ? shown.map(function (result, index) {
        return '<li role="option" id="ab-dl-opt-' + index + '" data-key="' + esc(result.place.key) + '" aria-selected="false"' +
          (result.place.key === chosen ? ' class="is-chosen"' : '') + '><span>' + esc(result.place.label) + '</span><small>' +
          esc(result.place.hint) + '</small></li>';
      }).join('') : '<li class="ab-dl-none" role="presentation">মিলছে না। জেলার নাম বাংলা বা ইংরেজিতে লিখুন।</li>');
    list.hidden = false;
    field.setAttribute('aria-expanded', 'true');
    markActive();
  }
  function markActive() {
    var b = box();
    if (!b) return;
    var field = b.querySelector('#ab-dl-input');
    b.querySelectorAll('#ab-dl-list li[role="option"]').forEach(function (item, index) {
      item.setAttribute('aria-selected', String(index === active));
      if (index === active && item.scrollIntoView) item.scrollIntoView({ block: 'nearest' });
    });
    if (active >= 0) field.setAttribute('aria-activedescendant', 'ab-dl-opt-' + active);
    else field.removeAttribute('aria-activedescendant');
  }
  function closeList() {
    var b = box();
    if (!b) return;
    b.querySelector('#ab-dl-list').hidden = true;
    var field = b.querySelector('#ab-dl-input');
    field.setAttribute('aria-expanded', 'false');
    field.removeAttribute('aria-activedescendant');
    active = -1;
  }

  function choose(place, how) {
    setPlace(place.district, place.area);
    state.manual = how === 'user';
    state.auto = how === 'address';
    var field = input();
    if (field) field.value = place.label;
    closeList();
    clearError();
    remember();
    rememberForMeta();
    sync();
  }
  // Text typed but no match tapped: take the match when there is one clear one (a single
  // one-letter-off match counts).
  function pickTyped() {
    var field = input();
    if (state.district || !field || !Z.norm(field.value)) return false;
    var results = search(field.value);
    var clear = results.length && (results.length === 1 ? results[0].score >= 40 : results[0].score >= 70 && results[0].score > results[1].score);
    if (clear) {
      choose(results[0].place, 'user');
      return true;
    }
    return false;
  }

  function addressBox() { return document.querySelector('app-checkout [formcontrolname="address"]'); }
  function submitButton() { return document.querySelector('app-checkout form button[type="submit"]'); }
  function deliveryGroup() { return document.querySelector('app-checkout [formcontrolname="deliveryOptions"]'); }

  function mount() {
    if (!onCheckout()) return;
    var address = addressBox();
    if (!address) return;
    var field = address.closest('.form-input') || address.closest('mat-form-field') || address;
    var root = box() || build();
    if (root.previousElementSibling !== field) field.insertAdjacentElement('afterend', root);
    if (state.address !== address.value) readAddress(address.value);
    rememberForMeta();
    sync();
  }

  // The address changed (typed, or filled from a saved address): take the place it names, unless
  // the customer has typed or picked one in the box on this visit.
  function readAddress(text) {
    state.address = text;
    if (state.manual) return;
    var found = Z.detect(text);
    if (!found.district) return;
    var area = found.district !== 'dhaka' ? '' :
      found.area || (state.district === 'dhaka' && state.area ? state.area : CITY_OTHER);
    if (found.district === state.district && area === state.area) return;
    setPlace(found.district, area);
    state.auto = true;
    clearError();
    remember();
    rememberForMeta();
  }

  function mismatchKey() {
    var address = addressBox();
    var other = Z.mismatch({ district: state.district, area: state.area }, address ? address.value : '');
    return other ? selectedKey() + '|' + other : '';
  }

  function sync() {
    var root = box();
    if (!root) return;
    var field = root.querySelector('#ab-dl-input');
    var current = selected();
    if (current && document.activeElement !== field && field.value !== current.label) field.value = current.label;
    root.querySelector('.ab-dl-combo').classList.toggle('is-set', !!current);
    var where = zone();
    var option = lockDelivery(where);
    var html = '';
    if (where) {
      var waived = option && option.closest('.ab-delivery-waived');
      var label = option ? option.closest('mat-radio-button').textContent.replace(/\s+/g, ' ').trim() : '';
      html = (waived ? 'এই অর্ডারে ডেলিভারি চার্জ নেই।' :
        'ডেলিভারি চার্জ: ' + esc(label || (where === 'inside' ? 'ঢাকা সিটির ভেতর' : 'ঢাকা সিটির বাইরে'))) +
        (state.auto ? '<small>ঠিকানা দেখে জেলা বসানো হয়েছে। ভুল হলে বদলে দিন।</small>' : '');
    }
    // Written only when it changes: the page watches itself for changes (and screen readers read it).
    var result = root.querySelector('.ab-dl-result');
    if (result.__abHtml !== html) {
      result.__abHtml = html;
      result.innerHTML = html;
      result.hidden = !html;
    }
    var warn = root.querySelector('.ab-dl-warn');
    if (!warn.hidden && (!mismatchKey() || mismatchKey() === state.confirmed)) warn.hidden = true;
  }

  // Sets "ঢাকা সিটির ভেতর / বাইরে" from the district and keeps it there. Returns the chosen radio.
  function lockDelivery(where) {
    var group = deliveryGroup();
    if (!group) return null;
    group.classList.add('ab-dl-locked');
    group.setAttribute('aria-disabled', 'true');
    var note = group.parentElement.querySelector(':scope > .ab-dl-note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'ab-dl-note';
      group.insertAdjacentElement('afterend', note);
    }
    var text = where ? 'ঠিকানার জেলা দেখে চার্জ ঠিক করা হয়েছে।' : 'ঠিকানার নিচে জেলা লিখলে চার্জ নিজে থেকেই ঠিক হবে।';
    if (note.textContent !== text) note.textContent = text;
    group.querySelectorAll('input[type="radio"]').forEach(function (radio) { if (radio.tabIndex !== -1) radio.tabIndex = -1; });
    if (!where) return null;
    var radio = group.querySelector('input[type="radio"][value="' + (where === 'inside' ? '1' : '2') + '"]');
    if (radio && !radio.checked) radio.click();
    return radio;
  }

  // ---------- before the order is sent ----------
  function clearError() {
    var root = box();
    if (!root) return;
    root.querySelector('.ab-dl-error').hidden = true;
    var field = root.querySelector('#ab-dl-input');
    field.classList.remove('ab-dl-invalid');
    field.removeAttribute('aria-invalid');
  }
  function showError(text) {
    var root = box();
    var field = root.querySelector('#ab-dl-input');
    var error = root.querySelector('.ab-dl-error');
    error.textContent = text;
    error.hidden = false;
    field.classList.add('ab-dl-invalid');
    field.setAttribute('aria-invalid', 'true');
    root.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(function () { field.focus({ preventScroll: true }); }, 250);
  }
  function guard(event) {
    if (!onCheckout()) return;
    var target = event.target;
    if (!target || !target.closest || !target.closest('app-checkout form')) return;
    if (event.type === 'click') {
      var button = target.closest('button');
      if (!button || button.type !== 'submit') return;
    }
    var root = box();
    if (!root) return;
    var stop = function () { event.preventDefault(); event.stopImmediatePropagation(); };
    if (!state.district) pickTyped();
    if (!state.district || !zone()) {
      stop();
      showError('আপনার জেলার নাম লিখে নিচের তালিকা থেকে বেছে নিন, তাহলে সঠিক ডেলিভারি চার্জ বসবে।');
      return;
    }
    var key = mismatchKey();
    if (key && key !== state.confirmed) {
      stop();
      var other = key.split('|')[2];
      var chosen = selected() ? selected().label : Z.label({ district: state.district, area: state.area });
      var warn = root.querySelector('.ab-dl-warn');
      warn.querySelector('span').textContent = 'ঠিকানায় “' + other + '” লেখা আছে, কিন্তু জেলা বাছাই করা “' + chosen + '”। ডেলিভারি কোথায় হবে?';
      warn.querySelector('.ab-dl-yes').textContent = chosen + ' ঠিক আছে, অর্ডার করুন';
      warn.hidden = false;
      root.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }
  document.addEventListener('click', guard, true);
  document.addEventListener('submit', guard, true);
  // Keyboard changes to the locked choice go back to the district's choice.
  document.addEventListener('change', function (event) {
    if (event.target && event.target.closest && event.target.closest('app-checkout [formcontrolname="deliveryOptions"]')) {
      setTimeout(sync, 0);
    }
  }, true);

  // ---------- the order request carries the place ----------
  function withPlace(body) {
    if (!onCheckout() || !state.district || !box() || typeof body !== 'string') return body;
    try {
      var data = JSON.parse(body);
      if (!data || typeof data !== 'object' || Array.isArray(data)) return body;
      data.deliveryLocation = {
        district: state.district,
        area: state.area,
        confirmed: !!state.confirmed && state.confirmed === mismatchKey(),
      };
      // Meta's town: the storefront's purchase tracking reads it from this request (user_data.city).
      data.city = Z.metaCity(state.district);
      return JSON.stringify(data);
    } catch (error) {
      return body;
    }
  }
  var open = XMLHttpRequest.prototype.open;
  var send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__abOrderPost = /^post$/i.test(String(method)) && ORDER_URL.test(String(url));
    this.__abIncomplete = /^(post|put)$/i.test(String(method)) && INCOMPLETE_URL.test(String(url)) ? String(url) : '';
    return open.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    if (this.__abOrderPost || this.__abIncomplete) {
      var args = Array.prototype.slice.call(arguments);
      args[0] = this.__abOrderPost ? withPlace(body) : withPlaceIncomplete(body);
      if (this.__abIncomplete) {
        var self = this;
        this.addEventListener('load', function () { noteIncomplete(self.__abIncomplete, self.responseText); });
      }
      return send.apply(this, args);
    }
    return send.apply(this, arguments);
  };
  if (window.fetch) {
    var originalFetch = window.fetch;
    window.fetch = function (request, init) {
      var url = String((typeof request === 'string' ? request : request && request.url) || '');
      var method = String(init && init.method || '');
      if (init && typeof init.body === 'string') {
        if (/^post$/i.test(method) && ORDER_URL.test(url)) init = Object.assign({}, init, { body: withPlace(init.body) });
        else if (/^(post|put)$/i.test(method) && INCOMPLETE_URL.test(url)) {
          // The storefront's save on tab close (keepalive).
          init = Object.assign({}, init, { body: withPlaceIncomplete(init.body) });
          noteIncomplete(url, '');
        }
      }
      return originalFetch.call(this, request, init);
    };
  }

  // ---------- keep it in place ----------
  var queued = false;
  function tick() {
    queued = false;
    if (!onCheckout()) return;
    var address = addressBox();
    if (address && state.address !== address.value && box()) {
      readAddress(address.value);
      sync();
    }
    mount();
  }
  function queue() {
    if (queued) return;
    queued = true;
    setTimeout(tick, 60);
  }
  document.addEventListener('input', function (event) {
    if (event.target && event.target.matches && event.target.matches('app-checkout [formcontrolname="address"]')) queue();
  }, true);
  new MutationObserver(queue).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(tick, 800);
  window.addEventListener('ab-route', queue);
  tick();
})();
