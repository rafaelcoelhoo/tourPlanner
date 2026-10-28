import type { Period, Violation } from "@schedule/core";

export interface City { id: string; name: string }
export interface Me { id: string; name: string; email: string; role: "ADMIN" | "GUIDE"; cityId: string | null }
export interface Tour { id: string; name: string; kind: "PRIMARY" | "SECONDARY"; active: boolean }
export interface Language { id: string; code: string; name: string }
export interface Slot { id: string; tourId: string; languageId: string; startMinutes: number; durationMin: number; weekdays: number[]; defaultNeeded: number; active: boolean }
export interface Settings { morningCutoffMinutes: number; minGapMinutes: number; maxToursPerDay: number; defaultDurationMin: number; confirmWindowHours: number }
export interface Catalog { cityId: string; tours: Tour[]; languages: Language[]; slots: Slot[]; settings: Settings }
export interface AssignmentView { id: string; guideId: string; guideName: string; withdrawn: boolean; source: "GENERATED" | "MANUAL"; warnings: Violation[]; confirmedAt: string | null; confirmState: "NONE" | "CONFIRMED" | "PENDING" }
export interface OccurrenceView { id: string; slotId: string; date: string; status: "ACTIVE" | "NO_DEMAND"; needed: number; note: string | null; missing: number; adminConfirmed: boolean; assignments: AssignmentView[] }
export interface StatRow { guideId: string; name: string; primary: number; secondary: number; availableDays: number; ratio: number }
export interface MonthView { year: number; month: number; status: "NEEDS_DRAFT" | "DRAFT" | "PUBLISHED"; needsConfirmedAt: string | null; publishedAt: string | null; occurrences: OccurrenceView[]; stats: StatRow[] }
export interface Candidate { guideId: string; name: string; violations: Violation[] }
export interface GuideListItem { id: string; name: string; email: string; phone: string | null; status: "INVITED" | "ACTIVE" | "DISABLED"; qualificationCount: number; secondaryCount: number; qualifications: { tourId: string; languageId: string }[] }
export interface Unav { id: string; startDate: string; endDate: string; period: Period; slotId: string | null; afterMinutes: number | null; beforeMinutes: number | null; note: string | null }
export interface Restriction { id: string; weekday: number; period: Period; notBeforeMinutes: number | null; notAfterMinutes: number | null }
export interface Profile { id: string; name: string; email: string; phone: string | null; cityId: string | null; qualifications: { tourId: string; languageId: string }[]; unavailabilities: Unav[]; restrictions: Restriction[] }
export interface MyItem { adminConfirmed: boolean; assignmentId: string; confirmedAt: string | null; confirm: { state: "NOT_YET" | "OPEN" | "ENDED"; opensAt: string } | null; occurrenceId: string; slotId: string; date: string; status: "ACTIVE" | "NO_DEMAND"; note: string | null; colleagues: string[] }
