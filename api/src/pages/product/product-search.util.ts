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
}

interface PreparedCandidate {
  id: any;
  order: number;
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
  return text;
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
    const name = textsOf(doc.name).concat(textsOf(doc.nameEn)).map(foldSearchText).join(' ');
    const others = [
      doc.author,
      doc.publisher,
      doc.translatorName,
      doc.category,
      doc.seoKeywords,
    ]
      .flatMap(textsOf)
      .map(foldSearchText)
      .join(' ');
    const all = (name + ' ' + others).trim();
    return {
      id: doc._id,
      order,
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

  const strong = candidates.filter(
    (c) => words.every((word) => c.all.includes(word)) || (compact.length >= 4 && c.allCompact.includes(compact)),
  );
  if (strong.length) return strong.map((c) => c.id);

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
