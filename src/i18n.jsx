import { createContext, useContext, useMemo, useState } from "react";

const dictionaries = {
  en: {
    app: {
      title: "Fisch Rod Selector",
      subtitle: "Compare rods, mutations, and session profit in one place.",
      navCalculator: "Calculator",
      navMutations: "Mutation Search",
      navCountdowns: "Countdowns",
      mutationModel: "Mutation model",
      mutationModelDesc: "Auto by rod passive and internal probability",
      worldConditions: "World conditions",
      worldConditionsDesc: "Earnings react to dynamic fish mix, island, weather, season, and totem.",
      island: "Island",
      weather: "Weather",
      season: "Season",
      totem: "Totem",
      fishPoolModel: "Fish pool model",
      netProfitDelta: "Session earnings delta",
      rodAvsRodB: "Rod A vs Rod B",
      session: "Session",
      efficiencyDelta: "Efficiency Δ",
      language: "Language",
    },
    comparison: {
      liveCompare: "Live compare",
      title: "Rod comparison",
      subtitle: "Luck, speed, control, and net earnings for your current session size ({count} fish).",
      luck: "Luck",
      speed: "Speed",
      control: "Control",
      sessionPreview: "Session earnings preview",
      sessionPreviewDesc: "Gross expected earnings · same inputs as the calculator below",
      scaleMax: "Scale max",
      rodA: "Rod A",
      rodB: "Rod B",
      expectedCatches: "Expected catches",
      loc: "Loc",
      unique: "Unique",
      history: "History",
      final: "Final",
    },
    rodCard: {
      findRod: "Find rod",
      typeRodName: "Type rod name...",
      selectResult: "Select result",
      noRodsFound: "No rods found.",
      luck: "Luck",
      speed: "Speed",
      control: "Control",
      resilience: "Resilience",
      maxKg: "Max Kg",
      durability: "Durability",
      about: "About",
      preview: "Preview",
    },
    calculator: {
      badge: "Calculator",
      title: "Session inputs",
      subtitle: "Mutations are now simulated automatically by rod probability.",
      totalCatchSize: "Total catch size",
      usedAsTotalCatch: "Used as total catch attempts for expected-value calculation.",
      catchChance: "Catch chance",
      mut: "Mut",
      factor: "Factor",
      catchChanceDesc: "Based on rod control, speed, luck, and dynamic fish mix difficulty.",
      paybackWindow: "Payback window",
      pricierRod: "Pricier rod",
      baseline: "Baseline",
      fishToBreakEven: "Fish to break even",
      fishUnit: "fish",
      noGap: "No gap - already even",
      formula: "Formula",
      contextMultiplier: "Context multiplier",
      rodAvsRodB: "Rod A vs Rod B",
    },
    mutations: {
      badge: "Mutation Search",
      title: "Find mutation details",
      subtitle: "Search a mutation and see value multiplier, rods that can trigger it, and enchanting chance.",
      searchPlaceholder: "Search mutation name...",
      loading: "Loading mutations...",
      noMutations: "No mutations found.",
      selectHint: "Select a mutation to view details.",
      mutation: "Mutation",
      valueMultiplier: "Value multiplier",
      enchantingChance: "Enchanting chance",
      rodsCanFish: "Rods that can fish this mutation",
      noRodSources: "No rod source data available for this mutation yet.",
      enchantingSources: "Enchanting sources",
      noEnchantingSources: "No enchanting chance data available for this mutation yet.",
    },
    countdowns: {
      badge: "Live timers",
      title: "Apex & update countdowns",
      subtitle: "Track all Apex hunt cycle windows, weekly update reset, and seasonal rollover.",
      apexTitle: "Apex: {name}",
      cycleInterval: "Cycle interval: {hours}h",
      weeklyUpdate: "Weekly update",
      nextSaturday: "Next Saturday 15:30 UTC",
      seasonalRollover: "Seasonal rollover",
      nextSeason: "Next season: {season}",
      days: "Days",
      hours: "Hours",
      minutes: "Min",
      seconds: "Sec",
      spring: "Spring",
      summer: "Summer",
      autumn: "Autumn",
      winter: "Winter",
    },
    common: {
      loading: "Loading",
      skipToMain: "Skip to main content",
      dash: "-",
    },
  },
  zh: {
    app: {
      title: "Fisch 鱼竿比较器",
      subtitle: "一次比较鱼竿、突变与整场收益。",
      navCalculator: "计算器",
      navMutations: "突变查询",
      navCountdowns: "倒计时",
      mutationModel: "突变模型",
      mutationModelDesc: "根据鱼竿被动与内部概率自动计算",
      worldConditions: "世界条件",
      worldConditionsDesc: "收益会受动态鱼池、岛屿、天气、季节与图腾影响。",
      island: "岛屿",
      weather: "天气",
      season: "季节",
      totem: "图腾",
      fishPoolModel: "鱼池模型",
      netProfitDelta: "场次收益差",
      rodAvsRodB: "鱼竿 A 对比 鱼竿 B",
      session: "本场",
      efficiencyDelta: "效率差",
      language: "语言",
    },
    comparison: {
      liveCompare: "实时比较",
      title: "鱼竿比较",
      subtitle: "显示当前场次（{count} 鱼）下的幸运、速度、控制与收益。",
      luck: "幸运",
      speed: "速度",
      control: "控制",
      sessionPreview: "场次收益预览",
      sessionPreviewDesc: "总期望收益 · 与下方计算器相同条件",
      scaleMax: "比例上限",
      rodA: "鱼竿 A",
      rodB: "鱼竿 B",
      expectedCatches: "预计上钩数",
      loc: "地区",
      unique: "被动",
      history: "历史",
      final: "最终",
    },
    rodCard: {
      findRod: "搜索鱼竿",
      typeRodName: "输入鱼竿名称...",
      selectResult: "选择结果",
      noRodsFound: "找不到鱼竿。",
      luck: "幸运",
      speed: "速度",
      control: "控制",
      resilience: "韧性",
      maxKg: "最大 KG",
      durability: "耐久",
      about: "说明",
      preview: "预览",
    },
    calculator: {
      badge: "计算器",
      title: "场次输入",
      subtitle: "突变已由鱼竿概率自动模拟。",
      totalCatchSize: "总尝试次数",
      usedAsTotalCatch: "此数值作为期望值计算的总钓鱼次数。",
      catchChance: "上钩概率",
      mut: "突变",
      factor: "系数",
      catchChanceDesc: "根据鱼竿控制、速度、幸运与动态鱼池难度。",
      paybackWindow: "回本窗口",
      pricierRod: "较贵鱼竿",
      baseline: "基准鱼竿",
      fishToBreakEven: "回本所需鱼数",
      fishUnit: "鱼",
      noGap: "无价差 - 已等价",
      formula: "公式",
      contextMultiplier: "环境倍率",
      rodAvsRodB: "鱼竿 A 对比 鱼竿 B",
    },
    mutations: {
      badge: "突变查询",
      title: "查看突变详情",
      subtitle: "搜索突变，查看倍率、可触发鱼竿与附魔概率。",
      searchPlaceholder: "搜索突变名称...",
      loading: "加载突变数据中...",
      noMutations: "找不到突变。",
      selectHint: "请先选择一个突变。",
      mutation: "突变",
      valueMultiplier: "价值倍率",
      enchantingChance: "附魔概率",
      rodsCanFish: "可钓出此突变的鱼竿",
      noRodSources: "此突变目前没有鱼竿来源数据。",
      enchantingSources: "附魔来源",
      noEnchantingSources: "此突变目前没有附魔概率数据。",
    },
    countdowns: {
      badge: "实时倒计时",
      title: "Apex 与更新倒计时",
      subtitle: "显示所有 Apex 循环、每周更新与季节轮替倒计时。",
      apexTitle: "Apex：{name}",
      cycleInterval: "循环间隔：{hours} 小时",
      weeklyUpdate: "每周更新",
      nextSaturday: "下次周六 15:30（UTC）",
      seasonalRollover: "季节轮替",
      nextSeason: "下一季：{season}",
      days: "天",
      hours: "时",
      minutes: "分",
      seconds: "秒",
      spring: "春季",
      summer: "夏季",
      autumn: "秋季",
      winter: "冬季",
    },
    common: {
      loading: "加载中",
      skipToMain: "跳到主要内容",
      dash: "-",
    },
  },
};

const LanguageContext = createContext(null);

function resolvePath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
}

function template(str, params) {
  if (!params) return str;
  return String(str).replace(/\{(\w+)\}/g, (_, key) => (params[key] != null ? String(params[key]) : `{${key}}`));
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem("fisch_lang");
      return saved === "zh" ? "zh" : "en";
    } catch {
      return "en";
    }
  });

  const value = useMemo(() => {
    const t = (key, params) => {
      const localized = resolvePath(dictionaries[lang], key);
      if (localized != null) return template(localized, params);
      const fallback = resolvePath(dictionaries.en, key);
      return template(fallback ?? key, params);
    };
    const setLanguage = (next) => {
      const valid = next === "zh" ? "zh" : "en";
      setLang(valid);
      try {
        localStorage.setItem("fisch_lang", valid);
      } catch {
        // ignore storage failures
      }
    };
    return { lang, setLanguage, t };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used inside LanguageProvider");
  return ctx;
}

