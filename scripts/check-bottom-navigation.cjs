const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const script = require('../api/dist/storefront-product-sections-script').STOREFRONT_PRODUCT_SECTIONS_SCRIPT;
const snippet = fs.readFileSync(path.join(__dirname, '../gtm-snippets/pagespeed-accessibility.html'), 'utf8');
const nativeStyle = '<style>.bottom-nav{position:fixed;bottom:0;left:0;width:100%;display:block;padding:8px}.bottom-nav ul{display:flex;justify-content:space-around;list-style:none;margin:0;padding:0}.bottom-nav li{display:flex;flex-direction:column;align-items:center;min-width:44px;min-height:44px}.bottom-nav i{color:#fff;font-size:19px;display:block}.bottom-nav span{color:#fff}</style>';
const items = [['fa-home','মূলপাতা'],['fa-bars','ক্যাটালগ'],['fa-shopping-bag','ক্রয় তালিকা'],['fa-user-circle','লগইন']];
const nav = '<app-header><div class="bottom-nav"><ul>' + items.map(([icon,label]) => '<li><i class="fa '+icon+'"></i><span>'+label+'</span></li>').join('') + '</ul></div></app-header>';
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    for (const width of [375,390,430]) {
      const page = await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
      await page.route('**/*', route => route.abort());
      // Reproduce the white icons on the old white bar, without any icon font.
      await page.setContent('<html><head>'+nativeStyle+'<style>.bottom-nav{background:#fff}.bottom-nav li span{color:#175c36}</style></head><body>'+nav+'</body></html>');
      await page.addScriptTag({content:script});
      await page.waitForFunction(() => document.querySelectorAll('.bottom-nav svg').length === 4);
      const before = await page.locator('.bottom-nav').evaluate(bar => ({background:getComputedStyle(bar).backgroundColor,icon:getComputedStyle(bar.querySelector('svg')).stroke}));
      assert.deepEqual(before,{background:'rgb(255, 255, 255)',icon:'rgb(255, 255, 255)'});
      await page.locator('head').evaluate((head,html) => head.insertAdjacentHTML('beforeend',html), snippet.match(/<style>[\s\S]*?<\/style>/)[0]);
      const after = await page.locator('.bottom-nav').evaluate(bar => ({background:getComputedStyle(bar).backgroundColor,icon:getComputedStyle(bar.querySelector('svg')).stroke,label:getComputedStyle(bar.querySelector('span')).color}));
      assert.deepEqual(after,{background:'rgb(23, 92, 54)',icon:'rgb(255, 255, 255)',label:'rgb(255, 255, 255)'});
      for (const icon of await page.locator('.bottom-nav svg').all()) assert.equal(await icon.isVisible(),true);
      await page.locator('.bottom-nav ul').evaluate(ul => {const replacement=ul.cloneNode(true);replacement.querySelectorAll('i').forEach(i=>{i.classList.remove('ab-bottom-nav-icon');i.innerHTML='';});ul.replaceWith(replacement);});
      await page.waitForFunction(() => document.querySelectorAll('.bottom-nav svg').length === 4);
      assert.equal(await page.locator('.bottom-nav li .fa-bars').count(),1,'Catalogue click-selector remains intact');
      assert.equal(await page.locator('.bottom-nav li .fa-shopping-bag').count(),1,'Cart click-selector remains intact');
      if (width === 390) await page.locator('.bottom-nav').screenshot({path:'/tmp/amolbooks-bottom-nav-mobile.png'});
      await page.close();
    }
    console.log('Bottom navigation checks passed at 375/390/430px: original invisible icons reproduced; green background, visible font-independent SVGs, white labels and Angular redraws verified.');
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
