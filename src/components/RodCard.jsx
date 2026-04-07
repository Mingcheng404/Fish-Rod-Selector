import { useMemo, useState } from "react";
import { useI18n } from "../i18n.jsx";

function StatBlock({ label, display, barRatio, barClass }) {
  const pct = Math.min(100, Math.max(0, barRatio * 100));

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
        <div className={`font-mono text-base font-semibold tabular-nums ${barClass.text}`}>{display}</div>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barClass.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function RodCard({ label, rod, rods, onRodSelect, accent = "cyan" }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const selectedRodId = rod?.id || "";
  const filteredRods = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rods;
    return rods.filter((r) => (r?.name || "").toLowerCase().includes(q));
  }, [rods, query]);
  const selectableRods = useMemo(() => {
    if (!selectedRodId) return filteredRods;
    if (filteredRods.some((r) => r.id === selectedRodId)) return filteredRods;
    const selected = rods.find((r) => r.id === selectedRodId);
    return selected ? [selected, ...filteredRods] : filteredRods;
  }, [filteredRods, rods, selectedRodId]);
  const noMatches = filteredRods.length === 0;
  const accentBorder =
    accent === "emerald"
      ? "border-emerald-500/25 hover:border-emerald-500/40"
      : "border-cyan-500/25 hover:border-cyan-500/40";
  const accentGlow =
    accent === "emerald"
      ? "shadow-[0_0_0_1px_rgba(16,185,129,0.08)]"
      : "shadow-[0_0_0_1px_rgba(34,211,238,0.08)]";
  const badgeClass =
    accent === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";

  if (!rod) {
    return (
      <div className={`fisch-panel p-4 ${accentBorder} ${accentGlow}`}>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
        <div className="mt-3 h-80 animate-pulse rounded-xl bg-slate-800/40" />
      </div>
    );
  }

  const speed = rod.lure_speed_modifier;
  const control = rod.control_rating;
  const luck = rod.luck_multiplier;
  const resilience = typeof rod.resilience_rating === "number" ? rod.resilience_rating : 0;
  const maxKgDisplay = rod.max_kg === null ? "∞" : Number.isFinite(Number(rod.max_kg)) ? `${Math.round(Number(rod.max_kg))}kg` : "—";
  const durability = Number.isFinite(Number(rod.durability)) ? Math.round(Number(rod.durability)) : 100;
  const barClass =
    accent === "emerald"
      ? { text: "text-emerald-300", bar: "bg-emerald-400/85" }
      : { text: "text-cyan-300", bar: "bg-cyan-400/85" };

  return (
    <article
      className={`fisch-panel p-4 transition-colors md:p-5 ${accentBorder} ${accentGlow}`}
      aria-labelledby={`rod-title-${rod.id}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
            >
              {label}
            </span>
          </div>
          <h3 id={`rod-title-${rod.id}`} className="mt-2 text-lg font-bold tracking-tight text-slate-50 md:text-xl">
            {rod.name}
          </h3>
          <p className={`mt-1 font-mono text-sm font-semibold tabular-nums ${barClass.text}`}>
            ${rod.price.toLocaleString()}
          </p>
        </div>

        <div className="w-full shrink-0 sm:w-[200px]">
          <label htmlFor={`rod-search-${label}`} className="block text-[11px] font-medium text-slate-500">
            {t("rodCard.findRod")}
          </label>
          <input
            id={`rod-search-${label}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("rodCard.typeRodName")}
            className="fisch-input mt-1.5 w-full text-sm"
          />
          <label htmlFor={`rod-select-${rod.id}`} className="mt-2 block text-[11px] font-medium text-slate-500">
            {t("rodCard.selectResult")}
          </label>
          <select
            id={`rod-select-${rod.id}`}
            className="fisch-input mt-1.5 w-full cursor-pointer text-sm"
            value={selectedRodId}
            onChange={(e) => onRodSelect(e.target.value)}
          >
            {selectableRods.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {noMatches ? <p className="mt-1 text-[11px] text-rose-300">{t("rodCard.noRodsFound")}</p> : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatBlock
          label={t("rodCard.luck")}
          display={`${luck.toFixed(2)}x`}
          barRatio={Math.min(1, luck / 3)}
          barClass={barClass}
        />
        <StatBlock
          label={t("rodCard.speed")}
          display={`${speed.toFixed(2)}x`}
          barRatio={Math.min(1, speed / 3)}
          barClass={barClass}
        />
        <StatBlock
          label={t("rodCard.control")}
          display={`${(control * 100).toFixed(0)}%`}
          barRatio={Math.min(1, Math.max(0, control))}
          barClass={barClass}
        />
        <StatBlock
          label={t("rodCard.resilience")}
          display={`${Math.round(resilience * 100)}%`}
          barRatio={Math.min(1, Math.max(0, resilience))}
          barClass={barClass}
        />
        <StatBlock
          label={t("rodCard.maxKg")}
          display={maxKgDisplay}
          barRatio={rod.max_kg === null ? 1 : Math.min(1, Math.max(0, Number(rod.max_kg || 0) / 5000))}
          barClass={barClass}
        />
        <StatBlock
          label={t("rodCard.durability")}
          display={String(durability)}
          barRatio={Math.min(1, Math.max(0, durability / 250))}
          barClass={barClass}
        />
      </div>

      <div className="mt-4">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{t("rodCard.about")}</div>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">{rod.description}</p>
      </div>

      <div
        className={`mt-4 flex items-center justify-between gap-3 rounded-xl border bg-gradient-to-br p-3 ${
          accent === "emerald"
            ? "border-emerald-500/20 from-emerald-500/10 to-slate-950/40"
            : "border-cyan-500/20 from-cyan-500/10 to-slate-950/40"
        }`}
      >
        <span className="text-xs text-slate-500">{t("rodCard.preview")}</span>
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border font-mono text-sm font-bold ${
            accent === "emerald"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
          }`}
          aria-hidden
        >
          {rod.name?.trim()?.[0]?.toUpperCase()}
        </span>
      </div>
    </article>
  );
}
