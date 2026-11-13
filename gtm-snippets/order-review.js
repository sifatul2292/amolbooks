/* Review page behind the WhatsApp review request (owner, 2026-11-13), drawn inside the storefront
   at /pages/order-review, so the shop's own header, footer and login are around it. Loaded by
   gtm-snippets/order-review-loader.html; served by the API at /api/storefront-page/order-review.js; data from
   /api/order-review/<token> (ReviewRequestService). The link is the key and opens only that
   order's books. Reviews wait for staff approval like every review. Login: an SMS code to the
   order's number logs the customer in to their account (ReviewLoginService), which then keeps
   their name, number, address and orders. */
(function () {
  'use strict';
  if (window.__abOrderReviewApp) return;
  window.__abOrderReviewApp = true;

  var ROUTE = '/pages/order-review';
  var LOCAL = /^(localhost|127\.0\.0\.1|\[?::1\]?)$/.test(location.hostname);
  var API = LOCAL ? location.origin + '/api' : 'https://apisub.amolbooks.com/api';
  var STAR_WORDS = ['', 'খুব খারাপ', 'ভালো লাগেনি', 'মোটামুটি', 'ভালো', 'অসাধারণ'];
  var BN = '০১২৩৪৫৬৭৮৯';
  var token = window.__abOrderReviewToken || read('ab-order-review-token') || '';
  var state = { data: null, error: null, name: '', images: {}, drafts: {}, login: { phase: 'idle', retryAt: 0, error: '', phone: '' } };
  var root = null;
  var app = null;
  var tick = null;

  function read(key) { try { return sessionStorage.getItem(key) || ''; } catch (_) { return ''; } }
  function write(key, value) { try { sessionStorage.setItem(key, value); } catch (_) {} }
  function bn(value) { return String(value).replace(/\d/g, function (d) { return BN[Number(d)]; }); }
  function latin(value) { return String(value || '').replace(/[০-৯]/g, function (d) { return String(BN.indexOf(d)); }); }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var css =
    'html.ab-rate-on app-extra-page-view .description{display:none!important}' +
    '#ab-rate{max-width:600px;margin:12px auto 36px;padding:0 4px;color:#202020;font-size:16px;line-height:1.55}' +
    '#ab-rate *{box-sizing:border-box}' +
    '#ab-rate h1{font-size:1.45rem;line-height:1.3;margin:0 0 6px;font-weight:700}' +
    '#ab-rate .lead{margin:0 0 16px;color:#666}' +
    '#ab-rate .card{background:#fff;border:1px solid #ececec;border-radius:12px;padding:14px;margin-bottom:14px}' +
    '#ab-rate .book{box-shadow:0 2px 8px rgba(0,0,0,.07)}' +
    '#ab-rate label.small{display:block;font-size:.875rem;color:#666;margin-bottom:4px}' +
    '#ab-rate input[type=text],#ab-rate input[type=tel],#ab-rate textarea{width:100%;font:inherit;color:inherit;background:#fff;border:1px solid #d6d6d6;border-radius:10px;padding:10px 12px;outline:none}' +
    '#ab-rate input[type=text]:focus,#ab-rate input[type=tel]:focus,#ab-rate textarea:focus{border-color:#168747;box-shadow:0 0 0 3px rgba(22,135,71,.15)}' +
    '#ab-rate textarea{min-height:96px;resize:vertical}' +
    '#ab-rate .book-head{display:flex;gap:12px;align-items:flex-start;margin-bottom:10px}' +
    '#ab-rate .cover{width:58px;height:84px;object-fit:cover;border-radius:6px;background:#f1f1f1;flex-shrink:0;border:1px solid #ececec}' +
    '#ab-rate .book-title{font-weight:700;font-size:1.05rem;line-height:1.35;margin:0}' +
    '#ab-rate .book-title a{color:inherit;text-decoration:none}' +
    '#ab-rate .book-author{color:#666;font-size:.9rem;margin:2px 0 0}' +
    '#ab-rate .stars{display:flex;gap:4px;margin:4px 0 2px;border:0;padding:0;min-width:0}' +
    '#ab-rate .stars legend{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}' +
    '#ab-rate .stars input{position:absolute;opacity:0;width:1px;height:1px}' +
    '#ab-rate .stars label{cursor:pointer;font-size:34px;line-height:1;color:#d9d9d9;padding:2px;border-radius:6px;user-select:none;margin:0}' +
    '#ab-rate .stars label.on{color:#f5a524}' +
    '#ab-rate .stars input:focus-visible+label{outline:2px solid #168747;outline-offset:2px}' +
    '#ab-rate .star-word{min-height:1.4em;font-size:.9rem;color:#666;margin:0 0 8px}' +
    '#ab-rate .photo{display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap}' +
    '#ab-rate .photo-btn{display:inline-flex;align-items:center;gap:6px;border:1px dashed #c9c9c9;border-radius:10px;padding:8px 12px;background:#fff;cursor:pointer;font-size:.92rem;margin:0}' +
    '#ab-rate .photo-btn input{display:none}' +
    '#ab-rate .photo-preview{width:54px;height:54px;object-fit:cover;border-radius:8px;border:1px solid #ececec}' +
    '#ab-rate .link-btn{border:0;background:none;color:#c41e1e;font:inherit;font-size:.9rem;cursor:pointer;padding:4px}' +
    '#ab-rate .send{margin-top:12px;width:100%;min-height:48px;border:0;border-radius:10px;background:#ea2929;color:#fff;font:inherit;font-size:1.05rem;font-weight:700;cursor:pointer}' +
    '#ab-rate .send:hover{background:#c41e1e}' +
    '#ab-rate .send:disabled,#ab-rate .green:disabled,#ab-rate .ghost:disabled{opacity:.6;cursor:default}' +
    '#ab-rate .error{color:#a61b1b!important;background:#fff1f0;border:1px solid #f5c2bf;border-radius:8px;padding:6px 10px;font-size:.92rem;margin:8px 0 0}' +
    '#ab-rate .error:empty{display:none}' +
    '#ab-rate .done{background:#eef8f2;border-radius:10px;padding:10px 12px;color:#0f5c31;font-size:.95rem}' +
    '#ab-rate .done p{margin:0}' +
    '#ab-rate .done .quote{color:#202020;margin-top:6px;white-space:pre-wrap}' +
    '#ab-rate .done button{margin-top:6px;border:0;background:none;color:#168747;font:inherit;font-weight:700;padding:0;cursor:pointer;text-decoration:underline}' +
    '#ab-rate .reward{background:#fff7e8;border-color:#f3d9a4}' +
    '#ab-rate .reward strong{display:block;font-size:1.05rem}' +
    '#ab-rate .code{display:flex;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap}' +
    '#ab-rate .code span{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:1.15rem;letter-spacing:1px;background:#fff;border:1px dashed #e0b25c;border-radius:8px;padding:6px 12px}' +
    '#ab-rate .green{border:0;border-radius:10px;background:#168747;color:#fff;font:inherit;font-weight:700;padding:10px 16px;min-height:44px;cursor:pointer}' +
    '#ab-rate .ghost{border:1px solid #168747;border-radius:10px;background:#fff;color:#168747;font:inherit;padding:9px 14px;min-height:44px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}' +
    '#ab-rate .login{border-color:#cfe6d8;background:#f6fbf8}' +
    '#ab-rate .login strong{display:block;font-size:1.05rem;margin-bottom:2px}' +
    '#ab-rate .login p{margin:0 0 10px;color:#3d4a42;font-size:.95rem}' +
    '#ab-rate .login .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '#ab-rate .login input.otp{flex:1 1 150px;max-width:200px;letter-spacing:4px;font-size:1.15rem;text-align:center}' +
    '#ab-rate .login input.phone{flex:1 1 180px;max-width:240px;font-size:1.1rem;letter-spacing:1px}' +
    '#ab-rate .login .tip{font-size:.9rem;color:#4b5a51;margin:8px 0 0}' +
    '#ab-rate a.green.link{display:inline-flex;align-items:center;text-decoration:none}' +
    '#ab-rate .hints{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 2px}' +
    '#ab-rate .hints-title{flex-basis:100%;font-size:.85rem;color:#666}' +
    '#ab-rate .hint{border:1px solid #cfe6d8;background:#f6fbf8;color:#0f5c31;border-radius:999px;padding:5px 11px;font:inherit;font-size:.86rem;line-height:1.35;cursor:pointer;text-align:left;max-width:100%}' +
    '#ab-rate .hint:hover{background:#e7f4ec}' +
    '#ab-rate .hint.used{background:#168747;border-color:#168747;color:#fff}' +
    '#ab-rate .note{text-align:center;padding:18px}' +
    '#ab-rate .note a.shop{display:inline-block;margin-top:10px;background:#ea2929;color:#fff;border-radius:10px;padding:10px 18px;text-decoration:none;font-weight:700}' +
    '#ab-rate .skeleton{height:160px;border-radius:12px;background:#f1f1f1;margin-bottom:14px}' +
    '#ab-rate [hidden]{display:none!important}';

  function api(path, method, body) {
    return fetch(API + '/order-review/' + encodeURIComponent(token) + path, {
      method: method || 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'omit',
      cache: 'no-store',
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (json) {
        if (!response.ok || json.success === false) {
          var message = Array.isArray(json.message) ? json.message[0] : json.message;
          if (response.status === 429 && !/[ঀ-৿]/.test(String(message || ''))) message = 'একটু পরে আবার চেষ্টা করুন।';
          throw new Error(message || 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।');
        }
        return json;
      });
    });
  }

  function note(title, text) {
    return '<div class="card note"><h1>' + esc(title) + '</h1><p class="lead">' + esc(text) + '</p><a class="shop" href="/">বই দেখুন</a></div>';
  }

  function rewardBox() {
    var code = state.data && state.data.reward;
    if (!code) return '';
    return '<section class="card reward" aria-label="আপনার কুপন"><strong>ধন্যবাদ! আপনার জন্য একটি কুপন</strong>' +
      '<span>পরের অর্ডারে চেকআউটে এই কোডটি লিখুন:</span>' +
      '<div class="code"><span id="abr-coupon">' + esc(code) + '</span><button type="button" class="green" data-act="copy">কপি করুন</button></div></section>';
  }

  /* ---------- Login with an SMS code to the order's number ---------- */

  function loggedIn() {
    try {
      var saved = JSON.parse(read('ab-order-review-login') || 'null');
      return saved && saved.token === token && new Date(saved.expiresAt).getTime() > Date.now() ? saved : null;
    } catch (_) { return null; }
  }

  /**
   * After the review: the customer types their mobile number, gets an SMS code and is logged in to
   * their profile (orders + the review, pending until staff approve it). Shown once a review is sent.
   */
  function loginBox() {
    var data = state.data;
    var sent = data.books.filter(function (book) { return book.review; }).length;
    if (loggedIn()) {
      return '<section class="card login" id="abr-login" aria-label="প্রোফাইল"><strong>✓ আপনি লগইন করেছেন</strong>' +
        '<p>আপনার অর্ডার আর রিভিউ প্রোফাইলে আছে। রিভিউ প্রকাশ হলে WhatsApp-এ জানিয়ে দেবো।</p>' +
        '<div class="row"><a class="green link" href="/account/profile">আমার প্রোফাইলে যান</a></div></section>';
    }
    if (!sent || !data.phoneHint) return '';
    var left = data.books.length - sent;
    var login = state.login;
    var html = '<section class="card login" id="abr-login" aria-label="প্রোফাইলে লগইন">' +
      '<strong>✓ রিভিউ জমা হয়েছে! এবার আপনার প্রোফাইলে লগইন করুন</strong>' +
      '<p>প্রোফাইলে আপনার আগের অর্ডার আর রিভিউ দেখতে পাবেন। রিভিউ প্রকাশ হলে WhatsApp-এ জানিয়ে দেবো।' +
      (left ? ' বাকি ' + bn(left) + 'টি বইয়ের রিভিউ চাইলে আগে লিখে নিন।' : '') + '</p>';
    if (login.phase === 'idle') {
      html += '<label class="small" for="abr-phone">আপনার মোবাইল নম্বর</label>' +
        '<div class="row"><input type="tel" class="phone" id="abr-phone" inputmode="numeric" autocomplete="tel" maxlength="16" placeholder="01XXXXXXXXX" value="' + esc(login.phone || '') + '">' +
        '<button type="button" class="green" data-act="send-code">কোড পাঠান</button></div>' +
        '<p class="tip">অর্ডারে দেওয়া নম্বরটি দিন (' + esc(bn(data.phoneHint)) + ')। এই নম্বরে SMS-এ একটি কোড যাবে।</p>';
    } else {
      var wait = Math.max(0, Math.ceil((login.retryAt - Date.now()) / 1000));
      html += '<p class="tip">' + esc(bn(login.phone)) + ' নম্বরে কোড পাঠানো হয়েছে। <button type="button" class="link-btn" data-act="change-phone">নম্বর বদলান</button></p>' +
        '<label class="small" for="abr-code">SMS-এ আসা ৬ সংখ্যার কোড</label>' +
        '<div class="row"><input type="text" class="otp" id="abr-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••">' +
        '<button type="button" class="green" data-act="login"' + (login.phase === 'busy' ? ' disabled' : '') + '>' + (login.phase === 'busy' ? 'অপেক্ষা করুন…' : 'লগইন') + '</button>' +
        '<button type="button" class="ghost" data-act="send-code" id="abr-resend"' + (wait ? ' disabled' : '') + '>' +
        (wait ? 'আবার কোড (' + bn(wait) + ')' : 'আবার কোড পাঠান') + '</button></div>';
    }
    return html + '<p class="error" id="abr-login-error" role="alert">' + esc(login.error) + '</p></section>';
  }

  function sendCode(button) {
    state.login.error = '';
    var field = document.getElementById('abr-phone');
    if (field) state.login.phone = latin(field.value).replace(/[^\d+]/g, '');
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(state.login.phone || '')) {
      state.login.error = 'সঠিক মোবাইল নম্বর দিন (০১ দিয়ে শুরু, ১১ সংখ্যা)।';
      render();
      return;
    }
    if (button) button.disabled = true;
    api('/login-code', 'POST', { phone: state.login.phone }).then(function (json) {
      state.login.phase = 'sent';
      state.login.retryAt = Date.now() + 1000 * Number((json.data && json.data.retryAfter) || 60);
      render();
      var input = document.getElementById('abr-code');
      if (input) input.focus();
      startTick();
    }).catch(function (problem) {
      state.login.error = problem.message;
      render();
    });
  }

  function login() {
    var input = document.getElementById('abr-code');
    var code = latin(input && input.value).replace(/\D/g, '');
    if (code.length !== 6) {
      state.login.error = 'SMS-এ আসা ৬ সংখ্যার কোডটি লিখুন।';
      render();
      return;
    }
    state.login.phase = 'busy';
    state.login.error = '';
    render();
    api('/login', 'POST', { code: code }).then(function (json) {
      var data = json.data || {};
      try { localStorage.setItem(data.storageKey, data.storageValue); } catch (_) {
        throw new Error('এই ব্রাউজারে লগইন সেভ করা যাচ্ছে না। অন্য ব্রাউজারে চেষ্টা করুন।');
      }
      write('ab-order-review-login', JSON.stringify({ token: token, expiresAt: data.expiresAt }));
      // The profile greets them with the review they just sent (customer-dashboard.js).
      write('ab-review-just-sent', JSON.stringify({ orderId: state.data.orderId, at: Date.now() }));
      // A full page load: the storefront reads the new login when it starts.
      location.assign('/account/profile');
    }).catch(function (problem) {
      state.login.phase = 'sent';
      state.login.error = problem.message;
      render();
    });
  }

  function startTick() {
    if (tick) clearInterval(tick);
    tick = setInterval(function () {
      var button = document.getElementById('abr-resend');
      if (!button) { clearInterval(tick); tick = null; return; }
      var wait = Math.max(0, Math.ceil((state.login.retryAt - Date.now()) / 1000));
      button.disabled = wait > 0;
      button.textContent = wait ? 'আবার কোড (' + bn(wait) + ')' : 'আবার কোড পাঠান';
      if (!wait) { clearInterval(tick); tick = null; }
    }, 1000);
  }

  /* ---------- Reviews ---------- */

  function stars(index, rating) {
    var html = '<fieldset class="stars" data-index="' + index + '"><legend>রেটিং</legend>';
    for (var n = 1; n <= 5; n++) {
      var id = 'abr-r' + index + '-' + n;
      html += '<input type="radio" name="abr-rating' + index + '" id="' + id + '" value="' + n + '"' + (rating === n ? ' checked' : '') + '>' +
        '<label for="' + id + '" class="' + (rating >= n ? 'on' : '') + '" title="' + esc(STAR_WORDS[n]) + '" aria-label="' + bn(n) + ' তারা — ' + esc(STAR_WORDS[n]) + '">★</label>';
    }
    return html + '</fieldset><p class="star-word" id="abr-word' + index + '">' + esc(rating ? STAR_WORDS[rating] : 'তারায় চাপ দিয়ে রেটিং দিন') + '</p>';
  }

  function bookCard(book, index, editing) {
    var title = esc(book.name);
    if (book.slug) title = '<a href="/product-details/' + encodeURIComponent(book.slug) + '">' + title + '</a>';
    var head = '<div class="book-head">' +
      (book.image ? '<img class="cover" src="' + esc(book.image) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' : '<span class="cover"></span>') +
      '<div><p class="book-title">' + title + '</p>' + (book.author ? '<p class="book-author">' + esc(book.author) + '</p>' : '') + '</div></div>';
    if (book.review && !editing) {
      return '<article class="card book" data-index="' + index + '">' + head +
        '<div class="done"><p>✓ রিভিউ পাঠানো হয়েছে — ' + '★'.repeat(book.review.rating) + '</p>' +
        '<p class="quote">' + esc(book.review.review) + '</p>' +
        (book.review.approved
          ? '<p>সাইটে প্রকাশিত হয়েছে। ধন্যবাদ!</p>'
          : '<p>প্রকাশের আগে আমরা একবার দেখে নিই।</p><button type="button" data-act="edit" data-index="' + index + '">রিভিউ বদলাতে চান?</button>') +
        '</div></article>';
    }
    var review = state.drafts[index] || book.review || {};
    var image = state.images[index] || '';
    return '<article class="card book" data-index="' + index + '">' + head +
      stars(index, review.rating || 0) +
      '<label class="small" for="abr-text' + index + '">বইটি নিয়ে আপনার মতামত</label>' +
      '<textarea id="abr-text' + index + '" maxlength="1500" placeholder="কেমন লাগলো, কাদের পড়া উচিত, ছাপা-বাঁধাই কেমন…">' + esc(review.review || '') + '</textarea>' +
      hintsHtml(book, index) +
      '<div class="photo"><label class="photo-btn">📷 ছবি যোগ করুন (ঐচ্ছিক)<input type="file" accept="image/*" data-index="' + index + '"></label>' +
      '<img class="photo-preview" id="abr-preview' + index + '" alt=""' + (image ? ' src="' + esc(image) + '"' : ' hidden') + '>' +
      '<button type="button" class="link-btn" data-act="photo-remove" data-index="' + index + '"' + (image ? '' : ' hidden') + '>ছবি বাদ দিন</button></div>' +
      '<button type="button" class="send" data-act="send" data-index="' + index + '">রিভিউ পাঠান</button>' +
      '<p class="error" id="abr-error' + index + '" role="alert"></p></article>';
  }

  /** Writing help from the book's description (ReviewRequestService: review-hints.ts). */
  function hintsHtml(book, index) {
    if (!book.hints || !book.hints.length) return '';
    return '<div class="hints" role="group" aria-label="লেখার আইডিয়া"><span class="hints-title">কী লিখবেন বুঝতে পারছেন না? একটিতে চাপ দিন:</span>' +
      book.hints.map(function (hint, n) {
        return '<button type="button" class="hint" data-act="hint" data-index="' + index + '" data-hint="' + n + '">' + esc(hint.label) + '</button>';
      }).join('') + '</div>';
  }

  /** Put the hint's opening words at the end of the review box; the customer writes the rest. */
  function useHint(index, n, button) {
    var hint = ((state.data.books[index] || {}).hints || [])[n];
    var box = document.getElementById('abr-text' + index);
    if (!hint || !box) return;
    var text = box.value.replace(/\s+$/, '');
    box.value = (text ? text + '\n' : '') + hint.starter;
    button.classList.add('used');
    box.focus();
    box.setSelectionRange(box.value.length, box.value.length);
  }

  /** Keep what was typed when the page redraws. */
  function saveDrafts() {
    if (!state.data || !app) return;
    var nameField = document.getElementById('abr-name');
    if (nameField) state.name = nameField.value.trim();
    state.data.books.forEach(function (book, index) {
      var text = document.getElementById('abr-text' + index);
      if (!text) return;
      var checked = app.querySelector('input[name="abr-rating' + index + '"]:checked');
      state.drafts[index] = { rating: checked ? Number(checked.value) : 0, review: text.value };
    });
  }

  function render(editIndex) {
    if (!app) return;
    if (!token) { app.innerHTML = note('লিংকটি ঠিক নেই', 'WhatsApp মেসেজের লিংকটি আবার খুলুন।'); return; }
    if (state.error) { app.innerHTML = note('লিংকটি খোলা যাচ্ছে না', state.error); return; }
    var data = state.data;
    if (!data) { app.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>'; return; }
    saveDrafts();
    if (data.expired) {
      app.innerHTML = note('এই লিংকের মেয়াদ শেষ', 'বইয়ের পাতায় গিয়েও রিভিউ দিতে পারেন। নতুন বই দেখতে নিচে চাপুন।');
      return;
    }
    var first = String(data.name || '').split(' ')[0];
    app.innerHTML = '<h1>' + (first ? 'প্রিয় ' + esc(first) + ', ' : '') + 'বইগুলো কেমন লাগলো?</h1>' +
      '<p class="lead">আপনার সৎ মতামত অন্য পাঠকদের বই বাছতে সাহায্য করে। ভালো-মন্দ যা মনে হয়, লিখুন।' +
      (data.rewardOffered && !data.reward ? ' রিভিউ দিলেই পাবেন পরের অর্ডারে ছাড়ের কুপন।' : '') + '</p>' +
      rewardBox() +
      '<div class="card"><label class="small" for="abr-name">রিভিউতে আপনার নাম যেভাবে দেখাবে</label>' +
      '<input type="text" id="abr-name" maxlength="60" autocomplete="name" value="' + esc(state.name) + '"></div>' +
      data.books.map(function (book, index) { return bookCard(book, index, index === editIndex); }).join('') +
      loginBox();
    if (state.login.phase !== 'idle' && !loggedIn()) startTick();
  }

  function setStars(fieldset, value) {
    Array.prototype.forEach.call(fieldset.querySelectorAll('label'), function (label, n) {
      label.classList.toggle('on', n < value);
    });
    var word = document.getElementById('abr-word' + fieldset.getAttribute('data-index'));
    if (word) word.textContent = STAR_WORDS[value] || '';
  }

  /** Phone photos are large: shrink to 1280 px JPEG before the upload. */
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(function (blob) { blob ? resolve(blob) : reject(new Error('ছবিটি পড়া যায়নি।')); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('ছবিটি পড়া যায়নি।')); };
      img.src = url;
    });
  }

  function upload(index, file) {
    var error = document.getElementById('abr-error' + index);
    var preview = document.getElementById('abr-preview' + index);
    var send = app.querySelector('[data-act="send"][data-index="' + index + '"]');
    error.textContent = 'ছবি আপলোড হচ্ছে…';
    send.disabled = true;
    shrink(file).then(function (blob) {
      var form = new FormData();
      form.append('image', blob, 'review.jpg');
      return fetch(API + '/upload/single-image', { method: 'POST', body: form, credentials: 'omit' });
    }).then(function (response) {
      return response.json().then(function (json) {
        if (!response.ok || !json.url) throw new Error('ছবি আপলোড হয়নি। আবার চেষ্টা করুন।');
        return json.url;
      });
    }).then(function (url) {
      state.images[index] = url;
      preview.src = url;
      preview.hidden = false;
      app.querySelector('[data-act="photo-remove"][data-index="' + index + '"]').hidden = false;
      error.textContent = '';
    }).catch(function (problem) {
      error.textContent = problem.message || 'ছবি আপলোড হয়নি।';
    }).then(function () {
      send.disabled = false;
    });
  }

  function submit(index) {
    var book = state.data.books[index];
    var checked = app.querySelector('input[name="abr-rating' + index + '"]:checked');
    var text = document.getElementById('abr-text' + index).value.trim();
    var error = document.getElementById('abr-error' + index);
    var nameField = document.getElementById('abr-name');
    state.name = nameField ? nameField.value.trim() : state.name;
    if (!checked) { error.textContent = 'তারায় চাপ দিয়ে রেটিং দিন।'; return; }
    if (text.length < 2) { error.textContent = 'বইটি নিয়ে অন্তত এক লাইন লিখুন।'; return; }
    var send = app.querySelector('[data-act="send"][data-index="' + index + '"]');
    send.disabled = true;
    send.textContent = 'পাঠানো হচ্ছে…';
    error.textContent = '';
    var images = state.images[index] ? [state.images[index]] : [];
    api('', 'POST', { product: book.product, rating: Number(checked.value), review: text, name: state.name, images: images })
      .then(function (result) {
        book.review = { rating: Number(checked.value), review: text, images: images, approved: !!(result.data && result.data.already) };
        delete state.drafts[index];
        if (result.data && result.data.reward) state.data.reward = result.data.reward;
        render();
        var next = state.data.books.findIndex(function (other) { return !other.review; });
        var target = next >= 0 ? app.querySelector('.book[data-index="' + next + '"]')
          : (document.getElementById('abr-login') || app.querySelector('.reward') || app.querySelector('.book[data-index="' + index + '"]'));
        if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var phone = next < 0 && document.getElementById('abr-phone');
        if (phone) setTimeout(function () { phone.focus({ preventScroll: true }); }, 400);
      })
      .catch(function (problem) {
        send.disabled = false;
        send.textContent = 'রিভিউ পাঠান';
        error.textContent = problem.message;
      });
  }

  function onChange(event) {
    var target = event.target;
    if (target.type === 'radio' && target.name.indexOf('abr-rating') === 0) setStars(target.closest('.stars'), Number(target.value));
    if (target.type === 'file' && target.files && target.files[0]) {
      upload(Number(target.getAttribute('data-index')), target.files[0]);
      target.value = '';
    }
  }

  function onClick(event) {
    var button = event.target.closest('button');
    if (!button || !app.contains(button)) return;
    var act = button.getAttribute('data-act');
    var index = Number(button.getAttribute('data-index'));
    if (act === 'send') submit(index);
    if (act === 'send-code') sendCode(button);
    if (act === 'change-phone') { state.login.phase = 'idle'; state.login.error = ''; render(); }
    if (act === 'hint') useHint(index, Number(button.getAttribute('data-hint')), button);
    if (act === 'login') login();
    if (act === 'edit') {
      saveDrafts();
      var reviewed = state.data.books[index].review || {};
      if ((reviewed.images || [])[0]) state.images[index] = reviewed.images[0];
      render(index);
    }
    if (act === 'photo-remove') {
      delete state.images[index];
      var preview = document.getElementById('abr-preview' + index);
      preview.hidden = true;
      preview.removeAttribute('src');
      button.hidden = true;
    }
    if (act === 'copy') {
      var code = document.getElementById('abr-coupon').textContent;
      var done = function () { button.textContent = 'কপি হয়েছে ✓'; };
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, function () {});
      else done();
    }
  }

  function onKey(event) {
    if (event.key !== 'Enter' || !event.target) return;
    if (event.target.id === 'abr-code') login();
    if (event.target.id === 'abr-phone') sendCode(null);
  }

  /* ---------- Placing the page inside the storefront ---------- */

  function place() {
    var onRoute = location.pathname === ROUTE;
    document.documentElement.classList.toggle('ab-rate-on', onRoute);
    if (!onRoute) {
      if (root && root.parentNode) { saveDrafts(); root.parentNode.removeChild(root); }
      return;
    }
    var host = document.querySelector('app-extra-page-view .container') || document.querySelector('app-extra-page-view');
    if (!host) return;
    if (root && root.parentNode === host) return;
    if (!root) {
      root = document.createElement('div');
      root.id = 'ab-rate';
      root.innerHTML = '<div aria-live="polite"></div>';
      app = root.firstChild;
      app.addEventListener('change', onChange);
      app.addEventListener('click', onClick);
      app.addEventListener('keydown', onKey);
    }
    host.insertBefore(root, host.firstChild);
    document.title = 'বইয়ের রিভিউ | আমল বুকস';
    render();
  }

  var style = document.createElement('style');
  style.id = 'ab-rate-style';
  style.textContent = css;
  document.head.appendChild(style);

  // Drafts typed before the login's reload.
  try {
    var kept = JSON.parse(read('ab-order-review-drafts') || 'null');
    if (kept) {
      state.name = kept.name || '';
      state.drafts = kept.drafts || {};
      state.images = kept.images || {};
      sessionStorage.removeItem('ab-order-review-drafts');
    }
  } catch (_) {}

  var scheduled = false;
  new MutationObserver(function () {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () { scheduled = false; place(); }, 30);
  }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', place);
  place();

  if (token) {
    api('').then(function (json) {
      state.data = json.data;
      if (!state.name) state.name = String(json.data.name || '').trim();
      json.data.books.forEach(function (book, index) {
        var image = book.review && (book.review.images || [])[0];
        if (image && !state.images[index]) state.images[index] = image;
      });
      render();
    }).catch(function (problem) {
      state.error = problem.message;
      render();
    });
  }
})();
