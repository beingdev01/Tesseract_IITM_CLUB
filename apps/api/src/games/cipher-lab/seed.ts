import type { PrismaClient } from '@prisma/client';
import { encodeCipher } from './content.js';

const now = Date.now();
const challenges = [
  ['Shifted Signal', 'CAESAR', 'MEET AT THE TESSERACT LOUNGE', '3', 'EASY', ['Classic Caesar shift.', 'The key is three.']],
  ['Mirror Message', 'ATBASH', 'LOGIC OPENS THE FIRST DOOR', null, 'EASY', ['The alphabet is reflected.']],
  ['Campus Frequency', 'VIGENERE', 'THE QUIETEST BUG IS THE MOST EXPENSIVE', 'IITM', 'MEDIUM', ['Repeated-key cipher.', 'The key is the institute acronym.']],
  ['Railway Note', 'RAILFENCE', 'CHECK THE SECOND ROW FIRST', null, 'MEDIUM', ['Characters are split by index parity.']],
  ['Encoded Memo', 'BASE64', 'OBSERVABILITY BEFORE OPTIMISM', null, 'MEDIUM', ['This one is not a classical cipher.']],
  ['Dotted Dispatch', 'MORSE', 'SHIP SMALL THINGS', null, 'HARD', ['Dots and dashes speak.']],
  ['Double Mask', 'SUBSTITUTION', 'EVERY ABSTRACTION HAS A COST', '5', 'HARD', ['A shift comes before a mirror.']],
  ['Plain Trap', 'CUSTOM', 'READ THE INSTRUCTIONS CAREFULLY', null, 'INSANE', ['The cipher may be hiding in plain sight.']],
] as const;

export async function seedCipherLabContent(prisma: PrismaClient): Promise<void> {
  for (const [index, item] of challenges.entries()) {
    const [title, cipherType, plaintext, key, difficulty, hints] = item;
    const activeFrom = new Date(now + index * 48 * 60 * 60 * 1000);
    const activeUntil = new Date(activeFrom.getTime() + 48 * 60 * 60 * 1000);
    const existing = await prisma.cipherChallenge.findFirst({
      where: { title },
      select: { id: true },
    });
    const data = {
      title,
      cipherType,
      plaintext,
      ciphertext: encodeCipher(cipherType, plaintext, key),
      hintsJson: hints,
      basePoints: difficulty === 'INSANE' ? 1600 : difficulty === 'HARD' ? 1200 : difficulty === 'MEDIUM' ? 900 : 700,
      hintPenalty: 100,
      timeLimitSeconds: 600,
      difficulty,
      activeFrom,
      activeUntil,
      active: true,
    };
    if (existing) {
      await prisma.cipherChallenge.update({ where: { id: existing.id }, data });
    } else {
      await prisma.cipherChallenge.create({ data });
    }
  }
}
