(function () {
  'use strict';

  var pendingImages = [];
  var injected = false;

  // Map: reviewer name (lowercase) -> images[]
  // Also keyed by review text snippet for better matching
  var reviewImagesMap = {};

  // ─── XHR intercept ───────────────────────────────────────────────────────────

  var origOpen = XMLHttpRequest.prototype.open;
  var origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._riu_url = url;
    this._riu_method = method;

    // Intercept review list responses to cache images
    var self = this;
    this.addEventListener('load', function () {
      var u = self._riu_url || '';
      if (
        u.indexOf('/review/') !== -1 &&
        u.indexOf('/review/add') === -1 &&
        (self.status === 200 || self.status === 201)
      ) {
        try {
          var res = JSON.parse(self.responseText);
          var list = res.data || res.reviews || res;
          if (Array.isArray(list)) {
            list.forEach(function (r) {
              if (r.images && r.images.length) {
                var name = ((r.user && r.user.name) || r.userName || r.name || '').toLowerCase().trim();
                var text = (r.review || '').substring(0, 40).toLowerCase().trim();
                if (name) reviewImagesMap[name] = r.images;
                if (text) reviewImagesMap[text] = r.images;
              }
            });
            // Retry injecting now that we have data
            setTimeout(injectReviewImages, 300);
          }
        } catch (e) {}
      }
    });

    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    // Inject images into review/add request body
    if (
      this._riu_url &&
      this._riu_url.toString().indexOf('/review/add') !== -1 &&
      this._riu_method &&
      this._riu_method.toUpperCase() === 'POST' &&
      pendingImages.length > 0 &&
      body &&
      typeof body === 'string'
    ) {
      try {
        var data = JSON.parse(body);
        data.images = pendingImages.slice();
        body = JSON.stringify(data);
        pendingImages = [];
        injected = false;
        resetUploadUI();
      } catch (e) {}
    }
    return origSend.call(this, body);
  };

  // ─── Fetch intercept ─────────────────────────────────────────────────────────

  var origFetch = window.fetch;
  window.fetch = function (url, options) {
    var urlStr = url && url.toString ? url.toString() : String(url);

    // Intercept outgoing review/add to inject images
    if (
      urlStr.indexOf('/review/add') !== -1 &&
      options &&
      options.method &&
      options.method.toUpperCase() === 'POST' &&
      pendingImages.length > 0 &&
      options.body &&
      typeof options.body === 'string'
    ) {
      try {
        var d = JSON.parse(options.body);
        d.images = pendingImages.slice();
        options = Object.assign({}, options, { body: JSON.stringify(d) });
        pendingImages = [];
        injected = false;
        resetUploadUI();
      } catch (e) {}
    }

    // Intercept review list response to cache images
    if (urlStr.indexOf('/review/') !== -1 && urlStr.indexOf('/review/add') === -1) {
      return origFetch.apply(this, arguments).then(function (response) {
        var clone = response.clone();
        clone.json().then(function (res) {
          var list = res.data || res.reviews || res;
          if (Array.isArray(list)) {
            list.forEach(function (r) {
              if (r.images && r.images.length) {
                var name = ((r.user && r.user.name) || r.userName || r.name || '').toLowerCase().trim();
                var text = (r.review || '').substring(0, 40).toLowerCase().trim();
                if (name) reviewImagesMap[name] = r.images;
                if (text) reviewImagesMap[text] = r.images;
              }
            });
            setTimeout(injectReviewImages, 300);
          }
        }).catch(function () {});
        return response;
      });
    }

    return origFetch.apply(this, arguments);
  };

  // ─── Display: inject images into rendered review cards ───────────────────────

  function injectReviewImages() {
    if (!Object.keys(reviewImagesMap).length) return;

    // Strategy: find all elements with text "(Verified Purchase)"
    // walk up to find card root, find reviewer name sibling, match to map
    var allEls = document.querySelectorAll('*');
    for (var i = 0; i < allEls.length; i++) {
      var el = allEls[i];
      if (
        el.children.length === 0 &&
        el.textContent &&
        el.textContent.trim() === '(Verified Purchase)'
      ) {
        processReviewCard(el);
      }
    }
  }

  function processReviewCard(verifiedBadge) {
    // Walk up to find card container (stop at body)
    var card = verifiedBadge.parentElement;
    var depth = 0;
    while (card && card !== document.body && depth < 8) {
      // Card likely has multiple children (avatar, name, stars, text)
      if (card.children.length >= 3) break;
      card = card.parentElement;
      depth++;
    }
    if (!card || card === document.body) return;
    if (card.dataset.riuDone) return;

    // Find reviewer name: look for text near the badge going up/sideways
    var nameEl = findReviewerName(card, verifiedBadge);
    var reviewTextEl = findReviewText(card);

    if (!nameEl && !reviewTextEl) return;

    var nameKey = nameEl ? nameEl.textContent.toLowerCase().trim() : '';
    var textKey = reviewTextEl ? reviewTextEl.textContent.substring(0, 40).toLowerCase().trim() : '';

    var images = reviewImagesMap[nameKey] || reviewImagesMap[textKey];
    if (!images || !images.length) return;

    card.dataset.riuDone = '1';

    // Inject image strip at bottom of card
    var strip = document.createElement('div');
    strip.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid #e0e0e0;';

    images.forEach(function (url) {
      var img = document.createElement('img');
      img.src = url;
      img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #ddd;cursor:pointer;';
      img.addEventListener('click', function () { openLightbox(url, images); });
      strip.appendChild(img);
    });

    // Insert after reviewTextEl if found, else append to card
    if (reviewTextEl && reviewTextEl.parentElement) {
      reviewTextEl.parentElement.insertBefore(strip, reviewTextEl.nextSibling);
    } else {
      card.appendChild(strip);
    }
  }

  function findReviewerName(card, badge) {
    // Name is typically a heading/strong near the badge — search card descendants
    var candidates = card.querySelectorAll('h1,h2,h3,h4,h5,h6,strong,b,span,p');
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (c === badge) continue;
      var t = c.textContent.trim();
      // Name: short text (2-50 chars), not "(Verified Purchase)", not all digits/stars
      if (
        t.length >= 2 &&
        t.length <= 50 &&
        t !== '(Verified Purchase)' &&
        !/^[\d★☆✓\s]+$/.test(t) &&
        c.children.length === 0
      ) {
        // Check it's in reviewImagesMap
        if (reviewImagesMap[t.toLowerCase()]) return c;
      }
    }
    // Fallback: return first short text element that could be a name
    for (var j = 0; j < candidates.length; j++) {
      var cc = candidates[j];
      if (cc === badge) continue;
      var tt = cc.textContent.trim();
      if (tt.length >= 2 && tt.length <= 50 && tt !== '(Verified Purchase)' && cc.children.length === 0) {
        return cc;
      }
    }
    return null;
  }

  function findReviewText(card) {
    // Review text: longest text element in card that's not a name/badge/number
    var candidates = card.querySelectorAll('p,span,div');
    var best = null;
    var bestLen = 0;
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (c.children.length > 0) continue;
      var t = c.textContent.trim();
      if (t.length > bestLen && t.length > 20 && t !== '(Verified Purchase)') {
        bestLen = t.length;
        best = c;
      }
    }
    return best;
  }

  // ─── Simple lightbox ─────────────────────────────────────────────────────────

  function openLightbox(url, images) {
    var existing = document.getElementById('riu-lightbox');
    if (existing) existing.remove();

    var lb = document.createElement('div');
    lb.id = 'riu-lightbox';
    lb.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;';

    var idx = images.indexOf(url);

    function render(i) {
      lb.innerHTML = '';
      var closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.style.cssText =
        'position:absolute;top:16px;right:16px;background:none;border:none;color:#fff;font-size:24px;cursor:pointer;';
      closeBtn.onclick = function () { lb.remove(); };

      var img = document.createElement('img');
      img.src = images[i];
      img.style.cssText = 'max-width:90vw;max-height:80vh;object-fit:contain;border-radius:8px;';

      var nav = document.createElement('div');
      nav.style.cssText = 'display:flex;gap:16px;margin-top:12px;';
      if (images.length > 1) {
        var prev = document.createElement('button');
        prev.textContent = '‹';
        prev.style.cssText = 'background:rgba(255,255,255,0.2);border:none;color:#fff;font-size:28px;padding:4px 14px;border-radius:4px;cursor:pointer;';
        prev.onclick = function () { render((i - 1 + images.length) % images.length); };

        var next = document.createElement('button');
        next.textContent = '›';
        next.style.cssText = prev.style.cssText;
        next.onclick = function () { render((i + 1) % images.length); };

        nav.appendChild(prev);
        nav.appendChild(next);
      }

      lb.appendChild(closeBtn);
      lb.appendChild(img);
      lb.appendChild(nav);
    }

    render(idx >= 0 ? idx : 0);
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.remove(); });
    document.body.appendChild(lb);
  }

  // ─── Upload UI (write-review form injection) ─────────────────────────────────

  function resetUploadUI() {
    var preview = document.getElementById('riu-preview');
    var status = document.getElementById('riu-status');
    var fileInput = document.getElementById('riu-file-input');
    if (preview) preview.innerHTML = '';
    if (status) status.textContent = '';
    if (fileInput) fileInput.value = '';
  }

  function uploadImage(file, callback) {
    var formData = new FormData();
    formData.append('image', file);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload/single-image');
    xhr.onload = function () {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          var res = JSON.parse(xhr.responseText);
          if (res && res.url) { callback(null, res.url); }
          else { callback(new Error('No URL')); }
        } catch (e) { callback(e); }
      } else {
        callback(new Error('Upload failed: ' + xhr.status));
      }
    };
    xhr.onerror = function () { callback(new Error('Network error')); };
    origSend.call(xhr, formData);
  }

  function injectUploadUI(textarea) {
    if (document.getElementById('riu-container')) return;

    var container = document.createElement('div');
    container.id = 'riu-container';
    container.style.cssText = 'margin-top:12px;';
    container.innerHTML =
      '<label style="display:block;font-size:14px;font-weight:500;margin-bottom:6px;color:#333;">ছবি আপলোড করুন (ঐচ্ছিক)</label>' +
      '<div id="riu-preview" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;"></div>' +
      '<input type="file" id="riu-file-input" accept="image/*" multiple style="display:none;">' +
      '<button type="button" id="riu-btn" style="border:1px dashed #999;padding:8px 16px;border-radius:6px;cursor:pointer;background:#fafafa;font-size:13px;color:#555;">+ ছবি যোগ করুন</button>' +
      '<div id="riu-status" style="font-size:12px;color:#666;margin-top:6px;"></div>';

    var insertTarget = textarea.closest('mat-form-field') || textarea.parentElement;
    if (insertTarget && insertTarget.parentElement) {
      insertTarget.parentElement.insertBefore(container, insertTarget.nextSibling);
    } else {
      textarea.parentElement.appendChild(container);
    }

    document.getElementById('riu-btn').addEventListener('click', function () {
      document.getElementById('riu-file-input').click();
    });

    document.getElementById('riu-file-input').addEventListener('change', function (e) {
      var files = e.target.files;
      if (!files || !files.length) return;
      var status = document.getElementById('riu-status');
      status.textContent = 'আপলোড হচ্ছে...';
      var total = files.length;
      var done = 0;

      for (var i = 0; i < files.length; i++) {
        (function (file) {
          uploadImage(file, function (err, url) {
            done++;
            if (!err && url) {
              pendingImages.push(url);
              var preview = document.getElementById('riu-preview');
              if (preview) {
                var wrapper = document.createElement('div');
                wrapper.style.cssText = 'position:relative;';
                var img = document.createElement('img');
                img.src = url;
                img.style.cssText = 'width:72px;height:72px;object-fit:cover;border-radius:6px;border:1px solid #ddd;';
                var removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.textContent = '×';
                removeBtn.style.cssText =
                  'position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:#e53935;color:#fff;border:none;cursor:pointer;font-size:12px;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;';
                removeBtn.addEventListener('click', function () {
                  var idx = pendingImages.indexOf(url);
                  if (idx !== -1) pendingImages.splice(idx, 1);
                  wrapper.remove();
                  updateUploadStatus();
                });
                wrapper.appendChild(img);
                wrapper.appendChild(removeBtn);
                preview.appendChild(wrapper);
              }
            }
            if (done === total) updateUploadStatus();
          });
        })(files[i]);
      }
    });

    function updateUploadStatus() {
      var status = document.getElementById('riu-status');
      if (status) {
        status.textContent = pendingImages.length > 0 ? pendingImages.length + 'টি ছবি প্রস্তুত' : '';
      }
    }
  }

  function findAndInjectUploadUI() {
    var textareas = document.querySelectorAll('textarea');
    for (var i = 0; i < textareas.length; i++) {
      var ta = textareas[i];
      var ph = ta.getAttribute('placeholder') || '';
      if (
        ph.indexOf('honest opinion') !== -1 ||
        ph.indexOf('review') !== -1 ||
        ph.indexOf('রিভিউ') !== -1 ||
        ph.indexOf('মতামত') !== -1
      ) {
        injectUploadUI(ta);
        return;
      }
    }
    var dialogs = document.querySelectorAll('mat-dialog-container, .cdk-overlay-pane');
    for (var j = 0; j < dialogs.length; j++) {
      var ta2 = dialogs[j].querySelector('textarea');
      if (ta2 && !document.getElementById('riu-container')) {
        injectUploadUI(ta2);
        return;
      }
    }
  }

  // ─── MutationObserver ────────────────────────────────────────────────────────

  var observer = new MutationObserver(function (mutations) {
    var hasNew = false;
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes.length) { hasNew = true; break; }
    }
    if (!hasNew) return;

    findAndInjectUploadUI();
    injectReviewImages();

    if (!document.querySelector('mat-dialog-container, .cdk-overlay-pane textarea')) {
      pendingImages = [];
      injected = false;
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
