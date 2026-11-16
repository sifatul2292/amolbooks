/**
 * Spelling-tolerant book search (owner, 2026-11-06): "আত্মার ঔষুধ" must find
 * "আত্মার ওষুধ" and "আধুনিল ফিতনা" must find "আধুনিক ফিতনা".
 *
 * 1. Strong matches: every typed word (or the whole text without spaces) is
 *    found in the book's name, English name, author, publisher, translator,
 *    category or SEO keywords, after folding letters people mix up (ঔ/ও,
 *    ী/ি, ূ/ু, শ/ষ/স, ণ/ন, য/জ, ড়/র, ক্ষ/খ, hasanta, য় written two ways, doubled letters...).
 *    These keep the requested sort, as the old exact search did.
 * 2. Only when nothing matches strongly: close spellings (one wrong, missing
 *    or extra letter in a 4-7 letter word, two in longer words), best first.
 *
 * Banglish (owner, 2026-11-08): "sompod ow rijiker rohosso" must find
 * "সম্পদ ও রিজিকের গোপন রহস্য". Every Bengali field is also written in Latin
 * letters (romanizeBengali), and Latin words fold the spellings people mix up
 * (sh/s, a/o, z/j, v/bh/b, ph/f, w/o, y/i, ee/i, kh/k, doubled letters, a final o).
 * The header dropdown (storefront-product-sections-script.ts searchKey /
 * searchRoman) mirrors both; scripts/check-product-search.cjs keeps them equal.
 */

export interface SearchCandidate {
  _id: any;
  name?: any;
  nameEn?: any;
  seoKeywords?: any;
  translatorName?: any;
  category?: any;
  publisher?: any;
  author?: any;
  /** Copies sold: related books (relatedSearch) put best sellers first. Optional. */
  totalSold?: any;
}

interface PreparedCandidate {
  id: any;
  order: number;
  sold: number;
  // Folded text of every searchable field, and of the name alone.
  all: string;
  allCompact: string;
  name: string;
  tokens: string[];
  nameTokens: Set<string>;
}

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

// Common words spelled several ways (applied after folding, so on folded text):
// কোরআন / কোরান / কুরান → কুরআন, দোয়া / দুয়া / দোআ → দুআ, quran / koran → quran.
const SPELLINGS: [RegExp, string][] = [
  [/কোরআন|কোরান|কুরান/g, 'কুরআন'],
  [/দোজা|দুজা|দোআ/g, 'দুআ'],
  [/\b(koran|kuran|quraan)/g, 'quran'],
];

/**
 * One Latin word as Banglish spellings meet: sh/s, kh/k, bh/b... (h after a
 * consonant), a/o, z/j, v/b, ph/f, q/k, w/o, y/i, ee/i, doubled letters once,
 * and a final o dropped ("rohossho" = "rohosso" = "rohos").
 */
export function foldLatinWord(word: string): string {
  let text = word
    .replace(/ph/g, 'f')
    .replace(/q/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/z/g, 'j')
    .replace(/v/g, 'b')
    .replace(/w/g, 'o')
    .replace(/y/g, 'i')
    .replace(/ee/g, 'i')
    .replace(/([bcdfgjklmnprst])h/g, '$1')
    .replace(/a/g, 'o')
    .replace(/(.)\1+/g, '$1');
  if (text.length > 3 && text.endsWith('o')) text = text.slice(0, -1);
  return text;
}

const ROMAN_CONSONANTS: Record<string, string> = {
  ক: 'k', খ: 'kh', গ: 'g', ঘ: 'gh', ঙ: 'ng', চ: 'c', ছ: 'ch', জ: 'j', ঝ: 'jh', ঞ: 'n',
  ট: 't', ঠ: 'th', ড: 'd', ঢ: 'dh', ণ: 'n', ত: 't', থ: 'th', দ: 'd', ধ: 'dh', ন: 'n',
  প: 'p', ফ: 'f', ব: 'b', ভ: 'bh', ম: 'm', য: 'j', র: 'r', ল: 'l', শ: 'sh', ষ: 'sh',
  স: 's', হ: 'h', ৎ: 't',
};
const ROMAN_VOWEL_SIGNS: Record<string, string> = {
  'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
};
const ROMAN_VOWELS: Record<string, string> = {
  অ: 'o', আ: 'a', ই: 'i', ঈ: 'i', উ: 'u', ঊ: 'u', ঋ: 'ri', এ: 'e', ঐ: 'oi', ও: 'o', ঔ: 'ou',
};
const ROMAN_SIGNS: Record<string, string> = { 'ং': 'ng', 'ঃ': 'h', 'ঁ': '' };

/**
 * Bengali words in Latin letters the way people type them: "সম্পদ" → "sompod",
 * "রিজিকের" → "rijiker", "ফিতনা" → "fitna". A consonant carries "o" unless a
 * vowel sign or hasanta follows; it drops that "o" at the end of a word and
 * before a consonant that has its own vowel (after the first syllable); য/ব
 * after a hasanta are silent (রহস্য → "rohos", বিশ্ব → "bish"). Other text is
 * left out.
 */
export function romanizeBengali(value: any): string {
  const words: string[] = String(value == null ? '' : value).normalize('NFC').match(/[ঀ-৿]+/g) || [];
  return words
    .map((word) => {
      const chars: string[] = Array.from(word);
      const isConsonant = (c: string) => c in ROMAN_CONSONANTS;
      let out = '';
      let voweled = false;
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        if (isConsonant(c)) {
          let base = ROMAN_CONSONANTS[c];
          let j = i + 1;
          if (chars[j] === '়') {
            base = c === 'য' ? 'y' : 'r';
            j++;
          }
          if ((c === 'য' || c === 'ব') && chars[i - 1] === '্' && j === i + 1) base = '';
          out += base;
          const next = chars[j];
          if (next in ROMAN_VOWEL_SIGNS) {
            out += ROMAN_VOWEL_SIGNS[next];
            voweled = true;
            i = j;
          } else if (next === '্') {
            i = j;
          } else if (next && isConsonant(next)) {
            let k = j + 1;
            if (chars[k] === '়') k++;
            if (!(voweled && chars[k] in ROMAN_VOWEL_SIGNS)) {
              out += 'o';
              voweled = true;
            }
            i = j - 1;
          } else if (next in ROMAN_SIGNS) {
            out += 'o';
            voweled = true;
            i = j - 1;
          } else {
            i = j - 1;
          }
        } else if (c in ROMAN_VOWELS) {
          out += ROMAN_VOWELS[c];
          voweled = true;
        } else if (c in ROMAN_SIGNS) {
          out += ROMAN_SIGNS[c];
        } else if (c >= '০' && c <= '৯') {
          out += String(BENGALI_DIGITS.indexOf(c));
        }
      }
      return out;
    })
    .filter(Boolean)
    .join(' ');
}

/** Lower-case, NFC, Bengali letters that sound alike folded together, punctuation removed. */
export function foldSearchText(value: any): string {
  let text = String(value == null ? '' : value).normalize('NFC').toLowerCase();
  text = text
    // Precomposed nukta letters → base + nukta, so both spellings fold alike.
    .replace(/ড়/g, 'ড়')
    .replace(/ঢ়/g, 'ঢ়')
    .replace(/য়/g, 'য়')
    .replace(/ড়|ঢ়/g, 'র') // ড় ঢ় → র
    .replace(/ক্ষ/g, 'খ') // ক্ষ → খ
    .replace(/জ্ঞ/g, 'গ') // জ্ঞ → গ
    .replace(/[়্ঁঃ‌‍]/g, '') // nukta, hasanta, chandrabindu, visarga, ZWJ/ZWNJ
    .replace(/[ঈ]/g, 'ই')
    .replace(/[ী]/g, 'ি')
    .replace(/[ঊ]/g, 'উ')
    .replace(/[ূ]/g, 'ু')
    .replace(/[ঔ]/g, 'ও')
    .replace(/[ৌ]/g, 'ো')
    .replace(/[ঐ]/g, 'ই')
    .replace(/[ৈ]/g, 'ি')
    .replace(/ঋ/g, 'রি')
    .replace(/ৃ/g, 'রি')
    .replace(/[শষ]/g, 'স')
    .replace(/ণ/g, 'ন')
    .replace(/য/g, 'জ')
    .replace(/ঙ/g, 'ং')
    .replace(/ৎ/g, 'ত')
    .replace(/[০-৯]/g, (digit) => String(BENGALI_DIGITS.indexOf(digit)))
    // Doubled letters count once (কাইয়্যিম / কাইয়িম, ক্ক).
    .replace(/(\p{L}|\p{M})\1+/gu, '$1');
  text = text
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [pattern, replacement] of SPELLINGS) text = text.replace(pattern, replacement);
  return text
    .split(' ')
    .map((word) => (/^[a-z]+$/.test(word) ? foldLatinWord(word) : word))
    .join(' ');
}

/** A field's searchable text: its folded words plus the Banglish form of its Bengali words. */
function searchable(value: any): string {
  const folded = foldSearchText(value);
  const latin = foldSearchText(romanizeBengali(value));
  return latin ? folded + ' ' + latin : folded;
}

function textsOf(value: any): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap(textsOf);
  if (typeof value === 'object') return textsOf(value.name);
  return [String(value)];
}

/** Letters (code points) of a folded word. */
function letters(word: string): string[] {
  return Array.from(word);
}

/** How many wrong letters a word of this length may have. */
export function allowedTypos(length: number): number {
  if (length <= 3) return 0;
  if (length <= 7) return 1;
  return 2;
}

/** Edit distance with swaps (optimal string alignment); stops early above `max`. */
export function editDistance(a: string[], b: string[], max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous2: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, previous2[j - 2] + 1);
      }
      current[j] = value;
      if (value < best) best = value;
    }
    if (best > max) return max + 1;
    previous2 = previous;
    previous = current;
  }
  return previous[b.length];
}

export function prepareCandidates(docs: SearchCandidate[]): PreparedCandidate[] {
  return docs.map((doc, order) => {
    const name = textsOf(doc.name).concat(textsOf(doc.nameEn)).map(searchable).join(' ');
    const others = [
      doc.author,
      doc.publisher,
      doc.translatorName,
      doc.category,
      doc.seoKeywords,
    ]
      .flatMap(textsOf)
      .map(searchable)
      .join(' ');
    const all = (name + ' ' + others).trim();
    return {
      id: doc._id,
      order,
      sold: Number(doc.totalSold) || 0,
      all,
      allCompact: all.replace(/ /g, ''),
      name,
      tokens: [...new Set(all.split(' ').filter(Boolean))],
      nameTokens: new Set(name.split(' ').filter(Boolean)),
    };
  });
}

/**
 * Ids in result order, or [] when nothing is close. `candidates` must already
 * be in the requested sort order (strong matches keep it).
 */
export function rankSearch(candidates: PreparedCandidate[], query: string): any[] {
  const folded = foldSearchText(query);
  if (!folded) return [];
  const words = folded.split(' ');
  const compact = folded.replace(/ /g, '');

  // A Latin word must start a word (Banglish folding makes inside-a-word hits
  // too loose); Bengali text may sit anywhere, as before.
  const found = (c: PreparedCandidate, word: string, inName = false) =>
    /^[a-z]+$/.test(word)
      ? c.tokens.some((token) => token.startsWith(word) && (!inName || c.nameTokens.has(token)))
      : (inName ? c.name : c.all).includes(word);
  const strong = candidates.filter(
    (c) => words.every((word) => found(c, word)) || (compact.length >= 4 && c.allCompact.includes(compact)),
  );
  if (strong.length) {
    // Books with every word in the title come first; each group keeps the requested sort.
    const titled = strong.filter((c) => words.every((word) => found(c, word, true)));
    const rest = strong.filter((c) => !titled.includes(c));
    return titled.concat(rest).map((c) => c.id);
  }

  // Close spellings. Single letters are ignored (often a stray key press).
  const fuzzyWords = words.filter((word) => letters(word).length >= 2);
  if (!fuzzyWords.length) return [];
  const last = fuzzyWords.length - 1;
  const scored = [];
  for (const candidate of candidates) {
    let matched = 0;
    let typos = 0;
    let inName = 0;
    fuzzyWords.forEach((word, index) => {
      const chars = letters(word);
      const max = allowedTypos(chars.length);
      let best = max + 1;
      let bestToken = '';
      for (const token of candidate.tokens) {
        if (token.startsWith(word)) {
          best = 0;
          bestToken = token;
          break;
        }
        const tokenChars = letters(token);
        let distance = editDistance(chars, tokenChars, max);
        // The last word may still be being typed: compare with the start of longer words.
        if (index === last && distance > max && tokenChars.length > chars.length && chars.length >= 3) {
          distance = editDistance(chars, tokenChars.slice(0, chars.length), max);
        }
        if (distance < best) {
          best = distance;
          bestToken = token;
          if (best === 0) break;
        }
      }
      if (best <= max) {
        matched += 1;
        typos += best;
        if (candidate.nameTokens.has(bestToken)) inName += 1;
      }
    });
    // Every word close, or (3+ words) all but one: one wrong extra word still finds the book.
    const needed = fuzzyWords.length >= 3 ? fuzzyWords.length - 1 : fuzzyWords.length;
    if (matched >= needed) scored.push({ candidate, matched, typos, inName });
  }
  scored.sort(
    (a, b) =>
      b.matched - a.matched ||
      a.typos - b.typos ||
      b.inName - a.inName ||
      a.candidate.order - b.candidate.order,
  );
  return scored.map((entry) => entry.candidate.id);
}

/* ---------------- Related books (owner, 2026-11-16) ----------------
 * "Whatever people search, show related books": when rankSearch finds nothing, the customer still
 * gets books. In 30 days 117 of 389 searched terms ended on an empty page: half-typed or badly
 * misspelled titles ("পোডাক্টেট মুসলিম", "দি বারাকা"), topics ("parenting", "জীবনী বই") and books
 * the shop does not have ("rich dad"). relatedSearch scores every book by the typed words it
 * shares (exact, close spelling, same beginning) and by the topic the words point to, and fills
 * the list with best sellers; with nothing shared at all it returns best sellers only. Weak
 * likenesses are dropped (a wrong "similar" book is worse than a best seller).
 * Server only: the header dropdown and the results page both read this through product/get-all.
 */

// Words that say nothing about the book (folded forms are computed below).
const RELATED_STOP_WORDS = [
  'বই', 'বইটি', 'বইয়ের', 'এর', 'ও', 'এবং', 'কি', 'কী', 'হবে', 'আছে', 'নিয়ে', 'জন্য', 'একটি', 'হযরত', 'সাঃ', 'সা', 'রাঃ',
  'সাথে', 'কথা', 'হে', 'তারিখে', 'পাঠানো', 'নেবে', 'পর', 'সব', 'আর', 'আমরা', 'আপনি', 'না', 'সিরিজ',
  'সাল্লাল্লাহু', 'আলাইহি', 'ওয়াসাল্লাম', 'পাবলিকেশন', 'প্রকাশনী', 'প্রকাশন', 'দি', 'দ্য', 'দ্যা', 'অব',
  'the', 'of', 'and', 'for', 'book', 'books', 'boi', 'er', 'in', 'to', 'a', 'an',
];

// A typed word → words the shop's books use for that topic.
const RELATED_TOPICS: [string[], string[]][] = [
  [['parenting', 'parent', 'kids', 'kid', 'child', 'children', 'baby', 'প্যারেন্টিং', 'প্যারেনটিং', 'প্যারেনটিংস', 'বাচ্চা', 'শিশু'], ['সন্তান', 'শিশু', 'ছোটদের', 'প্যারেন্টিং']],
  [['জীবনী', 'jiboni', 'biography', 'sirat', 'seerah', 'seerat', 'সিরাত', 'সীরাত'], ['সীরাত', 'নবিজি', 'নবীজি', 'রাসুল', 'মুহাম্মাদ']],
  [['bibaho', 'biye', 'marriage', 'wedding', 'বিয়ে', 'বিবাহ', 'দাম্পত্য', 'সংসার'], ['বিয়ে', 'বিবাহ', 'দাম্পত্য', 'সংসার']],
  [['arabic', 'arbi', 'আরবি'], ['আরবি', 'শব্দে কুরআন']],
  [['business', 'ব্যবসা', 'উদ্যোক্তা', 'উদ্দোক্তা', 'উদ্দক্তা', 'entrepreneur', 'startup'], ['ব্যবসা', 'বিজনেস', 'উদ্যোক্তা']],
  [['rich', 'money', 'millionaire', 'millioner', 'wealth', 'টাকা', 'ধনী', 'সম্পদ', 'রিচ'], ['সম্পদ', 'রিজিক', 'বিজনেস', 'বিলিয়ন']],
  [['namaz', 'namaj', 'salat', 'salah', 'নামাজ', 'নামায', 'সালাত'], ['সালাত', 'নামাজ', 'খুশু']],
  [['dua', 'doa', 'দোয়া', 'দুআ', 'দোআ', 'zikr', 'jikir', 'যিকির'], ['দুআ', 'যিকর']],
  [['habit', 'productivity', 'productive', 'dopamine', 'ডোপামিন', 'time', 'অলসতা', 'motivation'], ['প্রোডাক্টিভ', 'টাইম', 'অলসতা', 'মাইন্ডসেট']],
  [['women', 'woman', 'nari', 'নারী', 'মহিলা', 'hijab', 'হিজাব'], ['নারী', 'হিজাব', 'মুসলিমাহ']],
  [['history', 'itihas', 'ইতিহাস'], ['ইতিহাস']],
  [['tafsir', 'তাফসির', 'তাফসীর', 'fatiha', 'ফাতিহা', 'surah', 'সূরা'], ['তাফসীর', 'কুরআন', 'সূরা']],
  [['hadis', 'hadith', 'হাদিস', 'হাদীস'], ['হাদিস', 'রিয়াদুস']],
  [['ramadan', 'ramjan', 'roja', 'রমজান', 'রমাদান', 'রোজা'], ['রমাদান', 'রমজান']],
  [['aqida', 'akida', 'iman', 'ঈমান', 'আকিদা', 'আকীদা'], ['ঈমান', 'আকিদা']],
];

let relatedStop: Set<string> | null = null;
let relatedTopics: { words: Set<string>; terms: string[] }[] | null = null;
function relatedTables() {
  if (!relatedStop) {
    relatedStop = new Set(RELATED_STOP_WORDS.flatMap((word) => foldSearchText(word).split(' ')).filter(Boolean));
    relatedTopics = RELATED_TOPICS.map(([words, terms]) => ({
      words: new Set(words.flatMap((word) => foldSearchText(word).split(' ')).filter(Boolean)),
      terms: terms.map((term) => foldSearchText(term)).filter(Boolean),
    }));
  }
  return { stop: relatedStop, topics: relatedTopics };
}

export interface RelatedResult {
  ids: any[];
  /** similar: books sharing a word or topic with the search; popular: nothing shared, the shop's first books. */
  kind: 'similar' | 'popular';
}

/**
 * Books to show when rankSearch found nothing. `candidates` are in the requested order (it breaks
 * ties and supplies the "popular" list).
 */
export function relatedSearch(candidates: PreparedCandidate[], query: string, limit = 12): RelatedResult {
  const folded = foldSearchText(query);
  const { stop, topics } = relatedTables();
  // Best sellers first; without sales numbers, the requested order.
  const bestSellers = candidates.slice().sort((a, b) => b.sold - a.sold || a.order - b.order);
  const popular = (): RelatedResult => ({ ids: bestSellers.slice(0, limit).map((c) => c.id), kind: 'popular' });
  if (!folded) return { ids: [], kind: 'popular' };
  const typed = folded.split(' ').filter(Boolean);
  // Numbers count from two digits ("500", "৯৯"), words from three letters.
  const words = typed.filter((word) => !stop.has(word) && letters(word).length >= (/^\d+$/.test(word) ? 2 : 3));
  const topicTerms = [...new Set(topics.filter((topic) => typed.some((word) => topic.words.has(word))).flatMap((topic) => topic.terms))];
  if (!words.length && !topicTerms.length) return popular();

  const scored: { candidate: PreparedCandidate; score: number }[] = [];
  for (const candidate of candidates) {
    let score = 0;
    for (const word of words) {
      const latin = /^[a-z]+$/.test(word);
      const chars = letters(word);
      // The word itself: at the start of a book's word. A short word (up to four letters) must be
      // nearly the whole word ("রিচ" is not "পরিচয়", "পড়ো" is not "প্রোডাক্টিভ"); Latin from four letters.
      const short = chars.length <= 4;
      const starts = (token: string) =>
        token.startsWith(word) && (!short || letters(token).length - chars.length <= 3);
      const exact = latin && chars.length < 4 ? undefined
        : candidate.tokens.find((token) => starts(token) && candidate.nameTokens.has(token)) ||
          candidate.tokens.find(starts) ||
          (!latin && !short && candidate.all.includes(word) ? word : undefined);
      if (exact !== undefined) {
        const inName = candidate.nameTokens.has(exact) || (!latin && !short && candidate.name.includes(word));
        score += inName ? 6 : 3;
        continue;
      }
      // Close spellings: Bengali words from four letters, Latin from six (short Banglish words
      // are close to too many others).
      if (chars.length < (latin ? 6 : 4)) continue;
      // One letter more than the strict search allows, also against the start of a longer word
      // ("উদ্দোক্তা" → "উদ্যোক্তার").
      const max = allowedTypos(chars.length) + 1;
      let best = max + 1;
      let bestToken = '';
      for (const token of candidate.tokens) {
        const tokenChars = letters(token);
        if (tokenChars.length < 3) continue;
        let distance = editDistance(chars, tokenChars, max);
        if (distance > max && tokenChars.length > chars.length) distance = editDistance(chars, tokenChars.slice(0, chars.length), max);
        if (distance < best) {
          best = distance;
          bestToken = token;
        }
      }
      // Never more than a quarter of the word wrong.
      if (best <= max && best * 4 <= chars.length) {
        score += (candidate.nameTokens.has(bestToken) ? 4 : 2) - (best > 1 ? 1 : 0);
        continue;
      }
      // The same beginning (first four letters) of a title word: a half-typed title.
      if (chars.length >= 5) {
        const start = chars.slice(0, 4).join('');
        if ([...candidate.nameTokens].some((token) => token.startsWith(start))) score += 1;
      }
    }
    for (const term of topicTerms) {
      if (candidate.name.includes(term)) score += 3;
      else if (candidate.all.includes(term)) score += 1;
    }
    // 3 = the word itself somewhere, a close spelling in the title, or the topic in the title.
    if (score >= 3) scored.push({ candidate, score });
  }
  if (!scored.length) return popular();
  scored.sort((a, b) => b.score - a.score || b.candidate.sold - a.candidate.sold || a.candidate.order - b.candidate.order);
  const ids = scored.slice(0, limit).map((entry) => entry.candidate.id);
  // A short list is filled with best sellers (at least eight books to look at).
  const have = new Set(ids.map(String));
  for (const candidate of bestSellers) {
    if (ids.length >= Math.min(limit, 8)) break;
    if (!have.has(String(candidate.id))) ids.push(candidate.id);
  }
  return { ids, kind: 'similar' };
}
