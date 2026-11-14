// Checks for the automatic delivery charge by location (gtm-snippets/delivery-zone-core.js and
// where it is wired in). Run from the repo root: node scripts/check-delivery-zone.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Loaded the way the API loads it (plain script with a module object), whatever package.json says.
function loadCore() {
  const file = path.join(__dirname, '..', 'gtm-snippets', 'delivery-zone-core.js');
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  return sandbox.module.exports;
}
const zone = loadCore();

const detect = (text) => {
  const d = zone.detect(text);
  return [d.district || '', d.area || '', zone.zoneFor(d.district, d.area)];
};

// Address text -> district/area -> zone.
assert.deepEqual(detect('House 12, Road 5, Mirpur 10, Dhaka'), ['dhaka', 'mirpur', 'inside']);
assert.deepEqual(detect('বাসা ১২, উত্তরা সেক্টর ৭'), ['dhaka', 'uttara', 'inside']);
assert.deepEqual(detect('Gulshan 2'), ['dhaka', 'gulshan', 'inside']);
assert.deepEqual(detect('মোহাম্মদপুর, ঢাকা'), ['dhaka', 'mohammadpur', 'inside']);
assert.deepEqual(detect('ফেনী সদর, ফেনী'), ['feni', '', 'outside']);
assert.deepEqual(detect('Feni sadar'), ['feni', '', 'outside']);
assert.deepEqual(detect('সাভার, ঢাকা'), ['dhaka', 'savar', 'outside']);
assert.deepEqual(detect('Ashulia Baipail'), ['dhaka', 'ashulia', 'outside']);
assert.deepEqual(detect('Keraniganj, Dhaka'), ['dhaka', 'keraniganj', 'outside']);
assert.deepEqual(detect('Tongi, Gazipur'), ['gazipur', '', 'outside']);
assert.deepEqual(detect('Station road, Tongi'), ['gazipur', '', 'outside']);
assert.deepEqual(detect('Fatullah'), ['narayanganj', '', 'outside']);
assert.deepEqual(detect('নারায়ণগঞ্জ'), ['narayanganj', '', 'outside']);
assert.deepEqual(detect('নারায়ণগঞ্জ'), ['narayanganj', '', 'outside'], 'য় typed as one character (U+09DF)');
assert.deepEqual(detect('Agrabad, Chittagong'), ['chattogram', '', 'outside']);
assert.deepEqual(detect('Comilla'), ['cumilla', '', 'outside']);
assert.deepEqual(detect("Cox's Bazar"), ['coxsbazar', '', 'outside']);
assert.deepEqual(detect('কক্সবাজার'), ['coxsbazar', '', 'outside']);
assert.deepEqual(detect('ফেনীতে থাকি'), ['feni', '', 'outside'], 'Bengali endings still match');
assert.deepEqual(detect('Dhaka'), ['dhaka', '', null], 'Dhaka alone needs an area');
assert.deepEqual(detect('Road 3, House 9'), ['', '', null]);
// Other district written after Dhaka (e.g. office in Dhaka, deliver to Feni): the later one wins.
assert.deepEqual(detect('মিরপুর, ঢাকা থেকে ফেনী'), ['feni', '', 'outside']);
// Thana names every town has do not guess Dhaka on their own.
assert.deepEqual(detect('Kotwali thana road'), ['', '', null]);
assert.deepEqual(detect('Kotwali, Dhaka'), ['dhaka', '', null]);
assert.deepEqual(detect('Old Dhaka, Kotwali'), ['dhaka', 'kotwali', 'inside']);
// No false matches inside longer words: Bholahat is an upazila of Chapai Nawabganj, not Bhola.
assert.deepEqual(detect('Bholahat road'), ['chapainawabganj', '', 'outside']);
assert.deepEqual(detect('Titas gas office, Kasba road'), ['', '', null], 'Everyday words are not upazilas');

// Addresses as customers wrote them (owner's order list, 2026-11-14: 100 orders, all right), with
// names, phone numbers, house numbers and workplaces taken out. "Dhaka" with no area counts as Dhaka
// city, as at checkout.
const IN = 'dhaka:inside';
const OUT = 'dhaka:outside';
const REAL = [
  ['Dhaka,jatrabari,kazla,demra,road. Dr lab er samne', IN],
  ['C/o grocery shop Nutunpara road, Sadar, Khagrachari.', 'khagrachhari'],
  ['CR Datta road, L9, dhaka', IN],
  ['Medical center,Tejgaon, Dhaka', IN],
  ['Abed Moor , Ishwardi, Pabna', 'pabna'],
  ['Borogola, Tinpoitti, Bogura', 'bogura'],
  ['Flat No-B-4, Road No-10, Apartment, Dhanmondi.', IN],
  ['লন্ডনীরোড, সুবিদ বাজার ,সিলেট', 'sylhet'],
  ['Radio colony, Savar,Dhaka', OUT],
  ['ছাত্রী নিবাস, কাদিরগঞ্জ, বোয়ালিয়া, রাজশাহী', 'rajshahi'],
  ['Village:Chashapara, P.O: dhanaitory,Sadar Dakshin, Cumilla', 'cumilla'],
  ['WASA Bhaban Kawran bazar Dhaka office day office hour 8-3 pm', IN],
  ['জাউয়া বাজার, ছাতক,সুনামগঞ্জ', 'sunamganj'],
  ['শ্যামপুর গোসাইবাড়ি ফরিদাবাদ, সূত্রাপুর, ঢাকা', IN],
  ['বেলতলি বাজার, চিরির বন্দর, দিনাজপুর', 'dinajpur'],
  ['Road No- 7/B, Block- H, Banani Model Town, Dhaka-1213.', IN],
  ['flate 2a,Bangla sharok,Taliyoffice,, Dhaka', IN],
  ['সিংগার পাড়া, ভেন্ডাবাড়ি, পীরগঞ্জ, রংপুর', 'rangpur'],
  ['ইমামগঞ্জ ঢাল (ব্যাংক), চকবাজার, ঢাকা-১২১১।', IN],
  ['জোনাইল,বড়াইগ্রাম, নাটোর', 'natore'],
  ['dhanmondi 19 , dhaka', IN],
  ['কালা চাঁদপাড়া, পাবনা।', 'pabna'],
  ['গফরগাঁও চর আলগী', 'mymensingh'],
  ['Muksudpur, Gopalgonj', 'gopalganj'],
  ['মাধ্যমিক বিদ্যালয়, শালিকা, মাগুড়া', 'magura'],
  ['Riajbagh ,Road no 5,Khilgaon, Dhaka', IN],
  ['হাজীপাড়া, সুনামগঞ্জ সদর', 'sunamganj'],
  ['Upazila Fisheries Office, Madhukhali, Faridpur', 'faridpur'],
  ['পশ্চিমপাড়া, ১০নং ওয়ার্ড, কোনাবাড়ি মেট্রো থানা, গাজীপুর সিটি।', 'gazipur'],
  ['হেড কোয়ার্টার, উত্তরা, ঢাকা', IN],
  ['Mujib Sarak, Jashore', 'jashore'],
  ['Habigonj banichonj borobazar', 'habiganj'],
  ['East boxnagor, madraser mor,sarulia,demra,dhaka', IN],
  ['ফুলবাড়িগেট, দৌলতপুর, খুলনা', 'khulna'],
  ['চুনারুঘাট বাজার, হবিগঞ্জ', 'habiganj'],
  ['পুরান পাড়া। ৩ নং ওয়ার্ড। বি সি সি। বরিশাল।', 'barishal'],
  ['Choto Godair Char, Madhabdi, Narsingdi', 'narsingdi'],
  ['Road 11, Block J, Baridhara, Dhaka', IN],
  ['Road- s-1/A, Pallabi 2 nd, Eastern Housing, Mirpur.', IN],
  ['Dhaka shewrapara', IN],
  ['Road 2, Block E, Banasree, Rampura, Dhaka, Bangladesh', IN],
  ['বড় চৌরাস্তা, পটুয়াখালী সদর, পটুয়াখালী। নোট: (অন্য কুরিয়ার হলে ভালো হবে)', 'patuakhali'],
  ['nuton bazar khepupara patuakhili', 'patuakhali'],
  ['gendria fireservice road', IN],
  ['Murarikati, kalaroa, Satkhira', 'satkhira'],
  ['National Science and Technology Complex, Agargaon, Dhaka', IN],
  ['Motijheel, 4th floor Dhaka', IN],
  ['Joypurhat Railway Station,Joypurhat.', 'joypurhat'],
  ['Road:7, Block:B, Banasree, Dhaka.', IN],
  ['Road -03, Block-B, Banaaree, Rampura,Dhaka -1219.', IN],
  ['হযরত পারা। ১৮বং ওয়াড, সিটি করপোরেশন কুমিল্লা। জিলা কুমিল্লা।', 'cumilla'],
  ['চকবাজার থানা', IN],
  ['Kathalbagan bazar, Dhanmondi, Dhaka', IN],
  ['Sunamganj, chhatak, Islam bazar, Pandob', 'sunamganj'],
  ['Hospital road, Cinema Hall Para, Chuadanga sadar, Chuadanga.', 'chuadanga'],
  ['Green Road, College, Dhaka 1215', IN],
  ['Department of English, Govt. College, Satkhira', 'satkhira'],
  ['Degree College, College Road, Sherpur, Bogura', 'bogura'],
  ['Block H, South bonosree Rampur Dhaka', IN],
  ['পশ্চিম শেওড়াপাড়া, আনন্দ বাজার', IN],
  ['Islam Nagar,Jahangirnagar University,Savar,Dhaka', OUT],
  ['block k, Road 13,South banashree', IN],
  ['কালিকাপুর (মাস্টারপাড়া), বনপাড়া, নাটোর', 'natore'],
  ['Sector: 9 Uttara Model Town, Dhaka -1230.', IN],
  ['Department Of Economics, Govt College Meherpur.', 'meherpur'],
  ['Muradpur high school road Jurain, Biri Factory, Dhaka-1204', IN],
  ['Near at Savar model college. Chapain savar dhaka,', OUT],
  ['জেলা প্রশাসকের কার্যালয় বগুড়া', 'bogura'],
  ['পূব রাজার বাজার, আমতলা, ফামগেইট, ঢাকা -১২১৫', IN],
  ['Tulshipur, Pachdona, Narsingdi Sadar, Narsingdi', 'narsingdi'],
  ['পুরাতন রাজস্ব ভবন, সেগুনবাগিচা, ঢাকা ১০০০', IN],
  ['Village West Deovhog. Post+ Dist- Munshiganj.', 'munshiganj'],
  ['Masdair Bazar, Narayanganj sadar, Narayanganj', 'narayanganj'],
  ['গ্রাম- ডুমুর তলা, পো- নওয়াপাড়া, থানা- অভয়নগর, জেলা- যশোর।', 'jashore'],
  ['soltgala rail crossing, bandar, chattagram.', 'chattogram'],
  ['বারিধারা গাইবান্ধা সদর গাইবান্ধা', 'gaibandha'],
  ['ঝাউতলা লেন, পূর্বমজমপুর কুস্টিয়া ৭০০০', 'kushtia'],
  ['Mollartek school rode dakshin khan dhaka-1230 3rd Floor', IN],
  ['Green view housing society,oxygen,bayezid,Chattagram', 'chattogram'],
  ['KHOCHABARY(E.S.D.O), SADAR, LALMONIRHAT.', 'lalmonirhat'],
  ['University, Sector #13,Uttara, Dhaka 1230', IN],
  ['রোড নং-৩ ব্লক ডি সেক্টর-১ আফতাবনগর,  ঢাকা', IN],
  ['Gaznabi rd, Mohammadpur,  Dhaka', IN],
  ['মান্দারী আমিন বাজার, চন্দ্রগন্জ, লক্ষীপুর', 'lakshmipur'],
  ['Road no.18, Sector no 7, Utrara,Dhaka.', IN],
  ['Dhunat,Chander para', 'bogura'],
  ['সাভার নিউ মার্কেট সাভার ঢাকা', OUT],
  ['Road # 04, Shekhertek, Mohammadpur, Dhaka 1207', IN],
  ['Road#03, Aftabnagar Badda.', IN],
  ['Avenue 2 Mirpur DOHS Mirpur Cantonment Pallabi Dhaka', IN],
  ['North Ibrahim pur Mirpur-14, Dhaka', IN],
  ['Mirpur-06, block-A ,road-02', IN],
  ['Tejgaon Industrial Area, Dhaka-1208', IN],
  ['Road-9, sector-10, Uttara.', IN],
  ['বাজার জগৎপুর কচুয়া চাঁদপুর', 'chandpur'],
  ['Road 504G, Sector 16 JOLSHIRI ABASHON, Purbachal', 'narayanganj'],
  ['কদমতলী শনিআখরা পলাশপুর ২ নং রোড মাদ্রাসা', IN],
  ['Uttarkhan primary school road Balurmath', IN],
  // Second export (300 orders; zone checked against the courier charge of each delivered order).
  ['Chowdhury more.kaligonj.Lalmonirhat. rongpur', 'lalmonirhat'],
  ['বিভাগ: সিলেট, জেলা: হবিগঞ্জ, থানা: নবীগঞ্জ', 'habiganj'],
  ['University, Rangpur Road, Baghopara, Gokul, Bogura- 5800', 'bogura'],
  ['Keshorgonj.Fulbaria. mymensingh', 'mymensingh'],
  ['জেলা, নারায়ন গঞ্জ, থানা, বন্দর, সোনাকান্দা স্কুল মাঠ সংলগ্ন', 'narayanganj'],
  ['ইসলামি ব্যাংক জোনাল অফিস বগুডা', 'bogura'],
  ['Keranigong kodomtuli', OUT],
  ['Bangladesh sectetariat, gate 1', IN],
  ['মন্ত্রণালয়, সচিবালয় লিংক রোড', IN],
  ['Goldigir pad মারকাজ মসজিদ।ককসবাজার', 'coxsbazar'],
  ['উচ্চ বিদ্যালয়, কিশোরগঞ্জ, নীলফামারী।', 'nilphamari'],
  ['বড় ইন্দারা মোড় (ঢাকা ব্যাংক বিল্ডিং), চাঁপাইনবাবগঞ্জ', 'chapainawabganj'],
  ['বাহাদুরপুর, হেমায়েতপুর,পাবনা সদর, পাবনা', 'pabna'],
  ['Fulltola. muksudpur. dohar. Dhaka', OUT],
  ['শহিদ মিনার, কাশিমপুর নবাবগঞ্জ ঢালা ১৩২০', OUT],
  ['mills ltd.post office road fatullah. n.gonj', 'narayanganj'],
  ['Siddhirgonj pul narayangonj kenalpar', 'narayanganj'],
  ['Dhaka boat club, sector 18, uttara, uttara', IN],
  ['agargao costgard sodordoptor serebangla nogor daka-', IN],
  ['ঢাকা বারিদারা ডিওএস', IN],
  ['Murgitula mur old dhaka', IN],
  ['Matuail madical kodomtole Dhaka .', IN],
  ['সাভার পাকিজা', OUT],
  ['barobaria, Dhamrai,savar', OUT],
  ['এশিয়ান ইউনিভার্সিটি, আশুলিয়া, আশুলিয়া', OUT],
  ['• জেলা: লালমনিরহাট • থানা/উপজেলা: কালীগঞ্জ • স্থান/পোস্ট অফিস: চামটাহাট', 'lalmonirhat'],
  ['অষ্টগ্রাম বাজার, উপজেলাঃ বি বাড়িয়া সদর। জেলাঃ বি বাড়িয়া', 'brahmanbaria'],
  ['Cantonment Jamuna Bridge , Tangail', 'tangail'],
  ['মইনুল রোড, ঢাকা সেনানিবাস', IN],
  ['Kapasia bazar, Gazipur', 'gazipur'],
  ['Titas Gas Road,Tongi Station Road, Tongi-Gazipur.', 'gazipur'],
  ['Dhap medical more, rangppur', 'rangpur'],
  ['Parulia,debhata,saatkhirra', 'satkhira'],
  ['Hagigonj, chandpur', 'chandpur'],
  ['Akkelpur bazar, Jaypurhat', 'joypurhat'],
  ['Harishpur sandwip Chittagong', 'chattogram'],
  ['Chawk bazer aman Ali road rahatterpool bakalia ctg', 'chattogram'],
  ['Sonali bank plc sirajganj br.sirajganj sadar.ppst-code-6700', 'sirajganj'],
  ['Horinarayanpur, eb,kushtia', 'kushtia'],
  ['Vagjot nobogram high school ar pase,dulatpur,kustia', 'kushtia'],
  ['আদি টাংগাইল নুর মসজিদ ,ট্ংগাইল মদর,ট্যংগাইল', 'tangail'],
  ['বড়উধা/সারপার/বিয়ানীবাজার/সিলেট', 'sylhet'],
  ['জেলা সিলেট উপজেলা উপজেলা গোয় গাট', 'sylhet'],
  ['মাদারীপুর সদর মহিশের চর', 'madaripur'],
  ['লক্ষীপুর সদর', 'lakshmipur'],
  ['উত্তর চকযদু (টিএনটি মোড় )উপজেলাঃ ধাম্ইরহাট । জেলাঃ নওগাঁ ।', 'naogaon'],
  ['উকিল পাড়া, নওগা সদর, নওগাঁ', 'naogaon'],
  ['উত্তর মান্ডা (নতুন), ঢাকা ১২১৪, মুগদা থানা রোড', IN],
  ['nikunja 2 road 10 er piccim dike khilkhet', IN],
  ['Korail bow Bazar,Dhaka,Banani', IN],
  ['Boatghat, Namapara, Khilkhet', IN],
  ['Uttarkhan Madarbari', IN],
  ['গোপালগন্জ সদর , বাধন পেপার পুরাতন বাজার', 'gopalganj'],
  ['কল্পলোক আবাসিক বাকলিয়া থানার সামনে চট্রগ্রাম', 'chattogram'],
  ['থানা জেলা পোস্ট :মৌলভীবাজার জেলা সদর রঘুনন্দনপুর', 'moulvibazar'],
  // Nothing to go on: the customer picks.
  ['রোড# ১২, সেক্টর #০৯, উ', ''],
  ['katakhali bidduthkendro 50 megawawat piking', ''],
];
const placeOf = (address) => {
  const found = zone.detect(address);
  const area = found.district === 'dhaka' ? found.area || 'dhaka-city-other' : '';
  return { key: found.district === 'dhaka' ? 'dhaka:' + zone.zoneFor('dhaka', area) : found.district || '', district: found.district, area };
};
for (const [address, want] of REAL) {
  const place = placeOf(address);
  assert.equal(place.key, want, address);
  // Picked as detected, nothing to warn about.
  if (want) assert.equal(zone.mismatch({ district: place.district, area: place.area }, address), '', 'no warning: ' + address);
}
assert.equal(JSON.stringify(zone.detect('Building complex hospital apartment university department market')), '{}', 'Long everyday words are not district typos');
assert.ok(zone.UPAZILAS.length > 300, 'Upazila table loaded');

// Banglish written by ear (owner typed "borishal" and nothing was picked).
const BANGLISH = {
  borishal: 'barishal', borisal: 'barishal', rongpur: 'rangpur', vola: 'bhola', nowakhali: 'noakhali', komilla: 'cumilla',
  gajipur: 'gazipur', mymensing: 'mymensingh', moymonsingh: 'mymensingh', chottogram: 'chattogram', joshor: 'jashore',
  silet: 'sylhet', habigonj: 'habiganj', kishorgonj: 'kishoreganj', narayongonj: 'narayanganj', pobna: 'pabna',
  rajshai: 'rajshahi', brammonbaria: 'brahmanbaria', moulovibazar: 'moulvibazar', tangile: 'tangail', nator: 'natore',
  jhinaidah: 'jhenaidah', kustia: 'kushtia', shariotpur: 'shariatpur', lokkhipur: 'lakshmipur', meherpur: 'meherpur',
};
for (const [typed, district] of Object.entries(BANGLISH)) assert.equal(zone.detect(typed).district, district, typed);
assert.deepEqual(detect('Mirpur 2'), ['dhaka', 'mirpur', 'inside'], 'Mirpur is not Meherpur');
assert.deepEqual(detect('Mohakhali DOHS'), ['dhaka', 'mohakhali', 'inside']);
// Folded place names never equal each other across places, nor everyday address words.
const owners = {};
const own = (name, key) => { const n = zone.norm(name); if (n) (owners[n] = owners[n] || new Set()).add(key); };
zone.DISTRICTS.forEach((d) => d.slice(1).forEach((n) => own(n, d[0])));
zone.DHAKA_CITY.forEach((a) => a.slice(1).forEach((n) => own(n, 'dhaka:inside')));
zone.DHAKA_OUTER.forEach((a) => a.slice(1).forEach((n) => own(n, 'dhaka:' + a[0])));
zone.UPAZILAS.forEach((u) => u.slice(1).forEach((n) => own(n, u[0])));
assert.deepEqual(Object.entries(owners).filter(([, keys]) => keys.size > 1).map(([n]) => n), [], 'No two places look alike');
const WORDS = 'road house flat block sector lane para bazar market mosque masjid madrasa school college office near village post thana upazila union ward floor building tower apartment colony more mor bus stand station hospital clinic bari gram sadar city town east west north south new old main samne pashe gate shop bank moholla nagar ghat char bridge chowrasta park garden villa bhaban complex center centre medical pharmacy mondir home bhai';
assert.deepEqual(WORDS.split(' ').filter((w) => owners[zone.norm(w)]), [], 'Everyday address words are not places');

// Chosen district vs address text.
assert.equal(zone.mismatch({ district: 'dhaka', area: 'mirpur' }, 'ফেনী সদর'), 'ফেনী');
assert.equal(zone.mismatch({ district: 'dhaka', area: 'mirpur' }, 'Savar bus stand'), 'সাভার');
assert.equal(zone.mismatch({ district: 'dhaka', area: 'mirpur' }, 'Mirpur 10, Dhaka'), '');
assert.equal(zone.mismatch({ district: 'dhaka', area: 'savar' }, 'Savar, Dhaka'), '');
assert.equal(zone.mismatch({ district: 'feni' }, 'Feni'), '');
assert.equal(zone.mismatch({ district: 'feni' }, 'House 3, Road 2'), '', 'Nothing named, nothing to flag');
assert.equal(zone.mismatch({ district: 'feni' }, 'Mirpur, Dhaka'), 'ঢাকা');

assert.equal(zone.zoneFor('dhaka', 'dhaka-city-other'), 'inside');
assert.equal(zone.zoneFor('nowhere', ''), null);
assert.equal(zone.DISTRICTS.length, 64, 'All 64 districts');
assert.equal(new Set(zone.DISTRICTS.map((d) => d[0])).size, 64);

// Charge by zone and weight, as the storefront does.
const shipping = {
  deliveryInDhaka: 60,
  deliveryOutsideDhaka: 75,
  insideDhakaRules: [{ fromGram: 0, toGram: 1000, cost: 60 }, { fromGram: 1001, toGram: 2000, cost: 80 }],
  outsideDhakaRules: [{ fromGram: 0, toGram: 1000, cost: 75 }, { fromGram: 1001, toGram: 2000, cost: 95 }],
};
assert.equal(zone.chargeFor('inside', 500, shipping), 60);
assert.equal(zone.chargeFor('inside', 1500, shipping), 80);
assert.equal(zone.chargeFor('outside', 500, shipping), 75);
assert.equal(zone.chargeFor('outside', 1500, shipping), 95);
assert.equal(zone.chargeFor('outside', 99999, shipping), 75, 'No matching tier: base charge');
assert.equal(zone.chargeFor(null, 500, shipping), null);
assert.equal(zone.weightGram(1.2), 1200);
assert.equal(zone.weightGram(350), 350);

assert.equal(zone.withLocation('House 5, Road 2', { district: 'dhaka', area: 'mirpur' }), 'House 5, Road 2, মিরপুর, ঢাকা');
assert.equal(zone.withLocation('Mirpur 10, Dhaka', { district: 'dhaka', area: 'mirpur' }), 'Mirpur 10, Dhaka');
assert.equal(zone.withLocation('ফেনী সদর', { district: 'feni' }), 'ফেনী সদর');
assert.equal(zone.withLocation('Station road', { district: 'feni' }), 'Station road, ফেনী');
assert.equal(zone.label({ district: 'dhaka', area: 'uttara' }), 'উত্তরা, ঢাকা');
// Meta town: English, letters only, the spelling Facebook uses for renamed districts.
assert.deepEqual(['dhaka', 'feni', 'chattogram', 'cumilla', 'coxsbazar', 'chapainawabganj', 'nowhere'].map(zone.metaCity),
  ['dhaka', 'feni', 'chittagong', 'comilla', 'coxsbazar', 'chapainawabganj', '']);

// Wiring: the checkout picker, the script route, the order hook and the dashboard.
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const picker = read('gtm-snippets/checkout-location.js');
const loader = read('gtm-snippets/checkout-location-loader.html');
const main = read('api/src/main.ts');
const pages = read('api/src/pages/review-request/review-request.controller.ts');
const service = read('api/src/shared/delivery-zone/delivery-zone.service.ts');
const orders = read('api/src/pages/sales/order/order.service.ts');
const orderModule = read('api/src/pages/sales/order/order.module.ts');
const schema = read('api/src/schema/order.schema.ts');
const dashboard = read('api/upload/static/custom-orders.html');
assert.match(main, /'checkout-location-loader\.html',/, 'Loader is a storefront snippet');
assert.match(loader, /\/storefront-page\/checkout-location\.js/, 'Loader loads the picker on /checkout');
assert.match(pages, /'checkout-location\.js': \['delivery-zone-core\.js', 'checkout-location\.js'\]/, 'Picker is served with the shared rules first');
assert.match(picker, /input\[type="radio"\]\[value="' \+ \(where === 'inside' \? '1' : '2'\) \+ '"\]/, 'District sets the inside / outside choice');
assert.match(picker, /\.ab-dl-locked\{pointer-events:none\}/, 'Charge choice cannot be changed by hand');
assert.match(picker, /if \(!state\.district \|\| !zone\(\)\) \{\s*stop\(\);/, 'No order without a district');
assert.match(picker, /role="combobox"/, 'District is a search box, not a dropdown');
assert.match(picker, /found\.area \|\| \(state\.district === 'dhaka' && state\.area \? state\.area : CITY_OTHER\)/, 'Dhaka alone in the address counts as Dhaka city');
assert.match(picker, /data\.city = Z\.metaCity\(state\.district\);/, 'Order request carries the town for Meta');
assert.match(picker, /__amolRememberMetaCustomer\(\{ city: city \}\)/, 'Town kept for the visitor\'s Meta events');
assert.match(picker, /data\.deliveryLocation = \{/, 'Order request carries the district');
assert.match(service, /clientCharge !== expected && clientCharge !== base/, 'API keeps a right charge and replaces a wrong one');
assert.match(service, /mismatch \? address : zone\.withLocation/, 'District not added to an address naming another place');
assert.match(service, /city: districtEntry\[2\],/, 'District in English is the order city');
assert.match(service, /metaCity: zone\.metaCity\(district\),/, 'Order keeps the Meta town');
assert.match(orders, /this\.deliveryZoneService\?\.forOrder\(/, 'New orders get the district charge');
assert.match(orders, /deliveryLocation: deliveryLocation\?\.record,/, 'Orders store the district');
assert.match(orders, /city: deliveryLocation \? deliveryLocation\.city : orderData\?\.city,/, 'Order city is the district');
assert.equal((orders.match(/deliveryLocation\?\.metaCity \|\|/g) || []).length, 2, 'Both server Meta Purchase paths use the district as ct');
const metaMatch = read('gtm-snippets/meta-match-data.html');
assert.match(metaMatch, /ct: city \? sha256\(city\) : null/, 'Browser keeps the town hashed');
assert.match(metaMatch, /\['ph', 'em', 'fn', 'ln', 'ct'\]/, 'Storefront Meta events get the town');
assert.match(metaMatch, /ct: 'city' \}/, 'Checkout Data Tag events get the town');
const gtmImport = JSON.parse(read('gtm-snippets/GTM-NNZV54QJ_checkout-customer-data.json'));
for (const tag of gtmImport.containerVersion.tag) {
  const rows = tag.parameter.find((p) => p.key === 'user_data').list.map((row) => Object.fromEntries(row.map.map((m) => [m.key, m.value])));
  assert.ok(rows.some((row) => row.name === 'city' && row.value === '{{dlv - user_data.city}}'), tag.name + ' maps city');
}
// The storefront's purchase tracking reads the request's city into user_data.city.
assert.match(read('ui/dist/angular-ui/browser/index.html'), /if\(req\.city\)ud\.city=req\.city\.trim\(\)\.toLowerCase\(\);/, 'Purchase tracking sends the request city');
assert.match(orderModule, /DeliveryZoneModule,/, 'Order module imports the delivery zone module');
assert.match(schema, /deliveryLocation: \{\r?\n\s+type: \{/, 'Order schema has the district');
assert.match(dashboard, /division:1, area:1, zone:1, deliveryLocation:1,/, 'Dashboard loads the district');
assert.match(dashboard, /'<\/div>'\+zoneChip\(o\)\+'<\/td>'/, 'Dashboard shows the district under the address');
assert.match(dashboard, /ঠিকানা মিলছে না: /, 'Dashboard flags an address that names another place');
// Abandoned checkouts (Incomplete Orders) keep the district and pass it to the order made from them.
const incompleteSchema = read('api/src/schema/incomplete-order.schema.ts');
assert.match(picker, /args\[0\] = this\.__abOrderPost \? withPlace\(body\) : withPlaceIncomplete\(body\);/, 'Incomplete-order saves (XHR) carry the district');
assert.match(picker, /INCOMPLETE_URL\.test\(url\)\) \{[\s\S]*?withPlaceIncomplete\(init\.body\)/, 'The save on tab close (keepalive fetch) carries the district');
assert.match(picker, /request\.open\('PUT', incomplete\.base \+ '\/api\/order\/update-incomplete-order-by-id\/'/, 'A district picked later updates the saved incomplete order');
assert.match(orders, /if \(incompleteInput\.deliveryLocation\) await this\.syncIncompleteDeliveryCharge\(id\);/, 'Saved incomplete orders get the district charge');
assert.match(service, /async chargeForSaved\(location: any, orderedItems: any\[\], current: number\)/, 'Charge check for saved incomplete orders');
// The check never moves a saved row off a charge that is right for its district.
const INCOMPLETE_URL = /^(.*?)\/api\/order\/(?:add-incomplete-order-by-(?:user|anonymous)|update-incomplete-order-by-id\/([^/?#]+))(?:[?#]|$)/;
assert.deepEqual(INCOMPLETE_URL.exec('https://apisub.amolbooks.com/api/order/update-incomplete-order-by-id/abc123').slice(1), ['https://apisub.amolbooks.com', 'abc123']);
assert.ok(INCOMPLETE_URL.test('/api/order/add-incomplete-order-by-anonymous') && !INCOMPLETE_URL.test('/api/order/add-order-by-anonymous'));
assert.ok(picker.includes(String(INCOMPLETE_URL).slice(1, -1)), 'Same pattern as the checkout script');
assert.match(service, /describe\(input: any, address\?: string\)/, 'API checks and describes the district for incomplete orders');
assert.match(orders, /this\.applyIncompleteDeliveryLocation\(incompleteInput\);[\s\S]*?this\.applyIncompleteDeliveryLocation\(incompleteInput\);/, 'Both incomplete-order routes (add and update) keep the district');
assert.match(orders, /'attribution',\r?\n\s+'deliveryLocation',\r?\n\s+\],/, 'The public update route may set the district');
assert.match(orders, /'attribution',\r?\n\s+'deliveryLocation',\r?\n\s+\];/, 'A repeat checkout by the same phone merges the district');
assert.match(orders, /select\('attribution adminNote adminNoteBy adminNotes orderedItems deliveryLocation'\)/, 'Converting reads the district');
assert.match(orders, /mData\.deliveryLocation = convertedIncomplete\.deliveryLocation;/, 'Converted orders keep the district');
assert.match(incompleteSchema, /deliveryLocation: \{\s+type: \{\s+district: String,/, 'Incomplete order schema has the district');
assert.equal((dashboard.match(/zoneChip\(o\)/g) || []).length, 2, 'District chip on order and incomplete rows');

console.log('Delivery zone checks passed');
