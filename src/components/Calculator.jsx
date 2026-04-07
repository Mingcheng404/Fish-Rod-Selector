import { useI18n } from "../i18n.jsx";

function formatMoney(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function clampNum(v, min, max) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export default function Calculator({
  fishCount,
  setFishCount,
  moreExpensiveRod,
  cheaperRod,
  paybackPeriodFish,
  efficiencyPercentDiff,
  contextMultipliers,
  catchChanceA,
  catchChanceB,
  mutationChanceA,
  mutationChanceB,
  mutationFactorA,
  mutationFactorB,
}) {
  const { t } = useI18n();
  const hasPayback = moreExpensiveRod && cheaperRod && paybackPeriodFish !== null;
  const paybackText = hasPayback
    ? paybackPeriodFish === 0
      ? t("calculator.noGap")
      : `${paybackPeriodFish.toLocaleString()} ${t("calculator.fishUnit")}`
    : "—";

  const fishN = clampNum(fishCount, 0, 1_000_000);

  return (
    <section className="fisch-panel p-5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-200/90">
            {t("calculator.badge")}
          </div>
          <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-50 md:text-xl">{t("calculator.title")}</h3>
          <p className="mt-1 text-sm text-slate-400">{t("calculator.subtitle")}</p>
        </div>
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2 text-right">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{t("app.efficiencyDelta")}</div>
          <div className="font-mono text-lg font-semibold tabular-nums text-slate-100">
            {typeof efficiencyPercentDiff === "number" ? `${Math.round(efficiencyPercentDiff)}%` : "—"}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">{t("calculator.rodAvsRodB")}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="fish-count" className="text-sm font-medium text-slate-300">
              {t("calculator.totalCatchSize")}
            </label>
            <span className="font-mono text-xs tabular-nums text-slate-500">{fishN.toLocaleString()}</span>
          </div>
          <input
            id="fish-count-slider"
            type="range"
            min={0}
            max={50000}
            step={50}
            value={Math.min(50000, fishN)}
            onChange={(e) => setFishCount(e.target.value)}
            className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-cyan-500"
            aria-label="Fish count slider"
          />
          <input
            id="fish-count"
            type="number"
            min={0}
            step={1}
            value={fishCount}
            onChange={(e) => setFishCount(e.target.value)}
            className="fisch-input mt-2 w-full font-mono tabular-nums"
          />
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            {t("calculator.usedAsTotalCatch")}
          </p>
        </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
            <div className="text-sm font-medium text-slate-300">{t("calculator.catchChance")}</div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-500">Rod A</div>
                <div className="font-mono text-cyan-200">{typeof catchChanceA === "number" ? `${Math.round(catchChanceA * 100)}%` : "—"}</div>
                <div className="text-[11px] text-slate-500">
                  {t("calculator.mut")} {typeof mutationChanceA === "number" ? `${Math.round(mutationChanceA * 100)}%` : "—"} ·
                  {t("calculator.factor")} {typeof mutationFactorA === "number" ? `${mutationFactorA.toFixed(2)}x` : "—"}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Rod B</div>
                <div className="font-mono text-cyan-200">{typeof catchChanceB === "number" ? `${Math.round(catchChanceB * 100)}%` : "—"}</div>
                <div className="text-[11px] text-slate-500">
                  {t("calculator.mut")} {typeof mutationChanceB === "number" ? `${Math.round(mutationChanceB * 100)}%` : "—"} ·
                  {t("calculator.factor")} {typeof mutationFactorB === "number" ? `${mutationFactorB.toFixed(2)}x` : "—"}
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">{t("calculator.catchChanceDesc")}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/60 to-slate-900/20 p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-100">{t("calculator.paybackWindow")}</div>
            <div className="mt-1 text-xs text-slate-500">
              {t("calculator.pricierRod")}:{" "}
              <span className="font-medium text-slate-300">{moreExpensiveRod ? moreExpensiveRod.name : "—"}</span>
            </div>
            {cheaperRod ? (
              <div className="mt-0.5 text-xs text-slate-500">
                {t("calculator.baseline")}: <span className="font-medium text-slate-300">{cheaperRod.name}</span>
              </div>
            ) : null}
          </div>
          <div className="text-left sm:text-right">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{t("calculator.fishToBreakEven")}</div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-cyan-200">{paybackText}</div>
          </div>
        </div>
      </div>

      <p className="mt-5 text-center text-xs text-slate-500">
        <span className="text-slate-600">{t("calculator.formula")} · </span>
        <span className="font-mono text-slate-400">
          expectedEarnings = (fishValue × contextMultipliers × rodMutationFactor × catchChance) × totalCatchSize
        </span>
      </p>
      {contextMultipliers ? (
        <p className="mt-2 text-center text-[11px] text-slate-500">
          {t("calculator.contextMultiplier")}:{" "}
          <span className="font-mono text-slate-300">
            {(
              contextMultipliers.fish *
              contextMultipliers.island *
              contextMultipliers.weather *
              contextMultipliers.season *
              (contextMultipliers.totem || 1) *
              contextMultipliers.match
            ).toFixed(2)}
            x
          </span>
        </p>
      ) : null}
    </section>
  );
}
