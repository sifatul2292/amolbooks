// Builds the upazila -> district table (UPAZILA_TEXT) in gtm-snippets/delivery-zone-core.js from
// github.com/nuhil/bangladesh-geocode (MIT License, Copyright (c) 2014 Nuhil Mehdy).
// Download districts/districts.json and upazilas/upazilas.json from that repository into a folder,
// then: node scripts/build-delivery-zone-upazilas.cjs <folder>
// It prints what it leaves out and writes the table lines to <folder>/upazilas-block.txt, to paste
// between `var UPAZILA_TEXT = {` and `};`.
const fs = require('fs'); const vm = require('vm'); const path = require('path');
const W = path.join(__dirname, '..'), G = process.argv[2];
if (!G) { console.error('usage: node scripts/build-delivery-zone-upazilas.cjs <folder with districts.json and upazilas.json>'); process.exit(1); }
const sb = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(path.join(W, 'gtm-snippets/delivery-zone-core.js'), 'utf8'), sb);
const Z = sb.module.exports;
const table = (f) => JSON.parse(fs.readFileSync(path.join(G, f), 'utf8')).find((t) => t.type === 'table').data;
const dists = table('districts.json'), upas = table('upazilas.json');
const norm = Z.norm;
// their district -> ours
const ours = {};
for (const d of dists) {
  const hit = Z.DISTRICTS.find((x) => x.slice(1).some((a) => norm(a) === norm(d.name) || norm(a) === norm(d.bn_name)));
  if (!hit) console.error('NO DISTRICT', d.name, d.bn_name);
  else ours[d.id] = hit[0];
}
const districtNames = new Set(Z.DISTRICTS.flatMap((d) => d.slice(1).map(norm)));
const dhakaNames = new Set(Z.DHAKA_CITY.concat(Z.DHAKA_OUTER).flatMap((a) => a.slice(1).map(norm)));
const count = {};
for (const u of upas) for (const n of [norm(u.name), norm(u.bn_name)]) count[n] = (count[n] || new Set()).add(ours[u.district_id]);
// Everyday words, people's names, rivers and names many villages share: never a district on their own.
const COMMON = new Set(['Ruma', 'Lama', 'Kasba', 'Bandar', 'Madan', 'Palash', 'Raipur', 'Tala', 'Bera', 'Bagha', 'Meghna', 'Titas',
  'Juri', 'Rupsa', 'Anwara', 'Ramu', 'Birol', 'Bhanga', 'Paba', 'Manda', 'Kalai', 'Boda', 'Lalpur', 'Fulpur', 'Kalia', 'Atrai']);
const out = {}; const skipped = [];
for (const u of upas) {
  const id = ours[u.district_id];
  const names = [u.bn_name.trim(), u.name.trim()];
  const why = id === 'dhaka' ? 'dhaka district' :
    names.some((n) => /sadar|সদর|kotwali|কোতোয়ালী|কোতয়ালী/i.test(n)) ? 'sadar/kotwali' :
    names.some((n) => count[norm(n)].size > 1) ? 'two districts' :
    names.some((n) => districtNames.has(norm(n))) ? 'district name' :
    names.some((n) => dhakaNames.has(norm(n))) ? 'dhaka area name' :
    names.some((n) => norm(n).length < 3) ? 'short' :
    COMMON.has(u.name.trim()) ? 'everyday word or name' : '';
  if (why) { skipped.push(`${u.name}/${u.bn_name} (${id}): ${why}`); continue; }
  (out[id] = out[id] || []).push(names.join('|'));
}
const total = Object.values(out).reduce((n, l) => n + l.length, 0);
console.error('kept', total, 'skipped', skipped.length);
console.error(skipped.join('\n'));
// Upazilas named like another district: NAMED_LIKE_DISTRICT in the core (kept by hand).
console.error('named like a district:', skipped.filter((line) => line.endsWith('district name')).join('; '));
const lines = Object.keys(out).sort().map((id) => `    ${id}: '${out[id].join(';').replace(/'/g, "\\'")}',`);
fs.writeFileSync(path.join(G, 'upazilas-block.txt'), lines.join('\n') + '\n');
