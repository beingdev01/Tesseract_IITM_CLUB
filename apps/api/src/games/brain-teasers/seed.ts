import type { PrismaClient } from '@prisma/client';

const teasers = [
  ['EASY', 'What has to be broken before you can use it?', 'egg', 'An egg must be cracked first.'],
  ['EASY', 'What has many teeth but cannot bite?', 'comb', 'A comb has teeth only by shape.'],
  ['EASY', 'What can fill a room but takes no space?', 'light', 'Light occupies the room visually.'],
  ['EASY', 'What gets wetter the more it dries?', 'towel', 'A towel dries other things by absorbing water.'],
  ['EASY', 'What has a face and two hands but no arms?', 'clock', 'A clock face has hands.'],
  ['NORMAL', 'Forward I am heavy, backward I am not. What am I?', 'ton', 'Ton backwards is not.'],
  ['NORMAL', 'What word starts and ends with E but has one letter?', 'envelope', 'It contains one letter.'],
  ['NORMAL', 'What comes once in a minute, twice in a moment, and never in a thousand years?', 'm', 'Count the letter m.'],
  ['NORMAL', 'Which word is always spelled incorrectly?', 'incorrectly', 'The word itself is incorrectly.'],
  ['NORMAL', 'What has cities but no houses, forests but no trees, and water but no fish?', 'map', 'A map represents those things.'],
  ['HARD', 'I am taken from a mine and shut in a wooden case, from which I am never released, yet almost everyone uses me. What am I?', 'pencil lead|lead', 'Graphite is mined and held in wood.'],
  ['HARD', 'What can run but never walks, has a mouth but never talks?', 'river', 'A river runs and has a mouth.'],
  ['HARD', 'What is seen in the middle of March and April that cannot be seen at the beginning or end of either month?', 'r', 'The letter r appears in the middle of both words.'],
  ['HARD', 'The more you take, the more you leave behind. What are they?', 'footsteps|steps', 'Taking steps leaves footsteps.'],
  ['HARD', 'What disappears as soon as you say its name?', 'silence', 'Naming silence breaks it.'],
  ['DEVIOUS', 'A man pushes his car to a hotel and tells the owner he is bankrupt. Why?', 'monopoly', 'It is a Monopoly game.'],
  ['DEVIOUS', 'Two people are born at the same moment but do not have the same birthday. How?', 'time zones|different time zones', 'Birth date can differ across time zones.'],
  ['DEVIOUS', 'A room has no windows and one door. Inside are three bulbs and outside are three switches. How do you identify all bulbs with one entry?', 'heat', 'Leave one bulb hot, one on, one cold.'],
  ['DEVIOUS', 'What English word has three consecutive double letters?', 'bookkeeper', 'bookkeeper has oo, kk, ee.'],
  ['DEVIOUS', 'What number is odd until you remove one letter, then it becomes even?', 'seven', 'Remove s and seven becomes even.'],
  ['BONUS', 'A prisoner sees two doors and two guards: one always lies, one always tells truth. What single question finds freedom?', 'what would the other guard say', 'Ask either guard what the other would say, then choose the opposite.'],
  ['BONUS', 'How can you measure exactly 45 minutes with two uneven one-hour ropes?', 'burn both ends', 'Burn one rope at both ends and the other at one end, then use the second rope remainder at both ends.'],
  ['BONUS', 'There are 100 lockers. Toggle multiples for students 1 through 100. Which lockers stay open?', 'perfect squares|squares', 'Only perfect squares have an odd number of divisors.'],
  ['BONUS', 'You have 12 balls and one is heavier or lighter. Minimum weighings on a balance scale?', '3', 'A ternary search strategy solves it in three weighings.'],
  ['BONUS', 'What is the next term: 1, 11, 21, 1211, 111221?', '312211', 'This is the look-and-say sequence.'],
] as const;

export async function seedBrainTeasersContent(prisma: PrismaClient): Promise<void> {
  for (const [difficulty, prompt, answer, explanation] of teasers) {
    const existing = await prisma.brainTeaser.findFirst({
      where: { prompt },
      select: { id: true },
    });
    const data = { difficulty, prompt, answer, explanation, active: true };
    if (existing) {
      await prisma.brainTeaser.update({ where: { id: existing.id }, data });
    } else {
      await prisma.brainTeaser.create({ data });
    }
  }
}
