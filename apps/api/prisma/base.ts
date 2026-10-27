import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

export const LANGS = [
  ["PT", "Português"],
  ["FR", "Francês"],
  ["EN", "Inglês"],
  ["IT", "Italiano"],
  ["ES", "Espanhol"],
] as const;

export type TourDef = readonly [string, "PRIMARY" | "SECONDARY"];

export const CITIES: Record<string, TourDef[]> = {
  Porto: [
    ["Centro", "PRIMARY"],
    ["Ribeira", "SECONDARY"],
    ["Harry Potter", "SECONDARY"],
  ],
  Braga: [["Braga", "PRIMARY"]],
  Coimbra: [["Coimbra", "PRIMARY"]],
  Guimarães: [["Guimarães", "PRIMARY"]],
  Lisboa: [
    ["Centro", "PRIMARY"],
    ["Tour 1", "SECONDARY"],
    ["Tour 2", "SECONDARY"],
  ],
};

export const seedBase = async (prisma: PrismaClient): Promise<void> => {
  for (const [code, name] of LANGS) await prisma.language.upsert({ where: { code }, update: { name }, create: { code, name } });
  for (const [cityName, tours] of Object.entries(CITIES)) {
    const city = await prisma.city.upsert({ where: { name: cityName }, update: {}, create: { name: cityName } });
    for (const [name, kind] of tours) {
      await prisma.tour.upsert({ where: { cityId_name: { cityId: city.id, name } }, update: {}, create: { cityId: city.id, name, kind } });
    }
  }
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "change-me-please";
  const passwordHash = await argon2.hash(password);
  await prisma.user.upsert({
    where: { email },
    update: process.env.ADMIN_RESET_PASSWORD === "true" ? { passwordHash } : {},
    create: { email, name: "Administrador", role: "ADMIN", status: "ACTIVE", passwordHash },
  });
  console.log(`Admin: ${email}`);
};
