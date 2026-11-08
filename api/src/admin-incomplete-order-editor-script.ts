export const ADMIN_INCOMPLETE_ORDER_EDITOR_SCRIPT = String.raw`
(function (root) {
  'use strict';

  if (!root.document || root.AmolbooksIncompleteEditor) return;

  var document = root.document;
  var API = root.location.origin;
  var items = [];
  var currentId = '';
  var currentMode = 'incomplete';
  var currentOrder = null;
  var lastFocus = null;
  var searchTimer = null;
  var searchController = null;
  // A coupon used at checkout stays as it is; the Discount box is anything on top.
  var couponDiscount = 0;

  var CSS = [
    '.ie-overlay{position:fixed;inset:0;z-index:12500;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.72);backdrop-filter:blur(5px)}',
    '.ie-overlay.open{display:flex}.ie-dialog{width:min(820px,100%);max-height:94vh;display:flex;flex-direction:column;overflow:hidden;border-radius:18px;background:#fff;box-shadow:0 28px 80px rgba(15,23,42,.35)}',
    '.ie-header{display:flex;align-items:center;gap:12px;padding:18px 22px;background:linear-gradient(135deg,#6d28d9,#4c1d95);color:#fff}.ie-header h2{margin:0;font-size:19px}.ie-header p{margin:3px 0 0;color:#ddd6fe;font-size:12px}.ie-close{margin-left:auto;width:44px;height:44px;border:0;border-radius:50%;background:rgba(255,255,255,.16);color:#fff;font-size:20px;cursor:pointer}',
    '.ie-body{min-height:0;overflow:auto;padding:22px}.ie-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-bottom:13px}.ie-grid.full{grid-template-columns:1fr}.ie-label{display:block;margin-bottom:6px;color:#475569;font-size:11px;font-weight:800;letter-spacing:.045em;text-transform:uppercase}',
    '.ie-control{width:100%;min-height:44px;border:1.5px solid #dbe3ed;border-radius:10px;padding:9px 11px;background:#fff;color:#172033;font:500 14px/1.4 inherit}.ie-control:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.12);outline:none}.ie-control[aria-invalid="true"]{border-color:#dc2626}',
    '.ie-search-row{display:grid;grid-template-columns:1fr auto;gap:8px}.ie-results{display:none;max-height:180px;overflow:auto;margin-top:7px;border:1px solid #dbe3ed;border-radius:10px}.ie-results.open{display:block}.ie-result{display:flex;width:100%;justify-content:space-between;gap:12px;padding:11px;border:0;border-bottom:1px solid #eef2f7;background:#fff;text-align:left;cursor:pointer}.ie-result:hover{background:#f8fafc}.ie-result:last-child{border-bottom:0}.ie-result strong{color:#6d28d9;white-space:nowrap}',
    '.ie-button{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:7px;border:0;border-radius:999px;padding:10px 18px;background:#6d28d9;color:#fff;font:800 13px/1 inherit;cursor:pointer}.ie-button:hover{background:#5b21b6}.ie-button.secondary{background:#eef2f7;color:#475569}.ie-button:disabled{cursor:wait;opacity:.6}',
    '.ie-items{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}.ie-empty{padding:22px;color:#94a3b8;text-align:center}.ie-item{display:grid;grid-template-columns:minmax(0,1fr) 100px 76px 44px;align-items:end;gap:9px;padding:11px;border-bottom:1px solid #eef2f7}.ie-item:last-child{border-bottom:0}.ie-item-name{align-self:center;min-width:0;color:#172033;font-size:13px;font-weight:750;overflow-wrap:anywhere}.ie-small-label{display:block;margin-bottom:4px;color:#64748b;font-size:10px;font-weight:700}.ie-item input{width:100%;min-height:44px;border:1px solid #dbe3ed;border-radius:8px;padding:7px;text-align:center}.ie-remove{width:44px;height:44px;border:0;border-radius:8px;background:#fee2e2;color:#b91c1c;font-size:18px;cursor:pointer}',
    '.ie-totals{display:flex;justify-content:flex-end;gap:18px;margin-top:12px;color:#64748b;font-size:12px}.ie-totals strong{display:block;margin-top:2px;color:#172033;font-size:16px}.ie-status{min-height:18px;margin:10px 0 0;color:#64748b;font-size:12px}.ie-status.error{color:#b91c1c}.ie-status.success{color:#047857}',
    '.ie-footer{display:flex;justify-content:flex-end;gap:9px;padding:15px 22px;border-top:1px solid #eef2f7}',
    '.ie-grid.three{grid-template-columns:1.3fr 1fr 1fr}.ie-tag{display:inline-block;margin-right:6px;padding:1px 7px;border-radius:999px;background:#ede9fe;color:#6d28d9;font-size:10px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;vertical-align:1px}.ie-tag.off{background:#f1f5f9;color:#64748b}',
    '.ie-result-group{padding:7px 11px;background:#f8fafc;border-bottom:1px solid #eef2f7;color:#64748b;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}.ie-totals .ie-minus strong{color:#047857}.ie-totals [hidden]{display:none}',
    '@media(max-width:620px){.ie-overlay{align-items:flex-end;padding:0}.ie-dialog{max-height:97vh;border-radius:18px 18px 0 0}.ie-body{padding:16px}.ie-grid,.ie-grid.three{grid-template-columns:1fr}.ie-totals{flex-wrap:wrap;gap:10px 16px}.ie-item{grid-template-columns:minmax(0,1fr) 82px 64px 44px}.ie-header,.ie-footer{padding:14px 16px}.ie-footer{display:grid;grid-template-columns:1fr 1fr}.ie-button{padding:9px 12px}}'
  ].join('\n');

  var HTML = [
    '<div class="ie-overlay" id="ie-overlay" aria-hidden="true">',
    '<section class="ie-dialog" role="dialog" aria-modal="true" aria-labelledby="ie-title">',
    '<header class="ie-header"><div><h2 id="ie-title">Edit incomplete order</h2><p id="ie-subtitle">Changes will be used when this order is added or sent to courier.</p></div><button class="ie-close" id="ie-close" type="button" aria-label="Close">&times;</button></header>',
    '<div class="ie-body">',
    '<div class="ie-grid"><div><label class="ie-label" for="ie-name">Customer name</label><input class="ie-control" id="ie-name" autocomplete="name"></div><div><label class="ie-label" for="ie-phone">Phone</label><input class="ie-control" id="ie-phone" inputmode="tel" autocomplete="tel"></div></div>',
    '<div class="ie-grid full"><div><label class="ie-label" for="ie-address">Shipping address</label><input class="ie-control" id="ie-address" autocomplete="street-address"></div></div>',
    '<div class="ie-grid"><div><label class="ie-label" for="ie-city">City / area</label><input class="ie-control" id="ie-city" autocomplete="address-level2"></div><div><label class="ie-label" for="ie-email">Email (optional)</label><input class="ie-control" id="ie-email" type="email" autocomplete="email"></div></div>',
    '<div class="ie-grid three"><div><label class="ie-label" for="ie-payment">Payment type</label><select class="ie-control" id="ie-payment"><option value="cash_on_delivery">Cash on Delivery</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="card">Card</option><option value="online_payment">Online payment</option></select></div><div><label class="ie-label" for="ie-delivery">Delivery charge (৳)</label><input class="ie-control" id="ie-delivery" type="number" min="0" step="1" inputmode="decimal"></div><div><label class="ie-label" for="ie-discount">Discount (৳)</label><input class="ie-control" id="ie-discount" type="number" min="0" step="1" inputmode="decimal" placeholder="0"></div></div>',
    '<div class="ie-grid full"><div><label class="ie-label" for="ie-search">Add books or packages</label><div class="ie-search-row"><input class="ie-control" id="ie-search" autocomplete="off" placeholder="Search book or package name…"><button class="ie-button" id="ie-search-button" type="button"><i class="fas fa-search"></i> Search</button></div><div class="ie-results" id="ie-results"></div></div></div>',
    '<span class="ie-label">Books, packages, unit prices and quantities</span><div class="ie-items" id="ie-items"></div><div class="ie-totals"><span>Products<strong id="ie-subtotal">৳0</strong></span><span>Delivery<strong id="ie-delivery-total">৳0</strong></span><span class="ie-minus" id="ie-coupon-box" hidden>Coupon<strong id="ie-coupon-total">−৳0</strong></span><span class="ie-minus" id="ie-discount-box">Discount<strong id="ie-discount-total">−৳0</strong></span><span>Total<strong id="ie-grand-total">৳0</strong></span></div>',
    '<div class="ie-grid full" style="margin-top:15px"><div><label class="ie-label" for="ie-note">Customer note</label><textarea class="ie-control" id="ie-note" rows="2"></textarea></div></div>',
    '<p class="ie-status" id="ie-status" role="status" aria-live="polite"></p></div>',
    '<footer class="ie-footer"><button class="ie-button secondary" id="ie-cancel" type="button">Cancel</button><button class="ie-button" id="ie-save" type="button"><i class="fas fa-save"></i> Save changes</button></footer>',
    '</section></div>'
  ].join('');

  function byId(id) { return document.getElementById(id); }
  function token() { return root.localStorage.getItem('co_admin_token') || ''; }
  function headers() { return { 'Content-Type': 'application/json', administrator: token() }; }
  function setStatus(message, type) { var el = byId('ie-status'); el.textContent = message || ''; el.className = 'ie-status' + (type ? ' ' + type : ''); }
  function number(value) { var parsed = Number(value); return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0; }
  function itemPrice(item) {
    var regular = number(item.regularPrice || item.price || item.salePrice);
    var discount = number(item.discountAmount);
    var type = String(item.discountType || '').toUpperCase();
    if ((type === 'PERCENTAGE' || type === '1') && discount) return Math.floor(regular - (discount / 100) * regular);
    if ((type === 'CASH' || type === '2') && discount) return Math.floor(regular - discount);
    return number(item.unitPrice || item.salePrice || regular);
  }
  function quantity(item) { return Math.max(1, parseInt(item.editQty || item.quantity || item.selectedQty || 1, 10) || 1); }
  function normalizePayment(value) {
    var payment = String(value || 'cash_on_delivery').toLowerCase();
    return payment === 'cod' ? 'cash_on_delivery' : payment;
  }
  function parseResponse(response) {
    return response.text().then(function (text) {
      var payload = {};
      try { payload = text ? JSON.parse(text) : {}; } catch (error) { payload = { message: text || 'Unexpected server response' }; }
      if (!response.ok || payload.success === false) throw new Error(payload.message || 'Request failed (HTTP ' + response.status + ')');
      return payload;
    });
  }
  function totals() {
    var subtotal = items.reduce(function (sum, item) { return sum + number(item.editPrice) * quantity(item); }, 0);
    var delivery = number(byId('ie-delivery').value);
    var discount = number(byId('ie-discount').value);
    var grand = subtotal + delivery - couponDiscount - discount;
    byId('ie-subtotal').textContent = '৳' + subtotal.toLocaleString();
    byId('ie-delivery-total').textContent = '৳' + delivery.toLocaleString();
    byId('ie-coupon-box').hidden = !couponDiscount;
    byId('ie-coupon-total').textContent = '−৳' + couponDiscount.toLocaleString();
    byId('ie-discount-total').textContent = '−৳' + discount.toLocaleString();
    byId('ie-grand-total').textContent = (grand < 0 ? '−৳' : '৳') + Math.abs(grand).toLocaleString();
    return { subTotal: subtotal, deliveryCharge: delivery, discount: discount, grandTotal: grand };
  }
  function renderItems() {
    var box = byId('ie-items');
    box.innerHTML = '';
    if (!items.length) { box.innerHTML = '<div class="ie-empty">No products selected. Search above to add one.</div>'; totals(); return; }
    items.forEach(function (item, index) {
      var row = document.createElement('div'); row.className = 'ie-item';
      var name = document.createElement('div'); name.className = 'ie-item-name'; name.textContent = item.name || item.nameEn || 'Unnamed product';
      if (item.isPackage) name.insertAdjacentHTML('afterbegin', '<span class="ie-tag">Package</span>');
      var priceWrap = document.createElement('label'); priceWrap.innerHTML = '<span class="ie-small-label">Unit price (৳)</span>';
      var price = document.createElement('input'); price.type = 'number'; price.min = '0'; price.step = '1'; price.value = item.editPrice; price.setAttribute('aria-label', 'Unit price for ' + name.textContent);
      price.addEventListener('input', function () { item.editPrice = number(price.value); totals(); }); priceWrap.appendChild(price);
      var qtyWrap = document.createElement('label'); qtyWrap.innerHTML = '<span class="ie-small-label">Quantity</span>';
      var qty = document.createElement('input'); qty.type = 'number'; qty.min = '1'; qty.step = '1'; qty.value = quantity(item); qty.setAttribute('aria-label', 'Quantity for ' + name.textContent);
      qty.addEventListener('input', function () { item.editQty = Math.max(1, parseInt(qty.value, 10) || 1); totals(); }); qtyWrap.appendChild(qty);
      var remove = document.createElement('button'); remove.type = 'button'; remove.className = 'ie-remove'; remove.innerHTML = '&times;'; remove.setAttribute('aria-label', 'Remove ' + name.textContent);
      remove.addEventListener('click', function () { items.splice(index, 1); renderItems(); });
      row.append(name, priceWrap, qtyWrap, remove); box.appendChild(row);
    });
    totals();
  }
  function addItem(line) {
    var id = String(line._id || '');
    var existing = items.find(function (item) { return String(item._id) === id; });
    if (existing) existing.editQty = quantity(existing) + 1;
    else items.push(Object.assign({}, line, { editPrice: itemPrice(line), editQty: 1 }));
    byId('ie-search').value = ''; byId('ie-results').classList.remove('open'); renderItems();
  }
  // A package line is saved like a checkout order saves it: the package ID and
  // name, priced from its books (server-calculated) less the package discount.
  function packageLine(pkg) {
    var total = number(pkg.salePrice);
    return {
      _id: pkg._id, name: pkg.name, nameEn: pkg.nameEn, slug: pkg.slug, image: pkg.image || null,
      discountType: pkg.discountType, discountAmount: pkg.discountAmount,
      regularPrice: total, salePrice: total, orderType: 'regular', isPackage: true
    };
  }
  function resultButton(name, tagHtml, priceValue, onPick) {
    var button = document.createElement('button'); button.type = 'button'; button.className = 'ie-result';
    var label = document.createElement('span'); label.textContent = name;
    if (tagHtml) label.insertAdjacentHTML('afterbegin', tagHtml);
    var price = document.createElement('strong'); price.textContent = '৳' + priceValue.toLocaleString();
    button.append(label, price); button.addEventListener('click', onPick);
    return button;
  }
  function renderResults(packages, products) {
    var box = byId('ie-results'); box.innerHTML = ''; box.classList.add('open');
    if (!packages.length && !products.length) { box.innerHTML = '<div class="ie-empty">No books or packages found.</div>'; return; }
    if (packages.length) {
      box.insertAdjacentHTML('beforeend', '<div class="ie-result-group">Packages</div>');
      packages.forEach(function (pkg) {
        var line = packageLine(pkg);
        var tag = '<span class="ie-tag">Package</span>' + (pkg.active === false ? '<span class="ie-tag off">Not on site</span>' : '');
        box.appendChild(resultButton(pkg.name || 'Unnamed package', tag, itemPrice(line), function () { addItem(line); }));
      });
      if (products.length) box.insertAdjacentHTML('beforeend', '<div class="ie-result-group">Books</div>');
    }
    products.forEach(function (product) {
      box.appendChild(resultButton(product.name || product.nameEn || 'Unnamed product', '', itemPrice(product), function () { addItem(product); }));
    });
  }
  function escapeRegex(text) { return text.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&'); }
  // Packages whose name matches (up to 6), with their current price from the server.
  function searchPackages(query, signal) {
    return fetch(API + '/api/special-package/get-all?q=' + encodeURIComponent(escapeRegex(query)) + '&_=' + Date.now(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: signal,
      body: JSON.stringify({ sort: { createdAt: -1 }, select: { name: 1 } })
    }).then(parseResponse).then(function (payload) {
      var ids = (Array.isArray(payload.data) ? payload.data : []).slice(0, 6).map(function (pkg) { return String(pkg._id); });
      if (!ids.length) return [];
      return fetch(API + '/api/special-package/get-products-by-ids', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: signal, body: JSON.stringify({ ids: ids })
      }).then(parseResponse).then(function (result) {
        var list = Array.isArray(result.data) ? result.data : [];
        return ids.map(function (id) { return list.find(function (pkg) { return String(pkg._id) === id; }); }).filter(Boolean);
      });
    }).catch(function (error) { if (error.name === 'AbortError') throw error; return []; });
  }
  function search() {
    var query = byId('ie-search').value.trim(); var box = byId('ie-results');
    if (query.length < 2) { box.classList.remove('open'); box.innerHTML = ''; return; }
    if (searchController) searchController.abort(); searchController = new AbortController();
    box.classList.add('open'); box.innerHTML = '<div class="ie-empty">Searching…</div>';
    var packagesRequest = searchPackages(query, searchController.signal);
    fetch(API + '/api/product/get-all?q=' + encodeURIComponent(query) + '&_=' + Date.now(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: searchController.signal,
      body: JSON.stringify({
        filter: { salePrice: { $gte: 0 } },
        pagination: { pageSize: 12, currentPage: 0 },
        sort: { createdAt: -1 },
        select: {
          name: 1, nameEn: 1, slug: 1, salePrice: 1, images: 1,
          discountType: 1, discountAmount: 1, author: 1, category: 1,
          subCategory: 1, publisher: 1, brand: 1, unit: 1
        }
      })
    }).then(parseResponse).then(function (payload) {
      return packagesRequest.then(function (packages) {
        renderResults(packages, Array.isArray(payload.data) ? payload.data : []);
      });
    }).catch(function (error) {
      if (error.name !== 'AbortError') box.innerHTML = '<div class="ie-empty">' + String(error.message || 'Search failed') + '</div>';
    });
  }
  function close() {
    byId('ie-overlay').classList.remove('open'); byId('ie-overlay').setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function open(id, mode) {
    if (!id) return; currentId = id; currentMode = mode === 'order' ? 'order' : 'incomplete'; currentOrder = null; lastFocus = document.activeElement; items = []; couponDiscount = 0; byId('ie-discount').value = ''; renderItems(); setStatus('Loading order…');
    byId('ie-title').textContent = currentMode === 'order' ? 'Edit order' : 'Edit incomplete order';
    byId('ie-subtitle').textContent = currentMode === 'order' ? 'Changes apply immediately to this order.' : 'Changes will be used when this order is added or sent to courier.';
    byId('ie-overlay').classList.add('open'); byId('ie-overlay').setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
    var path = currentMode === 'order' ? '/api/order/' : '/api/order/incomplete/';
    fetch(API + path + encodeURIComponent(id), { headers: headers() }).then(parseResponse).then(function (payload) {
      var order = payload.data;
      if (!order) throw new Error(currentMode === 'order' ? 'Order was not found.' : 'Incomplete order was not found.');
      if (currentMode === 'incomplete' && order.status === 'converted') throw new Error('Converted orders can no longer be edited here.');
      currentOrder = order;
      byId('ie-name').value = order.name || ''; byId('ie-phone').value = order.phoneNo || ''; byId('ie-address').value = order.shippingAddress || '';
      byId('ie-city').value = order.city || ''; byId('ie-email').value = order.email || ''; byId('ie-payment').value = normalizePayment(order.paymentType);
      if (!byId('ie-payment').value) byId('ie-payment').value = 'cash_on_delivery';
      byId('ie-delivery').value = number(order.deliveryCharge); byId('ie-note').value = order.note || '';
      items = (Array.isArray(order.orderedItems) ? order.orderedItems : []).map(function (item) { return Object.assign({}, item, { editPrice: itemPrice(item), editQty: quantity(item) }); });
      // The Discount box starts with whatever the saved total already takes off
      // the books and delivery (apart from a coupon, shown on its own line).
      couponDiscount = number(order.couponDiscount);
      var before = totals();
      var saved = order.grandTotal == null || order.grandTotal === '' ? NaN : Number(order.grandTotal);
      var extra = Number.isFinite(saved) ? Math.round(before.subTotal + before.deliveryCharge - couponDiscount - saved) : 0;
      byId('ie-discount').value = extra > 0 ? extra : '';
      renderItems(); setStatus(''); byId('ie-name').focus();
    }).catch(function (error) { setStatus(error.message || 'Could not load order.', 'error'); });
  }
  function validate() {
    var fields = [['ie-name', 'Customer name is required.'], ['ie-phone', 'Phone number is required.'], ['ie-address', 'Shipping address is required.']];
    fields.forEach(function (entry) { byId(entry[0]).setAttribute('aria-invalid', byId(entry[0]).value.trim() ? 'false' : 'true'); });
    var missing = fields.find(function (entry) { return !byId(entry[0]).value.trim(); });
    if (missing) { setStatus(missing[1], 'error'); byId(missing[0]).focus(); return false; }
    if (!items.length) { setStatus('Select at least one book or package.', 'error'); byId('ie-search').focus(); return false; }
    if (totals().grandTotal < 0) { setStatus('Discount is more than the order total.', 'error'); byId('ie-discount').setAttribute('aria-invalid', 'true'); byId('ie-discount').focus(); return false; }
    byId('ie-discount').setAttribute('aria-invalid', 'false');
    return true;
  }
  function save() {
    if (!validate()) return;
    var computed = totals();
    var orderedItems = items.map(function (item) {
      var price = number(item.editPrice); var qty = quantity(item); var output = Object.assign({}, item);
      delete output.editPrice; delete output.editQty; delete output.selectedQty;
      output.quantity = qty; output.regularPrice = price; output.unitPrice = price; output.salePrice = price;
      output.discountAmount = 0; output.discountType = 2; output.orderType = output.orderType || 'regular';
      return output;
    });
    var payload = {
      name: byId('ie-name').value.trim(), phoneNo: byId('ie-phone').value.trim(), shippingAddress: byId('ie-address').value.trim(),
      city: byId('ie-city').value.trim(), email: byId('ie-email').value.trim(), paymentType: byId('ie-payment').value,
      paymentStatus: currentMode === 'order' ? (currentOrder && currentOrder.paymentStatus || 'unpaid') : 'unpaid', deliveryCharge: computed.deliveryCharge, subTotal: computed.subTotal, discount: computed.discount,
      grandTotal: computed.grandTotal, orderedItems: orderedItems, note: byId('ie-note').value.trim()
    };
    var button = byId('ie-save'); button.disabled = true; button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…'; setStatus('');
    var path = currentMode === 'order' ? '/api/order/update-order-admin/' : '/api/order/update-incomplete-order-admin/';
    fetch(API + path + encodeURIComponent(currentId), { method: 'PUT', headers: headers(), body: JSON.stringify(payload) })
      .then(parseResponse).then(function () { setStatus('Changes saved. Refreshing the order list…', 'success'); root.setTimeout(function () { root.location.reload(); }, 450); })
      .catch(function (error) { setStatus(error.message || 'Could not save changes.', 'error'); button.disabled = false; button.innerHTML = '<i class="fas fa-save"></i> Save changes'; });
  }

  var style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  document.body.insertAdjacentHTML('beforeend', HTML);
  byId('ie-close').addEventListener('click', close); byId('ie-cancel').addEventListener('click', close); byId('ie-save').addEventListener('click', save);
  byId('ie-search-button').addEventListener('click', search); byId('ie-search').addEventListener('input', function () { clearTimeout(searchTimer); searchTimer = setTimeout(search, 320); });
  byId('ie-search').addEventListener('keydown', function (event) { if (event.key === 'Enter') { event.preventDefault(); search(); } });
  byId('ie-delivery').addEventListener('input', totals); byId('ie-discount').addEventListener('input', totals); byId('ie-overlay').addEventListener('click', function (event) { if (event.target === this) close(); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && byId('ie-overlay').classList.contains('open')) close(); });
  root.AmolbooksIncompleteEditor = { open: open, openOrder: function (id) { open(id, 'order'); }, close: close };
})(window);
`;
