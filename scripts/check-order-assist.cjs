// AI Assist message reader (api/src/pages/sales/order-assist/order-message-parser.ts).
// The messages copy the shapes of real WhatsApp orders the owner shared on 2026-11-08,
// with made-up names, numbers and addresses. Needs `api/dist`.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { parseOrderMessage, prepareCatalogue, bdMobile } = require('../api/dist/pages/sales/order-assist/order-message-parser');

const catalogue = prepareCatalogue([
  { _id: 'q500', name: '৫০০ শব্দে কুরআনের ৭৫% (নতুন সংস্করণ)', nameEn: '500 shobder kuraner 75%', price: 310, totalSold: 2000 },
  { _id: 'pm', name: 'প্রোডাক্টিভ মুসলিম', nameEn: 'Productive Muslim', price: 315, totalSold: 900 },
  { _id: 'pmb', name: 'প্রোডাক্টিভ মুসলিম + দ্য বারাকাহ ইফেক্ট', nameEn: 'Productive Muslim + The Barakah Effect', price: 610, totalSold: 700 },
  { _id: 'be', name: 'দ্য বারাকাহ ইফেক্ট', nameEn: 'The Barakah Effect', price: 320, totalSold: 700 },
  { _id: 'iom', name: 'ইসলামি অর্থনীতি ও সফল উদ্যোক্তার মাইন্ডম্যাপ', nameEn: 'Islami Orthonity O Uddokta', price: 294, totalSold: 280 },
  { _id: 'ab', name: 'আমল বিশ্বকোষ - ৩৬৫ দিনের আমল একসাথে', nameEn: 'Amol Bissokosh', price: 706, totalSold: 25 },
  { _id: 'rs', name: 'রিয়াদুস সালিহীন (প্রথম ও দ্বিতীয় খণ্ড)', nameEn: 'Riyadus Salihin(1st and 2nd Khondo)', price: 795, totalSold: 5 },
  { _id: 'kbm', name: 'কুরআন বোঝার মজা', nameEn: 'Quran bojhar moja', price: 250, totalSold: 12 },
  { _id: 'nb', name: 'Amol Notebook', nameEn: 'Amol Notebook', price: 90, totalSold: 3 },
]);
const read = (text) => parseOrderMessage(text, catalogue);
const books = (r) => r.products.map((p) => p.name + ' x' + p.qty);

// Phones: Bengali digits, +880 with spaces and dashes, 88 prefix; landlines are not mobiles.
assert.equal(bdMobile('০১৭১১০০০১১১'), '01711000111');
assert.equal(bdMobile('+880 1711-000111'), '01711000111');
assert.equal(bdMobile('8801711000111'), '01711000111');
assert.equal(bdMobile('02-9112233'), null);

// 1. Phone first, Bengali name and address, Bengali total.
let r = read('০১৭০০০০০০০১\n\nআব্দুর রহিম\n\n১২/৩, রূপনগর, টিনশেড, মিরপুর\n\n৫০০ শব্দে কুরআনের ৭৫%\nক্যাশ অন ডেলিভারি ৩৭০/-');
assert.equal(r.phone, '01700000001');
assert.equal(r.name, 'আব্দুর রহিম');
assert.equal(r.address, '১২/৩, রূপনগর, টিনশেড, মিরপুর');
assert.equal(r.city, 'ঢাকা');
assert.deepEqual(books(r), ['৫০০ শব্দে কুরআনের ৭৫% (নতুন সংস্করণ) x1']);
assert.equal(r.quotedTotal, 370);
assert.equal(r.deliveryCharge, 60, 'Delivery = quoted total minus the books');
assert.deepEqual(r.warnings, []);

// 2. WhatsApp header, name before the phone, English name.
r = read('[7/11/26, 12:43:23 PM] Amol Books: MD Karim Uddin\n01500000002\nকলাবাগান, টঙ্গী, গাজীপুর\n\n৫০০ শব্দে কুরআনের ৭৫%\nক্যাশ অন ডেলিভারি ৩৮৫/-');
assert.equal(r.name, 'MD Karim Uddin');
assert.equal(r.phone, '01500000002');
assert.equal(r.city, 'গাজীপুর');
assert.equal(r.deliveryCharge, 75);

// 3. Labels (নাম:, মোবাইল নাম্বার :, ঠিকানা:).
r = read('নাম:সুমাইয়া \nমোবাইল নাম্বার :01800000003\nঠিকানা: কাজীপাড়া এক নাম্বার পুল, বরিশাল\nপ্রোডাক্টিভ মুসলিম \nক্যাশ অন ডেলিভারি ৩৯০/-');
assert.equal(r.name, 'সুমাইয়া');
assert.equal(r.phone, '01800000003');
assert.equal(r.address, 'কাজীপাড়া এক নাম্বার পুল, বরিশাল');
assert.deepEqual(books(r), ['প্রোডাক্টিভ মুসলিম x1'], 'Not the Productive Muslim + Barakah combo');

// 4. English everything.
r = read('01900000004\n\nABDUL KARIM \n\nJashore new merket\n\nProductive Muslim \nCash on delivery 390/-');
assert.equal(r.name, 'ABDUL KARIM');
assert.equal(r.city, 'যশোর');
assert.deepEqual(books(r), ['প্রোডাক্টিভ মুসলিম x1']);
assert.equal(r.paymentType, 'COD');

// 5. No name; a second number inside the address; a book not in the shop.
r = read('01600000005\n\n\nUdden school rode dakshin khan dhaka-1230 House#1 3rd Floor,01900000055\n\nPen and protocol \n\nCash on delivery 459/-');
assert.equal(r.phone, '01600000005');
assert.deepEqual(r.altPhones, ['01900000055']);
assert.equal(r.name, '', 'A book title is never used as the name');
assert.match(r.address, /^Udden school rode dakshin khan dhaka-1230 House#1 3rd Floor$/);
assert.deepEqual(r.unmatched, ['Pen and protocol']);
assert.ok(r.warnings.some((w) => /No customer name/.test(w)));
assert.ok(r.warnings.some((w) => /More than one phone/.test(w)));

// 6. Several books not in the shop, Bengali digits, a district with an unusual spelling.
r = read('০১৭০০০০০০০৬\n\nমো করিম রহমান\n\n\nঝাউতলা লেন, পূর্বপাড়া কুস্টিয়া ৭০০০\n\nEdventure \nPen and Protocol \nArgentina Blue and White notebook \n\nCash on delivery 778/-');
assert.equal(r.name, 'মো করিম রহমান');
assert.equal(r.address, 'ঝাউতলা লেন, পূর্বপাড়া কুস্টিয়া ৭০০০');
assert.equal(r.city, 'কুষ্টিয়া');
assert.deepEqual(r.unmatched, ['Edventure', 'Pen and Protocol', 'Argentina Blue and White notebook']);
assert.deepEqual(r.products, []);

// 7. A typo in the title ("৫৯৯"), +880 phone.
r = read('+880 1700-000007\n\nজলিল মিয়া\n\nমাস্টারপাড়া, নওগা সদর\n\n৫৯৯ শব্দে কুরআনের ৭৫%\nক্যাশ অন ডেলিভারি ৩৮৫/-');
assert.equal(r.phone, '01700000007');
assert.deepEqual(books(r), ['৫০০ শব্দে কুরআনের ৭৫% (নতুন সংস্করণ) x1']);
assert.equal(r.city, 'নওগাঁ');

// 8. A job title and workplace as the address.
r = read('01700000008\n\nডাঃ মোঃ করিম উদ্দিন \n\n\nসহকারী অধ্যাপক শিশু বিভাগ,  রংপুর মেডিকেল কলেজ হাসপাতাল \n\n\nপ্রোডাক্টিভ মুসলিম \nক্যাশ অন ডেলিভারি ৩৯০/-');
assert.equal(r.name, 'ডাঃ মোঃ করিম উদ্দিন');
assert.equal(r.address, 'সহকারী অধ্যাপক শিশু বিভাগ, রংপুর মেডিকেল কলেজ হাসপাতাল');
assert.equal(r.city, 'রংপুর');

// 9. "জেলা+ থানা :" label and full stops.
r = read('01600000009\n\nমোহাম্মদ রফিক আজাদ। \nজয়রা। \nজেলা+ থানা : মানিকগঞ্জ\n\nইসলামি অর্থনীতি ও সফল উদ্যোক্তার মাইন্ডম্যাপ \n\nক্যাশ অন ডেলিভারি ৩৬৯/-');
assert.equal(r.name, 'মোহাম্মদ রফিক আজাদ');
assert.equal(r.address, 'জয়রা, মানিকগঞ্জ');
assert.equal(r.city, 'মানিকগঞ্জ');

// 10. A book not in the shop above one that is; a big total.
r = read('01600000010\n\nHasina Ara\n \nBlock A,road no 09,(hossain tower),north bishil,mirpur 1\n\n\nপড়ো সিরিজ \nআমল বিশ্বকোষ \n\nক্যাশ অন ডেলিভারি ১৮৭০/-');
assert.equal(r.name, 'Hasina Ara');
assert.equal(r.address, 'Block A,road no 09,(hossain tower),north bishil,mirpur 1');
assert.deepEqual(books(r), ['আমল বিশ্বকোষ - ৩৬৫ দিনের আমল একসাথে x1']);
assert.deepEqual(r.unmatched, ['পড়ো সিরিজ']);

// 11. Multi-line address; "২ খন্ড" is part of the title; the price does not add up.
r = read('01700000011\n\nTaher Ali\n\n\nHouse # 52\nRoad # 6\nBlock # C\nPanchlaish R/A\nPanchlaish, Chattogram \n\n\n৫০০ শব্দে কুরআনের ৭৫%\n\nরিয়াদুস সালেহীন ২ খন্ড\n\n\nক্যাশ অন ডেলিভারি ১১০০/-');
assert.equal(r.address, 'House # 52, Road # 6, Block # C, Panchlaish R/A, Panchlaish, Chattogram');
assert.equal(r.city, 'চট্টগ্রাম');
assert.deepEqual(books(r), ['৫০০ শব্দে কুরআনের ৭৫% (নতুন সংস্করণ) x1', 'রিয়াদুস সালিহীন (প্রথম ও দ্বিতীয় খণ্ড) x1']);
assert.ok(r.warnings.some((w) => /Customer was told ৳1100/.test(w)), 'Price mismatch is flagged');

// 12. A bare total, no payment words.
r = read('01800000012\n\nতামিম\n\nএজিবি কলোনি, আল হেলাল জোন, আরামবাগ, মতিঝিল\n\nইসলামি অর্থনীতি ও সফল উদ্যোক্তার মাইন্ডম্যাপ \n\n\n ৩৫৪/-');
assert.equal(r.quotedTotal, 354);
assert.equal(r.deliveryCharge, 60);
assert.equal(r.city, 'ঢাকা');

// 13. Labelled division / district / thana and two labels on one line.
r = read('01900000013\n\n\nজিল্লুর মিয়া \n\n\nবিভাগ: সিলেট\nজেলা: হবিগঞ্জ \nথানা: নবীগঞ্জ। \nস্থয়াী ঠিকানা: ফুলতলি বাজার। রিসিভের জায়গা: মাজার গেইট। \n\n\nপ্রোডাক্টিভ মুসলিম \nক্যাশ অন ডেলিভারি ৩৯০/-');
assert.equal(r.name, 'জিল্লুর মিয়া');
assert.equal(r.address, 'ফুলতলি বাজার, মাজার গেইট, নবীগঞ্জ, হবিগঞ্জ, সিলেট');
assert.equal(r.city, 'হবিগঞ্জ');

// 14. Quantities, bKash, a Dhaka suburb.
r = read('01700000014\nরিনা আক্তার\nআশুলিয়া, সাভার\nদ্য বারাকাহ ইফেক্ট x2\nকুরআন বোঝার মজা ৩ কপি\nবিকাশে পেইড ১২৫০ টাকা');
assert.deepEqual(books(r), ['দ্য বারাকাহ ইফেক্ট x2', 'কুরআন বোঝার মজা x3']);
assert.equal(r.paymentType, 'BKASH');
assert.equal(r.quotedTotal, 1250);
assert.equal(r.city, 'ঢাকা');

// 15. Several orders pasted at once (with chatter between): the first is read, the rest counted.
const many = '[7/11/26, 2:09:47 PM] Amol Books: Kayes\n01700000015\nNew market \nKhulna\n\nপ্রোডাক্টিভ মুসলিম \nক্যাশ অন ডেলিভারি ৩৯০/-\n' +
  '[7/11/26, 4:15:57 PM] Amol Books: @⁨Staff Name⁩ shobaz er gula add koiro\n' +
  '[7/11/26, 5:50:39 PM] Amol Books: 01600000016\n\nকরিম\nজয়রা, মানিকগঞ্জ\nপ্রোডাক্টিভ মুসলিম\nক্যাশ অন ডেলিভারি ৩৯০/-';
r = read(many);
assert.equal(r.name, 'Kayes');
assert.equal(r.address, 'New market, Khulna');
assert.equal(r.city, 'খুলনা');
assert.equal(r.messages, 2);
assert.ok(r.warnings.some((w) => /2 orders/.test(w)));

// 16. Nothing usable.
r = read('hello');
assert.ok(r.warnings.some((w) => /No phone number/.test(w)));

// Orders page: the popup asks the server first and keeps the old rules as a fallback.
const page = fs.readFileSync(path.join(root, 'api/upload/static/custom-orders.html'), 'utf8');
for (const needle of ["API + '/api/order-assist/parse'", 'function aiLocalExtract(raw)', 'id="aiWarnings"', 'id="aiUnmatched"', 'id="aiFound"']) {
  assert.ok(page.includes(needle), 'Orders page has ' + needle);
}

console.log('Order assist: phones (Bengali digits, +880, a second number), labels, name/address in any order, books matched despite typos and Banglish/English, books not in the shop listed, quantities, payment, delivery from the quoted total, price mismatch, several messages and the popup wiring pass');
