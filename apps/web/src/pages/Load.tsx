import { useCity } from "../city";
import { useFetch } from "../hooks";
import { useI18n } from "../i18n";
import type { GuideListItem } from "../types";
import { GuidesLoad } from "./GuidesOverview";
import { PageHead } from "../components/PageHead";

export const LoadPage = () => {
  const { cityId, city } = useCity();
  const { t } = useI18n();
  const guides = useFetch<GuideListItem[]>(cityId ? `/guides?cityId=${cityId}` : null);
  return (
    <div>
      <PageHead title={t("nav.load")} meta={city?.name} />
      {guides.data ? <GuidesLoad guides={guides.data} /> : <p className="center">{guides.error ?? t("loading")}</p>}
    </div>
  );
};
