import type { ReactNode } from "react";

/** Cabeçalho de página consistente: título, informação secundária e ações à direita. */
export const PageHead = ({ title, meta, actions }: { title: string; meta?: ReactNode; actions?: ReactNode }) => (
  <header className="page-head">
    <div className="page-title">
      <h1>{title}</h1>
      {meta && <div className="page-meta">{meta}</div>}
    </div>
    {actions && <div className="page-actions">{actions}</div>}
  </header>
);
