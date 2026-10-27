export type IsoDate = string;
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Period = "MORNING" | "AFTERNOON" | "FULL_DAY";
export type TourKind = "PRIMARY" | "SECONDARY";
export type OccurrenceStatus = "ACTIVE" | "NO_DEMAND";

export interface Settings {
  morningCutoffMinutes: number;
  minGapMinutes: number;
  maxToursPerDay: number;
}

export const DEFAULT_SETTINGS: Settings = {
  morningCutoffMinutes: 13 * 60,
  minGapMinutes: 60,
  maxToursPerDay: 2,
};

export interface SlotInfo {
  id: string;
  tourId: string;
  tourKind: TourKind;
  languageId: string;
  startMinutes: number;
  durationMin: number;
}

export interface OccurrenceInfo {
  id: string;
  slotId: string;
  date: IsoDate;
  status: OccurrenceStatus;
  needed: number;
}

export interface Qualification {
  tourId: string;
  languageId: string;
}

export interface UnavailabilityInfo {
  startDate: IsoDate;
  endDate: IsoDate;
  period: Period;
  slotId?: string | null;
}

export interface RestrictionInfo {
  weekday: Weekday;
  period: Period;
  notBeforeMinutes?: number | null;
  notAfterMinutes?: number | null;
}

export interface GuideInfo {
  id: string;
  name?: string;
  qualifications: Qualification[];
  unavailabilities: UnavailabilityInfo[];
  restrictions: RestrictionInfo[];
}

export interface AssignmentInfo {
  occurrenceId: string;
  guideId: string;
  withdrawn?: boolean;
}

export type ViolationCode =
  | "NOT_QUALIFIED"
  | "UNAVAILABLE"
  | "RESTRICTION"
  | "MAX_PER_DAY"
  | "SAME_PERIOD"
  | "MIN_GAP"
  | "DUPLICATE";

export interface Violation {
  code: ViolationCode;
  message: string;
}

export interface GuideStats {
  guideId: string;
  primary: number;
  secondary: number;
  availableDays: number;
  ratio: number;
}

export interface IncompleteOccurrence {
  occurrenceId: string;
  missing: number;
}
