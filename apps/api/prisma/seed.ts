import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import { seedBase } from "./base";

const prisma = new PrismaClient();
await seedBase(prisma);

const langs = await prisma.language.findMany();
const langId = (c: string) => langs.find((l) => l.code === c)!.id;
const ALL = [1, 2, 3, 4, 5, 6, 7];
const hm = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const passwordHash = await argon2.hash("guia12345");

type S = [string, string, string, number[], number];
type Period = "FULL_DAY" | "MORNING" | "AFTERNOON";
interface CityConfig {
  name: string;
  slots: S[];
  names: string[];
  langSets: string[][];
  tourPicker: (i: number) => string[];
  unav: [number, string, string, Period][];
  restrictions: { guide: number; weekday: number; period: Period; notBeforeMinutes?: number; notAfterMinutes?: number }[];
}

const CITY_CONFIGS: CityConfig[] = [
  {
    name: "Porto",
    slots: [
      ["Centro", "PT", "10:00", ALL, 1],
      ["Centro", "EN", "10:00", ALL, 2],
      ["Centro", "ES", "10:30", ALL, 1],
      ["Centro", "IT", "10:30", ALL, 1],
      ["Centro", "FR", "11:00", ALL, 1],
      ["Centro", "EN", "11:30", ALL, 1],
      ["Centro", "PT", "15:00", [1, 2, 3, 4, 5], 1],
      ["Centro", "EN", "15:30", ALL, 2],
      ["Centro", "ES", "16:00", ALL, 1],
      ["Centro", "FR", "16:30", ALL, 1],
      ["Centro", "IT", "17:00", [1, 3, 5, 6, 7], 1],
      ["Centro", "EN", "18:00", ALL, 1],
      ["Ribeira", "EN", "11:00", ALL, 1],
      ["Ribeira", "ES", "15:30", ALL, 1],
      ["Ribeira", "FR", "16:30", [2, 4, 6, 7], 1],
      ["Ribeira", "IT", "15:30", [1, 3, 5], 1],
      ["Ribeira", "PT", "17:00", [5, 6, 7], 1],
      ["Harry Potter", "EN", "12:00", ALL, 1],
      ["Harry Potter", "EN", "17:00", [1, 2, 3, 4, 5, 6], 1],
      ["Harry Potter", "ES", "19:00", [3], 1],
    ],
    names: ["Ana", "Bruno", "Carla", "Diogo", "Eva", "Filipe", "Graça", "Hugo", "Inês", "João", "Karina", "Luís", "Marta", "Nuno", "Olga", "Pedro", "Rita", "Sérgio", "Teresa", "Vasco"],
    langSets: [["PT", "EN"], ["EN", "ES"], ["FR", "EN"], ["IT", "EN"], ["ES", "PT", "EN"], ["FR", "PT"], ["EN"], ["IT", "ES", "EN"], ["EN", "FR", "ES"], ["PT", "EN", "IT"]],
    tourPicker: (i) => {
      const t = ["Centro"];
      if (i % 4 !== 3) t.push("Ribeira");
      if (i % 4 === 0 || i % 4 === 3) t.push("Harry Potter");
      return t;
    },
    unav: [
      [0, "2026-11-09", "2026-11-22", "FULL_DAY"],
      [3, "2026-11-01", "2026-11-07", "FULL_DAY"],
      [5, "2026-11-14", "2026-11-14", "FULL_DAY"],
      [7, "2026-11-20", "2026-11-27", "FULL_DAY"],
      [9, "2026-11-03", "2026-11-03", "MORNING"],
      [11, "2026-11-10", "2026-11-12", "AFTERNOON"],
      [13, "2026-11-16", "2026-11-30", "FULL_DAY"],
      [15, "2026-11-05", "2026-11-06", "FULL_DAY"],
      [17, "2026-11-25", "2026-11-26", "MORNING"],
    ],
    restrictions: [
      { guide: 1, weekday: 1, period: "MORNING" },
      { guide: 2, weekday: 3, period: "FULL_DAY", notAfterMinutes: hm("17:00") },
      { guide: 4, weekday: 6, period: "FULL_DAY" },
      { guide: 6, weekday: 2, period: "AFTERNOON" },
      { guide: 8, weekday: 5, period: "FULL_DAY", notBeforeMinutes: hm("14:00") },
    ],
  },
  ...(
    [
      ["Braga", [["Braga", "EN", "09:30", [6, 7], 1], ["Braga", "ES", "14:00", [2, 4], 1]], ["Rui", "Sofia", "Tiago"]],
      ["Coimbra", [["Coimbra", "ES", "16:00", [1, 3, 5], 1], ["Coimbra", "EN", "09:00", [6, 7], 1]], ["Ulisses", "Vera", "Xavier"]],
      ["Guimarães", [["Guimarães", "EN", "14:30", [1, 3, 5, 7], 1]], ["Yara", "Zé"]],
    ] as [string, S[], string[]][]
  ).map(
    ([name, slots, names]): CityConfig => ({
      name,
      slots,
      names,
      langSets: [["EN", "ES"], ["EN"], ["PT", "EN"]],
      tourPicker: () => [name],
      unav: [[0, "2026-11-12", "2026-11-14", "FULL_DAY"]],
      restrictions: [],
    }),
  ),
  {
    name: "Lisboa",
    slots: [
      ["Centro", "EN", "10:00", ALL, 2],
      ["Centro", "PT", "10:30", ALL, 1],
      ["Centro", "ES", "11:00", ALL, 1],
      ["Centro", "EN", "15:00", ALL, 2],
      ["Centro", "FR", "16:00", ALL, 1],
      ["Tour 1", "EN", "11:30", ALL, 1],
      ["Tour 1", "ES", "16:30", [2, 4, 6], 1],
      ["Tour 2", "EN", "15:30", [1, 3, 5, 7], 1],
    ],
    names: ["Afonso", "Beatriz", "Cláudio", "Daniela", "Eduardo", "Francisca", "Gonçalo", "Helena"],
    langSets: [["PT", "EN"], ["EN", "ES"], ["FR", "EN"], ["EN"]],
    tourPicker: (i) => ["Centro", i % 2 === 0 ? "Tour 1" : "Tour 2", ...(i % 3 === 0 ? ["Tour 2"] : [])],
    unav: [[2, "2026-11-10", "2026-11-16", "FULL_DAY"], [5, "2026-11-23", "2026-11-23", "MORNING"]],
    restrictions: [{ guide: 1, weekday: 2, period: "AFTERNOON" }],
  },
];

const seedCity = async (cfg: CityConfig): Promise<void> => {
  const city = await prisma.city.findUniqueOrThrow({ where: { name: cfg.name } });
  const tours = await prisma.tour.findMany({ where: { cityId: city.id } });
  const tourId = (n: string) => tours.find((t) => t.name === n)!.id;

  for (const [t, l, start, weekdays, n] of cfg.slots) {
    await prisma.tourSlot.upsert({
      where: { tourId_languageId_startMinutes: { tourId: tourId(t), languageId: langId(l), startMinutes: hm(start) } },
      update: { weekdays, defaultNeeded: n },
      create: { tourId: tourId(t), languageId: langId(l), startMinutes: hm(start), weekdays, defaultNeeded: n },
    });
  }

  const guides: { id: string }[] = [];
  for (const [i, name] of cfg.names.entries()) {
    const email = `${name.normalize("NFD").replace(/[^a-z]/gi, "").toLowerCase()}@guias.example.com`;
    const g = await prisma.user.upsert({
      where: { email },
      update: { cityId: city.id },
      create: { email, name, role: "GUIDE", status: "ACTIVE", passwordHash, cityId: city.id, phone: `+3519100000${String(i).padStart(2, "0")}` },
    });
    guides.push(g);
    const langsOf = cfg.langSets[i % cfg.langSets.length]!;
    const data = cfg.tourPicker(i).flatMap((t) => langsOf.map((l) => ({ userId: g.id, tourId: tourId(t), languageId: langId(l) })));
    await prisma.guideQualification.deleteMany({ where: { userId: g.id } });
    await prisma.guideQualification.createMany({ data, skipDuplicates: true });
    await prisma.unavailability.deleteMany({ where: { userId: g.id } });
    await prisma.recurringRestriction.deleteMany({ where: { userId: g.id } });
  }

  for (const [i, s, e, period] of cfg.unav) {
    await prisma.unavailability.create({ data: { userId: guides[i]!.id, startDate: d(s), endDate: d(e), period } });
  }
  await prisma.recurringRestriction.createMany({
    data: cfg.restrictions.map(({ guide, ...r }) => ({ userId: guides[guide]!.id, ...r })),
  });

  const slots = await prisma.tourSlot.findMany({ where: { tour: { cityId: city.id } } });
  const m = await prisma.monthSchedule.upsert({
    where: { cityId_year_month: { cityId: city.id, year: 2026, month: 11 } },
    update: { needsConfirmedAt: new Date() },
    create: { cityId: city.id, year: 2026, month: 11, needsConfirmedAt: new Date() },
  });
  for (let day = 1; day <= 30; day++) {
    const date = d(`2026-11-${String(day).padStart(2, "0")}`);
    const wd = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
    for (const s of slots.filter((x) => x.weekdays.includes(wd))) {
      await prisma.slotOccurrence.upsert({
        where: { slotId_date: { slotId: s.id, date } },
        update: {},
        create: { monthId: m.id, slotId: s.id, date, needed: s.defaultNeeded },
      });
    }
  }
};

for (const cfg of CITY_CONFIGS) await seedCity(cfg);
console.log("Seed concluído: Porto (20 guias), Lisboa (8), Braga (3), Coimbra (3) e Guimarães (2), palavra-passe dos guias: guia12345. Novembro 2026 pronto a gerar.");
await prisma.$disconnect();
