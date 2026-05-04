import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

import { featureSeeds } from "../src/features/feature-seeds";
import { env } from "../src/config/env";
import { levelForXp } from "../src/users/user.service";

const prisma = new PrismaClient();
const domainRegex = /@(ds|es)\.study\.iitm\.ac\.in$/i;

async function main() {
  if (!domainRegex.test(env.seedAdminEmail)) {
    throw new Error("SEED_ADMIN_EMAIL must be an IITM student email.");
  }
  for (const seed of featureSeeds) {
    await prisma.featureFlag.upsert({
      where: { key: seed.key },
      update: {
        displayName: seed.displayName,
        description: seed.description,
        category: seed.category,
        valueType: seed.valueType,
        defaultValue: seed.defaultValue
      },
      create: {
        key: seed.key,
        displayName: seed.displayName,
        description: seed.description,
        category: seed.category,
        valueType: seed.valueType,
        defaultValue: seed.defaultValue
      }
    });
  }

  const passwordHash = await argon2.hash(env.seedAdminPassword);
  await prisma.user.upsert({
    where: { email: env.seedAdminEmail.toLowerCase() },
    update: {
      name: env.seedAdminName,
      role: "admin",
      verifiedAt: new Date(),
      passwordHash
    },
    create: {
      email: env.seedAdminEmail.toLowerCase(),
      name: env.seedAdminName,
      role: "admin",
      verifiedAt: new Date(),
      level: levelForXp(0),
      passwordHash
    }
  });
  console.log(`Seeded ${featureSeeds.length} feature flags and admin ${env.seedAdminEmail.toLowerCase()} (password set).`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
