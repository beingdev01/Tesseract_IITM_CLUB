import type { PrismaClient } from '@prisma/client';

const words = `
apple banana mango pizza sandwich noodles cupcake popcorn cookie carrot guitar violin drum camera laptop keyboard router satellite rocket bicycle scooter helmet pencil notebook backpack umbrella lantern pillow mirror bottle spoon teapot wallet clock calendar window ladder bridge castle island mountain river thunder rainbow cloud comet planet galaxy robot circuit database server browser compiler terminal function variable algorithm puzzle chess dice domino marble whistle anchor compass telescope microscope magnet battery engine tractor airplane airport station tunnel fountain statue museum library classroom hostel canteen lecture badge medal trophy cricket football tennis badminton swimming running dancing singing cooking painting sketching typing coding debugging testing shipping climbing folding throwing catching whispering laughing thinking sleeping reading writing building drawing guessing hiding seeking balancing jumping waving scanning charging sorting filtering looping rotating bouncing floating glowing freezing melting mixing folding weaving stitching carving planting watering harvesting animals tiger lion panda zebra giraffe monkey rabbit turtle dolphin whale penguin eagle owl peacock parrot butterfly dragonfly honeybee elephant camel horse donkey goat sheep squirrel fox wolf bear food dosa idli vada chai coffee biryani samosa jalebi laddoo coconut pickle paneer curry bread cheese butter sugar spices objects chair table sofa cupboard curtain carpet bucket broom suitcase ticket passport key lock bell lamp switch cable charger screen remote speaker headphones microphone actions sprint crawl juggle stretch yawn blink sneeze clap point salute measure count slice pour stir knead bake roast sketch erase underline circle connect upload download login logout search bookmark message notify invite approve reject celebrate
`.trim().split(/\s+/);

function categoryFor(index: number): string {
  if (index < 40) return 'food';
  if (index < 90) return 'objects';
  if (index < 125) return 'actions';
  if (index < 165) return 'animals';
  return 'campus';
}

function difficultyFor(index: number): 'EASY' | 'MEDIUM' | 'HARD' {
  if (index % 5 === 0) return 'HARD';
  if (index % 3 === 0) return 'MEDIUM';
  return 'EASY';
}

export async function seedScribblContent(prisma: PrismaClient): Promise<void> {
  for (const [index, word] of words.entries()) {
    await prisma.scribblPrompt.upsert({
      where: { word },
      update: {
        category: categoryFor(index),
        difficulty: difficultyFor(index),
        active: true,
      },
      create: {
        word,
        category: categoryFor(index),
        difficulty: difficultyFor(index),
        active: true,
      },
    });
  }
}
