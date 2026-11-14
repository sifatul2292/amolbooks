/* Delivery zone for an address in Bangladesh (owner, 2026-11-14: customers outside Dhaka were
   choosing the Dhaka delivery charge). One file for the checkout page (window.AbDeliveryZone) and
   the API (require), so both decide the same way:
   - district other than Dhaka                      -> outside Dhaka charge
   - Dhaka district, Dhaka city area                -> inside Dhaka charge
   - Dhaka district, Savar/Ashulia/Keraniganj/...   -> outside Dhaka charge
   The charge for a zone follows the shop's weight rules (shipping-charge: insideDhakaRules /
   outsideDhakaRules), exactly like the storefront's own checkout.
   Each place: [id, Bengali, English, other spellings...]. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AbDeliveryZone = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var DISTRICTS = [
    // Dhaka division
    ['dhaka', 'ঢাকা', 'Dhaka'],
    ['faridpur', 'ফরিদপুর', 'Faridpur'],
    ['gazipur', 'গাজীপুর', 'Gazipur', 'গাজিপুর'],
    ['gopalganj', 'গোপালগঞ্জ', 'Gopalganj', 'gopalgonj'],
    ['kishoreganj', 'কিশোরগঞ্জ', 'Kishoreganj', 'kishorganj', 'kishoregonj'],
    ['madaripur', 'মাদারীপুর', 'Madaripur', 'মাদারিপুর'],
    ['manikganj', 'মানিকগঞ্জ', 'Manikganj', 'manikgonj'],
    ['munshiganj', 'মুন্সীগঞ্জ', 'Munshiganj', 'মুন্সিগঞ্জ', 'munsiganj', 'munshigonj'],
    ['narayanganj', 'নারায়ণগঞ্জ', 'Narayanganj', 'নারায়নগঞ্জ', 'narayangonj', 'n.gonj', 'n.ganj'],
    ['narsingdi', 'নরসিংদী', 'Narsingdi', 'নরসিংদি', 'narsindi', 'norsingdi'],
    ['rajbari', 'রাজবাড়ী', 'Rajbari', 'রাজবাড়ি'],
    ['shariatpur', 'শরীয়তপুর', 'Shariatpur', 'শরিয়তপুর', 'soriotpur'],
    ['tangail', 'টাঙ্গাইল', 'Tangail', 'টাংগাইল', 'tangile'],
    // Chattogram division
    ['bandarban', 'বান্দরবান', 'Bandarban'],
    ['brahmanbaria', 'ব্রাহ্মণবাড়িয়া', 'Brahmanbaria', 'ব্রাহ্মনবাড়িয়া', 'বি বাড়িয়া', 'b baria', 'bbaria'],
    ['chandpur', 'চাঁদপুর', 'Chandpur', 'চাদপুর'],
    ['chattogram', 'চট্টগ্রাম', 'Chattogram', 'চট্রগ্রাম', 'chittagong', 'ctg'],
    ['cumilla', 'কুমিল্লা', 'Cumilla', 'comilla', 'kumilla'],
    ['coxsbazar', 'কক্সবাজার', 'Cox\'s Bazar', 'কক্স বাজার', 'coxs bazar', 'cox bazar', 'coxsbazar', 'coxbazar'],
    ['feni', 'ফেনী', 'Feni', 'ফেনি'],
    ['khagrachhari', 'খাগড়াছড়ি', 'Khagrachhari', 'khagrachari'],
    ['lakshmipur', 'লক্ষ্মীপুর', 'Lakshmipur', 'লক্ষীপুর', 'laxmipur', 'lakshipur', 'lokkhipur'],
    ['noakhali', 'নোয়াখালী', 'Noakhali', 'নোয়াখালি'],
    ['rangamati', 'রাঙ্গামাটি', 'Rangamati', 'রাঙামাটি'],
    // Rajshahi division
    ['bogura', 'বগুড়া', 'Bogura', 'bogra'],
    ['joypurhat', 'জয়পুরহাট', 'Joypurhat', 'jaipurhat'],
    ['naogaon', 'নওগাঁ', 'Naogaon', 'নওগা'],
    ['natore', 'নাটোর', 'Natore'],
    ['chapainawabganj', 'চাঁপাইনবাবগঞ্জ', 'Chapai Nawabganj', 'চাঁপাই নবাবগঞ্জ', 'চাপাইনবাবগঞ্জ', 'chapainawabganj', 'chapai', 'চাঁপাই'],
    ['pabna', 'পাবনা', 'Pabna'],
    ['rajshahi', 'রাজশাহী', 'Rajshahi', 'রাজশাহি', 'rajshai'],
    ['sirajganj', 'সিরাজগঞ্জ', 'Sirajganj', 'sirajgonj'],
    // Khulna division
    ['bagerhat', 'বাগেরহাট', 'Bagerhat'],
    ['chuadanga', 'চুয়াডাঙ্গা', 'Chuadanga', 'চুয়াডাঙা'],
    ['jashore', 'যশোর', 'Jashore', 'যশোহর', 'jessore'],
    ['jhenaidah', 'ঝিনাইদহ', 'Jhenaidah', 'jhenaidaha', 'jhinaidah'],
    ['khulna', 'খুলনা', 'Khulna'],
    ['kushtia', 'কুষ্টিয়া', 'Kushtia'],
    ['magura', 'মাগুরা', 'Magura'],
    ['meherpur', 'মেহেরপুর', 'Meherpur'],
    ['narail', 'নড়াইল', 'Narail'],
    ['satkhira', 'সাতক্ষীরা', 'Satkhira'],
    // Barishal division
    ['barguna', 'বরগুনা', 'Barguna'],
    ['barishal', 'বরিশাল', 'Barishal', 'barisal'],
    ['bhola', 'ভোলা', 'Bhola'],
    ['jhalokathi', 'ঝালকাঠি', 'Jhalokathi', 'jhalakathi', 'jhalokati'],
    ['patuakhali', 'পটুয়াখালী', 'Patuakhali', 'পটুয়াখালি'],
    ['pirojpur', 'পিরোজপুর', 'Pirojpur'],
    // Sylhet division
    ['habiganj', 'হবিগঞ্জ', 'Habiganj', 'hobiganj'],
    ['moulvibazar', 'মৌলভীবাজার', 'Moulvibazar', 'মৌলভিবাজার', 'maulvibazar', 'moulvi bazar', 'moulovibazar'],
    ['sunamganj', 'সুনামগঞ্জ', 'Sunamganj'],
    ['sylhet', 'সিলেট', 'Sylhet'],
    // Rangpur division
    ['dinajpur', 'দিনাজপুর', 'Dinajpur'],
    ['gaibandha', 'গাইবান্ধা', 'Gaibandha'],
    ['kurigram', 'কুড়িগ্রাম', 'Kurigram'],
    ['lalmonirhat', 'লালমনিরহাট', 'Lalmonirhat'],
    ['nilphamari', 'নীলফামারী', 'Nilphamari', 'নীলফামারি'],
    ['panchagarh', 'পঞ্চগড়', 'Panchagarh'],
    ['rangpur', 'রংপুর', 'Rangpur'],
    ['thakurgaon', 'ঠাকুরগাঁও', 'Thakurgaon', 'ঠাকুরগাও'],
    // Mymensingh division
    ['jamalpur', 'জামালপুর', 'Jamalpur'],
    ['mymensingh', 'ময়মনসিংহ', 'Mymensingh', 'mymenshingh', 'moymonsingh', 'maimansingh'],
    ['netrokona', 'নেত্রকোণা', 'Netrokona', 'নেত্রকোনা', 'netrakona'],
    ['sherpur', 'শেরপুর', 'Sherpur'],
  ];

  // Districts by division. A division has its main district's name ("..., Lalmonirhat, Rangpur"):
  // when an address names a district and its division, the district is the place.
  var DIVISIONS = {
    dhaka: 'faridpur gazipur gopalganj kishoreganj madaripur manikganj munshiganj narayanganj narsingdi rajbari shariatpur tangail',
    chattogram: 'bandarban brahmanbaria chandpur cumilla coxsbazar feni khagrachhari lakshmipur noakhali rangamati',
    rajshahi: 'bogura joypurhat naogaon natore chapainawabganj pabna sirajganj',
    khulna: 'bagerhat chuadanga jashore jhenaidah kushtia magura meherpur narail satkhira',
    barishal: 'barguna bhola jhalokathi patuakhali pirojpur',
    sylhet: 'habiganj moulvibazar sunamganj',
    rangpur: 'dinajpur gaibandha kurigram lalmonirhat nilphamari panchagarh thakurgaon',
    mymensingh: 'jamalpur netrokona sherpur',
  };
  function inDivision(districtId, divisionId) {
    return !!DIVISIONS[divisionId] && (' ' + DIVISIONS[divisionId] + ' ').indexOf(' ' + districtId + ' ') !== -1;
  }

  // Dhaka district, inside Dhaka city: the inside-Dhaka charge.
  var DHAKA_CITY = [
    ['adabor', 'আদাবর', 'Adabor', 'shyamoli', 'শ্যামলী', 'shamoli'],
    ['agargaon', 'আগারগাঁও', 'Agargaon'],
    ['azimpur', 'আজিমপুর', 'Azimpur'],
    ['badda', 'বাড্ডা', 'Badda'],
    ['banani', 'বনানী', 'Banani'],
    ['bangshal', 'বংশাল', 'Bangshal'],
    ['baridhara', 'বারিধারা', 'Baridhara'],
    ['basabo', 'বাসাবো', 'Basabo'],
    ['bashundhara', 'বসুন্ধরা', 'Bashundhara', 'bashundhara r/a', 'bosundhora'],
    ['cantonment', 'ক্যান্টনমেন্ট', 'Cantonment', 'ঢাকা সেনানিবাস'],
    ['chawkbazar', 'চকবাজার', 'Chawkbazar', 'chowkbazar'],
    ['dakshinkhan', 'দক্ষিণখান', 'Dakshinkhan'],
    ['darussalam', 'দারুস সালাম', 'Darus Salam', 'gabtoli', 'গাবতলী', 'darussalam'],
    ['demra', 'ডেমরা', 'Demra'],
    ['dhanmondi', 'ধানমন্ডি', 'Dhanmondi', 'ধানমণ্ডি'],
    ['farmgate', 'ফার্মগেট', 'Farmgate', 'kawran bazar', 'কারওয়ান বাজার', 'karwan bazar'],
    ['gendaria', 'গেন্ডারিয়া', 'Gendaria', 'gendria'],
    ['gulshan', 'গুলশান', 'Gulshan'],
    ['hazaribagh', 'হাজারীবাগ', 'Hazaribagh'],
    ['jatrabari', 'যাত্রাবাড়ী', 'Jatrabari', 'যাত্রাবাড়ি'],
    ['kadamtali', 'কদমতলী', 'Kadamtali'],
    ['kafrul', 'কাফরুল', 'Kafrul', 'ibrahimpur', 'ইব্রাহিমপুর'],
    ['kalabagan', 'কলাবাগান', 'Kalabagan'],
    ['kallyanpur', 'কল্যাণপুর', 'Kallyanpur', 'kalyanpur'],
    ['kamrangirchar', 'কামরাঙ্গীরচর', 'Kamrangirchar'],
    ['khilgaon', 'খিলগাঁও', 'Khilgaon'],
    ['khilkhet', 'খিলক্ষেত', 'Khilkhet', 'nikunja', 'নিকুঞ্জ'],
    ['kotwali', 'কোতোয়ালী', 'Kotwali', 'old dhaka', 'পুরান ঢাকা'],
    ['lalbagh', 'লালবাগ', 'Lalbagh'],
    ['malibagh', 'মালিবাগ', 'Malibagh'],
    ['mirpur', 'মিরপুর', 'Mirpur', 'shewrapara', 'শেওড়াপাড়া', 'kazipara', 'কাজীপাড়া'],
    ['moghbazar', 'মগবাজার', 'Moghbazar', 'mogbazar', 'eskaton', 'ইস্কাটন'],
    ['mohakhali', 'মহাখালী', 'Mohakhali'],
    ['mohammadpur', 'মোহাম্মদপুর', 'Mohammadpur', 'mohammodpur'],
    ['motijheel', 'মতিঝিল', 'Motijheel', 'arambagh', 'আরামবাগ'],
    ['mugda', 'মুগদা', 'Mugda'],
    ['newmarket', 'নিউ মার্কেট', 'New Market', 'নিউমার্কেট', 'nilkhet', 'নীলক্ষেত'],
    ['pallabi', 'পল্লবী', 'Pallabi'],
    ['paltan', 'পল্টন', 'Paltan', 'purana paltan'],
    ['ramna', 'রমনা', 'Ramna', 'shantinagar', 'শান্তিনগর', 'kakrail', 'কাকরাইল', 'secretariat', 'সচিবালয়', 'segunbagicha', 'সেগুনবাগিচা'],
    ['rampura', 'রামপুরা', 'Rampura', 'banasree', 'বনশ্রী', 'banashree'],
    ['rupnagar', 'রূপনগর', 'Rupnagar'],
    ['sabujbagh', 'সবুজবাগ', 'Sabujbagh'],
    ['shahali', 'শাহ আলী', 'Shah Ali', 'শাহআলী'],
    ['shahbagh', 'শাহবাগ', 'Shahbagh'],
    ['shahjahanpur', 'শাহজাহানপুর', 'Shahjahanpur'],
    ['shyampur', 'শ্যামপুর', 'Shyampur'],
    ['sutrapur', 'সূত্রাপুর', 'Sutrapur'],
    ['tejgaon', 'তেজগাঁও', 'Tejgaon'],
    ['turag', 'তুরাগ', 'Turag', 'diabari', 'দিয়াবাড়ি'],
    ['uttara', 'উত্তরা', 'Uttara'],
    ['uttarkhan', 'উত্তরখান', 'Uttarkhan'],
    ['vatara', 'ভাটারা', 'Vatara', 'notun bazar', 'নতুন বাজার'],
    ['wari', 'ওয়ারী', 'Wari', 'ওয়ারি'],
    ['airport', 'বিমানবন্দর', 'Airport', 'kurmitola', 'কুর্মিটোলা'],
    ['dhaka-city-other', 'ঢাকা সিটির অন্য এলাকা', 'Other area in Dhaka city'],
  ];

  // Dhaka district, outside the city: the outside-Dhaka charge (as the storefront already did for
  // Savar, Dohar, Nawabganj, Keraniganj and Dhamrai).
  var DHAKA_OUTER = [
    ['savar', 'সাভার', 'Savar', 'hemayetpur', 'হেমায়েতপুর', 'nabinagar', 'নবীনগর'],
    ['ashulia', 'আশুলিয়া', 'Ashulia', 'baipail', 'বাইপাইল', 'zirabo', 'জিরাবো'],
    ['keraniganj', 'কেরানীগঞ্জ', 'Keraniganj', 'কেরানিগঞ্জ', 'jinjira', 'জিঞ্জিরা'],
    ['dhamrai', 'ধামরাই', 'Dhamrai'],
    ['dohar', 'দোহার', 'Dohar'],
    ['nawabganj', 'নবাবগঞ্জ', 'Nawabganj'],
  ];

  // Places people write without their district (near Dhaka): count as that district.
  var LOCALITIES = [
    ['gazipur', 'টঙ্গী', 'Tongi', 'টঙ্গি'],
    ['gazipur', 'বোর্ড বাজার', 'Board Bazar', 'boardbazar'],
    ['gazipur', 'জয়দেবপুর', 'Joydebpur'],
    ['gazipur', 'কালিয়াকৈর', 'Kaliakair'],
    ['gazipur', 'কোনাবাড়ী', 'Konabari', 'কোনাবাড়ি'],
    ['gazipur', 'শ্রীপুর', 'Sreepur'],
    ['gazipur', 'কাপাসিয়া', 'Kapasia'],
    ['narayanganj', 'ফতুল্লা', 'Fatullah'],
    ['narayanganj', 'সিদ্ধিরগঞ্জ', 'Siddhirganj'],
    ['narayanganj', 'রূপগঞ্জ', 'Rupganj'],
    ['narayanganj', 'পূর্বাচল', 'Purbachal'],
    ['narayanganj', 'সোনারগাঁ', 'Sonargaon', 'সোনারগাঁও'],
    ['narayanganj', 'আড়াইহাজার', 'Araihazar'],
    ['narayanganj', 'চাষাড়া', 'Chashara'],
  ];

  // Upazilas, for addresses that name no district ("গফরগাঁও চর আলগী"). From
  // github.com/nuhil/bangladesh-geocode (MIT License, Copyright (c) 2014 Nuhil Mehdy), built by
  // scripts/build-delivery-zone-upazilas.cjs, leaving out "Sadar", names two districts share,
  // district or Dhaka area names, and everyday words or people's names (Kasba, Bandar, Ruma...).
  // 'বাংলা|English;...' per district.
  var UPAZILA_TEXT = {
    bagerhat: 'ফকিরহাট|Fakirhat;মোল্লাহাট|Mollahat;শরণখোলা|Sharankhola;রামপাল|Rampal;মোড়েলগঞ্জ|Morelganj;মোংলা|Mongla;চিতলমারী|Chitalmari',
    bandarban: 'আলীকদম|Alikadam;নাইক্ষ্যংছড়ি|Naikkhongchhari;রোয়াংছড়ি|Rowangchhari;থানচি|Thanchi',
    barguna: 'আমতলী|Amtali;বেতাগী|Betagi;বামনা|Bamna;পাথরঘাটা|Patharghata;তালতলি|Taltali',
    barishal: 'বাকেরগঞ্জ|Bakerganj;বাবুগঞ্জ|Babuganj;উজিরপুর|Ujirpur;বানারীপাড়া|Banaripara;গৌরনদী|Gaurnadi;আগৈলঝাড়া|Agailjhara;মেহেন্দিগঞ্জ|Mehendiganj;মুলাদী|Muladi;হিজলা|Hijla',
    bhola: 'বোরহান উদ্দিন|Borhanuddin;চরফ্যাশন|Charfasson;দৌলতখান|Daulatkhan;মনপুরা|Monpura;তজুমদ্দিন|Tazumuddin;লালমোহন|Lalmohan',
    bogura: 'কাহালু|Kahaloo;সারিয়াকান্দি|Sariakandi;দুপচাচিঁয়া|Dupchachia;আদমদিঘি|Adamdighi;নন্দিগ্রাম|Nandigram;সোনাতলা|Sonatala;ধুনট|Dhunat',
    brahmanbaria: 'নাসিরনগর|Nasirnagar;সরাইল|Sarail;আশুগঞ্জ|Ashuganj;আখাউড়া|Akhaura;বাঞ্ছারামপুর|Banchharampur;বিজয়নগর|Bijoynagar',
    chandpur: 'হাইমচর|Haimchar;শাহরাস্তি|Shahrasti;মতলব দক্ষিণ|Matlab Dakkhin;হাজীগঞ্জ|Hajiganj;মতলব উত্তর|Matlab Uttar;ফরিদগঞ্জ|Faridganj',
    chapainawabganj: 'গোমস্তাপুর|Gomastapur;নাচোল|Nachole;ভোলাহাট|Bholahat',
    chattogram: 'রাঙ্গুনিয়া|Rangunia;সীতাকুন্ড|Sitakunda;মীরসরাই|Mirsarai;পটিয়া|Patiya;সন্দ্বীপ|Sandwip;বাঁশখালী|Banshkhali;বোয়ালখালী|Boalkhali;চন্দনাইশ|Chandanaish;সাতকানিয়া|Satkania;হাটহাজারী|Hathazari;ফটিকছড়ি|Fatikchhari;রাউজান|Raozan;কর্ণফুলী|Karnaphuli',
    chuadanga: 'আলমডাঙ্গা|Alamdanga;দামুড়হুদা|Damurhuda;জীবননগর|Jibannagar',
    coxsbazar: 'চকরিয়া|Chakaria;কুতুবদিয়া|Kutubdia;উখিয়া|Ukhia;মহেশখালী|Maheshkhali;পেকুয়া|Pekua;টেকনাফ|Teknaf;ঈদগাঁও|Eidgaon',
    cumilla: 'দেবিদ্বার|Debidwar;বরুড়া|Barura;ব্রাহ্মণপাড়া|Brahmanpara;চান্দিনা|Chandina;চৌদ্দগ্রাম|Chauddagram;দাউদকান্দি|Daudkandi;হোমনা|Homna;লাকসাম|Laksam;মুরাদনগর|Muradnagar;নাঙ্গলকোট|Nangalkot;মনোহরগঞ্জ|Manoharganj;বুড়িচং|Burichang;লালমাই|Lalmai',
    dinajpur: 'বীরগঞ্জ|Birganj;ঘোড়াঘাট|Ghoraghat;বিরামপুর|Birampur;পার্বতীপুর|Parbatipur;বোচাগঞ্জ|Bochaganj;কাহারোল|Kaharole;হাকিমপুর|Hakimpur;খানসামা|Khansama;চিরিরবন্দর|Chirirbandar',
    faridpur: 'আলফাডাঙ্গা|Alfadanga;বোয়ালমারী|Boalmari;নগরকান্দা|Nagarkanda;চরভদ্রাসন|Char Bhadrasan;মধুখালী|Madhukhali;সালথা|Saltha',
    feni: 'ছাগলনাইয়া|Chhagalnaiya;সোনাগাজী|Sonagazi;ফুলগাজী|Fulgazi;পরশুরাম|Parashuram;দাগনভূঞা|Daganbhuiyan',
    gaibandha: 'সাদুল্লাপুর|Sadullapur;পলাশবাড়ী|Palashbari;সাঘাটা|Saghata;গোবিন্দগঞ্জ|Gobindaganj;সুন্দরগঞ্জ|Sundarganj;ফুলছড়ি|Fulchhari',
    gazipur: 'কালিয়াকৈর|Kaliakair;কাপাসিয়া|Kapasia',
    gopalganj: 'কাশিয়ানী|Kashiani;টুংগীপাড়া|Tungipara;কোটালীপাড়া|Kotalipara;মুকসুদপুর|Muksudpur',
    habiganj: 'নবীগঞ্জ|Nabiganj;বাহুবল|Bahubal;আজমিরীগঞ্জ|Ajmiriganj;বানিয়াচং|Baniachong;লাখাই|Lakhai;চুনারুঘাট|Chunarughat;মাধবপুর|Madhabpur;শায়েস্তাগঞ্জ|Shayestaganj',
    jamalpur: 'মেলান্দহ|Melandaha;ইসলামপুর|Islampur;দেওয়ানগঞ্জ|Dewanganj;সরিষাবাড়ী|Sarishabari;মাদারগঞ্জ|Madarganj;বকশীগঞ্জ|Bakshiganj',
    jashore: 'মণিরামপুর|Manirampur;অভয়নগর|Abhaynagar;বাঘারপাড়া|Bagharpara;চৌগাছা|Chaugachha;ঝিকরগাছা|Jhikargachha;কেশবপুর|Keshabpur;শার্শা|Sharsha',
    jhalokathi: 'কাঠালিয়া|Kanthalia;নলছিটি|Nalchhity;রাজাপুর|Rajapur',
    jhenaidah: 'শৈলকুপা|Shailkupa;হরিণাকুন্ডু|Harinakundu;কোটচাঁদপুর|Kotchandpur;মহেশপুর|Maheshpur',
    joypurhat: 'আক্কেলপুর|Akkelpur;ক্ষেতলাল|Khetlal;পাঁচবিবি|Panchbibi',
    khagrachhari: 'দিঘীনালা|Dighinala;পানছড়ি|Panchhari;লক্ষীছড়ি|Lakkhichhari;মহালছড়ি|Mahalchhari;মানিকছড়ি|Manikchhari;রামগড়|Ramgarh;মাটিরাঙ্গা|Matiranga;গুইমারা|Guimara',
    khulna: 'পাইকগাছা|Paikgachha;ফুলতলা|Phultala;দিঘলিয়া|Dighalia;তেরখাদা|Terokhada;ডুমুরিয়া|Dumuria;বটিয়াঘাটা|Batiaghata;দাকোপ|Dacope;কয়রা|Koyra',
    kishoreganj: 'ইটনা|Itna;কটিয়াদী|Katiadi;ভৈরব|Bhairab;তাড়াইল|Tarail;হোসেনপুর|Hossainpur;পাকুন্দিয়া|Pakundia;কুলিয়ারচর|Kuliarchar;করিমগঞ্জ|Karimganj;বাজিতপুর|Bajitpur;অষ্টগ্রাম|Austagram;মিঠামইন|Mithamain;নিকলী|Nikli',
    kurigram: 'নাগেশ্বরী|Nageshwari;ভুরুঙ্গামারী|Bhurungamari;রাজারহাট|Rajarhat;উলিপুর|Ulipur;চিলমারী|Chilmari;রৌমারী|Roumari;চর রাজিবপুর|Rajibpur',
    kushtia: 'কুমারখালী|Kumarkhali;খোকসা|Khoksa;ভেড়ামারা|Bheramara',
    lakshmipur: 'কমলনগর|Kamalnagar;রামগতি|Ramgati;রামগঞ্জ|Ramganj',
    lalmonirhat: 'হাতীবান্ধা|Hatibandha;পাটগ্রাম|Patgram;আদিতমারী|Aditmari',
    madaripur: 'শিবচর|Shibchar;কালকিনি|Kalkini;রাজৈর|Rajoir;ডাসার|Dasar',
    magura: 'শালিখা|Shalikha',
    manikganj: 'হরিরামপুর|Harirampur;সাটুরিয়া|Saturia;ঘিওর|Ghior;শিবালয়|Shibalay;সিংগাইর|Singair',
    meherpur: 'মুজিবনগর|Mujibnagar;গাংনী|Gangni',
    moulvibazar: 'বড়লেখা|Baralekha;কমলগঞ্জ|Kamalganj;কুলাউড়া|Kulaura;রাজনগর|Rajnagar;শ্রীমঙ্গল|Sreemangal',
    munshiganj: 'শ্রীনগর|Sreenagar;সিরাজদিখান|Sirajdikhan;লৌহজং|Louhajang;গজারিয়া|Gazaria;টংগীবাড়ি|Tongibari',
    mymensingh: 'ফুলবাড়ীয়া|Fulbaria;ত্রিশাল|Trishal;ভালুকা|Bhaluka;মুক্তাগাছা|Muktagachha;ধোবাউড়া|Dhobaura;হালুয়াঘাট|Haluaghat;গৌরীপুর|Gouripur;গফরগাঁও|Gafargaon;ঈশ্বরগঞ্জ|Ishwarganj;নান্দাইল|Nandail;তারাকান্দা|Tarakanda',
    naogaon: 'মহাদেবপুর|Mahadebpur;বদলগাছী|Badalgachhi;পত্নিতলা|Patnitala;ধামইরহাট|Dhamoirhat;নিয়ামতপুর|Niamatpur;রাণীনগর|Raninagar;পোরশা|Porsha;সাপাহার|Sapahar',
    narayanganj: 'আড়াইহাজার|Araihazar;রূপগঞ্জ|Rupganj;সোনারগাঁ|Sonargaon',
    narsingdi: 'বেলাবো|Belabo;মনোহরদী|Manohardi;রায়পুরা|Raipura;শিবপুর|Shibpur',
    natore: 'সিংড়া|Singra;বড়াইগ্রাম|Baraigram;বাগাতিপাড়া|Bagatipara;গুরুদাসপুর|Gurudaspur;নলডাঙ্গা|Naldanga',
    netrokona: 'বারহাট্টা|Barhatta;কেন্দুয়া|Kendua;আটপাড়া|Atpara;খালিয়াজুরী|Khaliajuri;কলমাকান্দা|Kalmakanda;মোহনগঞ্জ|Mohanganj;পূর্বধলা|Purbadhala',
    nilphamari: 'সৈয়দপুর|Saidpur;ডোমার|Domar;ডিমলা|Dimla;জলঢাকা|Jaldhaka',
    noakhali: 'বেগমগঞ্জ|Begumganj;হাতিয়া|Hatiya;সুবর্ণচর|Subarnachar;কবিরহাট|Kabirhat;সেনবাগ|Senbag;চাটখিল|Chatkhil;সোনাইমুড়ী|Sonaimuri',
    pabna: 'সুজানগর|Sujanagar;ঈশ্বরদী|Ishwardi;ভাঙ্গুড়া|Bhangura;আটঘরিয়া|Atgharia;চাটমোহর|Chatmohar;সাঁথিয়া|Santhia',
    panchagarh: 'দেবীগঞ্জ|Debiganj;আটোয়ারী|Atowari;তেতুলিয়া|Tentulia',
    patuakhali: 'বাউফল|Bauphal;দুমকি|Dumki;দশমিনা|Dashmina;কলাপাড়া|Kalapara;মির্জাগঞ্জ|Mirzaganj;গলাচিপা|Galachipa;রাঙ্গাবালী|Rangabali',
    pirojpur: 'নাজিরপুর|Nazirpur;ইন্দুরকানী|Indurkani;ভান্ডারিয়া|Bhandaria;মঠবাড়ীয়া|Mathbaria;নেছারাবাদ|Nesarabad (Swarupkathi)',
    rajbari: 'গোয়ালন্দ|Goalanda;পাংশা|Pangsha;বালিয়াকান্দি|Baliakandi;কালুখালী|Kalukhali',
    rajshahi: 'মোহনপুর|Mohanpur;চারঘাট|Charghat;পুঠিয়া|Puthia;গোদাগাড়ী|Godagari;তানোর|Tanore;বাগমারা|Bagmara',
    rangamati: 'কাপ্তাই|Kaptai;বাঘাইছড়ি|Baghaichhari;বরকল|Barkal;লংগদু|Langadu;রাজস্থলী|Rajasthali;বিলাইছড়ি|Belaichhari;জুরাছড়ি|Jurachhari;নানিয়ারচর|Naniarchar',
    rangpur: 'গংগাচড়া|Gangachara;তারাগঞ্জ|Taraganj;বদরগঞ্জ|Badarganj;মিঠাপুকুর|Mithapukur;কাউনিয়া|Kaunia;পীরগাছা|Pirgachha',
    satkhira: 'আশাশুনি|Ashashuni;দেবহাটা|Debhata;কলারোয়া|Kalaroa;শ্যামনগর|Shyamnagar',
    shariatpur: 'নড়িয়া|Naria;জাজিরা|Zajira;গোসাইরহাট|Gosairhat;ভেদরগঞ্জ|Bhedarganj;ডামুড্যা|Damudya',
    sherpur: 'নালিতাবাড়ী|Nalitabari;শ্রীবরদী|Sreebardi;নকলা|Nakla;ঝিনাইগাতী|Jhenaigati',
    sirajganj: 'বেলকুচি|Belkuchi;চৌহালি|Chouhali;কামারখন্দ|Kamarkhanda;কাজীপুর|Kazipur;রায়গঞ্জ|Rayganj;শাহজাদপুর|Shahjadpur;তাড়াশ|Tarash;উল্লাপাড়া|Ullapara',
    sunamganj: 'শান্তিগঞ্জ|Shantiganj;বিশ্বম্ভরপুর|Bishwambharpur;ছাতক|Chhatak;জগন্নাথপুর|Jagannathpur;দোয়ারাবাজার|Dowarabazar;তাহিরপুর|Tahirpur;ধর্মপাশা|Dharmapasha;জামালগঞ্জ|Jamalganj;শাল্লা|Shalla;দিরাই|Derai;মধ্যনগর|Madhyanagar',
    sylhet: 'বালাগঞ্জ|Balaganj;বিয়ানীবাজার|Beanibazar;বিশ্বনাথ|Bishwanath;ফেঞ্চুগঞ্জ|Fenchuganj;গোলাপগঞ্জ|Golapganj;গোয়াইনঘাট|Gowainghat;জৈন্তাপুর|Jaintapur;কানাইঘাট|Kanaighat;জকিগঞ্জ|Zakiganj;দক্ষিণ সুরমা|Dakkhin Surma;ওসমানী নগর|Osmaninagar',
    tangail: 'বাসাইল|Basail;ভুয়াপুর|Bhuanpur;দেলদুয়ার|Delduar;ঘাটাইল|Ghatail;গোপালপুর|Gopalpur;মধুপুর|Madhupur;মির্জাপুর|Mirzapur;নাগরপুর|Nagarpur;সখিপুর|Sakhipur;কালিহাতী|Kalihati;ধনবাড়ী|Dhanbari',
    thakurgaon: 'রাণীশংকৈল|Ranishankail;হরিপুর|Haripur;বালিয়াডাঙ্গী|Baliadangi',
  };
  // Upazilas named like another district (so left out above): "Bogra sherpur" is Sherpur upazila of
  // Bogura, not Sherpur district. district -> districts it has an upazila named like. From the same
  // data (scripts/build-delivery-zone-upazilas.cjs lists them).
  var NAMED_LIKE_DISTRICT = { bogura: ['sherpur'], nilphamari: ['kishoreganj'], pabna: ['faridpur'] };
  var UPAZILAS = [];
  Object.keys(UPAZILA_TEXT).forEach(function (id) {
    UPAZILA_TEXT[id].split(';').forEach(function (pair) {
      var names = pair.split('|');
      UPAZILAS.push([id, names[0], names[1]]);
    });
  });

  // Names every town has (Kotwali thana, Cantonment, New Market...): offered in the area list but
  // never used alone to guess Dhaka from an address.
  var COMMON_NAMES = ['kotwali', 'কোতোয়ালী', 'cantonment', 'ক্যান্টনমেন্ট', 'airport', 'বিমানবন্দর',
    'new market', 'নিউ মার্কেট', 'নিউমার্কেট', 'notun bazar', 'নতুন বাজার', 'lalbagh', 'লালবাগ'];

  // ---------- text matching ----------
  // Banglish is written by ear: Borishal/Barisal, Rongpur, Vola/Bhola, Gajipur, Nowakhali, Komilla,
  // Habigonj, Mymensing, Joshor, Brammonbaria. Each Latin word is cut down to a sound key: ph=f, no h
  // next to a consonant (an h between vowels stays: Meherpur is not Mirpur), no silent final e,
  // v=b, z=j, c=k, y=i, w=o, o=a, e=i, no doubled letters.
  function banglish(word) {
    return word
      .replace(/ph/g, 'f')
      .replace(/([^aeiou])h/g, '$1')
      .replace(/h(?![aeiou])/g, '')
      .replace(/([^aeiou])e$/, '$1')
      .replace(/c/g, 'k')
      .replace(/v/g, 'b')
      .replace(/z/g, 'j')
      .replace(/q/g, 'k')
      .replace(/y/g, 'i')
      .replace(/ee/g, 'i')
      .replace(/oo/g, 'u')
      .replace(/w/g, 'o')
      .replace(/o/g, 'a')
      .replace(/e/g, 'i')
      .replace(/([a-z])\1+/g, '$1')
      .replace(/gang$/, 'ganj'); // Keranigong, Narayangong
  }
  // Both sides of every comparison go through this, so it only has to make spellings people mix
  // up come out the same: Habigonj/Habiganj, Comilla/Comila, মাগুড়া/মাগুরা, ফেনী/ফেনি, নারায়ণ/নারায়ন.
  function norm(value) {
    return String(value == null ? '' : value)
      .normalize('NFC') // ড়, ঢ়, য় come out the same whichever way they were typed
      .replace(/[\u200c\u200d]/g, '')
      .toLowerCase()
      .replace(/[.,;:!?()[\]{}"'`\u2018\u2019/\\|_\-\u2013\u2014\u2022\u0964\u0965#*+=<>~^@&%$\u09e6-\u09ef0-9]+/g, ' ')
      .replace(/[a-z]+/g, banglish)
      .replace(/\s+ganj\b/g, 'ganj') // Narayan gonj, N.gonj
      .replace(/\u09a1\u09bc/g, '\u09b0') // ড় -> র
      .replace(/\u09c0/g, '\u09bf') // ী -> ি
      .replace(/\u09c2/g, '\u09c1') // ূ -> ু
      .replace(/\u09a3/g, '\u09a8') // ণ -> ন
      .replace(/[\u09b6\u09b7]/g, '\u09b8') // শ, ষ -> স (কুস্টিয়া)
      .replace(/\u09a8\u09cd\u099c/g, '\u099e\u09cd\u099c') // ন্জ -> ঞ্জ (চন্দ্রগন্জ)
      .replace(/\s+(?=\u0997\u099e\u09cd\u099c)/g, '') // নারায়ন গঞ্জ -> নারায়নগঞ্জ
      .replace(/\s+/g, ' ')
      .trim();
  }
  var BENGALI = /[\u0980-\u09ff]/;
  var COMMON = {};
  COMMON_NAMES.forEach(function (n) { COMMON[norm(n)] = true; });
  function aliasesOf(entry, guessing) {
    return entry.slice(1).map(norm).filter(function (a) { return a && !(guessing && COMMON[a]); });
  }
  // Every position where one of the entry's names appears as a word (Bengali names may carry an
  // ending: ঢাকায়, ফেনীর, ফেনীতে).
  function positions(text, entry, guessing) {
    var found = [];
    aliasesOf(entry, guessing).forEach(function (alias) {
      var from = 0;
      for (;;) {
        var at = text.indexOf(alias, from);
        if (at === -1) break;
        from = at + 1;
        var before = at > 0 ? text.charAt(at - 1) : ' ';
        var after = text.charAt(at + alias.length) || ' ';
        if (BENGALI.test(alias.charAt(0))) {
          if (BENGALI.test(before)) continue;
        } else {
          if (/[a-z]/.test(before) || /[a-z]/.test(after)) continue;
        }
        found.push(at);
      }
    });
    return found;
  }
  function lastPosition(text, entry, guessing) {
    var list = positions(text, entry, guessing);
    return list.length ? Math.max.apply(null, list) : -1;
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i][0] === id) return list[i];
    return null;
  }
  function district(id) { return byId(DISTRICTS, id); }
  function area(id) { return byId(DHAKA_CITY, id) || byId(DHAKA_OUTER, id); }

  // What the address text says: districts mentioned (with localities), and a Dhaka area if any.
  function mentions(text) {
    var t = norm(text);
    var districts = {};
    DISTRICTS.forEach(function (d) {
      var at = lastPosition(t, d);
      if (at !== -1) districts[d[0]] = Math.max(districts[d[0]] == null ? -1 : districts[d[0]], at);
    });
    LOCALITIES.forEach(function (l) {
      var at = lastPosition(t, l);
      if (at !== -1) districts[l[0]] = Math.max(districts[l[0]] == null ? -1 : districts[l[0]], at);
    });
    var outer = null;
    DHAKA_OUTER.forEach(function (a) { if (!outer && lastPosition(t, a) !== -1) outer = a[0]; });
    var city = null;
    DHAKA_CITY.forEach(function (a) { if (!city && a[0] !== 'dhaka-city-other' && lastPosition(t, a, true) !== -1) city = a[0]; });
    return { districts: districts, outer: outer, city: city };
  }

  // Best guess of {district, area} from an address, or {} when it names no place we know.
  function detect(text) {
    var m = mentions(text);
    var others = Object.keys(m.districts).filter(function (id) { return id !== 'dhaka'; });
    if (others.length) {
      others.sort(function (a, b) { return m.districts[b] - m.districts[a]; });
      // Two districts named and one is also an upazila of the other ("Bogra sherpur", "Nilphamari
      // kishoreganj"): it is that upazila, whichever comes last.
      var upazilaNames = others.filter(function (id) {
        return others.some(function (other) { return (NAMED_LIKE_DISTRICT[other] || []).indexOf(id) !== -1; });
      });
      if (upazilaNames.length) others = others.filter(function (id) { return upazilaNames.indexOf(id) === -1; });
      // The last one named may be the division ("kaligonj, Lalmonirhat, rongpur").
      var inside = others.filter(function (id) { return inDivision(id, others[0]); });
      return { district: inside.length ? inside[0] : others[0], area: '' };
    }
    if (m.outer) return { district: 'dhaka', area: m.outer };
    if (m.city) return { district: 'dhaka', area: m.city };
    if (m.districts.dhaka != null) return { district: 'dhaka', area: '' };
    // Only an upazila named: its district (the last one named, if several).
    var t = norm(text);
    var best = null;
    UPAZILAS.forEach(function (u) {
      var at = lastPosition(t, u);
      if (at !== -1 && (!best || at > best.at)) best = { at: at, district: u[0] };
    });
    if (best) return { district: best.district, area: '' };
    // Last: a long word one letter off a district or Dhaka area name ("patuakhili", "বগুডা",
    // "sectetariat"), when only one place fits.
    var typo = typoPlace(t);
    return typo ? { district: typo.split('|')[0], area: typo.split('|')[1] } : {};
  }

  function editDistance(a, b) {
    var row = [];
    for (var j = 0; j <= b.length; j++) row[j] = j;
    for (var i = 1; i <= a.length; i++) {
      var previous = row[0];
      row[0] = i;
      for (var k = 1; k <= b.length; k++) {
        var kept = row[k];
        row[k] = Math.min(row[k] + 1, row[k - 1] + 1, previous + (a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1));
        previous = kept;
      }
    }
    return row[b.length];
  }
  // Latin words of 7+ letters, Bengali of 5+ characters (marks count).
  var LONG_NAMES = null;
  function longEnough(word) { return word.length >= (BENGALI.test(word.charAt(0)) ? 5 : 7); }
  function typoPlace(text) {
    if (!LONG_NAMES) {
      LONG_NAMES = [];
      var add = function (entry, key) {
        aliasesOf(entry).forEach(function (name) { if (longEnough(name) && name.indexOf(' ') === -1) LONG_NAMES.push([name, key]); });
      };
      DISTRICTS.forEach(function (d) { add(d, d[0] + '|'); });
      DHAKA_CITY.concat(DHAKA_OUTER).forEach(function (a) { add(a, 'dhaka|' + a[0]); });
    }
    var found = {};
    text.split(' ').forEach(function (word) {
      if (!longEnough(word)) return;
      LONG_NAMES.forEach(function (entry) {
        if (Math.abs(entry[0].length - word.length) <= 1 && editDistance(entry[0], word) <= 1) found[entry[1]] = true;
      });
    });
    var keys = Object.keys(found);
    return keys.length === 1 ? keys[0] : '';
  }

  // 'inside' | 'outside' | null (Dhaka district without an area yet, or unknown district).
  function zoneFor(districtId, areaId) {
    if (!district(districtId)) return null;
    if (districtId !== 'dhaka') return 'outside';
    if (byId(DHAKA_OUTER, areaId)) return 'outside';
    if (byId(DHAKA_CITY, areaId)) return 'inside';
    return null;
  }

  // The place named in the address that does not fit the chosen district/area (Bengali name), or ''.
  function mismatch(location, text) {
    var loc = location || {};
    if (!district(loc.district)) return '';
    var m = mentions(text);
    var chosenNamed = m.districts[loc.district] != null;
    var other = Object.keys(m.districts).filter(function (id) { return id !== loc.district; })
      .sort(function (a, b) { return m.districts[b] - m.districts[a]; })[0];
    if (other && !chosenNamed) {
      // "Dhaka" written next to an outer area (e.g. "Savar, Dhaka") is not a different district.
      if (!(other === 'dhaka' && loc.district === 'dhaka')) return district(other)[1];
    }
    if (loc.district === 'dhaka' && byId(DHAKA_CITY, loc.area) && m.outer && !m.city) return area(m.outer)[1];
    return '';
  }

  // ---------- charge ----------
  function weightGram(value) {
    var n = Number(value);
    if (!isFinite(n) || n <= 0) return 0;
    return n <= 20 ? Math.round(n * 1000) : Math.round(n); // small numbers are kilograms
  }
  function chargeFor(zone, totalWeight, shipping) {
    if (!shipping || (zone !== 'inside' && zone !== 'outside')) return null;
    var rules = (zone === 'inside' ? shipping.insideDhakaRules : shipping.outsideDhakaRules) || [];
    var w = Number(totalWeight || 0);
    var match = rules.slice().sort(function (a, b) { return Number(a.fromGram || 0) - Number(b.fromGram || 0); })
      .filter(function (r) { return w >= Number(r.fromGram || 0) && w <= Number(r.toGram || 0); })[0];
    if (match) return Number(match.cost || 0);
    return Number((zone === 'inside' ? shipping.deliveryInDhaka : shipping.deliveryOutsideDhaka) || 0);
  }

  // Town for Meta's city match (ct): the English name people and Facebook use (old spellings for
  // renamed districts), lowercase letters only, as Meta asks. Dhaka areas count as Dhaka.
  var META_CITY = { chattogram: 'chittagong', cumilla: 'comilla', bogura: 'bogra', jashore: 'jessore', barishal: 'barisal' };
  function metaCity(districtId) {
    var d = district(districtId);
    if (!d) return '';
    return META_CITY[d[0]] || String(d[2]).toLowerCase().replace(/[^a-z]/g, '');
  }

  function label(location) {
    var loc = location || {};
    var d = district(loc.district);
    if (!d) return '';
    var a = loc.district === 'dhaka' ? area(loc.area) : null;
    return a && a[0] !== 'dhaka-city-other' ? a[1] + ', ' + d[1] : d[1];
  }
  // The address with the area and district added when it does not name them already.
  function withLocation(address, location) {
    var text = String(address || '').trim();
    var loc = location || {};
    var d = district(loc.district);
    if (!d) return text;
    var t = norm(text);
    var parts = [];
    var a = loc.district === 'dhaka' ? area(loc.area) : null;
    if (a && a[0] !== 'dhaka-city-other' && lastPosition(t, a) === -1) parts.push(a[1]);
    if (lastPosition(t, d) === -1) parts.push(d[1]);
    return parts.length ? (text ? text + ', ' : '') + parts.join(', ') : text;
  }

  return {
    DISTRICTS: DISTRICTS, DHAKA_CITY: DHAKA_CITY, DHAKA_OUTER: DHAKA_OUTER, UPAZILAS: UPAZILAS,
    norm: norm, district: district, area: area, detect: detect, zoneFor: zoneFor,
    mismatch: mismatch, weightGram: weightGram, chargeFor: chargeFor, label: label, withLocation: withLocation,
    metaCity: metaCity, editDistance: editDistance,
  };
});
