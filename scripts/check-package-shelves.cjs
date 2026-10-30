const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'gtm-snippets/special-package-shelves.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const rank = new Function(script.slice(script.indexOf('function rankPackages'), script.indexOf('function loadPackages')) + ';return rankPackages;')();
const id = n => String(n).padStart(24, '0');
const item = (n, sold, date) => ({_id:id(n),totalSold:sold,createdAt:date,image:'https://example.com/banner.webp'});
const source = [item(1,2,'2026-10-01'),item(2,12,'2026-01-01'),item(3,2,'2026-10-02'),item(4,undefined,'2026-11-01')];
assert.deepEqual(rank(source).map(p=>p._id),[id(2),id(3),id(1),id(4)]);
assert.equal(source[0]._id,id(1),'Do not mutate the response');
assert.equal(rank([{...item(5,99,''),image:'javascript:alert(1)'}]).length,0);
assert.match(script,/items\.slice\(i,i\+4\)/);
assert.match(html,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(script,/insertBefore\(section,comboSection\)/);
const {SpecialPackageService} = require(path.join(root,'api/dist/pages/offers/special-package/special-package.service.js'));
let salesRequests = 0;
let salesPipeline;
let packagePipeline;
const model = {
  db:{collection(name) {
    assert.equal(name,'orders');
    return {aggregate(pipeline) {
      salesRequests++; salesPipeline=pipeline;
      return {toArray:async()=>[{_id:id(2),totalSold:12}]};
    }};
  }},
  aggregate:async pipeline => {packagePipeline=pipeline;return [];}
};
(async()=>{
  const service = new SpecialPackageService(model,{}, {}, {}, {});
  await service.getAllSpecialPackages({sort:{totalSold:-1},select:{name:1,totalSold:1}});
  assert.equal(salesPipeline[0].$match.orderStatus,5,'Delivered sales only');
  assert.equal(salesPipeline[2].$match['orderedItems.isGift'].$ne,true);
  assert.equal(salesPipeline[3].$group._id,'$orderedItems._id','Count package IDs, not component book sales');
  assert.equal(salesPipeline[3].$group.totalSold.$sum.$max[1].$convert.input,'$orderedItems.quantity');
  assert.ok(packagePipeline.findIndex(p=>p.$addFields)<packagePipeline.findIndex(p=>p.$sort));
  assert.equal(packagePipeline.find(p=>p.$addFields).$addFields.totalSold.$switch.default,0);
  await service.getAllSpecialPackages({sort:{totalSold:-1}});
  assert.equal(salesRequests,1,'Sales query is cached');
  await service.getAllSpecialPackages({sort:{createdAt:-1}});
  assert.equal(salesRequests,1,'Existing callers do not query order history');
  console.log('Package sales, cache, ordering and 2×2 shelf checks pass');
})().catch(error=>{console.error(error);process.exitCode=1;});

// A failed package load (the live nginx 404s some page-load bursts) retries soon instead of hiding the shelf.
(async () => {
  const loadSource = script.slice(script.indexOf('var RETRY_DELAYS_MS'), script.indexOf('var resizeObserver')) +
    script.slice(script.indexOf('function rankPackages'), script.indexOf('function banner'));
  const responses = [{ ok: false }, { ok: false }, { ok: true, json: async () => ({ data: [item(9, 1, '2026-10-01')] }) }];
  const timers = [];
  let scheduled = 0;
  const harness = new Function('fetch', 'window', 'schedule', 'API_BASE',
    'var packages = null; var request = null;' + loadSource + '; return { loadPackages: loadPackages };')(
    async () => responses.shift(),
    { setTimeout: (fn, delay) => { timers.push({ fn, delay }); return timers.length; } },
    () => { scheduled += 1; },
    'https://api.test'
  );
  assert.deepEqual(await harness.loadPackages(), [], 'First failure shows nothing yet');
  assert.equal(timers[0].delay, 700, 'First retry is quick');
  assert.deepEqual(await harness.loadPackages(), [], 'No duplicate request while a retry is pending');
  timers[0].fn();
  assert.equal(scheduled, 1, 'Retry re-runs the shelf mount');
  assert.deepEqual(await harness.loadPackages(), []);
  assert.equal(timers[1].delay, 2000, 'Second retry backs off');
  timers[1].fn();
  const loaded = await harness.loadPackages();
  assert.equal(loaded.length, 1, 'Shelf loads once the API answers');
  assert.doesNotMatch(script, /30000/, 'No 30-second blackout after a failure');
  console.log('Package shelf retry checks passed');
})().catch((error) => { console.error(error); process.exit(1); });
