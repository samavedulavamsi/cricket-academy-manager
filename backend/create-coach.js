import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("dbr12345", 12);

  const user = await prisma.user.create({
    data: {
      name: "COACH DBR",
      email: "dbr@gmail.com",
      passwordHash: passwordHash,
      role: "COACH"
    }
  });

  console.log("✅ User created successfully!");
  console.log(user);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });