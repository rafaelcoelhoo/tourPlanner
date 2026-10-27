import { useI18n } from "../i18n";

export const MonthNav = ({ year, month, onChange }: { year: number; month: number; onChange: (y: number, m: number) => void }) => {
  const { monthName } = useI18n();
  const go = (d: number) => {
    const t = new Date(Date.UTC(year, month - 1 + d, 1));
    onChange(t.getUTCFullYear(), t.getUTCMonth() + 1);
  };
  return (
    <div className="row">
      <button onClick={() => go(-1)}>‹</button>
      <strong>{monthName(month)} {year}</strong>
      <button onClick={() => go(1)}>›</button>
    </div>
  );
};
