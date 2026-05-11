import type { PrismaClient } from '@prisma/client';

const puzzles = [
  ['EASY', 'What number comes next: 2, 4, 8, 16, ?', '32', ['Each term doubles.'], 80, 10],
  ['EASY', 'I am a three-letter word. Add two letters and I become shorter. What am I?', 'short', ['Think about spelling, not length.'], 80, 10],
  ['EASY', 'Which month has 28 days?', 'all', ['Every month has at least that many.'], 80, 10],
  ['EASY', 'Unscramble the club word: RACETTES', 'tesseract', ['It is the platform name.'], 80, 10],
  ['EASY', 'If 5 cats catch 5 mice in 5 minutes, how many cats catch 100 mice in 100 minutes?', '5', ['The rate scales with time.'], 80, 10],
  ['EASY', 'What is the missing letter: A, C, F, J, O, ?', 'U', ['Gaps increase by one.'], 80, 10],
  ['MEDIUM', 'A clock shows 3:15. What is the smaller angle between the hour and minute hands?', '7.5', ['The hour hand has moved past 3.'], 120, 20],
  ['MEDIUM', 'Find the next number: 1, 1, 2, 3, 5, 8, ?', '13', ['Add the previous two.'], 120, 20],
  ['MEDIUM', 'I speak without a mouth and hear without ears. What am I?', 'echo', ['Sound returns.'], 120, 20],
  ['MEDIUM', 'A farmer has 17 sheep. All but 9 run away. How many remain?', '9', ['Read the wording carefully.'], 120, 20],
  ['MEDIUM', 'What word is pronounced the same if you remove four of its five letters?', 'queue', ['One letter keeps the sound.'], 120, 20],
  ['MEDIUM', 'If MONDAY is coded as NPOEBZ, how is FRIDAY coded?', 'GSJEBZ', ['Each letter shifts by one.'], 120, 20],
  ['HARD', 'Three switches control three bulbs in another room. You may enter the bulb room once. How can you identify each switch?', 'heat', ['Use more than light state.'], 180, 30],
  ['HARD', 'A number is divisible by 3 and 5, has two digits, and its digits multiply to 18. What is it?', '36', ['Check the divisibility clue carefully.'], 180, 30],
  ['HARD', 'What five-letter word becomes shorter when you add two letters to it?', 'short', ['The result is a different word.'], 180, 30],
  ['HARD', 'You have two ropes that each burn for one hour unevenly. How do you measure 45 minutes?', 'burn both ends', ['One rope can make a 30-minute marker.'], 180, 30],
  ['HARD', 'A binary clock reads 1010 minutes after 1000. How many decimal minutes passed?', '2', ['Convert both binary values.'], 180, 30],
  ['HARD', 'What is the only number whose letters are in alphabetical order?', 'forty', ['Write the number as an English word.'], 180, 30],
  ['MEDIUM', 'What comes next: J, F, M, A, M, J, J, ?', 'A', ['Calendar initials.'], 120, 20],
  ['EASY', 'What has keys but no locks?', 'keyboard', ['You are using one.'], 80, 10],
] as const;

export async function seedPuzzleRunContent(prisma: PrismaClient): Promise<void> {
  for (const [difficulty, prompt, answer, hints, basePoints, hintPenalty] of puzzles) {
    const existing = await prisma.puzzleRunPuzzle.findFirst({
      where: { prompt },
      select: { id: true },
    });
    const data = {
      prompt,
      answer,
      hintsJson: hints,
      basePoints,
      hintPenalty,
      difficulty,
      active: true,
    };
    if (existing) {
      await prisma.puzzleRunPuzzle.update({ where: { id: existing.id }, data });
    } else {
      await prisma.puzzleRunPuzzle.create({ data });
    }
  }
}
