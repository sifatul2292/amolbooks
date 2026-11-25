// Rendering regressions only: no API, cart writes, orders or payment requests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const header = fs.readFileSync(path.join(root, 'gtm-snippets/header-stability.html'), 'utf8').match(/<style>([\s\S]*?)<\/style>/)[1];
const sticky = fs.readFileSync(path.join(root, 'gtm-snippets/checkout-sticky-confirm.html'), 'utf8');
async function main() {
  const browser = await chromium.launch({ channel:'chrome', headless:true });
  try {
    const page = await browser.newPage({viewport:{width:492,height:1035}});
    await page.route('https://scroll.amolbooks.test/**', route => route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><style>
      body{margin:0} .header-main{will-change:transform;transition:transform .3s} .header-main.header-fixed{transform:translateY(0)}
      .logo img{width:49px;height:62px;transition:transform .25s} .header-fixed .logo img{transform:scale(.9)}
      .header-middle-top{width:300px;height:46px;transition:transform .25s} .header-fixed .header-middle-top{transform:scale(.98)}
      .bottom-nav{position:fixed;bottom:0;left:0;right:0;height:60px;background:green}
      </style><style>${header}</style>${sticky}
      <app-header><div class="header-main"><div class="logo"><img alt="Logo"></div><div class="header-middle-top"><input aria-label="Search"></div></div><div class="bottom-nav">Navigation</div></app-header>
      <app-checkout><form style="height:3000px"><input aria-label="Name"><button type="submit">Order</button></form></app-checkout>`}));
    await page.goto('https://scroll.amolbooks.test/checkout');
    for (const width of [375,492,1024,1440]) {
      await page.setViewportSize({width,height:1035});
      const sizes=[];
      for (const fixed of [false,true,false,true]) {
        sizes.push(await page.evaluate(fixed => {
          document.querySelector('.header-main').classList.toggle('header-fixed',fixed);
          const selectors=['.header-main','.logo img','.header-middle-top'];
          return selectors.map(selector => {const el=document.querySelector(selector),style=getComputedStyle(el),rect=el.getBoundingClientRect();return {transform:style.transform,width:rect.width,height:rect.height};});
        },fixed));
      }
      for (const state of sizes) {assert.ok(state.every(item=>item.transform==='none'),'No scroll-triggered header layers/scaling');assert.deepEqual(state,sizes[0],'Header geometry stays constant at '+width);}
    }
    await page.setViewportSize({width:492,height:1035});
    async function scroll(y) {await page.evaluate(y=>window.scrollTo(0,y),y);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
    await scroll(180);assert.equal(await page.locator('#ab-checkout-confirm-bar.is-visible').count(),1);
    for(const y of [172,182,171,184]){await scroll(y);assert.equal(await page.locator('#ab-checkout-confirm-bar.is-visible').count(),1,'Small direction jitter keeps the same controls');}
    await scroll(100);assert.equal(await page.locator('#ab-checkout-confirm-bar.is-visible').count(),0);
    const frames=await page.evaluate(async()=>{
      window.scrollTo(0,200);const frames=[];
      for(let i=0;i<8;i++){await new Promise(requestAnimationFrame);const bar=document.querySelector('#ab-checkout-confirm-bar'),nav=document.querySelector('.bottom-nav');if(bar.classList.contains('is-visible'))frames.push({opacity:getComputedStyle(bar).opacity,bottom:bar.getBoundingClientRect().bottom,nav:getComputedStyle(nav).visibility,height:innerHeight});}
      return frames;
    });
    assert.ok(frames.length>0);for(const frame of frames){assert.equal(frame.opacity,'1','No translucent flash while navigation is hidden');assert.ok(Math.abs(frame.bottom-frame.height)<1,'The replacement bar covers the bottom immediately');assert.equal(frame.nav,'hidden');}
    await page.locator('input[aria-label="Name"]').focus();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await page.locator('#ab-checkout-confirm-bar.is-visible').count(),0,'Typing still hides the confirm bar');
    await page.evaluate(()=>{history.pushState({},'','/');window.dispatchEvent(new PopStateEvent('popstate'));});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));assert.equal(await page.locator('#ab-checkout-confirm-bar.is-visible').count(),0,'Route cleanup retained');
  } finally { await browser.close(); }
  console.log('Scroll stability passed: stable header geometry/layers, no checkout-bar white frames, jitter guard, keyboard and route cleanup.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
