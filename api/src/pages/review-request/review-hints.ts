/**
 * Writing help on the review page (owner, 2026-11-13: "add some review suggestions like add a
 * particular part of the book, you can read the product description"). Parts of the book are read
 * from the product description: its list items ("১. কুরআনের বার্তা: ...", "✅ ...") and short
 * headings. Selling lines (price, delivery, free notebook, "order now") are left out. Each hint is a
 * short label and the opening words it puts in the review box; the customer writes the rest.
 */
export interface ReviewHint {
  label: string;
  starter: string;
}

const MAX_TOPICS = 4;
const SELLING = /অর্ডার|ফ্রি|ডেলিভারি|টাকা|৳|মূল্য|দাম|অফার|ছাড়|ছাড়|কুপন|ফরম|ফোন|নোটবুক|স্টক|কিনুন|কিনতে|ক্যাশ|পেমেন্ট|পাচ্ছেন|সংস্করণ|এডিশন|প্রকাশনী|প্রকাশক|পৃষ্ঠা|কভার|বাঁধাই|ছাপা|isbn|লেখক|অনুবাদ|উপহার|গিফট|বিকাশ|নগদ|order|free|price|delivery/i;
// Credits, book parts every book has, and lead-in lines ("এই বইয়ের মাধ্যমে আপনি—") are no topic.
const NOT_A_TOPIC = /সম্পাদনা|সম্পাদক|নিরীক্ষণ|নিরীক্ষা|তত্ত্বাবধান|অনুবাদক|শব্দানুবাদ|প্রচ্ছদ|সংকলন|সংকলক|গ্রন্থস্বত্ব|স্বত্ব|মুদ্রণ|প্রকাশকাল|বিন্যাস|শরঈ|রচনা|ভূমিকা|সূচিপত্র|সূচি|ফ্ল্যাপ|পরিচিতি|বই সম্পর্কে|এই বই|বইটি|বইয়ের|আপনি|আপনার|আমরা|আমাদের|কেন পড়বেন|যা পাবেন|বিস্তারিত|বিষয়বস্তু/;
const BULLET = /^(?:[✅✔☑✓•●◆◇▪▫■□➤►▶➔→⭐🌟🔹🔸💠📌📖📚✨\-–—*]+|[০-৯0-9]{1,2}\s*[.)।:–-])\s*/u;

function decode(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(Number(code)));
}

/** The description as plain lines (one per paragraph / list item / line break). */
export function descriptionLines(html: any): string[] {
  const text = decode(
    String(html || '')
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr|section|blockquote)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<[^>]+>/g, ' '),
  );
  return text.split(/\n+/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** A part of the book from one line, or '' (too long, a whole sentence, or a selling line). */
export function topicFromLine(line: string, bookName = ''): string {
  const listed = BULLET.test(line);
  let topic = line.replace(BULLET, '').trim();
  // "কুরআনের বার্তা: এখানে রয়েছে ..." → the name before the colon / dash.
  const head = topic.split(/\s*[:：]\s*|\s+[–—-]\s+/)[0].trim();
  if (head && head !== topic && head.length >= 3) {
    // A "name: value" line that is not a list item needs a name of two words or more.
    if (!listed && head.split(' ').length < 2) return '';
    topic = head;
  } else if (!listed) return '';
  topic = topic
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/^[\s"'“”‘’«»(]+|[\s"'“”‘’«»).,।;!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (topic.length < 3 || topic.length > 42) return '';
  if (!/[ঀ-৿]/.test(topic)) return '';
  if (SELLING.test(topic) || NOT_A_TOPIC.test(topic)) return '';
  if (/[—–\-:]$/.test(line.trim()) && !line.includes(':')) return '';
  if (topic.split(' ').length > 7) return '';
  if (bookName && topic === bookName.trim()) return '';
  return topic;
}

/** Up to four parts of the book named in its description. */
export function bookTopics(description: any, bookName = ''): string[] {
  const seen = new Set<string>();
  const topics: string[] = [];
  for (const line of descriptionLines(description)) {
    const topic = topicFromLine(line, bookName);
    if (!topic || seen.has(topic)) continue;
    seen.add(topic);
    topics.push(topic);
    if (topics.length >= MAX_TOPICS) break;
  }
  return topics;
}

/** The hints for one book: its own parts first, then questions every review can answer. */
export function reviewHints(product: any): ReviewHint[] {
  const name = String(product?.name || '');
  const topics = bookTopics(product?.description, name);
  if (topics.length < 2) {
    for (const topic of bookTopics(product?.shortDescription, name)) {
      if (!topics.includes(topic) && topics.length < MAX_TOPICS) topics.push(topic);
    }
  }
  const hints: ReviewHint[] = topics.map((topic) => ({
    label: topic,
    starter: `«${topic}» নিয়ে আমার মতামত: `,
  }));
  // A plain description: the book's subject from its category gives one book-specific question.
  if (topics.length < 2) {
    const subject = (Array.isArray(product?.category) ? product.category : [])
      .map((category: any) => String(category?.name || '').trim())
      .find((name: string) => name && name.length <= 32 && /[\u0980-\u09FF]/.test(name) && !SELLING.test(name));
    const about = subject && /বিষয়/.test(subject) ? subject : subject && `${subject} বিষয়ে`;
    if (about) hints.push({ label: `${about} কতটা কাজে এল`, starter: `${about} বইটি ` });
  }
  hints.push(
    { label: 'সবচেয়ে ভালো লাগা অংশ', starter: 'বইটির যে অংশটি সবচেয়ে ভালো লেগেছে: ' },
    { label: 'কী শিখলেন', starter: 'বইটি পড়ে আমি শিখেছি ' },
    { label: 'কাদের পড়া উচিত', starter: 'বইটি তাদের জন্য উপকারী, যারা ' },
    { label: 'ভাষা ও উপস্থাপনা', starter: 'বইয়ের ভাষা ও উপস্থাপনা ' },
    { label: 'ছাপা ও বাঁধাই', starter: 'বইয়ের ছাপা ও বাঁধাই ' },
  );
  return hints;
}
