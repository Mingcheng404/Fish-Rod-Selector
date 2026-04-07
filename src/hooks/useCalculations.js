import { useMemo } from "react";

function asNumber(value, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function fishMultiplier(selectedFish) {
  return selectedFish?.value_multiplier ?? 1;
}

function islandMultiplier(selectedIsland) {
  return selectedIsland?.earnings_multiplier ?? 1;
}

function weatherMultiplier(selectedWeather) {
  return selectedWeather?.earnings_multiplier ?? 1;
}

function seasonMultiplier(selectedSeason) {
  return selectedSeason?.earnings_multiplier ?? 1;
}

function totemMultiplier(selectedTotem) {
  return selectedTotem?.earnings_multiplier ?? 1;
}

function matchBonus({ selectedFish, selectedIsland, selectedWeather, selectedSeason }) {
  if (!selectedFish) return 1;
  let bonus = 1;
  if (selectedIsland?.id && selectedFish.best_islands?.includes(selectedIsland.id)) bonus *= 1.08;
  if (selectedWeather?.id && selectedFish.preferred_weather?.includes(selectedWeather.id)) bonus *= 1.06;
  if (selectedSeason?.id && selectedFish.preferred_seasons?.includes(selectedSeason.id)) bonus *= 1.05;
  return bonus;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function inferredRodBonuses(rod, selectedIsland, selectedWeather, selectedSeason) {
  const name = String(rod?.name || "").toLowerCase();
  let valueBonus = 0;
  let catchBonus = 0;
  let locationBonus = 0;
  let weatherBonus = 0;
  let seasonBonus = 0;

  if ((name.includes("abyss") || name.includes("depth") || name.includes("void")) && ["depths", "vertigo"].includes(selectedIsland?.id)) {
    locationBonus += 0.08;
    catchBonus += 0.04;
  }
  if (name.includes("storm") && ["storm", "rain"].includes(selectedWeather?.id)) {
    weatherBonus += 0.07;
    catchBonus += 0.03;
  }
  if ((name.includes("frost") || name.includes("snow") || name.includes("ice")) && (selectedSeason?.id === "winter" || selectedIsland?.id === "snowcap")) {
    seasonBonus += 0.06;
    catchBonus += 0.02;
  }
  if ((name.includes("sun") || name.includes("flare")) && (selectedSeason?.id === "summer" || selectedWeather?.id === "clear")) {
    weatherBonus += 0.05;
    seasonBonus += 0.03;
  }
  if ((name.includes("moon") || name.includes("phantom")) && ["fog", "clear"].includes(selectedWeather?.id)) {
    weatherBonus += 0.04;
    catchBonus += 0.01;
  }
  if (name.includes("master") || name.includes("legend")) {
    valueBonus += 0.04;
    catchBonus += 0.02;
  }

  return { valueBonus, catchBonus, locationBonus, weatherBonus, seasonBonus };
}

function rodSpecificBonuses(rod, selectedIsland, selectedWeather, selectedSeason) {
  const explicitLocation = asNumber(rod?.location_bonuses?.[selectedIsland?.id], 0);
  const explicitWeather = asNumber(rod?.weather_bonuses?.[selectedWeather?.id], 0);
  const explicitSeason = asNumber(rod?.season_bonuses?.[selectedSeason?.id], 0);
  const explicitUniqueValue = asNumber(rod?.unique_effects?.value_bonus, 0);
  const explicitUniqueCatch = asNumber(rod?.unique_effects?.catch_bonus, 0);
  const explicitHistoryValue = asNumber(rod?.historical_adjustment?.value_bonus, 0);
  const explicitHistoryCatch = asNumber(rod?.historical_adjustment?.catch_bonus, 0);

  const inferred = inferredRodBonuses(rod, selectedIsland, selectedWeather, selectedSeason);

  return {
    locationValueBonus: explicitLocation + inferred.locationBonus,
    weatherValueBonus: explicitWeather + inferred.weatherBonus,
    seasonValueBonus: explicitSeason + inferred.seasonBonus,
    uniqueValueBonus: explicitUniqueValue + inferred.valueBonus,
    uniqueCatchBonus: explicitUniqueCatch + inferred.catchBonus,
    historicalValueBonus: explicitHistoryValue,
    historicalCatchBonus: explicitHistoryCatch,
  };
}

function rodMutationModel(rod, selectedIsland, selectedWeather, selectedSeason) {
  const name = String(rod?.name || "").toLowerCase();
  let chance = 0.015;
  let avgMutationBoost = 0.2;

  if (name.includes("abyss") || name.includes("depth")) {
    chance += 0.06;
    avgMutationBoost += 0.35;
  }
  if (name.includes("myth") || name.includes("master")) {
    chance += 0.05;
    avgMutationBoost += 0.28;
  }
  if (name.includes("storm") && ["storm", "rain"].includes(selectedWeather?.id)) {
    chance += 0.03;
    avgMutationBoost += 0.12;
  }
  if ((name.includes("moon") || name.includes("phantom")) && ["fog", "clear"].includes(selectedWeather?.id)) {
    chance += 0.02;
    avgMutationBoost += 0.1;
  }
  if ((name.includes("frost") || name.includes("ice")) && (selectedSeason?.id === "winter" || selectedIsland?.id === "snowcap")) {
    chance += 0.025;
    avgMutationBoost += 0.12;
  }

  const explicit = asNumber(rod?.unique_effects?.value_bonus, 0);
  if (explicit > 0) {
    chance += Math.min(0.2, explicit * 0.15);
    avgMutationBoost += Math.min(1.5, explicit);
  }

  const mutationChance = clamp(chance, 0, 0.75);
  const mutationFactor = 1 + mutationChance * clamp(avgMutationBoost, 0, 3);
  return {
    mutationChance,
    mutationFactor: clamp(mutationFactor, 1, 3.5),
  };
}

function catchChance(rod, selectedFish, rodBonuses) {
  const control = asNumber(rod?.control_rating, 0.75);
  const speed = asNumber(rod?.lure_speed_modifier, 1);
  const luck = asNumber(rod?.luck_multiplier, 1);
  const resilience = asNumber(rod?.resilience_rating, 0.15);
  const durability = asNumber(rod?.durability, 100);
  const fishDifficulty = Math.max(0, fishMultiplier(selectedFish) - 1);
  const bonus = asNumber(rodBonuses?.uniqueCatchBonus, 0) + asNumber(rodBonuses?.historicalCatchBonus, 0);
  const resilienceBonus = resilience * 0.12;
  const durabilityBonus = Math.min(0.05, durability / 2000);

  const chance =
    0.45 +
    control * 0.35 +
    (speed - 1) * 0.18 +
    (luck - 1) * 0.22 +
    resilienceBonus +
    durabilityBonus -
    fishDifficulty * 0.2 +
    bonus;
  return clamp(chance, 0.08, 0.97);
}

export function calculateRodTotal({
  rod,
  fishCount,
  selectedFish,
  selectedIsland,
  selectedWeather,
  selectedSeason,
  selectedTotem,
}) {
  const f = Math.max(0, asNumber(fishCount));
  const baseFishValue = Math.max(0, asNumber(selectedFish?.base_value, 120));
  const contextMultiplier =
    fishMultiplier(selectedFish) *
    islandMultiplier(selectedIsland) *
    weatherMultiplier(selectedWeather) *
    seasonMultiplier(selectedSeason) *
    totemMultiplier(selectedTotem) *
    matchBonus({ selectedFish, selectedIsland, selectedWeather, selectedSeason });

  const rodBonuses = rodSpecificBonuses(rod, selectedIsland, selectedWeather, selectedSeason);
  const rodValueBonusTotal =
    rodBonuses.locationValueBonus +
    rodBonuses.weatherValueBonus +
    rodBonuses.seasonValueBonus +
    rodBonuses.uniqueValueBonus +
    rodBonuses.historicalValueBonus;
  const rodValueMultiplier = clamp(1 + rodValueBonusTotal, 0.5, 2.5);
  const mutationModel = rodMutationModel(rod, selectedIsland, selectedWeather, selectedSeason);

  const chance = catchChance(rod, selectedFish, rodBonuses);
  const expectedCaught = f * chance;
  const earningsPerFish =
    baseFishValue * contextMultiplier * rodValueMultiplier * mutationModel.mutationFactor * chance;

  return {
    baseFishValue,
    contextMultiplier,
    rodValueMultiplier,
    rodBonuses,
    mutationModel,
    catchChance: chance,
    expectedCaught,
    earningsPerFish,
    earningsTotal: earningsPerFish * f,
  };
}

export function calculateEfficiencyPercentDiff({
  rodA,
  rodB,
  selectedFish,
  selectedIsland,
  selectedWeather,
  selectedSeason,
  selectedTotem,
}) {
  const modelA = calculateRodTotal({
    rod: rodA,
    fishCount: 1,
    selectedFish,
    selectedIsland,
    selectedWeather,
    selectedSeason,
    selectedTotem,
  });
  const modelB = calculateRodTotal({
    rod: rodB,
    fishCount: 1,
    selectedFish,
    selectedIsland,
    selectedWeather,
    selectedSeason,
    selectedTotem,
  });

  if (modelB.earningsPerFish === 0) return null;
  return ((modelA.earningsPerFish - modelB.earningsPerFish) / modelB.earningsPerFish) * 100;
}

export function calculatePaybackPeriod({
  expensiveRod,
  cheaperRod,
  selectedFish,
  selectedIsland,
  selectedWeather,
  selectedSeason,
  selectedTotem,
}) {
  if (!expensiveRod || !cheaperRod) return null;

  const priceDiff = asNumber(expensiveRod.price) - asNumber(cheaperRod.price);
  if (priceDiff <= 0) return 0;

  const expensiveModel = calculateRodTotal({
    rod: expensiveRod,
    fishCount: 1,
    selectedFish,
    selectedIsland,
    selectedWeather,
    selectedSeason,
    selectedTotem,
  });
  const cheapModel = calculateRodTotal({
    rod: cheaperRod,
    fishCount: 1,
    selectedFish,
    selectedIsland,
    selectedWeather,
    selectedSeason,
    selectedTotem,
  });

  const incrementalPerFish = expensiveModel.earningsPerFish - cheapModel.earningsPerFish;
  if (incrementalPerFish <= 0) return null;
  return Math.ceil(priceDiff / incrementalPerFish);
}

export function useCalculations({
  rodA,
  rodB,
  fishCount,
  selectedFish,
  selectedIsland,
  selectedWeather,
  selectedSeason,
  selectedTotem,
}) {
  return useMemo(() => {
    const totalA = calculateRodTotal({
      rod: rodA,
      fishCount,
      selectedFish,
      selectedIsland,
      selectedWeather,
      selectedSeason,
      selectedTotem,
    });
    const totalB = calculateRodTotal({
      rod: rodB,
      fishCount,
      selectedFish,
      selectedIsland,
      selectedWeather,
      selectedSeason,
      selectedTotem,
    });

    const sessionEarningsA = totalA.expectedCaught <= 0 ? 0 : totalA.earningsTotal;
    const sessionEarningsB = totalB.expectedCaught <= 0 ? 0 : totalB.earningsTotal;
    const firstSessionNetA = sessionEarningsA - asNumber(rodA?.price, 0);
    const firstSessionNetB = sessionEarningsB - asNumber(rodB?.price, 0);

    const efficiencyPercentDiff = calculateEfficiencyPercentDiff({
      rodA,
      rodB,
      selectedFish,
      selectedIsland,
      selectedWeather,
      selectedSeason,
      selectedTotem,
    });

    const moreExpensiveRod = asNumber(rodA?.price, 0) >= asNumber(rodB?.price, 0) ? rodA : rodB;
    const cheaperRod = moreExpensiveRod === rodA ? rodB : rodA;
    const paybackPeriodFish = calculatePaybackPeriod({
      expensiveRod: moreExpensiveRod,
      cheaperRod,
      selectedFish,
      selectedIsland,
      selectedWeather,
      selectedSeason,
      selectedTotem,
    });

    const sessionFish = Math.max(1, asNumber(fishCount));
    const max = Math.max(sessionEarningsA, sessionEarningsB, 1);

    return {
      totalA,
      totalB,
      netProfitA: sessionEarningsA,
      netProfitB: sessionEarningsB,
      firstSessionNetA,
      firstSessionNetB,
      profitDelta: sessionEarningsA - sessionEarningsB,
      efficiencyPercentDiff,
      paybackPeriodFish,
      moreExpensiveRod,
      cheaperRod,
      bars: {
        sessionFish,
        netSessionA: sessionEarningsA,
        netSessionB: sessionEarningsB,
        max,
      },
      expectedCatchA: totalA.expectedCaught,
      expectedCatchB: totalB.expectedCaught,
      catchChanceA: totalA.catchChance,
      catchChanceB: totalB.catchChance,
      mutationChanceA: totalA.mutationModel?.mutationChance,
      mutationChanceB: totalB.mutationModel?.mutationChance,
      mutationFactorA: totalA.mutationModel?.mutationFactor,
      mutationFactorB: totalB.mutationModel?.mutationFactor,
      rodBreakdownA: totalA.rodBonuses,
      rodBreakdownB: totalB.rodBonuses,
      rodValueMultiplierA: totalA.rodValueMultiplier,
      rodValueMultiplierB: totalB.rodValueMultiplier,
      contextMultipliers: {
        fish: fishMultiplier(selectedFish),
        island: islandMultiplier(selectedIsland),
        weather: weatherMultiplier(selectedWeather),
        season: seasonMultiplier(selectedSeason),
        totem: totemMultiplier(selectedTotem),
        match: matchBonus({ selectedFish, selectedIsland, selectedWeather, selectedSeason }),
      },
    };
  }, [
    rodA,
    rodB,
    fishCount,
    selectedFish,
    selectedIsland,
    selectedWeather,
    selectedSeason,
    selectedTotem,
  ]);
}

