import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();

async function main() {
  if (process.env.RESET_ACADEMY_DATA === "true") {
    await prisma.playerMatchPerformance.deleteMany();
    await prisma.match.deleteMany();
    await prisma.skillAssessment.deleteMany();
    await prisma.performanceStat.deleteMany();
    await prisma.feePayment.deleteMany();
    await prisma.extraPractice.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.player.deleteMany();
    console.log("Existing academy player data cleared.");
  }

  const email = process.env.ADMIN_EMAIL ?? "dbr@gmail.com";
  const password = process.env.ADMIN_PASSWORD ?? "dbracademy";
  const name = process.env.ADMIN_NAME ?? "DBR Academy Coach";

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash: await hashPassword(password),
      role: "ADMIN"
    },
    create: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "ADMIN"
    }
  });

  console.log(`Admin account ready: ${email}`);
  console.log("No sample players were inserted. Add players through the app forms or Google Forms import.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
