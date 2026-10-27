import type { ReactNode } from "react";
import { useI18n } from "../i18n";

export const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => {
  const { t } = useI18n();
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row end"><h1>{title}</h1><button onClick={onClose}>{t("close")}</button></div>
        {children}
      </div>
    </div>
  );
};
