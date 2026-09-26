const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const root = join(__dirname, '..');
  const snippet = readFileSync(join(root, 'gtm-snippets/customer-account-mobile.html'), 'utf8');
  const main = readFileSync(join(root, 'api/src/main.ts'), 'utf8');
  assert.match(main, /'customer-account-mobile\.html'/);
  assert.match(snippet, /nativeItems\[2\].*querySelector\('a'\)/s);
  assert.match(snippet, /nativeItems\[nativeItems\.length - 1\]/);
  assert.doesNotMatch(snippet, /href="' \+ href/);
  assert.match(snippet, /<button type="button" class="' \+ className/);
  assert.match(snippet, /সংরক্ষিত ঠিকানা থেকে বেছে নিন/);
  assert.match(snippet, /__abCartAuthorizationBridgeInstalled/);
  assert.match(snippet, /fetch\(API_BASE \+ '\/user\/get-user-address'/);
  assert.match(snippet, /fetch\(API_BASE \+ '\/user\/logged-in-user-data\?select=name%20phoneNo%20username'/);
  assert.match(snippet, /setCheckoutControl\('address', address\.address/);
  assert.match(snippet, /input\[type="radio"\]\[value=/);
  assert.match(snippet, /prefers-reduced-motion/);
  assert.match(snippet, /min-height: 44px/);
  assert.doesNotMatch(snippet, /transition:\s*all/);
  assert.doesNotMatch(snippet, /width:\s*100vw/);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [320, 375, 414, 768]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      const fixture = '<app-account><div class="account-area"><div class="container"><div class="account-main">' +
        '<aside class="account-left"><div class="user-info"><div class="user-img"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></div><div class="user-text"><h3>Sifatul</h3></div></div>' +
        '<div class="side-bar"><nav><ul>' +
        '<li><a href="/account/profile">Profile</a></li><li><a href="/account/orders">Orders</a></li><li><a>Address</a></li>' +
        '<li><a href="/account/notification">Notifications</a></li><li><a href="/account/wishlist">Wishlist</a></li>' +
        '<li><a href="/account/review">Reviews</a></li><li><a href="/account/transactions">Transactions</a></li><li><a>Logout</a></li>' +
        '</ul></nav></div></aside><main class="account-right"><div>Profile content</div></main></div></div></div></app-account>' + snippet;
      await page.route('https://account.test/**', route => route.fulfill({ body: fixture, contentType: 'text/html' }));
      await page.goto('https://account.test/account/profile');
      await page.waitForSelector('.ab-account-hub', { state: 'attached' });
      assert.equal(await page.locator('.ab-account-hub').isVisible(), width <= 750);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 0, `${width}px viewport has ${overflow}px horizontal overflow`);
      if (width <= 750) {
        const targets = await page.locator('.ab-account-quick').evaluateAll(nodes => nodes.map(node => {
          const box = node.getBoundingClientRect(); return [box.width, box.height];
        }));
        assert.ok(targets.every(([w, h]) => w >= 44 && h >= 44));
        await page.locator('.ab-account-hub__menu').click();
        assert.equal(await page.locator('#ab-account-sheet').getAttribute('open'), '');
        const dialogBox = await page.locator('#ab-account-sheet').boundingBox();
        assert.ok(dialogBox, 'account menu must be visible');
        assert.ok(Math.abs(dialogBox.y + dialogBox.height / 2 - 422) <= 2, `${width}px account menu must be vertically centered`);
        assert.ok(dialogBox.y >= 0 && dialogBox.y + dialogBox.height <= 844, `${width}px account menu must fit the viewport`);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#ab-account-sheet').getAttribute('open'), null);
        if (width === 320) {
          await page.evaluate(() => {
            window.addressClicks = 0;
            window.logoutClicks = 0;
            document.querySelectorAll('.account-left .side-bar li')[2].querySelector('a').addEventListener('click', () => window.addressClicks++);
            document.querySelectorAll('.account-left .side-bar li')[7].addEventListener('click', () => window.logoutClicks++);
          });
          await page.locator('.ab-account-quick[data-account-target="address"]').click();
          assert.equal(await page.evaluate(() => window.addressClicks), 1);
          assert.equal(await page.locator('.ab-account-quick[data-account-target="address"]').evaluate(node => node.tagName), 'BUTTON');
          await page.locator('.ab-account-hub__menu').click();
          await page.locator('.ab-account-action[data-account-target="logout"]').click();
          assert.equal(await page.evaluate(() => window.logoutClicks), 1);
        }
      }
      await page.close();
    }

    const checkout = await browser.newPage({ viewport: { width: 375, height: 844 } });
    const checkoutFixture = '<app-checkout><div class="address-form-area"><div class="address-form-top">Delivery address</div>' +
      '<input formcontrolname="name"><input formcontrolname="phoneNo"><textarea formcontrolname="address"></textarea></div></app-checkout>' +
      '<script>localStorage.setItem("Amolbooks_TOKEN_1","token");window.checkoutPatched={};window.checkoutAddressLoads=0;var host=document.querySelector("app-checkout");var checkoutComponent={addresses:null,user:{name:"Fallback",phoneNo:"01900000000"},shippingCharge:{deliveryInDhaka:60,deliveryOutsideDhaka:75},formData:{value:window.checkoutPatched,patchValue:function(value){Object.assign(window.checkoutPatched,value);}},calculateDeliveryCharge:function(){return 100;},getUserAddress:function(){window.checkoutAddressLoads++;this.addresses=[' +
      '{_id:"one",name:"Home",phone:"01700000000",address:"Road 1",addressType:"home",division:{_id:"d1",name:"Dhaka"},area:{_id:"a1",name:"Dhanmondi"},zone:{_id:"z1",name:"Zone 1"}},' +
      '{_id:"two",name:"Office",phone:"01800000000",address:"Road 2",addressType:"office",setDefaultAddress:true,division:{_id:"d2",name:"Chattogram"},area:{_id:"a2",name:"Panchlaish"},zone:{_id:"z2",name:"Zone 2"}}' +
      '];},getAllArea:function(id){window.checkoutArea=id;},getAllZone:function(id){window.checkoutZone=id;}};host.__ngContext__=[checkoutComponent];<\/script>' + snippet;
    await checkout.route('https://account.test/**', route => route.fulfill({ body: checkoutFixture, contentType: 'text/html' }));
    await checkout.goto('https://account.test/checkout');
    await checkout.waitForSelector('.ab-checkout-addresses');
    assert.equal(await checkout.locator('.ab-checkout-address').count(), 2);
    assert.equal(await checkout.locator('.ab-checkout-address__name').count(), 2);
    assert.equal(await checkout.evaluate(() => window.checkoutAddressLoads), 1);
    assert.equal(await checkout.locator('.ab-checkout-address[data-address-id="two"]').getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await checkout.evaluate(() => [window.checkoutPatched.name, window.checkoutPatched.phoneNo, window.checkoutPatched.address, window.checkoutPatched.division, window.checkoutPatched.deliveryOptions, window.checkoutArea, window.checkoutZone, checkoutComponent.calculateDeliveryCharge()]), ['Office', '01800000000', 'Road 2', 'd2', '2', 'd2', 'a2', 75]);
    await checkout.locator('.ab-checkout-address[data-address-id="one"]').click();
    assert.deepEqual(await checkout.evaluate(() => [window.checkoutPatched.name, window.checkoutPatched.phoneNo, window.checkoutPatched.address, window.checkoutPatched.division, window.checkoutPatched.deliveryOptions, checkoutComponent.calculateDeliveryCharge()]), ['Home', '01700000000', 'Road 1', 'd1', '1', 60]);
    await checkout.locator('.ab-checkout-address[data-address-id="one"]').evaluate(button => {
      const strip = document.createElement('div');
      strip.style.cssText = 'display:flex;margin-top:10px;padding-top:10px;border-top:1px solid #e0e0e0';
      strip.appendChild(document.createElement('img'));
      button.appendChild(strip);
    });
    await checkout.waitForFunction(() => !document.querySelector('.ab-checkout-address img'));
    assert.equal(await checkout.locator('.ab-checkout-address img').count(), 0);
    const checkoutOverflow = await checkout.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(checkoutOverflow <= 0, `checkout has ${checkoutOverflow}px horizontal overflow`);
    await checkout.close();
    console.log('PASS: mobile account navigation and checkout saved-address selection are responsive and preserve native actions.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
