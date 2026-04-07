import { useEffect, useMemo, useState } from "react";
import Comparison from "./components/Comparison.jsx";
import Calculator from "./components/Calculator.jsx";
import MutationsPage from "./components/MutationsPage.jsx";
import CountdownsPage from "./components/CountdownsPage.jsx";
import { useCalculations } from "./hooks/useCalculations";
import { LanguageProvider, useI18n } from "./i18n.jsx";

function formatMoney(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "−" : "+";
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function LoadingSkeleton() {
  return (
    <div className="animate-fade-in space-y-6" aria-busy="true" aria-label="Loading">
      <div className="fisch-panel p-6 md:p-8">
        <div className="h-5 w-40 rounded-lg bg-slate-700/60 animate-shimmer" />
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-72 rounded-2xl bg-slate-800/50 animate-shimmer" />
          <div className="h-72 rounded-2xl bg-slate-800/50 animate-shimmer" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-slate-800/40 animate-shimmer" />
          ))}
        </div>
      </div>
      <div className="fisch-panel mx-auto max-w-xl p-6">
        <div className="h-5 w-48 rounded-lg bg-slate-700/60 animate-shimmer" />
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="h-24 rounded-xl bg-slate-800/40 animate-shimmer" />
          <div className="h-24 rounded-xl bg-slate-800/40 animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

function normalizeById(list) {
  const arr = Array.isArray(list) ? list : [];
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const id = String(item?.id || "").trim();
    const name = String(item?.name || "").trim();
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

function buildDynamicFishProfile(fish, selectedIslandId, selectedWeatherId, selectedSeasonId) {
  const list = Array.isArray(fish) ? fish : [];
  if (list.length === 0) {
    return {
      id: "dynamic-mix",
      name: "Dynamic Catch Mix",
      base_value: 120,
      value_multiplier: 1,
      best_islands: [],
      preferred_weather: [],
      preferred_seasons: [],
    };
  }

  const scored = list.map((f) => {
    let score = 1;
    if (selectedIslandId && Array.isArray(f.best_islands) && f.best_islands.includes(selectedIslandId)) score += 2;
    if (selectedWeatherId && Array.isArray(f.preferred_weather) && f.preferred_weather.includes(selectedWeatherId)) score += 1.5;
    if (selectedSeasonId && Array.isArray(f.preferred_seasons) && f.preferred_seasons.includes(selectedSeasonId)) score += 1.5;
    return { fish: f, score };
  });

  const totalWeight = scored.reduce((sum, row) => sum + row.score, 0) || 1;
  const weightedBase = scored.reduce((sum, row) => sum + (Number(row.fish.base_value) || 0) * row.score, 0) / totalWeight;
  const weightedMulti =
    scored.reduce((sum, row) => sum + (Number(row.fish.value_multiplier) || 1) * row.score, 0) / totalWeight;

  return {
    id: "dynamic-mix",
    name: "Dynamic Catch Mix",
    base_value: Math.max(1, weightedBase),
    value_multiplier: Math.max(0.1, weightedMulti),
    best_islands: [],
    preferred_weather: [],
    preferred_seasons: [],
  };
}

function AppContent() {
  const { lang, setLanguage, t } = useI18n();
  const [rods, setRods] = useState([]);
  const [fish, setFish] = useState([]);
  const [islands, setIslands] = useState([]);
  const [weather, setWeather] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [totems, setTotems] = useState([]);
  const [loadingRods, setLoadingRods] = useState(true);
  const [activePage, setActivePage] = useState("calculator");
  const [rodAId, setRodAId] = useState("");
  const [rodBId, setRodBId] = useState("");
  const [selectedIslandId, setSelectedIslandId] = useState("");
  const [selectedWeatherId, setSelectedWeatherId] = useState("");
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [selectedTotemId, setSelectedTotemId] = useState("");

  const [fishCount, setFishCount] = useState(500);

  useEffect(() => {
    let cancelled = false;
    setLoadingRods(true);

    fetch(`${import.meta.env.BASE_URL}data.json`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const list = normalizeById(json?.rods);
        const fishList = normalizeById(json?.fish);
        const islandList = normalizeById(json?.islands);
        const weatherList = normalizeById(json?.weather);
        const seasonList = normalizeById(json?.seasons);
        const totemList = normalizeById(json?.totems);
        const fallbackTotems = [
          { id: "none", name: "No Totem", earnings_multiplier: 1 },
          { id: "aurora", name: "Aurora Totem", earnings_multiplier: 1.08 },
          { id: "storm_caller", name: "Storm Caller Totem", earnings_multiplier: 1.1 },
          { id: "abyssal_relic", name: "Abyssal Relic Totem", earnings_multiplier: 1.12 },
          { id: "sun_blessing", name: "Sun Blessing Totem", earnings_multiplier: 1.06 },
        ];
        setRods(list);
        setFish(fishList);
        setIslands(islandList);
        setWeather(weatherList);
        setSeasons(seasonList);
        setTotems(totemList.length > 0 ? totemList : fallbackTotems);
        setLoadingRods(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRods([]);
        setFish([]);
        setIslands([]);
        setWeather([]);
        setSeasons([]);
        setTotems([{ id: "none", name: "No Totem", earnings_multiplier: 1 }]);
        setLoadingRods(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loadingRods) return;
    if (rods.length === 0) return;

    setRodAId((prev) => prev || rods[0]?.id || "");
    setRodBId((prev) => prev || rods[1]?.id || rods[0]?.id || "");
  }, [loadingRods, rods]);

  useEffect(() => {
    if (loadingRods) return;
    setSelectedIslandId((prev) => prev || islands[0]?.id || "");
    setSelectedWeatherId((prev) => prev || weather[0]?.id || "");
    setSelectedSeasonId((prev) => prev || seasons[0]?.id || "");
    setSelectedTotemId((prev) => prev || totems[0]?.id || "");
  }, [loadingRods, islands, weather, seasons, totems]);

  const rodA = useMemo(() => rods.find((r) => r.id === rodAId), [rods, rodAId]);
  const rodB = useMemo(() => rods.find((r) => r.id === rodBId), [rods, rodBId]);
  const selectedIsland = useMemo(
    () => islands.find((i) => i.id === selectedIslandId),
    [islands, selectedIslandId]
  );
  const selectedWeather = useMemo(
    () => weather.find((w) => w.id === selectedWeatherId),
    [weather, selectedWeatherId]
  );
  const selectedSeason = useMemo(
    () => seasons.find((s) => s.id === selectedSeasonId),
    [seasons, selectedSeasonId]
  );
  const selectedTotem = useMemo(
    () => totems.find((t) => t.id === selectedTotemId),
    [totems, selectedTotemId]
  );
  const selectedFish = useMemo(
    () => buildDynamicFishProfile(fish, selectedIslandId, selectedWeatherId, selectedSeasonId),
    [fish, selectedIslandId, selectedWeatherId, selectedSeasonId]
  );

  const calc = useCalculations({
    rodA,
    rodB,
    fishCount,
    selectedFish,
    selectedIsland,
    selectedWeather,
    selectedSeason,
    selectedTotem,
  });

  const activeContext = [selectedIsland?.name, selectedWeather?.name, selectedSeason?.name, selectedTotem?.name]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="relative min-h-screen flex flex-col fisch-bg-grid">
      <a
        href="#main-content"
        className="absolute left-0 top-0 z-[100] -translate-y-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition focus:translate-y-3 focus:outline-none focus:ring-2 focus:ring-cyan-300"
      >
        {t("common.skipToMain")}
      </a>

      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 shadow-glow-sm"
              aria-hidden
            >
              <span className="font-mono text-lg font-bold tracking-tight text-cyan-200">F</span>
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold tracking-tight text-slate-50 sm:text-xl">
                {t("app.title")}
              </div>
              <p className="mt-0.5 text-sm text-slate-400">
                {t("app.subtitle")}
              </p>
            </div>
          </div>

          <div className="w-full lg:max-w-2xl">
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setActivePage("calculator")}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    activePage === "calculator"
                      ? "bg-cyan-500/20 text-cyan-100 border border-cyan-500/40"
                      : "bg-slate-900/40 text-slate-300 border border-slate-700/70 hover:border-slate-600"
                  }`}
                >
                  {t("app.navCalculator")}
                </button>
                <button
                  type="button"
                  onClick={() => setActivePage("mutations")}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    activePage === "mutations"
                      ? "bg-fuchsia-500/20 text-fuchsia-100 border border-fuchsia-500/40"
                      : "bg-slate-900/40 text-slate-300 border border-slate-700/70 hover:border-slate-600"
                  }`}
                >
                  {t("app.navMutations")}
                </button>
                <button
                  type="button"
                  onClick={() => setActivePage("countdowns")}
                  className={`rounded-lg px-3 py-2 text-sm transition ${
                    activePage === "countdowns"
                      ? "bg-emerald-500/20 text-emerald-100 border border-emerald-500/40"
                      : "bg-slate-900/40 text-slate-300 border border-slate-700/70 hover:border-slate-600"
                  }`}
                >
                  {t("app.navCountdowns")}
                </button>
              </div>
            </div>
            <div className="mt-2 rounded-xl border border-slate-800/80 bg-slate-900/30 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] uppercase tracking-wider text-slate-500">{t("app.language")}</div>
                <div className="inline-flex rounded-lg border border-slate-700/80 bg-slate-950/50 p-1">
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                      lang === "en" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-300 hover:text-slate-100"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("zh")}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                      lang === "zh" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-300 hover:text-slate-100"
                    }`}
                  >
                    中文
                  </button>
                </div>
              </div>
            </div>
            {activePage === "calculator" ? (
              <div className="mt-2 rounded-xl border border-slate-800/80 bg-slate-900/30 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wider text-slate-500">{t("app.mutationModel")}</div>
                <div className="mt-1 text-sm text-slate-200">{t("app.mutationModelDesc")}</div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1 pb-10 pt-2 md:pb-32">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-8">
          {activePage === "mutations" ? (
            <MutationsPage />
          ) : activePage === "countdowns" ? (
            <CountdownsPage />
          ) : loadingRods ? (
            <LoadingSkeleton />
          ) : (
            <div className="animate-fade-in flex flex-col gap-8">
              <Comparison
                rods={rods}
                rodA={rodA}
                rodB={rodB}
                onRodASelect={setRodAId}
                onRodBSelect={setRodBId}
                bars={calc?.bars}
                fishCount={fishCount}
                expectedCatchA={calc?.expectedCatchA}
                expectedCatchB={calc?.expectedCatchB}
                rodBreakdownA={calc?.rodBreakdownA}
                rodBreakdownB={calc?.rodBreakdownB}
                rodValueMultiplierA={calc?.rodValueMultiplierA}
                rodValueMultiplierB={calc?.rodValueMultiplierB}
              />

              <section className="fisch-panel p-4 md:p-5">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{t("app.worldConditions")}</div>
                    <p className="text-xs text-slate-500">{t("app.worldConditionsDesc")}</p>
                  </div>
                  <div className="text-xs text-cyan-200">{activeContext || "—"}</div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <label className="block">
                    <span className="text-xs text-slate-400">{t("app.island")}</span>
                    <select
                      className="fisch-input mt-1 w-full"
                      value={selectedIslandId}
                      onChange={(e) => setSelectedIslandId(e.target.value)}
                    >
                      {islands
                        .filter((i) => String(i?.id || "").trim() && String(i?.name || "").trim())
                        .map((i, idx) => (
                        <option key={`${i.id}-${idx}`} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs text-slate-400">{t("app.weather")}</span>
                    <select
                      className="fisch-input mt-1 w-full"
                      value={selectedWeatherId}
                      onChange={(e) => setSelectedWeatherId(e.target.value)}
                    >
                      {weather
                        .filter((w) => String(w?.id || "").trim() && String(w?.name || "").trim())
                        .map((w, idx) => (
                        <option key={`${w.id}-${idx}`} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs text-slate-400">{t("app.season")}</span>
                    <select
                      className="fisch-input mt-1 w-full"
                      value={selectedSeasonId}
                      onChange={(e) => setSelectedSeasonId(e.target.value)}
                    >
                      {seasons
                        .filter((s) => String(s?.id || "").trim() && String(s?.name || "").trim())
                        .map((s, idx) => (
                        <option key={`${s.id}-${idx}`} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs text-slate-400">{t("app.totem")}</span>
                    <select
                      className="fisch-input mt-1 w-full"
                      value={selectedTotemId}
                      onChange={(e) => setSelectedTotemId(e.target.value)}
                    >
                      {totems
                        .filter((t) => String(t?.id || "").trim() && String(t?.name || "").trim())
                        .map((t, idx) => (
                        <option key={`${t.id}-${idx}`} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  {t("app.fishPoolModel")}:{" "}
                  <span className="text-slate-300">
                    {selectedFish?.name || "—"} ({formatMoney(selectedFish?.base_value)})
                  </span>
                </div>
              </section>

              <div className="flex justify-center">
                <div className="w-full max-w-xl">
                  <Calculator
                    fishCount={fishCount}
                    setFishCount={setFishCount}
                    moreExpensiveRod={calc?.moreExpensiveRod}
                    cheaperRod={calc?.cheaperRod}
                    paybackPeriodFish={calc?.paybackPeriodFish}
                    efficiencyPercentDiff={calc?.efficiencyPercentDiff}
                    contextMultipliers={calc?.contextMultipliers}
                    catchChanceA={calc?.catchChanceA}
                    catchChanceB={calc?.catchChanceB}
                    mutationChanceA={calc?.mutationChanceA}
                    mutationChanceB={calc?.mutationChanceB}
                    mutationFactorA={calc?.mutationFactorA}
                    mutationFactorB={calc?.mutationFactorB}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {activePage === "calculator" ? (
      <footer className="md:fixed md:bottom-0 md:left-0 md:right-0 z-50 pointer-events-none p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto max-w-6xl">
          <div className="fisch-panel flex flex-col gap-3 rounded-2xl border-cyan-500/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {t("app.netProfitDelta")}
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">·</span>
              <span className="text-xs text-slate-500">{t("app.rodAvsRodB")}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-8">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">{t("app.session")}</div>
                <div className="font-mono text-lg font-semibold tabular-nums text-cyan-200">
                  {formatMoney(calc?.profitDelta)}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-700/80 hidden sm:block" aria-hidden />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">{t("app.efficiencyDelta")}</div>
                <div className="font-mono text-lg font-semibold tabular-nums text-slate-200">
                  {typeof calc?.efficiencyPercentDiff === "number"
                    ? `${Math.round(calc.efficiencyPercentDiff)}%`
                    : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
      ) : null}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
