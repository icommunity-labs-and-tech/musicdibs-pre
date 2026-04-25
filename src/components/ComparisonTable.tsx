import { useTranslation } from "react-i18next";
import { Check, Minus, X } from "lucide-react";

const competitors = ["musicdibs", "suno", "ozone", "distrokid", "traditional"] as const;

const featureRows = [
  { key: "create_ai", values: ["yes", "yes", "no", "no", "no"] },
  { key: "mastering", values: ["yes", "partial", "yes", "no", "no"] },
  { key: "lyrics", values: ["yes", "partial", "no", "no", "no"] },
  { key: "covers", values: ["yes", "no", "no", "no", "no"] },
  { key: "videos", values: ["yes", "no", "no", "no", "no"] },
  { key: "ip_register", values: ["yes", "no", "no", "no", "yes"] },
  { key: "blockchain_cert", values: ["yes", "no", "no", "no", "no"] },
  { key: "distribution", values: ["yes", "no", "no", "yes", "no"] },
  { key: "social_promo", values: ["yes", "no", "no", "no", "no"] },
  { key: "all_in_one", values: ["yes", "no", "no", "no", "no"] },
] as const;

function CellValue({ value, t }: { value: string; t: (key: string) => string }) {
  if (value === "yes") return <Check className="w-6 h-6 text-compare-success mx-auto stroke-[3]" />;
  if (value === "no") return <X className="w-6 h-6 text-compare-danger mx-auto stroke-[3]" />;
  if (value === "partial") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-compare-warning/70 px-3 py-1 text-[10px] font-bold uppercase text-compare-warning">
        <Minus className="h-3 w-3 stroke-[3]" />
        {t("compare.partial")}
      </span>
    );
  }
  return <span className="text-page font-semibold text-xs">{value}</span>;
}

export const ComparisonTable = () => {
  const { t } = useTranslation();

  return (
    <section className="pt-12 pb-4 px-2">
      <div className="max-w-6xl mx-auto">
        <h3 className="text-2xl md:text-3xl font-bold text-page text-center mb-2">
          {t("compare.title")}
        </h3>
        <p className="text-page-muted text-center mb-6 text-sm max-w-xl mx-auto">
          {t("compare.subtitle")}
        </p>

        <div className="overflow-x-auto rounded-lg bg-compare-panel backdrop-blur-sm border border-compare-border shadow-compare-table">
          <table className="w-full min-w-[920px] table-fixed text-sm">
            <thead>
              <tr className="border-b border-compare-border">
                <th className="w-[23%] text-left px-5 py-5 text-page-muted font-bold text-xs uppercase tracking-wide">
                  {t("compare.feature")}
                </th>
                {competitors.map((c) => (
                  <th
                    key={c}
                    className={`px-3 py-5 text-center ${
                      c === "musicdibs" ? "bg-compare-highlight border-x border-compare-accent" : ""
                    }`}
                  >
                    {c === "musicdibs" && (
                      <span className="mb-3 inline-flex rounded-full bg-compare-badge px-3 py-1 text-[10px] font-black uppercase text-primary-foreground">
                        ✣ {t("compare.recommended")}
                      </span>
                    )}
                    <span className={`block font-bold text-sm ${c === "musicdibs" ? "text-page" : "text-page-muted"}`}>
                      {t(`compare.competitors.${c}`)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureRows.map((row, i) => (
                <tr
                  key={row.key}
                  className={`border-b border-compare-border last:border-b-0 ${i % 2 === 0 ? "bg-compare-row" : ""}`}
                >
                  <td className="px-5 py-4 text-page-muted font-bold text-sm text-left">
                    {t(`compare.features.${row.key}`)}
                  </td>
                  {row.values.map((val, j) => (
                    <td
                      key={j}
                      className={`px-3 py-4 text-center ${j === 0 ? "bg-compare-highlight border-x border-compare-accent" : ""}`}
                    >
                      <CellValue value={val} t={t} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-page-muted text-[10px] text-center mt-3">
          {t("compare.disclaimer")}
        </p>
      </div>
    </section>
  );
};