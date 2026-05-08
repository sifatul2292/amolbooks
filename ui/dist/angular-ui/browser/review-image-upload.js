(function () {
  'use strict';

  var pendingImages = [];
  var injected = false;

  // Intercept XHR to inject images into review/add request body
  var origOpen = XMLHttpRequest.prototype.open;
  var origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._riu_url = url;
    this._riu_method = method;
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
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
        // clear after injecting so next submission starts fresh
        pendingImages = [];
        injected = false;
        resetUI();
      } catch (e) {}
    }
    return origSend.call(this, body);
  };

  // Also intercept fetch in case Angular switches to fetch provider
  var origFetch = window.fetch;
  window.fetch = function (url, options) {
    var urlStr = url && url.toString ? url.toString() : String(url);
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
        var data = JSON.parse(options.body);
        data.images = pendingImages.slice();
        options = Object.assign({}, options, { body: JSON.stringify(data) });
        pendingImages = [];
        injected = false;
        resetUI();
      } catch (e) {}
    }
    return origFetch.apply(this, arguments);
  };

  function resetUI() {
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
          if (res && res.url) {
            callback(null, res.url);
          } else {
            callback(new Error('No URL in response'));
          }
        } catch (e) {
          callback(e);
        }
      } else {
        callback(new Error('Upload failed: ' + xhr.status));
      }
    };
    xhr.onerror = function () {
      callback(new Error('Network error'));
    };
    // use origSend to bypass our intercept for this upload XHR
    origSend.call(xhr, formData);
  }

  function injectUI(textarea) {
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

    // Insert after the textarea's parent label/wrapper
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
                  updateStatus();
                });
                wrapper.appendChild(img);
                wrapper.appendChild(removeBtn);
                preview.appendChild(wrapper);
              }
            }
            if (done === total) {
              updateStatus();
            }
          });
        })(files[i]);
      }
    });

    function updateStatus() {
      var status = document.getElementById('riu-status');
      if (status) {
        status.textContent = pendingImages.length > 0
          ? pendingImages.length + 'টি ছবি প্রস্তুত'
          : '';
      }
    }
  }

  function findAndInject() {
    // Detect textarea with placeholder matching the review form
    var textareas = document.querySelectorAll('textarea');
    for (var i = 0; i < textareas.length; i++) {
      var ta = textareas[i];
      var placeholder = ta.getAttribute('placeholder') || '';
      if (
        placeholder.indexOf('honest opinion') !== -1 ||
        placeholder.indexOf('review') !== -1 ||
        placeholder.indexOf('রিভিউ') !== -1 ||
        placeholder.indexOf('মতামত') !== -1
      ) {
        injectUI(ta);
        return;
      }
    }
    // Fallback: look for mat-dialog containing a textarea and a submit button
    var dialogs = document.querySelectorAll('mat-dialog-container, .cdk-overlay-pane');
    for (var j = 0; j < dialogs.length; j++) {
      var ta2 = dialogs[j].querySelector('textarea');
      if (ta2 && !document.getElementById('riu-container')) {
        injectUI(ta2);
        return;
      }
    }
  }

  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var added = mutations[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        if (added[j].nodeType === 1) {
          findAndInject();
          break;
        }
      }
    }
    // Also clean up when modal closes
    if (!document.querySelector('mat-dialog-container, .cdk-overlay-pane textarea')) {
      pendingImages = [];
      injected = false;
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
