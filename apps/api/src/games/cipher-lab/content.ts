import { z } from 'zod';
import { sanitizeText } from '../../utils/sanitize.js';
import { normalizeText } from '../lib/http.js';

export const cipherTypeSchema = z.enum(['CAESAR', 'VIGENERE', 'ATBASH', 'RAILFENCE', 'SUBSTITUTION', 'BASE64', 'MORSE', 'CUSTOM']);
export const cipherDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD', 'INSANE']);

export const cipherInputSchema = z.object({
  title: z.string().trim().min(2).max(160),
  cipherType: cipherTypeSchema,
  plaintext: z.string().trim().min(1).max(5000),
  ciphertext: z.string().trim().max(8000).optional(),
  key: z.string().trim().max(200).optional().nullable(),
  hints: z.array(z.string().trim().min(1).max(500)).max(6).optional(),
  basePoints: z.number().int().min(0).max(100000).optional(),
  hintPenalty: z.number().int().min(0).max(10000).optional(),
  timeLimitSeconds: z.number().int().min(60).max(86400).optional(),
  difficulty: cipherDifficultySchema,
  activeFrom: z.string().datetime().optional().nullable(),
  activeUntil: z.string().datetime().optional().nullable(),
  active: z.boolean().optional(),
});

export const cipherPatchSchema = cipherInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required',
);

export const cipherPreviewSchema = z.object({
  cipherType: cipherTypeSchema,
  plaintext: z.string().trim().min(1).max(5000),
  key: z.string().trim().max(200).optional().nullable(),
});

export const cipherSubmitSchema = z.object({
  submission: z.string().trim().min(1).max(5000),
});

export const cipherHintSchema = z.object({
  index: z.number().int().min(0).max(5),
});

const MORSE: Record<string, string> = {
  a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....', i: '..', j: '.---',
  k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-',
  u: '..-', v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
  '6': '-....', '7': '--...', '8': '---..', '9': '----.',
};

function shiftChar(char: string, shift: number): string {
  const code = char.charCodeAt(0);
  const lower = code >= 97 && code <= 122;
  const upper = code >= 65 && code <= 90;
  if (!lower && !upper) return char;
  const base = lower ? 97 : 65;
  return String.fromCharCode(((code - base + shift + 26) % 26) + base);
}

function caesar(text: string, key?: string | null): string {
  const shift = Number.parseInt(key || '3', 10);
  return Array.from(text).map((char) => shiftChar(char, Number.isFinite(shift) ? shift : 3)).join('');
}

function atbash(text: string): string {
  return Array.from(text).map((char) => {
    const code = char.charCodeAt(0);
    if (code >= 97 && code <= 122) return String.fromCharCode(122 - (code - 97));
    if (code >= 65 && code <= 90) return String.fromCharCode(90 - (code - 65));
    return char;
  }).join('');
}

function vigenere(text: string, key?: string | null): string {
  const cleanKey = (key || 'TESSERACT').replace(/[^a-z]/gi, '').toLowerCase() || 'tesseract';
  let keyIndex = 0;
  return Array.from(text).map((char) => {
    if (!/[a-z]/i.test(char)) return char;
    const shift = cleanKey.charCodeAt(keyIndex % cleanKey.length) - 97;
    keyIndex += 1;
    return shiftChar(char, shift);
  }).join('');
}

function railFence(text: string): string {
  const even = Array.from(text).filter((_char, index) => index % 2 === 0).join('');
  const odd = Array.from(text).filter((_char, index) => index % 2 === 1).join('');
  return `${even}${odd}`;
}

function morse(text: string): string {
  return text.toLowerCase().split(' ').map((word) =>
    Array.from(word).map((char) => MORSE[char] || char).join(' '),
  ).join(' / ');
}

export function encodeCipher(cipherType: z.infer<typeof cipherTypeSchema>, plaintext: string, key?: string | null): string {
  const text = sanitizeText(plaintext).trim();
  if (cipherType === 'CAESAR') return caesar(text, key);
  if (cipherType === 'VIGENERE') return vigenere(text, key);
  if (cipherType === 'ATBASH') return atbash(text);
  if (cipherType === 'RAILFENCE') return railFence(text);
  if (cipherType === 'BASE64') return Buffer.from(text, 'utf8').toString('base64');
  if (cipherType === 'MORSE') return morse(text);
  if (cipherType === 'SUBSTITUTION') return atbash(caesar(text, key || '5'));
  return text;
}

export function cleanCipherInput(input: z.infer<typeof cipherInputSchema>) {
  const plaintext = sanitizeText(input.plaintext).trim();
  return {
    title: sanitizeText(input.title).trim(),
    cipherType: input.cipherType,
    plaintext,
    ciphertext: input.ciphertext?.trim() || encodeCipher(input.cipherType, plaintext, input.key),
    hintsJson: input.hints?.map((hint) => sanitizeText(hint).trim()).filter(Boolean) ?? [],
    basePoints: input.basePoints ?? 1000,
    hintPenalty: input.hintPenalty ?? 100,
    timeLimitSeconds: input.timeLimitSeconds ?? 600,
    difficulty: input.difficulty,
    activeFrom: input.activeFrom ? new Date(input.activeFrom) : null,
    activeUntil: input.activeUntil ? new Date(input.activeUntil) : null,
    active: input.active ?? true,
  };
}

export function isCipherSolved(plaintext: string, submission: string): boolean {
  return normalizeText(plaintext) === normalizeText(submission);
}

export function cipherScore(input: {
  solved: boolean;
  basePoints: number;
  hintsUsed: number;
  hintPenalty: number;
  elapsedSeconds: number;
}): number {
  if (!input.solved) return 0;
  return Math.max(0, input.basePoints - input.hintsUsed * input.hintPenalty - Math.floor(input.elapsedSeconds / 10));
}
