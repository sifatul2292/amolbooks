import * as crypto from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The compiled storefront (ui/dist, no source) keeps a customer's login in localStorage under
 * `encryptUserLogin`, as CryptoJS.AES.encrypt(JSON.stringify({ token, expiredDate, userId }),
 * storageSecret). Both values are in the storefront's main bundle, so they are read from there
 * (a rebuilt storefront keeps working). With this the review page can log a customer in after an
 * SMS code: the storefront then shows them logged in, with their orders, like any login.
 */
export const STOREFRONT_BROWSER_DIR = join(__dirname, '..', '..', '..', '..', 'ui', 'dist', 'angular-ui', 'browser');

export interface StorefrontLoginStorage {
  key: string;
  secret: string;
}

let cached: (StorefrontLoginStorage & { bundle: string }) | null = null;

export function storefrontLoginStorage(dir = STOREFRONT_BROWSER_DIR): StorefrontLoginStorage | null {
  try {
    const index = readFileSync(join(dir, 'index.html'), 'utf8');
    const main = /<script[^>]*\bsrc="(main\.[A-Za-z0-9]+\.js)"/.exec(index)?.[1];
    if (!main) return null;
    const bundle = join(dir, main);
    if (cached?.bundle === bundle) return { key: cached.key, secret: cached.secret };
    const code = readFileSync(bundle, 'utf8');
    const secret = /storageSecret:"([^"]+)"/.exec(code)?.[1];
    // encryptUserLogin:"Amolbooks_USER_1_"+r.N.VERSION, with VERSION:1 in the environment.
    const named = /encryptUserLogin:"([^"]+)"(\+[\w$]+\.[\w$]+\.VERSION)?/.exec(code);
    const version = /[,{]VERSION:(?:"([^"]*)"|(\d+))/.exec(code);
    if (!secret || !named || (named[2] && !version)) return null;
    const key = named[1] + (named[2] ? version[1] ?? version[2] : '');
    cached = { bundle, key, secret };
    return { key, secret };
  } catch {
    return null;
  }
}

/** OpenSSL EVP_BytesToKey with MD5, as CryptoJS does for a passphrase: 32-byte key + 16-byte IV. */
function passphraseKey(passphrase: string, salt: Buffer): { key: Buffer; iv: Buffer } {
  const pass = Buffer.from(passphrase, 'utf8');
  let derived = Buffer.alloc(0);
  let block = Buffer.alloc(0);
  while (derived.length < 48) {
    block = crypto.createHash('md5').update(Buffer.concat([block, pass, salt])).digest();
    derived = Buffer.concat([derived, block]);
  }
  return { key: derived.subarray(0, 32), iv: derived.subarray(32, 48) };
}

/** Same output as CryptoJS.AES.encrypt(text, passphrase).toString() ("Salted__" + salt + AES-256-CBC). */
export function cryptoJsEncrypt(text: string, passphrase: string, salt = crypto.randomBytes(8)): string {
  const { key, iv } = passphraseKey(passphrase, salt);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const body = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return Buffer.concat([Buffer.from('Salted__', 'utf8'), salt, body]).toString('base64');
}

/** Reverse of cryptoJsEncrypt (CryptoJS.AES.decrypt(...).toString(Utf8)). */
export function cryptoJsDecrypt(value: string, passphrase: string): string {
  const raw = Buffer.from(value, 'base64');
  if (raw.subarray(0, 8).toString('utf8') !== 'Salted__') throw new Error('Not a CryptoJS value');
  const { key, iv } = passphraseKey(passphrase, raw.subarray(8, 16));
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(raw.subarray(16)), decipher.final()]).toString('utf8');
}
