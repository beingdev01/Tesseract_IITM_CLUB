import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
import { seedTypeWarsContent } from '../apps/api/src/games/type-wars/seed.js';
import { seedTriviaTowerContent } from '../apps/api/src/games/trivia-tower/seed.js';
import { seedPuzzleRunContent } from '../apps/api/src/games/puzzle-run/seed.js';
import { seedBrainTeasersContent } from '../apps/api/src/games/brain-teasers/seed.js';
import { seedCipherLabContent } from '../apps/api/src/games/cipher-lab/seed.js';
import { seedRiddleRoomContent } from '../apps/api/src/games/riddle-room/seed.js';
import { seedScribblContent } from '../apps/api/src/games/scribbl/seed.js';

dotenv.config();

const prisma = new PrismaClient();

const IITM_BRANCH_BY_DOMAIN: Record<string, 'Data Science' | 'Electronic Systems'> = {
  'ds.study.iitm.ac.in': 'Data Science',
  'es.study.iitm.ac.in': 'Electronic Systems',
};

function getBranch(email: string): 'Data Science' | 'Electronic Systems' | null {
  const domain = email.split('@')[1]?.trim().toLowerCase() ?? '';
  return IITM_BRANCH_BY_DOMAIN[domain] ?? null;
}

async function main() {
  console.log('🌱 Starting Tesseract database seed...');

  const defaultEmail = 'admin@example.com';
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || defaultEmail).trim().toLowerCase();
  const superAdminName = (process.env.SUPER_ADMIN_NAME || 'Super Admin').trim();

  if (!superAdminEmail) {
    throw new Error('SUPER_ADMIN_EMAIL must be provided');
  }

  if (process.env.NODE_ENV === 'production' && superAdminEmail === defaultEmail) {
    throw new Error('Production seed requires a non-default SUPER_ADMIN_EMAIL');
  }

  // OAuth-only auth: pre-create the super admin row with `oauthProvider='pending'`
  // so the first sign-in via Google links the real OAuth identity.
  const admin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      name: superAdminName,
      email: superAdminEmail,
      oauthProvider: 'pending',
      oauthId: `pending-${randomUUID()}`,
      role: 'ADMIN',
      branch: getBranch(superAdminEmail) ?? undefined,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(superAdminEmail)}`,
    },
  });

  await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      clubName: 'Tesseract',
      clubEmail: 'contact@tesseract.example',
      clubDescription: 'The IIT Madras BS Degree coding community — building, learning, and shipping together.',
    },
  });

  await seedTypeWarsContent(prisma);
  await seedTriviaTowerContent(prisma);
  await seedPuzzleRunContent(prisma);
  await seedBrainTeasersContent(prisma);
  await seedCipherLabContent(prisma);
  await seedRiddleRoomContent(prisma);
  await seedScribblContent(prisma);

  console.log('✅ Database seeded successfully!');
  console.log('📧 Super Admin pre-created:', superAdminEmail);
  console.log('🔑 Admin signs in via Google OAuth. SEED_ADMIN_EMAIL auto-promotes the matching account on first sign-in.');
  console.log({
    admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
  });
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
