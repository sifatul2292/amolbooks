(function () {
  'use strict';

  var API = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://apisub.amolbooks.com';

  var MODAL_ID = 'ai-assist-widget-modal';
  var BTN_ID = 'ai-assist-widget-btn';
  var injectTimer = null;

  /* ── Bangla digit → ASCII ── */
  var BN = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  function bnToEn(s) { return s.replace(/[০-৯]/g, function (d) { return BN[d]; }); }

  /* ── Phone helpers ── */
  function isPhoneLine(line) {
    var s = bnToEn(line).replace(/[\s\-().+]/g, '');
    if (s.startsWith('880') && s.length >= 12) {
      return /^0?1[3-9]\d{8}$/.test(s.slice(3));
    }
    return /^01[3-9]\d{8}$/.test(s) || /^1[3-9]\d{8}$/.test(s);
  }
  function normalizePhone(raw) {
    var s = bnToEn(raw).replace(/[\s\-().+]/g, '');
    if (s.startsWith('880') && s.length >= 12) {
      var local = s.slice(3);
      if (/^0?1[3-9]\d{8}$/.test(local)) return local.startsWith('0') ? local : '0' + local;
    }
    if (/^01[3-9]\d{8}$/.test(s)) return s;
    if (/^1[3-9]\d{8}$/.test(s)) return '0' + s;
    return s;
  }

  /* ── Price / Payment helpers ── */
  function isPriceLine(line) {
    var l = line.toLowerCase();
    return /ক্যাশ|cash|cod|delivery|bkash|বিকাশ|nagad|নগদ|টাকা|তাকা|\/-/.test(l)
      || (/\d/.test(bnToEn(line)) && /\/-|tk|taka/.test(l));
  }
  function detectPayment(line) {
    var l = line.toLowerCase();
    if (/ক্যাশ|cash on delivery|cod/.test(l)) return 'COD';
    if (/bkash|বিকাশ/.test(l)) return 'BKASH';
    if (/nagad|নগদ/.test(l)) return 'NAGAD';
    if (/online|ট্রান্সফার/.test(l)) return 'ONLINE';
    return 'COD';
  }
  function extractPrice(line) {
    var m = bnToEn(line).match(/(\d+)/g);
    return m ? m[m.length - 1] : '';
  }

  /* ── Parse raw WhatsApp text ── */
  function parseOrder(raw) {
    var lines = raw.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    var phone = '', remaining = [];
    lines.forEach(function (line) {
      if (!phone && isPhoneLine(line)) { phone = normalizePhone(line); }
      else { remaining.push(line); }
    });
    var paymentType = 'COD', price = '';
    var lastLine = lines[lines.length - 1];
    if (isPriceLine(lastLine)) {
      paymentType = detectPayment(lastLine);
      price = extractPrice(lastLine);
      remaining = remaining.filter(function (l) { return l !== lastLine; });
    }
    var name = remaining[0] || '';
    var address = (remaining[1] || '').replace(/[.,؟?!]+$/, '').trim();
    var product = remaining.slice(2).join(' | ');
    var city = '';
    if (address) {
      var parts = address.split(',');
      if (parts.length > 1) city = parts[parts.length - 1].trim().replace(/[.,؟?!]+$/, '');
    }
    var note = product ? product + (price ? ' — ৳' + price : '') : (price ? '৳' + price : '');
    return { phone: phone, name: name, address: address, city: city, paymentType: paymentType, note: note };
  }

  /* ── Auth header ── */
  function getAuthHeader() {
    return localStorage.getItem('adminTokenKey') || localStorage.getItem('co_admin_token') || '';
  }

  /* ── CSS ── */
  var CSS = [
    '#' + BTN_ID + ' {',
    '  display:inline-flex;align-items:center;gap:6px;',
    '  background:linear-gradient(135deg,#10b981,#059669);',
    '  color:#fff;border:none;border-radius:8px;',
    '  padding:8px 16px;font-size:13px;font-weight:700;',
    '  cursor:pointer;margin-right:8px;',
    '  font-family:inherit;transition:opacity .15s;',
    '}',
    '#' + BTN_ID + ':hover{opacity:.88;}',
    '#' + MODAL_ID + '-overlay {',
    '  position:fixed;inset:0;background:rgba(15,23,42,.7);',
    '  z-index:99999;display:none;align-items:center;justify-content:center;',
    '  padding:16px;backdrop-filter:blur(6px);',
    '}',
    '#' + MODAL_ID + '-overlay.open{display:flex;}',
    '#' + MODAL_ID + '-box {',
    '  background:#fff;border-radius:20px;width:100%;max-width:520px;',
    '  box-shadow:0 24px 64px rgba(0,0,0,.25);overflow:hidden;',
    '  animation:aiModalIn .22s cubic-bezier(.34,1.56,.64,1);',
    '}',
    '@keyframes aiModalIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}',
    '#' + MODAL_ID + '-header {',
    '  background:linear-gradient(135deg,#10b981,#059669);',
    '  padding:20px 24px;display:flex;align-items:center;gap:14px;',
    '}',
    '#' + MODAL_ID + '-header-icon {',
    '  width:44px;height:44px;border-radius:12px;',
    '  background:rgba(255,255,255,.2);display:flex;align-items:center;',
    '  justify-content:center;font-size:20px;color:#fff;flex-shrink:0;',
    '}',
    '#' + MODAL_ID + '-header h2{font-size:18px;font-weight:800;color:#fff;margin:0;}',
    '#' + MODAL_ID + '-header p{font-size:12px;color:rgba(255,255,255,.8);margin:2px 0 0;}',
    '#' + MODAL_ID + '-close {',
    '  margin-left:auto;background:rgba(255,255,255,.2);border:none;',
    '  width:32px;height:32px;border-radius:50%;color:#fff;font-size:18px;',
    '  cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;',
    '}',
    '#' + MODAL_ID + '-body{padding:24px;}',
    '.ai-w-step{display:none;} .ai-w-step.active{display:block;}',
    '.ai-w-label{font-size:13px;font-weight:700;color:#1e293b;margin-bottom:8px;display:block;}',
    '.ai-w-textarea {',
    '  width:100%;border:1.5px solid #e2e8f0;border-radius:12px;',
    '  padding:14px;font-size:14px;font-family:inherit;color:#1e293b;',
    '  resize:vertical;min-height:160px;outline:none;line-height:1.6;',
    '}',
    '.ai-w-textarea:focus{border-color:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.1);}',
    '.ai-w-hint{font-size:11.5px;color:#64748b;margin-top:8px;}',
    '.ai-w-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}',
    '.ai-w-grid.full{grid-template-columns:1fr;}',
    '.ai-w-field{display:flex;flex-direction:column;gap:5px;}',
    '.ai-w-field label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;}',
    '.ai-w-field input,.ai-w-field select,.ai-w-field textarea{',
    '  border:1.5px solid #e2e8f0;border-radius:8px;padding:9px 12px;',
    '  font-size:13.5px;font-family:inherit;color:#1e293b;outline:none;background:#fff;',
    '}',
    '.ai-w-field textarea{min-height:60px;resize:vertical;}',
    '#' + MODAL_ID + '-footer {',
    '  padding:16px 24px;border-top:1px solid #f1f5f9;',
    '  display:flex;gap:10px;justify-content:flex-end;',
    '}',
    '.ai-w-btn-extract {',
    '  display:flex;align-items:center;gap:8px;',
    '  background:#10b981;color:#fff;border:none;border-radius:100px;',
    '  padding:11px 22px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;',
    '}',
    '.ai-w-btn-extract:hover{background:#059669;}',
    '.ai-w-btn-create {',
    '  display:flex;align-items:center;gap:8px;',
    '  background:#7c3aed;color:#fff;border:none;border-radius:100px;',
    '  padding:11px 22px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;',
    '}',
    '.ai-w-btn-create:hover{background:#5b21b6;}',
    '.ai-w-btn-create:disabled{background:#94a3b8;cursor:not-allowed;}',
    '.ai-w-btn-sec {',
    '  background:#f1f5f9;color:#64748b;border:none;border-radius:100px;',
    '  padding:11px 20px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;',
    '}',
    '.ai-w-btn-sec:hover{background:#e2e8f0;}',
    '.ai-w-toast {',
    '  position:fixed;bottom:24px;right:24px;z-index:100000;',
    '  background:#1e293b;color:#fff;border-radius:12px;',
    '  padding:12px 18px;font-size:13px;font-weight:600;',
    '  display:none;align-items:center;gap:10px;',
    '  box-shadow:0 8px 32px rgba(0,0,0,.3);',
    '}',
    '.ai-w-toast.show{display:flex;}',
    '.ai-w-toast.success{background:rgba(5,150,105,.9);}',
    '.ai-w-toast.error{background:rgba(220,38,38,.9);}',
  ].join('\n');

  /* ── Build modal HTML ── */
  var MODAL_HTML = [
    '<div id="' + MODAL_ID + '-overlay">',
    '  <div id="' + MODAL_ID + '-box">',
    '    <div id="' + MODAL_ID + '-header">',
    '      <div id="' + MODAL_ID + '-header-icon">✨</div>',
    '      <div>',
    '        <h2>AI Assist</h2>',
    '        <p>Create order from WhatsApp / Facebook message</p>',
    '      </div>',
    '      <button id="' + MODAL_ID + '-close">✕</button>',
    '    </div>',
    '    <div id="' + MODAL_ID + '-body">',
    '      <div class="ai-w-step active" id="ai-w-step1">',
    '        <span class="ai-w-label">Paste the order message</span>',
    '        <textarea class="ai-w-textarea" id="ai-w-text" placeholder="Paste customer order from WhatsApp, Facebook, SMS..."></textarea>',
    '        <div class="ai-w-hint">✦ Understands Bangla, English & Banglish</div>',
    '      </div>',
    '      <div class="ai-w-step" id="ai-w-step2">',
    '        <div class="ai-w-grid">',
    '          <div class="ai-w-field"><label>Phone</label><input type="text" id="ai-w-phone"></div>',
    '          <div class="ai-w-field"><label>Name</label><input type="text" id="ai-w-name"></div>',
    '        </div>',
    '        <div class="ai-w-grid full">',
    '          <div class="ai-w-field"><label>Address</label><input type="text" id="ai-w-address"></div>',
    '        </div>',
    '        <div class="ai-w-grid">',
    '          <div class="ai-w-field"><label>City</label><input type="text" id="ai-w-city"></div>',
    '          <div class="ai-w-field"><label>Payment Type</label>',
    '            <select id="ai-w-payment">',
    '              <option value="COD">Cash on Delivery</option>',
    '              <option value="ONLINE">Online Payment</option>',
    '              <option value="BKASH">bKash</option>',
    '              <option value="NAGAD">Nagad</option>',
    '            </select>',
    '          </div>',
    '        </div>',
    '        <div class="ai-w-grid full">',
    '          <div class="ai-w-field"><label>Product / Note</label><textarea id="ai-w-note"></textarea></div>',
    '        </div>',
    '      </div>',
    '    </div>',
    '    <div id="' + MODAL_ID + '-footer">',
    '      <div id="ai-w-footer1" style="display:flex;gap:10px;width:100%;justify-content:flex-end">',
    '        <button class="ai-w-btn-sec" id="ai-w-cancel1">Cancel</button>',
    '        <button class="ai-w-btn-extract" id="ai-w-extract">✨ Extract Order</button>',
    '      </div>',
    '      <div id="ai-w-footer2" style="display:none;gap:10px;width:100%;justify-content:flex-end">',
    '        <button class="ai-w-btn-sec" id="ai-w-back">← Back</button>',
    '        <button class="ai-w-btn-sec" id="ai-w-cancel2">Cancel</button>',
    '        <button class="ai-w-btn-create" id="ai-w-create">+ Create Order</button>',
    '      </div>',
    '    </div>',
    '  </div>',
    '</div>',
    '<div class="ai-w-toast" id="ai-w-toast"></div>',
  ].join('');

  /* ── Toast ── */
  var toastTimer;
  function showToast(msg, type) {
    var el = document.getElementById('ai-w-toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'ai-w-toast show ' + (type || 'success');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3500);
  }

  /* ── Open / Close ── */
  function openModal() {
    document.getElementById('ai-w-text').value = '';
    document.getElementById('ai-w-step1').classList.add('active');
    document.getElementById('ai-w-step2').classList.remove('active');
    document.getElementById('ai-w-footer1').style.display = 'flex';
    document.getElementById('ai-w-footer2').style.display = 'none';
    document.getElementById(MODAL_ID + '-overlay').classList.add('open');
    setTimeout(function () { document.getElementById('ai-w-text').focus(); }, 120);
  }
  function closeModal() {
    document.getElementById(MODAL_ID + '-overlay').classList.remove('open');
  }

  /* ── Extract ── */
  function doExtract() {
    var raw = document.getElementById('ai-w-text').value.trim();
    if (!raw) { alert('Paste order text first'); return; }
    var d = parseOrder(raw);
    document.getElementById('ai-w-phone').value = d.phone;
    document.getElementById('ai-w-name').value = d.name;
    document.getElementById('ai-w-address').value = d.address;
    document.getElementById('ai-w-city').value = d.city;
    document.getElementById('ai-w-note').value = d.note;
    var sel = document.getElementById('ai-w-payment');
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === d.paymentType) { sel.selectedIndex = i; break; }
    }
    document.getElementById('ai-w-step1').classList.remove('active');
    document.getElementById('ai-w-step2').classList.add('active');
    document.getElementById('ai-w-footer1').style.display = 'none';
    document.getElementById('ai-w-footer2').style.display = 'flex';
  }

  /* ── Create order ── */
  function doCreate() {
    var btn = document.getElementById('ai-w-create');
    var phone = document.getElementById('ai-w-phone').value.trim();
    var name = document.getElementById('ai-w-name').value.trim();
    var address = document.getElementById('ai-w-address').value.trim();
    var city = document.getElementById('ai-w-city').value.trim();
    var paymentType = document.getElementById('ai-w-payment').value;
    var note = document.getElementById('ai-w-note').value.trim();

    if (!phone) { alert('Phone required'); return; }
    if (!name) { alert('Name required'); return; }
    if (!address) { alert('Address required'); return; }

    btn.disabled = true;
    btn.textContent = '⏳ Creating...';

    var token = getAuthHeader();
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['administrator'] = token;

    function reset() {
      btn.disabled = false;
      btn.textContent = '+ Create Order';
    }

    fetch(API + '/api/order/add', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ phoneNo: phone, name: name, shippingAddress: address, city: city, paymentType: paymentType, adminNote: note })
    })
      .then(function (r) {
        return r.json().then(function (res) { return { ok: r.ok, status: r.status, res: res }; });
      })
      .then(function (d) {
        reset();
        if (d.ok && d.res && d.res.success !== false) {
          var orderId = (d.res.data && d.res.data.orderId) || d.res.orderId || '';
          showToast('Order' + (orderId ? ' #' + orderId : '') + ' created!', 'success');
          closeModal();
        } else {
          showToast((d.res && d.res.message) || ('Error ' + d.status), 'error');
        }
      })
      .catch(function (err) {
        reset();
        showToast('Failed: ' + (err.message || err), 'error');
      });
  }

  /* ── Wire events ── */
  function wireEvents() {
    document.getElementById(MODAL_ID + '-close').addEventListener('click', closeModal);
    document.getElementById('ai-w-cancel1').addEventListener('click', closeModal);
    document.getElementById('ai-w-cancel2').addEventListener('click', closeModal);
    document.getElementById('ai-w-extract').addEventListener('click', doExtract);
    document.getElementById('ai-w-back').addEventListener('click', function () {
      document.getElementById('ai-w-step2').classList.remove('active');
      document.getElementById('ai-w-step1').classList.add('active');
      document.getElementById('ai-w-footer2').style.display = 'none';
      document.getElementById('ai-w-footer1').style.display = 'flex';
    });
    document.getElementById('ai-w-create').addEventListener('click', doCreate);
    document.getElementById(MODAL_ID + '-overlay').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });
  }

  /* ── Inject modal + styles once ── */
  function injectModal() {
    if (document.getElementById(MODAL_ID + '-overlay')) return;
    var styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);
    var div = document.createElement('div');
    div.innerHTML = MODAL_HTML;
    while (div.firstChild) document.body.appendChild(div.firstChild);
    wireEvents();
  }

  /* ── Inject AI Assist button near "Add Order" ── */
  function tryInjectBtn() {
    if (document.getElementById(BTN_ID)) return;

    /* Find "Add Order" button on the page */
    var addBtn = null;
    var allBtns = document.querySelectorAll('button, a');
    allBtns.forEach(function (el) {
      if (!addBtn) {
        var text = (el.textContent || el.innerText || '').trim();
        if (text === 'Add Order' || text === '+ Add Order' || text.includes('Add Order')) {
          addBtn = el;
        }
      }
    });
    if (!addBtn) return;

    injectModal();

    var btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.innerHTML = '✨ AI Assist';
    btn.addEventListener('click', openModal);

    /* Insert before the Add Order button */
    var parent = addBtn.parentElement;
    if (parent) {
      parent.insertBefore(btn, addBtn);
    }
  }

  /* ── Watcher ── */
  function startWatcher() {
    tryInjectBtn();
    var observer = new MutationObserver(function () {
      if (!document.getElementById(BTN_ID)) {
        clearTimeout(injectTimer);
        injectTimer = setTimeout(tryInjectBtn, 300);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startWatcher);
  } else {
    startWatcher();
  }

  [500, 1000, 2000, 3000, 5000].forEach(function (d) { setTimeout(tryInjectBtn, d); });

})();
