import "dotenv/config";
import { PrismaClient, type PermissionKey, type UserRole } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";
import { defaultRolePermissions } from "../src/lib/permissions.js";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "dbr@gmail.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "dbracademy";
  const name = process.env.ADMIN_NAME ?? "DBR Academy Super Admin";
  const academyCode = (process.env.ACADEMY_CODE ?? "DBR2026").toUpperCase();

  const academy = await prisma.academy.upsert({
    where: { academyCode },
    update: {
      name: process.env.ACADEMY_NAME ?? "DBR Cricket Academy",
      ownerName: process.env.ACADEMY_OWNER ?? name,
      email: process.env.ACADEMY_EMAIL ?? email
    },
    create: {
      name: process.env.ACADEMY_NAME ?? "DBR Cricket Academy",
      address: process.env.ACADEMY_ADDRESS ?? "Main Academy Road",
      city: process.env.ACADEMY_CITY ?? "Hyderabad",
      state: process.env.ACADEMY_STATE ?? "Telangana",
      country: process.env.ACADEMY_COUNTRY ?? "India",
      mobileNumber: process.env.ACADEMY_PHONE ?? "9000000000",
      email: process.env.ACADEMY_EMAIL ?? email,
      website: process.env.ACADEMY_WEBSITE ?? undefined,
      ownerName: process.env.ACADEMY_OWNER ?? name,
      subscriptionPlan: "PROFESSIONAL",
      academyCode,
      timeZone: process.env.ACADEMY_TIMEZONE ?? "Asia/Kolkata",
      currency: process.env.ACADEMY_CURRENCY ?? "INR",
      themeColor: process.env.ACADEMY_THEME_COLOR ?? "#17834b"
    }
  });

  await prisma.academySettings.upsert({
    where: { academyId: academy.id },
    update: {
      dashboardTitle: `${academy.name} Command Center`,
      dashboardDescription: "Academy operations, coach workflows, and parent communication all in one place."
    },
    create: {
      academyId: academy.id,
      dashboardTitle: `${academy.name} Command Center`,
      dashboardDescription: "Academy operations, coach workflows, and parent communication all in one place."
    }
  });

  if ((await prisma.rolePermission.count({ where: { academyId: academy.id } })) === 0) {
    await prisma.rolePermission.createMany({
      data: Object.entries(defaultRolePermissions).flatMap(([role, permissions]) =>
        permissions.map((permission) => ({
          academyId: academy.id,
          role: role as UserRole,
          permission: permission as PermissionKey,
          allowed: true
        }))
      )
    });
  }

  await prisma.user.upsert({
    where: {
      academyId_email: {
        academyId: academy.id,
        email
      }
    },
    update: {
      name,
      passwordHash: await hashPassword(password),
      role: "SUPER_ADMIN",
      title: "Super Admin"
    },
    create: {
      academyId: academy.id,
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "SUPER_ADMIN",
      title: "Super Admin"
    }
  });

  console.log(`Academy seeded: ${academy.name} (${academy.academyCode})`);
  console.log(`Super admin ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
