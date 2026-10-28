import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  checkAssignment,
  computeStats,
  confirmWindow,
  zonedInstant,
  daysOfMonth,
  generateSchedule,
  type AssignmentInfo,
  type GuideInfo,
  type OccurrenceInfo,
  type SlotInfo,
  type TourKind,
} from "../src";

const DATES = daysOfMonth(2026, 11); // 2026-11-01 é domingo
const D1 = "2026-11-02";

const slot = (id: string, start: string, tourId = "centro", lang = "EN", kind: TourKind = "PRIMARY"): SlotInfo => {
  const [h, m] = start.split(":").map(Number) as [number, number];
  return { id, tourId, tourKind: kind, languageId: lang, startMinutes: h * 60 + m, durationMin: 150 };
};
const occ = (slotId: string, date = D1, needed = 1, status: "ACTIVE" | "NO_DEMAND" = "ACTIVE"): OccurrenceInfo => ({
  id: `${slotId}@${date}`,
  slotId,
  date,
  status,
  needed,
});
const guide = (id: string, quals: [string, string][] = [["centro", "EN"]], extra: Partial<GuideInfo> = {}): GuideInfo => ({
  id,
  qualifications: quals.map(([tourId, languageId]) => ({ tourId, languageId })),
  unavailabilities: [],
  restrictions: [],
  ...extra,
});
const run = (slots: SlotInfo[], occurrences: OccurrenceInfo[], guides: GuideInfo[], dates = DATES) =>
  generateSchedule({ slots, occurrences, guides, dates, settings: DEFAULT_SETTINGS });
const idsFor = (r: ReturnType<typeof run>, o: string) => r.assignments.filter((a) => a.occurrenceId === o).map((a) => a.guideId);

describe("geração", () => {
  it("não atribui guia de férias", () => {
    const s = slot("s1", "10:30");
    const vac = guide("a", undefined, { unavailabilities: [{ startDate: "2026-11-01", endDate: "2026-11-10", period: "FULL_DAY" }] });
    const r = run([s], [occ("s1")], [vac, guide("b")]);
    expect(idsFor(r, "s1@" + D1)).toEqual(["b"]);
  });

  it("não atribui guia sem qualificação (tour ou idioma)", () => {
    const s = slot("s1", "10:30");
    const r = run([s], [occ("s1")], [guide("a", [["ribeira", "EN"]]), guide("b", [["centro", "FR"]]), guide("c")]);
    expect(idsFor(r, "s1@" + D1)).toEqual(["c"]);
  });

  it("máximo 1 manhã e 1 tarde por dia", () => {
    const slots = [slot("m1", "09:00"), slot("m2", "11:30"), slot("t1", "15:30"), slot("t2", "18:30")];
    const r = run(slots, slots.map((s) => occ(s.id)), [guide("a")]);
    expect(r.assignments).toHaveLength(2);
    expect(r.incomplete).toHaveLength(2);
  });

  it("dois tours da manhã do mesmo guia são rejeitados pela regra", () => {
    const a = slot("m1", "09:00");
    const b = slot("m2", "11:30");
    const v = checkAssignment(guide("a"), "m2@" + D1, b, D1, [{ occurrenceId: "m1@" + D1, slot: a }], DEFAULT_SETTINGS);
    expect(v.map((x) => x.code)).toContain("SAME_PERIOD");
  });

  it("11:30 e 15:00 do mesmo guia são permitidos", () => {
    const a = slot("m", "11:30");
    const b = slot("t", "15:00");
    const v = checkAssignment(guide("g"), "t@" + D1, b, D1, [{ occurrenceId: "m@" + D1, slot: a }], DEFAULT_SETTINGS);
    expect(v).toEqual([]);
    const r = run([a, b], [occ("m"), occ("t")], [guide("g")]);
    expect(r.assignments).toHaveLength(2);
  });

  it("respeita o intervalo mínimo entre tours", () => {
    const a = slot("m", "11:30"); // termina 14:00
    const b = slot("t", "14:30"); // gap 30 < 60
    const v = checkAssignment(guide("g"), "t@" + D1, b, D1, [{ occurrenceId: "m@" + D1, slot: a }], DEFAULT_SETTINGS);
    expect(v.map((x) => x.code)).toContain("MIN_GAP");
    const r = run([a, b], [occ("m"), occ("t")], [guide("g")]);
    expect(r.assignments).toHaveLength(1);
    expect(r.incomplete).toHaveLength(1);
  });

  it("falta de guias gera slot incompleto sem erro", () => {
    const s = slot("s1", "10:30");
    const r = run([s], [occ("s1", D1, 3)], [guide("a"), guide("b")]);
    expect(r.assignments).toHaveLength(2);
    expect(r.incomplete).toEqual([{ occurrenceId: "s1@" + D1, missing: 1 }]);
  });

  it("ocorrência NT não gera atribuições", () => {
    const s = slot("s1", "10:30");
    const r = run([s], [occ("s1", D1, 2, "NO_DEMAND")], [guide("a")]);
    expect(r.assignments).toEqual([]);
    expect(r.incomplete).toEqual([]);
  });

  it("marcar NT depois de gerar liberta o guia e atualiza estatísticas", () => {
    const s1 = slot("m", "10:30");
    const s2 = slot("m2", "11:30");
    const guides = [guide("a")];
    const occs = [occ("m"), occ("m2", "2026-11-03")];
    const gen = run([s1, s2], occs, guides);
    expect(gen.assignments).toHaveLength(2);
    const before = computeStats(guides, [s1, s2], occs, gen.assignments, DATES)[0]!;
    expect(before.primary).toBe(2);
    const nt = occs.map((o) => (o.id === "m@" + D1 ? { ...o, status: "NO_DEMAND" as const } : o));
    const after = computeStats(guides, [s1, s2], nt, gen.assignments, DATES)[0]!;
    expect(after.primary).toBe(1);
    // guia fica livre para outro slot no mesmo período
    const other = slot("x", "10:00");
    const v = checkAssignment(guides[0]!, "x@" + D1, other, D1, [], DEFAULT_SETTINGS);
    expect(v).toEqual([]);
  });

  it("atribuições retiradas não contam", () => {
    const s = slot("s1", "10:30");
    const o = [occ("s1")];
    const asg: AssignmentInfo[] = [{ occurrenceId: "s1@" + D1, guideId: "a", withdrawn: true }];
    expect(computeStats([guide("a")], [s], o, asg, DATES)[0]!.primary).toBe(0);
  });

  it("equilíbrio proporcional à disponibilidade parcial", () => {
    const s = slot("s1", "10:30");
    const dates = daysOfMonth(2026, 11);
    const slots = [s];
    const occs = dates.map((d) => occ("s1", d));
    const half = guide("half", undefined, { unavailabilities: [{ startDate: "2026-11-01", endDate: "2026-11-15", period: "FULL_DAY" }] });
    const full = guide("full");
    const r = run(slots, occs, [half, full], dates);
    const sh = r.stats.find((x) => x.guideId === "half")!;
    const sf = r.stats.find((x) => x.guideId === "full")!;
    expect(sh.availableDays).toBe(15);
    expect(sf.availableDays).toBe(30);
    expect(sf.primary).toBeGreaterThan(sh.primary);
    expect(Math.abs(sh.ratio - sf.ratio)).toBeLessThan(0.1);
  });

  it("proporcionalidade também quando a disponibilidade acaba a meio do mês", () => {
    const s = slot("s1", "10:30");
    const dates = daysOfMonth(2026, 10);
    const occs = dates.map((d) => occ("s1", d, 2));
    // A só está disponível 12 dias (indisponível de 13 a 31); B, C e D o mês todo.
    const early = guide("A", undefined, { unavailabilities: [{ startDate: "2026-10-13", endDate: "2026-10-31", period: "FULL_DAY" }] });
    const r = run([s], occs, [early, guide("B"), guide("C"), guide("D")], dates);
    const st = (id: string) => r.stats.find((x) => x.guideId === id)!;
    expect(st("A").availableDays).toBe(12);
    const ratios = ["A", "B", "C", "D"].map((id) => st(id).ratio);
    expect(Math.max(...ratios) - Math.min(...ratios)).toBeLessThan(0.15);
  });

  it("guia que só faz alguns secundários só recebe esses", () => {
    const hp = slot("hp", "10:00", "hp", "EN", "SECONDARY");
    const br = slot("br", "15:30", "braga", "EN", "SECONDARY");
    const guides = [guide("a", [["hp", "EN"], ["centro", "EN"]]), guide("b", [["braga", "EN"], ["centro", "EN"]])];
    const r = run([hp, br], [occ("hp"), occ("br")], guides);
    expect(idsFor(r, "hp@" + D1)).toEqual(["a"]);
    expect(idsFor(r, "br@" + D1)).toEqual(["b"]);
  });

  it("restrição recorrente e indisponibilidade por slot", () => {
    const m = slot("m", "10:00");
    const t = slot("t", "17:30");
    const g = guide("a", undefined, {
      restrictions: [{ weekday: 1, period: "MORNING" }],
      unavailabilities: [{ startDate: D1, endDate: D1, period: "FULL_DAY", slotId: "t" }],
    });
    const r = run([m, t], [occ("m"), occ("t")], [g]); // D1 é segunda
    expect(r.assignments).toEqual([]);
    expect(r.incomplete).toHaveLength(2);
    const lim = guide("b", undefined, { restrictions: [{ weekday: 1, period: "FULL_DAY", notAfterMinutes: 17 * 60 }] });
    const r2 = run([m, t], [occ("m"), occ("t")], [lim]);
    expect(r2.assignments.map((a) => a.occurrenceId)).toEqual(["m@" + D1]);

    // Restrição horária que bloqueia toda a manhã (ex.: só a partir das 14:00 às segundas) desconta 0.5 dia por segunda.
    const afternoonOnlyOnMon = guide("c", undefined, {
      restrictions: [{ weekday: 1, period: "FULL_DAY", notBeforeMinutes: 14 * 60 }],
    });
    const r3 = run([t], [occ("t")], [afternoonOnlyOnMon]);
    // Novembro 2026 tem 5 segundas-feiras -> 30 - 5 * 0.5 = 27.5 dias disponíveis
    expect(r3.stats[0]!.availableDays).toBe(27.5);
  });

  it("limite 'até às 16:00' é pela hora de início e inclusivo", () => {
    const g = guide("a", undefined, { restrictions: [{ weekday: 1, period: "FULL_DAY", notAfterMinutes: 16 * 60 }] });
    const at16 = slot("t16", "16:00");
    const at1601 = slot("t1601", "16:01");
    const at1530 = slot("t1530", "15:30");
    const check = (s: SlotInfo) => checkAssignment(g, `${s.id}@${D1}`, s, D1, [], DEFAULT_SETTINGS).map((v) => v.code);
    expect(check(at1530)).toEqual([]);
    expect(check(at16)).toEqual([]);
    expect(check(at1601)).toEqual(["RESTRICTION"]);
    // 16:00 não bloqueia a tarde inteira, por isso o dia continua a contar como disponível.
    expect(run([at16], [occ("t16")], [g]).stats[0]!.availableDays).toBe(30);
  });

  it("indisponibilidade por hora numa data: depois das 16:00 e antes das 10:00", () => {
    const after = guide("a", undefined, { unavailabilities: [{ startDate: D1, endDate: D1, period: "FULL_DAY", afterMinutes: 16 * 60 }] });
    const before = guide("b", undefined, { unavailabilities: [{ startDate: D1, endDate: D1, period: "FULL_DAY", beforeMinutes: 10 * 60 }] });
    const codes = (g: GuideInfo, s: SlotInfo) => checkAssignment(g, `${s.id}@${D1}`, s, D1, [], DEFAULT_SETTINGS).map((v) => v.code);
    expect(codes(after, slot("t16", "16:00"))).toEqual([]);
    expect(codes(after, slot("t1630", "16:30"))).toEqual(["UNAVAILABLE"]);
    expect(codes(before, slot("t0930", "09:30"))).toEqual(["UNAVAILABLE"]);
    expect(codes(before, slot("t10", "10:00"))).toEqual([]);
    // Só nesse dia: no dia seguinte nada muda.
    const next = checkAssignment(after, "x", slot("t1630", "16:30"), "2026-11-03", [], DEFAULT_SETTINGS);
    expect(next).toEqual([]);
  });

  it("é determinístico e preserva atribuições bloqueadas", () => {
    const s = slot("s1", "10:30");
    const guides = [guide("a"), guide("b")];
    const input = { slots: [s], occurrences: [occ("s1")], guides, dates: DATES, settings: DEFAULT_SETTINGS };
    expect(generateSchedule(input)).toEqual(generateSchedule(input));
    const locked = generateSchedule({ ...input, locked: [{ occurrenceId: "s1@" + D1, guideId: "b" }] });
    expect(locked.assignments).toEqual([]);
  });
});

describe("janela de confirmação", () => {
  it("converte hora local de Lisboa para UTC respeitando o horário de verão", () => {
    expect(zonedInstant("2026-01-15", 10 * 60).toISOString()).toBe("2026-01-15T10:00:00.000Z"); // inverno: UTC+0
    expect(zonedInstant("2026-07-15", 10 * 60).toISOString()).toBe("2026-07-15T09:00:00.000Z"); // verão: UTC+1
    expect(zonedInstant("2026-03-28", 10 * 60).toISOString()).toBe("2026-03-28T10:00:00.000Z"); // véspera da mudança
    expect(zonedInstant("2026-03-29", 10 * 60).toISOString()).toBe("2026-03-29T09:00:00.000Z"); // dia da mudança (01:00 UTC)
    expect(zonedInstant("2026-10-25", 10 * 60).toISOString()).toBe("2026-10-25T10:00:00.000Z"); // fim do horário de verão
  });

  it("abre 3 horas antes do início e fecha no fim do tour", () => {
    const w = (iso: string) => confirmWindow(new Date(iso), "2026-01-15", 10 * 60, 150, 3).state;
    expect(w("2026-01-15T06:59:00.000Z")).toBe("NOT_YET");
    expect(w("2026-01-15T07:00:00.000Z")).toBe("OPEN");
    expect(w("2026-01-15T10:00:00.000Z")).toBe("OPEN");
    expect(w("2026-01-15T12:30:00.000Z")).toBe("OPEN");
    expect(w("2026-01-15T12:31:00.000Z")).toBe("ENDED");
  });
});
