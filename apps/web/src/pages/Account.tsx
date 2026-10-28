import { useAuth } from "../auth";
import { PageHead } from "../components/PageHead";
import { PasswordCard } from "../components/PasswordCard";
import { useI18n } from "../i18n";

export const AccountPage = () => {
  const { me } = useAuth();
  const { t } = useI18n();
  return (
    <div>
      <PageHead title={t("nav.account")} meta={me ? `${me.name} · ${me.email}` : undefined} />
      <PasswordCard />
    </div>
  );
};
