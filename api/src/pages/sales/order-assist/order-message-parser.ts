import { allowedTypos, editDistance, foldSearchText, romanizeBengali } from '../../product/product-search.util';

/**
 * AI Assist on the Orders page (owner, 2026-11-08): reads an order typed or
 * pasted from WhatsApp / Facebook in any order and any mix of Bangla, English
 * and Banglish:
 *
 *   ০১৭৪৬৪১৩৭৪৯            phone anywhere (Bengali digits, +880, spaces);
 *   মো উদয় রহমান            a second number inside a line is an extra phone
 *   ঝাউতলা লেন, কুস্টিয়া     name = the first line that reads like a name
 *   Edventure                book lines are matched against the catalogue
 *   ক্যাশ অন ডেলিভারি ৭৭৮/-   payment + the total the customer was told
 *
 * Labels work too (নাম:, মোবাইল:, ঠিকানা:, জেলা:, থানা:, বই:). WhatsApp
 * "[date, time] Sender:" headers are removed; when several messages are
 * pasted, the first one with an order is read and the rest are counted.
 * Nothing here guesses silently: anything unsure comes back in `warnings`,
 * book lines with no match in `unmatched`.
 */

export interface AssistProduct {
  _id: any;
  name: string;
  nameEn?: string;
  price: number;
  totalSold?: number;
}

export interface ParsedOrderMessage {
  phone: string;
  altPhones: string[];
  name: string;
  address: string;
  city: string;
  insideDhaka: boolean | null;
  paymentType: 'COD' | 'ONLINE' | 'BKASH' | 'NAGAD';
  quotedTotal: number | null;
  products: { _id: string; name: string; price: number; qty: number; line: string }[];
  unmatched: string[];
  booksTotal: number;
  deliveryCharge: number | null;
  messages: number;
  warnings: string[];
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const toEnDigits = (value: string) => value.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
const INVISIBLE = /[​-‍⁠-⁯﻿]/g;
// "[7/11/26, 12:42:46 PM] Amol Books: ..." or "7/11/26, 12:42 PM - Amol Books: ..."
const CHAT_HEADER =
  /^\s*\[?\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AaPp]\.?\s?[Mm]\.?)?\s*\]?\s*(?:-\s*)?[^:\n]{1,40}:\s?/;
const PHONE_CANDIDATE = /(?:\+|00)?[\d০-৯][\d০-৯\s\-–.]{8,18}[\d০-৯]/g;

const LABELS: [RegExp, 'name' | 'phone' | 'address' | 'thana' | 'district' | 'division' | 'book'][] = [
  [/^(?:গ্রাহকের নাম|প্রাপকের নাম|customer name|নাম|name)\s*[:：ঃ=\-–]\s*/i, 'name'],
  [/^(?:মোবাইল(?:\s*(?:নাম্বার|নম্বর|নং))?|ফোন(?:\s*(?:নাম্বার|নম্বর|নং))?|নাম্বার|নম্বর|phone(?:\s*(?:no|number))?|mobile(?:\s*(?:no|number))?|number|contact(?:\s*no)?|cell)\s*\.?\s*[:：ঃ=\-–]\s*/i, 'phone'],
  [/^(?:স্থায়ী ঠিকানা|স্থয়াী ঠিকানা|বর্তমান ঠিকানা|রিসিভের জায়গা|রিসিভ করার জায়গা|ডেলিভারি ঠিকানা|ঠিকানা|full address|delivery address|address|addr)\s*[:：ঃ=\-–]\s*/i, 'address'],
  [/^(?:জেলা\s*\+\s*থানা|থানা\s*\+\s*জেলা)\s*[:：ঃ=\-–]\s*/i, 'district'],
  [/^(?:থানা|উপজেলা|thana|upazila|upozila|police station)\s*[:：ঃ=\-–]\s*/i, 'thana'],
  [/^(?:জেলা|district|zilla|city|শহর)\s*[:：ঃ=\-–]\s*/i, 'district'],
  [/^(?:বিভাগ|division)\s*[:：ঃ=\-–]\s*/i, 'division'],
  [/^(?:বইয়ের নাম|বই|books?|product|পণ্য|অর্ডার|order)\s*[:：ঃ=\-–]\s*/i, 'book'],
];

const PAY_WORDS =
  /(ক্যাশ\s*অন\s*ডেলিভারি|ক্যাশ\s*অন|ক্যাশঅন|কন্ডিশন|cash\s*on\s*delivery|\bc\.?o\.?d\b|বিকাশ|bkash|b-kash|নগদ|nagad|রকেট|rocket|পেইড|\bpaid\b|অগ্রিম|advance|অনলাইন\s*পেমেন্ট|online\s*payment)/i;
const DELIVERY_WORDS = /(ডেলিভারি\s*চার্জ|delivery\s*charge|শিপিং\s*চার্জ|shipping)/i;
const AMOUNT_LINE = /^[\s৳(]*(?:tk\.?|taka|টাকা)?\s*[\d০-৯][\d০-৯,]*(?:\.\d+)?\s*(?:\/-|\/=|৳|tk\.?|taka|টাকা)\s*\)?\s*$/i;

// Words that mark a line as an address, not a person's name (checked on folded text).
const ADDRESS_WORDS = [
  'রোড', 'road', 'rode', 'rd', 'বাসা', 'বাড়ি', 'বারি', 'house', 'হাউজ', 'লেন', 'lane', 'বাজার', 'bazar', 'bazaar', 'market', 'মার্কেট',
  'থানা', 'জেলা', 'উপজেলা', 'সদর', 'sadar', 'sector', 'সেক্টর', 'block', 'ব্লক', 'floor', 'ফ্লোর', 'তলা', 'হল', 'hall', 'কলেজ', 'college',
  'school', 'স্কুল', 'বিশ্ববিদ্যালয়', 'university', 'ইউনিভার্সিটি', 'হাসপাতাল', 'hospital', 'মসজিদ', 'mosque', 'মাদ্রাসা', 'madrasa',
  'পাড়া', 'para', 'গ্রাম', 'village', 'মোড়', 'more', 'চৌরাস্তা', 'chorasta', 'কলোনি', 'colony', 'টাওয়ার', 'tower', 'অফিস', 'office',
  'আদালত', 'court', 'ফ্ল্যাট', 'flat', 'পুল', 'ব্রিজ', 'bridge', 'স্টেশন', 'station', 'ইউনিয়ন', 'union', 'পোস্ট', 'post', 'ডাকঘর',
  'জোন', 'zone', 'আবাসিক', 'housing', 'নগর', 'nagar', 'মহল্লা', 'ward', 'ওয়ার্ড', 'club', 'ক্লাব', 'হেডকোয়ার্টার্স', 'headquarters',
  'ক্যান্টনমেন্ট', 'cantonment', 'বিভাগ', 'department', 'কক্ষ', 'room', 'ভবন', 'building', 'গেট', 'গেইট', 'gate', 'মাজার', 'ঘাট', 'ghat',
].map((w) => foldSearchText(w));

// Bangladesh's 64 districts (Bengali, English and common spellings) → district name.
const DISTRICTS: [string, string[]][] = [
  ['ঢাকা', ['dhaka', 'dacca']], ['গাজীপুর', ['gazipur', 'gajipur']], ['নারায়ণগঞ্জ', ['narayanganj', 'narayangonj']], ['নরসিংদী', ['narsingdi', 'narshingdi']],
  ['মানিকগঞ্জ', ['manikganj', 'manikgonj']], ['মুন্সিগঞ্জ', ['munshiganj', 'munshigonj', 'munsiganj']], ['টাঙ্গাইল', ['tangail']], ['কিশোরগঞ্জ', ['kishoreganj', 'kishorganj']],
  ['ফরিদপুর', ['faridpur']], ['গোপালগঞ্জ', ['gopalganj']], ['মাদারীপুর', ['madaripur']], ['রাজবাড়ী', ['rajbari']], ['শরীয়তপুর', ['shariatpur']],
  ['চট্টগ্রাম', ['chattogram', 'chittagong', 'ctg']], ['কক্সবাজার', ['coxsbazar', "cox's bazar", 'cox bazar']], ['কুমিল্লা', ['cumilla', 'comilla']],
  ['ফেনী', ['feni']], ['নোয়াখালী', ['noakhali']], ['লক্ষ্মীপুর', ['lakshmipur', 'laxmipur']], ['চাঁদপুর', ['chandpur']], ['ব্রাহ্মণবাড়িয়া', ['brahmanbaria', 'b.baria']],
  ['খাগড়াছড়ি', ['khagrachari', 'khagrachhari']], ['রাঙ্গামাটি', ['rangamati']], ['বান্দরবান', ['bandarban']],
  ['রাজশাহী', ['rajshahi']], ['নাটোর', ['natore']], ['নওগাঁ', ['naogaon', 'nogaon', 'নওগা']], ['চাঁপাইনবাবগঞ্জ', ['chapainawabganj', 'chapai nawabganj']],
  ['পাবনা', ['pabna']], ['সিরাজগঞ্জ', ['sirajganj', 'sirajgonj']], ['বগুড়া', ['bogura', 'bogra']], ['জয়পুরহাট', ['joypurhat', 'jaipurhat']],
  ['খুলনা', ['khulna']], ['যশোর', ['jashore', 'jessore', 'যশোহর']], ['সাতক্ষীরা', ['satkhira']], ['বাগেরহাট', ['bagerhat']], ['নড়াইল', ['narail']],
  ['মাগুরা', ['magura']], ['ঝিনাইদহ', ['jhenaidah', 'jhenidah', 'ঝিনাইদাহ']], ['কুষ্টিয়া', ['kushtia', 'kustia', 'কুস্টিয়া']], ['চুয়াডাঙ্গা', ['chuadanga']], ['মেহেরপুর', ['meherpur']],
  ['বরিশাল', ['barishal', 'barisal']], ['পটুয়াখালী', ['patuakhali']], ['ভোলা', ['bhola']], ['পিরোজপুর', ['pirojpur']], ['ঝালকাঠি', ['jhalokathi', 'jhalakathi']], ['বরগুনা', ['barguna']],
  ['সিলেট', ['sylhet']], ['মৌলভীবাজার', ['moulvibazar', 'maulvibazar']], ['হবিগঞ্জ', ['habiganj', 'hobiganj']], ['সুনামগঞ্জ', ['sunamganj']],
  ['রংপুর', ['rangpur']], ['দিনাজপুর', ['dinajpur']], ['ঠাকুরগাঁও', ['thakurgaon']], ['পঞ্চগড়', ['panchagarh']], ['নীলফামারী', ['nilphamari']],
  ['লালমনিরহাট', ['lalmonirhat']], ['কুড়িগ্রাম', ['kurigram']], ['গাইবান্ধা', ['gaibandha']],
  ['ময়মনসিংহ', ['mymensingh', 'moymonsingh']], ['জামালপুর', ['jamalpur']], ['শেরপুর', ['sherpur']], ['নেত্রকোনা', ['netrokona', 'netrakona']],
];
// Dhaka city areas: an address with one of these is inside Dhaka.
const DHAKA_AREAS = [
  'মিরপুর', 'mirpur', 'উত্তরা', 'uttara', 'খিলগাঁও', 'khilgaon', 'মতিঝিল', 'motijheel', 'তেজগাঁও', 'tejgaon', 'সবুজবাগ', 'sabujbag',
  'ধানমন্ডি', 'dhanmondi', 'মোহাম্মদপুর', 'mohammadpur', 'গুলশান', 'gulshan', 'বনানী', 'banani', 'বাড্ডা', 'badda', 'রামপুরা', 'rampura',
  'যাত্রাবাড়ী', 'jatrabari', 'লালবাগ', 'lalbagh', 'পল্টন', 'paltan', 'শাহবাগ', 'shahbag', 'মগবাজার', 'moghbazar', 'মালিবাগ', 'malibagh',
  'বসুন্ধরা', 'bashundhara', 'দক্ষিণখান', 'dakshinkhan', 'dakshin khan', 'উত্তরখান', 'uttarkhan', 'খিলক্ষেত', 'khilkhet', 'ক্যান্টনমেন্ট',
  'কাফরুল', 'kafrul', 'পল্লবী', 'pallabi', 'আজিমপুর', 'azimpur', 'ওয়ারী', 'wari', 'শ্যামলী', 'shyamoli', 'আদাবর', 'adabor', 'ফার্মগেট',
  'farmgate', 'কারওয়ান বাজার', 'karwan bazar', 'রমনা', 'ramna', 'ডেমরা', 'demra', 'কামরাঙ্গীরচর', 'রায়েরবাজার', 'হাজারীবাগ', 'hazaribagh',
  'ফুলবাড়িয়া', 'আরামবাগ', 'arambagh', 'বেগুনবাড়ি', 'নন্দীপাড়া', 'রূপনগর', 'rupnagar', 'ঢাকা বিশ্ববিদ্যালয়',
  'সাভার', 'savar', 'আশুলিয়া', 'ashulia', 'কেরানীগঞ্জ', 'keraniganj', 'দোহার', 'dohar',
];
const STOPWORDS = new Set(['ও', 'এবং', 'এর', 'and', 'of', 'the', 'a', 'an', 'te', 'od', 'ond', 'o'].map((w) => foldSearchText(w) || w));

function words(folded: string): string[] {
  return folded.split(' ').filter((w) => w && !STOPWORDS.has(w));
}

/** BD mobile number as 01XXXXXXXXX, or null. */
export function bdMobile(raw: string): string | null {
  let digits = toEnDigits(String(raw || '')).replace(/\D/g, '');
  if (digits.startsWith('0088')) digits = digits.slice(4);
  else if (digits.startsWith('88')) digits = digits.slice(2);
  if (/^1[3-9]\d{8}$/.test(digits)) return '0' + digits;
  if (/^01[3-9]\d{8}$/.test(digits)) return digits;
  return null;
}

function cleanText(value: string): string {
  return value
    .replace(/[\s,;:।|\-–]+$/g, '')
    .replace(/^[\s,;:।|\-–]+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();
}

function hasLetters(value: string): boolean {
  return /[\p{L}]/u.test(value);
}

/** Split pasted text into messages (WhatsApp headers start a new one). */
function splitMessages(text: string): string[][] {
  const messages: string[][] = [[]];
  for (const raw of String(text || '').replace(INVISIBLE, '').replace(/\r/g, '').split('\n')) {
    const header = raw.match(CHAT_HEADER);
    if (header) {
      if (messages[messages.length - 1].some((line) => line.trim())) messages.push([]);
      const rest = raw.slice(header[0].length);
      if (rest.trim()) messages[messages.length - 1].push(rest);
    } else {
      messages[messages.length - 1].push(raw);
    }
  }
  return messages.map((lines) => lines.map((line) => line.trim()).filter((line) => line && !/^@/.test(line))).filter((lines) => lines.length);
}

function looksLikeOrder(lines: string[]): boolean {
  return lines.some((line) => (line.match(PHONE_CANDIDATE) || []).some((m) => bdMobile(m)) || PAY_WORDS.test(line));
}

function lastAmount(line: string): number | null {
  const numbers = toEnDigits(line).replace(/(\d),(\d{3})/g, '$1$2').match(/\d+(?:\.\d+)?/g);
  if (!numbers) return null;
  const value = Number(numbers[numbers.length - 1]);
  return Number.isFinite(value) && value > 0 && value < 1000000 ? value : null;
}

function payType(line: string): ParsedOrderMessage['paymentType'] {
  if (/বিকাশ|bkash|b-kash/i.test(line)) return 'BKASH';
  if (/নগদ|nagad/i.test(line)) return 'NAGAD';
  if (/রকেট|rocket|পেইড|\bpaid\b|অগ্রিম|advance|অনলাইন\s*পেমেন্ট|online\s*payment/i.test(line)) return 'ONLINE';
  return 'COD';
}

function addressScore(line: string): number {
  const folded = foldSearchText(line);
  const tokens = folded.split(' ');
  let score = 0;
  if (/\d/.test(toEnDigits(line))) score += 1;
  if ((line.match(/[,，]/g) || []).length >= 1) score += 1;
  if (ADDRESS_WORDS.some((w) => w && tokens.some((t) => t === w || (w.length >= 3 && t.startsWith(w))))) score += 2;
  if (findDistrict(line) || dhakaArea(line)) score += 2;
  if (tokens.length > 6) score += 1;
  return score;
}

function looksLikeName(line: string): boolean {
  const text = cleanText(line);
  if (!text || text.length > 45 || !hasLetters(text)) return false;
  if (/\d/.test(toEnDigits(text))) return false;
  if (text.split(/\s+/).length > 6) return false;
  return addressScore(text) < 2;
}

function tokenMatch(word: string, token: string): number {
  if (word === token) return 0;
  const wl = Array.from(word).length;
  const tl = Array.from(token).length;
  if (wl >= 3 && token.startsWith(word)) return 0;
  if (tl >= 3 && word.startsWith(token) && wl - tl <= 3) return 0;
  const max = allowedTypos(Math.min(wl, tl));
  if (!max) return -1;
  const distance = editDistance(Array.from(word), Array.from(token), max);
  return distance <= max ? distance : -1;
}

interface CatalogueEntry {
  product: AssistProduct;
  variants: { all: string[]; main: string[] }[];
}

export function prepareCatalogue(products: AssistProduct[]): CatalogueEntry[] {
  return products.map((product) => {
    const variants = [];
    for (const text of [product.name, product.nameEn]) {
      if (!text) continue;
      const full = String(text);
      // Main title: before brackets or " - " ("আমল বিশ্বকোষ - ৩৬৫ দিনের…", "… (নতুন সংস্করণ)").
      const main = full.replace(/\s*[\(\[].*?[\)\]]\s*/g, ' ').split(/\s+[-–|:]\s+/)[0];
      variants.push({ all: words(foldSearchText(full)), main: words(foldSearchText(main)) });
      const roman = romanizeBengali(full);
      if (roman) variants.push({ all: words(foldSearchText(roman)), main: words(foldSearchText(romanizeBengali(main))) });
    }
    return { product, variants: variants.filter((v) => v.all.length && v.main.length) };
  });
}

/** Best catalogue match for one line, with how much of the line and of the title matched. */
export function matchProduct(line: string, catalogue: CatalogueEntry[], strict = false) {
  const lineWords = words(foldSearchText(line));
  if (!lineWords.length || !lineWords.some((w) => /\D/.test(w))) return null;
  let best = null;
  for (const entry of catalogue) {
    for (const variant of entry.variants) {
      let matched = 0;
      let typos = 0;
      for (const word of lineWords) {
        let found = -1;
        for (const token of variant.all) {
          const d = tokenMatch(word, token);
          if (d >= 0 && (found < 0 || d < found)) found = d;
          if (found === 0) break;
        }
        if (found >= 0) {
          matched += 1;
          typos += found;
        }
      }
      const mainMatched = variant.main.filter((token) => lineWords.some((word) => tokenMatch(word, token) >= 0)).length;
      const lineCov = matched / lineWords.length;
      const titleCov = mainMatched / variant.main.length;
      const need = strict ? [0.8, 0.75] : [0.6, 0.5];
      if (lineCov < need[0] || titleCov < need[1] || !matched) continue;
      const score = lineCov + titleCov - typos * 0.05;
      if (
        !best ||
        score > best.score + 1e-9 ||
        (Math.abs(score - best.score) < 1e-9 && (entry.product.totalSold || 0) > (best.product.totalSold || 0))
      ) {
        best = { product: entry.product, score, lineCov, titleCov };
      }
    }
  }
  return best;
}

/** How many copies a book line asks for: "x2", "২টি", "2 pcs", "৩ কপি". */
function quantityOf(line: string): { qty: number; text: string } {
  const text = toEnDigits(line);
  const patterns = [/\s*[x×*]\s*(\d{1,2})\s*$/i, /^\s*(\d{1,2})\s*[x×*]\s*/i, /\s*[(\[]?\s*(\d{1,2})\s*(?:টি|টা|কপি|পিস|pcs?|piece|pieces|copy|copies)\s*[)\]]?\s*$/i];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) return { qty: Math.max(1, Math.min(50, Number(m[1]))), text: line.slice(0, m.index) + line.slice((m.index || 0) + m[0].length) };
  }
  return { qty: 1, text: line };
}

export function findDistrict(text: string): string {
  const folded = ' ' + foldSearchText(text) + ' ';
  let found = '';
  let at = -1;
  for (const [bn, others] of DISTRICTS) {
    for (const name of [bn, ...others]) {
      const key = ' ' + foldSearchText(name) + ' ';
      const index = folded.lastIndexOf(key.trimEnd());
      if (index >= 0 && folded.slice(index).startsWith(key.trimEnd()) && index > at) {
        const next = folded.charAt(index + key.trimEnd().length);
        if (next === ' ' || next === '') {
          found = bn;
          at = index;
        }
      }
    }
  }
  return found;
}

function dhakaArea(text: string): boolean {
  const folded = ' ' + foldSearchText(text) + ' ';
  return DHAKA_AREAS.some((area) => folded.includes(' ' + foldSearchText(area)));
}

export function parseOrderMessage(text: string, catalogue: CatalogueEntry[]): ParsedOrderMessage {
  const warnings: string[] = [];
  const all = splitMessages(text);
  const orders = all.filter(looksLikeOrder);
  const lines = (orders[0] || all[0] || []).slice();
  if (orders.length > 1) {
    warnings.push(`The text has ${orders.length} orders. Only the first one was read; paste one order at a time.`);
  }

  const phones: string[] = [];
  let name = '';
  const address: string[] = [];
  const addressParts = { thana: '', district: '', division: '' };
  let paymentType: ParsedOrderMessage['paymentType'] = 'COD';
  let quotedTotal: number | null = null;
  let deliveryCharge: number | null = null;
  const bookLines: string[] = [];
  const plain: { line: string; index: number }[] = [];
  let index = 0;

  for (const raw of lines) {
    // Several labels on one line ("স্থায়ী ঠিকানা: … । রিসিভের জায়গা: …")
    for (let segment of raw.split(/।\s*(?=\S+(?:\s\S+)?\s*[:：ঃ])/)) {
      segment = segment.trim();
      if (!segment) continue;
      index += 1;
      // Phones anywhere in the line.
      let rest = segment;
      for (const candidate of segment.match(PHONE_CANDIDATE) || []) {
        const phone = bdMobile(candidate);
        if (phone) {
          if (!phones.includes(phone)) phones.push(phone);
          rest = rest.replace(candidate, ' ');
        }
      }
      const label = LABELS.find(([pattern]) => pattern.test(rest));
      if (label) {
        const value = cleanText(rest.replace(label[0], ''));
        if (!value) continue;
        if (label[1] === 'name') name = name || value;
        else if (label[1] === 'address') address.push(value);
        else if (label[1] === 'book') bookLines.push(value);
        else if (label[1] !== 'phone') addressParts[label[1]] = addressParts[label[1]] || value;
        continue;
      }
      if (AMOUNT_LINE.test(rest.trim()) && !PAY_WORDS.test(rest)) {
        // A bare total ("৩৫৪/-").
        quotedTotal = lastAmount(rest);
        continue;
      }
      rest = cleanText(rest);
      if (!rest || !hasLetters(rest)) continue;
      if (DELIVERY_WORDS.test(rest) && !PAY_WORDS.test(rest)) {
        deliveryCharge = lastAmount(rest);
        continue;
      }
      if (PAY_WORDS.test(rest)) {
        paymentType = payType(rest);
        const amount = lastAmount(rest);
        if (amount != null) quotedTotal = amount;
        continue;
      }
      plain.push({ line: rest, index });
    }
  }

  // Book lines: labelled ones, then any line that matches the catalogue well.
  const products = new Map<string, { _id: string; name: string; price: number; qty: number; line: string }>();
  const unmatched: string[] = [];
  const addProduct = (line: string, strict: boolean) => {
    const { qty, text: title } = quantityOf(line);
    const match = matchProduct(title, catalogue, strict);
    if (!match) return false;
    const id = String(match.product._id);
    const seen = products.get(id);
    if (seen) seen.qty += qty;
    else products.set(id, { _id: id, name: match.product.name, price: match.product.price, qty, line });
    return true;
  };
  for (const line of bookLines) if (!addProduct(line, false)) unmatched.push(line);

  // The name is usually the first plain line; a book title there needs a near-exact match.
  const firstText = plain[0];
  let firstBookIndex = Infinity;
  const rest: { line: string; index: number }[] = [];
  for (const entry of plain) {
    const isFirst = entry === firstText && !name;
    if (addProduct(entry.line, isFirst)) {
      firstBookIndex = Math.min(firstBookIndex, entry.index);
    } else {
      rest.push(entry);
    }
  }

  // Name: labelled, else the first plain line that reads like a name.
  const before = rest.filter((entry) => entry.index < firstBookIndex);
  const after = rest.filter((entry) => entry.index > firstBookIndex);
  if (!name) {
    // Only lines above the address: a message without a name must not borrow a book title.
    const firstAddress = before.findIndex((entry) => addressScore(entry.line) >= 2);
    const candidate = before.find((entry, i) => (firstAddress < 0 || i < firstAddress) && looksLikeName(entry.line));
    if (candidate) {
      name = candidate.line;
      before.splice(before.indexOf(candidate), 1);
    }
  }
  name = cleanText(name).replace(/[.।,]+$/, '');

  // Address: the plain lines before the books. Once an address-like line was
  // seen, plain lines after the last one ("Edventure", "পড়ো সিরিজ") are book
  // names we could not find, not more address.
  let lastAddress = -1;
  before.forEach((entry, i) => {
    if (addressScore(entry.line) >= 2) lastAddress = i;
  });
  before.forEach((entry, i) => {
    if (lastAddress >= 0 && i > lastAddress && addressScore(entry.line) < 2) unmatched.push(entry.line);
    else address.push(entry.line);
  });
  // Plain lines after the books: book names we could not find, unless clearly an address.
  for (const entry of after) {
    if (addressScore(entry.line) >= 3) address.push(entry.line);
    else unmatched.push(entry.line);
  }
  for (const part of [addressParts.thana, addressParts.district, addressParts.division]) {
    if (part && !address.some((line) => foldSearchText(line).includes(foldSearchText(part)))) address.push(part);
  }
  const fullAddress = address
    .map((line) => cleanText(line).replace(/[.।]+$/, ''))
    .filter(Boolean)
    .join(', ')
    .replace(/\s*,\s*,+/g, ', ')
    .replace(/\s{2,}/g, ' ');

  const city = findDistrict(addressParts.district) || findDistrict(fullAddress) || (dhakaArea(fullAddress) ? 'ঢাকা' : '');
  const insideDhaka = city ? city === 'ঢাকা' : dhakaArea(fullAddress) ? true : null;

  const productList = [...products.values()];
  const booksTotal = productList.reduce((sum, p) => sum + p.price * p.qty, 0);
  if (deliveryCharge == null && quotedTotal != null && productList.length && !unmatched.length) {
    const derived = quotedTotal - booksTotal;
    if (derived >= 0 && derived <= 250) deliveryCharge = derived;
  }
  if (deliveryCharge == null && insideDhaka != null) deliveryCharge = insideDhaka ? 60 : 75;

  if (!phones.length) warnings.push('No phone number found.');
  if (phones.length > 1) warnings.push(`More than one phone number: ${phones.slice(1).join(', ')} added to the note.`);
  if (!name) warnings.push('No customer name found. Type it in.');
  if (!fullAddress) warnings.push('No address found.');
  if (!productList.length && !unmatched.length) warnings.push('No book found in the message.');
  if (unmatched.length) warnings.push(`Not in the shop under that name: ${unmatched.join(', ')}. Search and pick it below.`);
  if (quotedTotal != null && productList.length && !unmatched.length && deliveryCharge != null) {
    const total = booksTotal + deliveryCharge;
    if (Math.abs(total - quotedTotal) >= 1) {
      warnings.push(`Customer was told ৳${quotedTotal}; books ৳${booksTotal} + delivery ৳${deliveryCharge} = ৳${total}. Check the price.`);
    }
  }

  return {
    phone: phones[0] || '',
    altPhones: phones.slice(1),
    name,
    address: fullAddress,
    city,
    insideDhaka,
    paymentType,
    quotedTotal,
    products: productList,
    unmatched,
    booksTotal,
    deliveryCharge,
    messages: orders.length || all.length,
    warnings,
  };
}
