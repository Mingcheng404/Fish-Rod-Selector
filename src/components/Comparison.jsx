import RodCard from "./RodCard";
import { useI18n } from "../i18n.jsx";

function ArrowIcon({ direction }) {
  const up = direction === "up";
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      {up ? <path d="M10 3l6 6H4l6-6z" /> : <path d="M10 17l-6-6h12l-6 6z" />}
    </svg>
  );
}

function StatCompareRow({ label, aValue, bValue, formatValue }) {
  const a = aValue ?? 0;
  const b = bValue ?? 0;

  const isHigher = a > b;
  const isLower = a < b;

  const aClass = isHigher ? "text-emerald-400" : isLower ? "text-rose-400" : "text-slate-300";
  const bClass = !isHigher && isLower ? "text-emerald-400" : isHigher ? "text-rose-400" : "text-slate-300";

  const aDir = isHigher ? "up" : isLower ? "down" : null;
  const bDir = isHigher ? "down" : isLower ? "up" : null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800/80 bg-slate-950/30 px-3 py-2.5 transition hover:border-slate-700/80">
      <div className="text-sm font-medium text-slate-400">{label}</div>
      <div className="flex items-center gap-2 font-mono text-sm font-semibold tabular-nums">
        <span className={`${aClass} inline-flex items-center gap-1`}>
          {aDir ? <ArrowIcon direction={aDir} /> : null}
          {formatValue(a)}
        </span>
        <span className="text-slate-600 text-xs font-sans font-normal">vs</span>
        <span className={`${bClass} inline-flex items-center gap-1`}>
          {bDir ? <ArrowIcon direction={bDir} /> : null}
          {formatValue(b)}
        </span>
      </div>
    </div>
  );
}

function formatPercent(x) {
  return `${Math.round(x * 100)}%`;
}

function formatMultiplier(x) {
  return `${Number(x).toFixed(2)}x`;
}

function pct(value) {
  const n = Number(value || 0);
  const sign = n > 0 ? "+" : "";
  return `${sign}${Math.round(n * 100)}%`;
}

export default function Comparison({
  rods,
  rodA,
  rodB,
  onRodASelect,
  onRodBSelect,
  bars,
  fishCount,
  expectedCatchA,
  expectedCatchB,
  rodBreakdownA,
  rodBreakdownB,
  rodValueMultiplierA,
  rodValueMultiplierB,
}) {
  const { t } = useI18n();
  const luckA = rodA?.luck_multiplier ?? 0;
  const luckB = rodB?.luck_multiplier ?? 0;

  const speedA = rodA?.lure_speed_modifier ?? 0;
  const speedB = rodB?.lure_speed_modifier ?? 0;

  const controlA = rodA?.control_rating ?? 0;
  const controlB = rodB?.control_rating ?? 0;

  const netA = bars?.netSessionA ?? 0;
  const netB = bars?.netSessionB ?? 0;
  const max = bars?.max ?? 1;
  const sessionFish = bars?.sessionFish ?? (Number(fishCount) || 1);

  const wA = Math.max(0, (netA / max) * 100);
  const wB = Math.max(0, (netB / max) * 100);

  return (
    <section className="fisch-panel p-4 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-200/90">
            {t("comparison.liveCompare")}
          </div>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-50 md:text-2xl">
            {t("comparison.title")}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            {t("comparison.subtitle", {
              count: Number(sessionFish).toLocaleString(),
            })}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RodCard label={t("comparison.rodA")} rod={rodA} rods={rods} onRodSelect={onRodASelect} accent="emerald" />
        <RodCard label={t("comparison.rodB")} rod={rodB} rods={rods} onRodSelect={onRodBSelect} accent="cyan" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCompareRow label={t("comparison.luck")} aValue={luckA} bValue={luckB} formatValue={formatMultiplier} />
        <StatCompareRow label={t("comparison.speed")} aValue={speedA} bValue={speedB} formatValue={formatMultiplier} />
        <StatCompareRow label={t("comparison.control")} aValue={controlA} bValue={controlB} formatValue={formatPercent} />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-800/80 bg-slate-950/25 p-4 md:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-100">{t("comparison.sessionPreview")}</div>
            <div className="mt-0.5 text-xs text-slate-500">
              {t("comparison.sessionPreviewDesc")}
            </div>
          </div>
          <div className="font-mono text-xs text-slate-500 tabular-nums">
            {t("comparison.scaleMax")}:{" "}
            <span className="text-slate-200">${max.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-3">
            <div className="flex items-center justify-between gap-3 text-sm font-semibold">
              <span className="text-emerald-300">{t("comparison.rodA")}</span>
              <span className="font-mono tabular-nums text-slate-100">
                ${netA.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div
              className="mt-2.5 h-3.5 w-full overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-slate-700/50"
              role="presentation"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-glow-sm transition-[width] duration-500 ease-out"
                style={{ width: `${wA}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {t("comparison.expectedCatches")}:{" "}
              <span className="font-mono text-slate-300">{typeof expectedCatchA === "number" ? Math.round(expectedCatchA) : "—"}</span>
              {" • "}{t("comparison.loc")} {pct(rodBreakdownA?.locationValueBonus)}
              {" • "}{t("comparison.unique")} {pct(rodBreakdownA?.uniqueValueBonus)}
              {" • "}{t("comparison.history")} {pct(rodBreakdownA?.historicalValueBonus)}
              {" • "}{t("comparison.final")} {formatMultiplier(rodValueMultiplierA || 1)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-3">
            <div className="flex items-center justify-between gap-3 text-sm font-semibold">
              <span className="text-cyan-300">{t("comparison.rodB")}</span>
              <span className="font-mono tabular-nums text-slate-100">
                ${netB.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div
              className="mt-2.5 h-3.5 w-full overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-slate-700/50"
              role="presentation"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400/90 shadow-glow-sm transition-[width] duration-500 ease-out"
                style={{ width: `${wB}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {t("comparison.expectedCatches")}:{" "}
              <span className="font-mono text-slate-300">{typeof expectedCatchB === "number" ? Math.round(expectedCatchB) : "—"}</span>
              {" • "}{t("comparison.loc")} {pct(rodBreakdownB?.locationValueBonus)}
              {" • "}{t("comparison.unique")} {pct(rodBreakdownB?.uniqueValueBonus)}
              {" • "}{t("comparison.history")} {pct(rodBreakdownB?.historicalValueBonus)}
              {" • "}{t("comparison.final")} {formatMultiplier(rodValueMultiplierB || 1)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
