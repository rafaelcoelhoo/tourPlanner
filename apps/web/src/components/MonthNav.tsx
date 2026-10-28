import { useI18n } from "../i18n";

export const MonthNav = ({ year, month, onChange }: { year: number; month: number; onChange: (y: number, m: number) => void }) => {
  const { monthName, t } = useI18n();
  const go = (d: number) => {
    const t = new Date(Date.UTC(year, month - 1 + d, 1));
    onChange(t.getUTCFullYear(), t.getUTCMonth() + 1);
  };
  return (
    <div className="month-nav">
      <button className="icon-btn" aria-label={t("nav.prevMonth")} onClick={() => go(-1)}>‹</button>
      <strong aria-live="polite">{monthName(month)} {year}</strong>
      <button className="icon-btn" aria-label={t("nav.nextMonth")} onClick={() => go(1)}>›</button>
    </div>
  );
};
