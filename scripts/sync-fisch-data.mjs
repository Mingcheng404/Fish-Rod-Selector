import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WIKI_API = "https://fischipedia.org/w/api.php";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const dataPath = path.join(projectRoot, "public", "data.json");
const mutationsPath = path.join(projectRoot, "public", "mutations.json");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function titleLooksLikeRealItem(title) {
  if (!title) return false;
  if (title.includes(":")) return false;
  const blacklist = ["Main Page", "Fisch Wiki", "Template", "Category", "File", "User", "Talk"];
  return !blacklist.some((x) => title.includes(x));
}

async function fetchCategoryMembers(categoryName) {
  const out = [];
  let cmcontinue = undefined;
  for (let i = 0; i < 12; i += 1) {
    const params = new URLSearchParams({
      action: "query",
      list: "categorymembers",
      cmtitle: `Category:${categoryName}`,
      cmlimit: "500",
      cmtype: "page",
      format: "json",
      origin: "*",
    });
    if (cmcontinue) params.set("cmcontinue", cmcontinue);
    const res = await fetch(`${WIKI_API}?${params.toString()}`);
    if (!res.ok) throw new Error(`Category request failed: ${categoryName}`);
    const json = await res.json();
    const members = Array.isArray(json?.query?.categorymembers) ? json.query.categorymembers : [];
    out.push(...members.map((m) => m.title).filter(titleLooksLikeRealItem));
    cmcontinue = json?.continue?.cmcontinue;
    if (!cmcontinue) break;
  }
  return [...new Set(out)];
}

async function getBestCategory(candidates) {
  let best = [];
  for (const category of candidates) {
    try {
      const rows = await fetchCategoryMembers(category);
      if (rows.length > best.length) best = rows;
    } catch {
      // Try the next category alias.
    }
  }
  return best;
}

async function fetchPageWikitext(title) {
  const params = new URLSearchParams({
    action: "parse",
    page: title,
    prop: "wikitext",
    format: "json",
    origin: "*",
  });
  const res = await fetch(`${WIKI_API}?${params.toString()}`);
  if (!res.ok) return "";
  const json = await res.json();
  return json?.parse?.wikitext?.["*"] || "";
}

async function fetchPageRaw(title) {
  const normalized = String(title || "").trim().replace(/\s+/g, "_");
  if (!normalized) return "";
  const url = `https://fischipedia.org/wiki/${encodeURIComponent(normalized)}?action=raw`;
  const res = await fetch(url);
  if (!res.ok) return "";
  return await res.text();
}

async function fetchPageExtract(title) {
  const params = new URLSearchParams({
    action: "query",
    prop: "extracts",
    explaintext: "1",
    redirects: "1",
    titles: title,
    format: "json",
    origin: "*",
  });
  const res = await fetch(`${WIKI_API}?${params.toString()}`);
  if (!res.ok) return "";
  const json = await res.json();
  const pages = json?.query?.pages || {};
  const first = Object.values(pages)[0];
  return first?.extract || "";
}

function parseMutationMultiplierFromWikitext(wikitext) {
  if (!wikitext) return null;
  const patterns = [
    /\|\s*value[_ ]?multiplier\s*=\s*([0-9]+(?:\.[0-9]+)?)\s*x?/i,
    /\|\s*value\s*multiplier\s*=\s*([0-9]+(?:\.[0-9]+)?)\s*x?/i,
    /value\s*multiplier[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*x?/i,
    /\|\s*multiplier\s*=\s*([0-9]+(?:\.[0-9]+)?)\s*x?/i,
  ];
  for (const re of patterns) {
    const m = wikitext.match(re);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n < 100) return n;
  }
  return null;
}

function parseMutationRarityFromWikitext(wikitext) {
  if (!wikitext) return null;
  const m = wikitext.match(/\|\s*rarity(?:[_ ]?tier)?\s*=\s*([^\n|]+)/i);
  if (!m) return null;
  return String(m[1] || "").replace(/\[\[|\]\]/g, "").trim() || null;
}

function parseMutationMultiplierFromExtract(extract) {
  if (!extract) return null;
  const patterns = [
    /sell value by\s*([0-9]+(?:\.[0-9]+)?)\s*[x×]/i,
    /multipl(?:y|ies)[^0-9]{0,40}([0-9]+(?:\.[0-9]+)?)\s*[x×]/i,
    /value multiplier[^0-9]{0,20}([0-9]+(?:\.[0-9]+)?)\s*[x×]/i,
  ];
  for (const re of patterns) {
    const m = extract.match(re);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n < 100) return n;
  }
  return null;
}

function parseRodSourcesFromExtract(extract) {
  const text = String(extract || "");
  const out = [];
  const re = /([A-Z][A-Za-z0-9'’\- ]*Rod[A-Za-z0-9'’\- ]*)([^.\n]{0,120})\s+at a?\s*([0-9]+(?:\.[0-9]+)?)%\s*chance/gi;
  let m;
  while ((m = re.exec(text))) {
    const rod = String(m[1] || "").replace(/\s+/g, " ").trim();
    const chancePercent = Number(m[3]);
    if (!rod || !Number.isFinite(chancePercent)) continue;
    out.push({
      rod,
      chance_percent: chancePercent,
      note: String(m[2] || "").replace(/\s+/g, " ").trim(),
    });
  }
  const seen = new Set();
  return out.filter((x) => {
    const key = `${x.rod.toLowerCase()}|${x.chance_percent}|${(x.note || "").toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseEnchantingSourcesFromExtract(extract) {
  const text = String(extract || "");
  const out = [];
  const re = /([A-Z][A-Za-z0-9'’\- ]*Enchantment)\s+at a?\s*([0-9]+(?:\.[0-9]+)?)%\s*chance/gi;
  let m;
  while ((m = re.exec(text))) {
    const enchantment = String(m[1] || "").trim();
    const chancePercent = Number(m[2]);
    if (!enchantment || !Number.isFinite(chancePercent)) continue;
    out.push({ enchantment, chance_percent: chancePercent });
  }
  const seen = new Set();
  return out.filter((x) => {
    const key = `${x.enchantment.toLowerCase()}|${x.chance_percent}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractInfobox(raw, boxName) {
  const start = raw.indexOf(`{{${boxName}`);
  if (start < 0) return "";
  let depth = 0;
  let out = "";
  for (let i = start; i < raw.length; i += 1) {
    const pair = raw.slice(i, i + 2);
    if (pair === "{{") {
      depth += 1;
      out += pair;
      i += 1;
      continue;
    }
    if (pair === "}}") {
      depth -= 1;
      out += pair;
      i += 1;
      if (depth === 0) break;
      continue;
    }
    out += raw[i];
  }
  return out;
}

function parseInfoboxField(infobox, key) {
  if (!infobox) return null;
  const re = new RegExp(
    `\\|\\s*${key}\\s*=\\s*([\\s\\S]*?)(?=\\n\\s*\\|\\s*[a-z0-9_]+\\s*=|\\n\\s*\\}\\}|$)`,
    "i"
  );
  const m = infobox.match(re);
  return m ? m[1].trim() : null;
}

function parseNumberLoose(value) {
  if (!value) return null;
  const m = String(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function parseMaxWeightLoose(value) {
  if (!value) return null;
  const str = String(value).trim().toLowerCase();
  if (str === "inf" || str === "infinite" || str === "infinity") return Number.POSITIVE_INFINITY;
  return parseNumberLoose(str);
}

function parsePassiveBonuses(passive) {
  const text = String(passive || "")
    .replace(/'''/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\{\{[^}]+\}\}/g, " ")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  let valueBonus = 0;
  let catchBonus = 0;

  const mutationChance = [...text.matchAll(/(\d+(?:\.\d+)?)%\s*chance[^()]*\((\d+(?:\.\d+)?)\s*[x×]\)/gi)];
  for (const hit of mutationChance) {
    const chance = Number(hit[1]) / 100;
    const mult = Number(hit[2]);
    if (Number.isFinite(chance) && Number.isFinite(mult) && mult > 1) {
      valueBonus += chance * (mult - 1);
    }
  }

  const progressHits = [...text.matchAll(/([+\-]?\d+(?:\.\d+)?)%\s*(?:Forced\s*)?Progress Speed/gi)];
  for (const hit of progressHits) {
    const pct = Number(hit[1]);
    if (Number.isFinite(pct)) {
      catchBonus += pct / 100 * 0.12;
    }
  }

  const shinyHits = [...text.matchAll(/([+\-]?\d+(?:\.\d+)?)%\s*chance[^.\n]*(Shiny|Sparkling)/gi)];
  for (const hit of shinyHits) {
    const pct = Number(hit[1]);
    if (Number.isFinite(pct)) valueBonus += pct / 100 * 0.12;
  }

  return {
    valueBonus: Number(valueBonus.toFixed(4)),
    catchBonus: Number(catchBonus.toFixed(4)),
  };
}

function applyRodInfoboxStats(rod, raw) {
  const infobox = extractInfobox(raw, "RodInfobox");
  if (!infobox) return { updated: false };

  const price = parseNumberLoose(parseInfoboxField(infobox, "price"));
  const lure = parseNumberLoose(parseInfoboxField(infobox, "lure"));
  const luck = parseNumberLoose(parseInfoboxField(infobox, "luck"));
  const control = parseNumberLoose(parseInfoboxField(infobox, "control"));
  const resilience = parseNumberLoose(parseInfoboxField(infobox, "resilience"));
  const maxWeight = parseMaxWeightLoose(parseInfoboxField(infobox, "max_weight"));
  const durability = parseNumberLoose(parseInfoboxField(infobox, "durability"));
  const passive = parseInfoboxField(infobox, "passive");

  let changed = false;
  if (Number.isFinite(price) && price >= 0 && rod.price !== price) {
    rod.price = Math.round(price);
    changed = true;
  }
  if (Number.isFinite(lure)) {
    const lureSpeed = Number((1 + lure / 100).toFixed(2));
    if (rod.lure_speed_modifier !== lureSpeed) {
      rod.lure_speed_modifier = lureSpeed;
      changed = true;
    }
  }
  if (Number.isFinite(luck)) {
    const luckMultiplier = Number((1 + luck / 100).toFixed(2));
    if (rod.luck_multiplier !== luckMultiplier) {
      rod.luck_multiplier = luckMultiplier;
      changed = true;
    }
  }
  if (Number.isFinite(control) && rod.control_rating !== Number(control.toFixed(2))) {
    rod.control_rating = Number(control.toFixed(2));
    changed = true;
  }
  if (Number.isFinite(resilience)) {
    const normalizedResilience = Number((resilience / 100).toFixed(2));
    if (rod.resilience_rating !== normalizedResilience) {
      rod.resilience_rating = normalizedResilience;
      changed = true;
    }
  }
  if (maxWeight === Number.POSITIVE_INFINITY) {
    if (rod.max_kg !== null) {
      rod.max_kg = null;
      changed = true;
    }
  } else if (Number.isFinite(maxWeight)) {
    const nextMax = Math.max(0, Math.round(maxWeight));
    if (rod.max_kg !== nextMax) {
      rod.max_kg = nextMax;
      changed = true;
    }
  }
  if (Number.isFinite(durability)) {
    const nextDurability = Math.max(0, Math.round(durability));
    if (rod.durability !== nextDurability) {
      rod.durability = nextDurability;
      changed = true;
    }
  }
  if (passive) {
    const bonuses = parsePassiveBonuses(passive);
    const nextUnique = {
      value_bonus: bonuses.valueBonus,
      catch_bonus: bonuses.catchBonus,
    };
    if (
      rod.unique_effects?.value_bonus !== nextUnique.value_bonus ||
      rod.unique_effects?.catch_bonus !== nextUnique.catch_bonus
    ) {
      rod.unique_effects = nextUnique;
      changed = true;
    }
  }

  return { updated: changed };
}

async function enrichRodsFromWiki(rods) {
  const out = Array.isArray(rods) ? [...rods] : [];
  let updated = 0;
  const concurrency = 6;
  for (let i = 0; i < out.length; i += concurrency) {
    const chunk = out.slice(i, i + concurrency);
    const raws = await Promise.all(
      chunk.map(async (rod) => {
        const titleA = rod.name;
        const titleB = rod.name?.replace(/\s+/g, "_");
        const [rawA, rawB] = await Promise.all([fetchPageRaw(titleA), fetchPageRaw(titleB)]);
        return rawA || rawB || "";
      })
    );
    chunk.forEach((rod, idx) => {
      const result = applyRodInfoboxStats(rod, raws[idx]);
      if (result.updated) updated += 1;
    });
    await sleep(80);
  }
  return { rods: out, updated };
}

function canonicalMutationName(raw) {
  return String(raw || "")
    .replace(/\s*\(mutation\)\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidMutationName(name) {
  const n = canonicalMutationName(name);
  if (!n || n.length < 3) return false;
  if (!/[a-z]/i.test(n)) return false;
  if (/^\d+$/.test(n)) return false;
  return true;
}

function normalizeMutations(records) {
  const out = [];
  const seen = new Set();
  for (const rec of Array.isArray(records) ? records : []) {
    const name = canonicalMutationName(rec?.name);
    if (!isValidMutationName(name)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...rec, name });
  }
  return out;
}

async function enrichMutationsFromWiki(mutations) {
  const out = normalizeMutations(mutations);
  let updated = 0;
  const concurrency = 8;
  for (let i = 0; i < out.length; i += concurrency) {
    const chunk = out.slice(i, i + concurrency);
    const pageData = await Promise.all(
      chunk.map(async (m) => {
        const titles = [m.name, `${m.name} (Mutation)`];
        try {
          const [w1, e1, w2, e2] = await Promise.all([
            fetchPageWikitext(titles[0]),
            fetchPageExtract(titles[0]),
            fetchPageWikitext(titles[1]),
            fetchPageExtract(titles[1]),
          ]);
          return { w1, e1, w2, e2 };
        } catch {
          return { w1: "", e1: "", w2: "", e2: "" };
        }
      })
    );
    chunk.forEach((m, idx) => {
      const { w1, e1, w2, e2 } = pageData[idx];
      const mergedExtract = `${e1 || ""}\n${e2 || ""}`.trim();
      const parsedMultiplier =
        parseMutationMultiplierFromWikitext(w1) ||
        parseMutationMultiplierFromWikitext(w2) ||
        parseMutationMultiplierFromExtract(e1) ||
        parseMutationMultiplierFromExtract(e2);
      const parsedRarity = parseMutationRarityFromWikitext(w1) || parseMutationRarityFromWikitext(w2);
      const parsedRodSources = parseRodSourcesFromExtract(mergedExtract);
      const parsedEnchanting = parseEnchantingSourcesFromExtract(mergedExtract);
      const target = out[i + idx];
      let changed = false;
      if (parsedMultiplier && Number(target.value_multiplier) !== parsedMultiplier) {
        target.value_multiplier = parsedMultiplier;
        changed = true;
      }
      if (parsedRarity && parsedRarity !== target.rarity_tier) {
        target.rarity_tier = parsedRarity;
        changed = true;
      }
      if (parsedRodSources.length > 0) {
        target.rod_sources = parsedRodSources;
        changed = true;
      }
      if (parsedEnchanting.length > 0) {
        target.enchanting_sources = parsedEnchanting;
        target.enchanting_percent = Math.max(...parsedEnchanting.map((s) => s.chance_percent));
        changed = true;
      }
      if (changed) updated += 1;
    });
  }
  return { mutations: out, updated };
}

function mergeByName(existing, incoming, toRecord) {
  const out = [...existing];
  const existingKey = new Set(existing.map((x) => (x.name || "").toLowerCase()));
  for (const name of incoming) {
    const key = String(name || "").toLowerCase();
    if (!key || existingKey.has(key)) continue;
    out.push(toRecord(name));
    existingKey.add(key);
  }
  return out;
}

function defaultRod(name, idx) {
  const tier = Math.min(8, idx);
  return {
    id: slugify(name),
    name,
    price: 900 + tier * 850,
    luck_multiplier: Number((1.02 + tier * 0.04).toFixed(2)),
    control_rating: Number((0.92 - tier * 0.02).toFixed(2)),
    resilience_rating: Number((0.15 + tier * 0.04).toFixed(2)),
    lure_speed_modifier: Number((0.95 + tier * 0.04).toFixed(2)),
    max_kg: 500 + tier * 250,
    durability: 100,
    description: "Imported from Official Fisch Wiki category data.",
  };
}

function defaultFish(name, idx) {
  const tier = Math.min(10, idx);
  return {
    id: slugify(name),
    name,
    base_value: 120 + tier * 120,
    value_multiplier: Number((1 + tier * 0.05).toFixed(2)),
    preferred_weather: ["clear"],
    preferred_seasons: ["spring"],
    best_islands: ["moosewood"],
  };
}

function defaultMutation(name, idx) {
  const tier = Math.min(8, idx);
  const value = Number((1.03 + tier * 0.02).toFixed(2));
  return {
    name,
    value_multiplier: value,
    rarity_tier: value >= 1.18 ? "Legendary" : value >= 1.12 ? "Mythic" : "Rare",
    visual_effect: "wiki-import",
  };
}

function defaultIsland(name, idx) {
  return {
    id: slugify(name),
    name,
    earnings_multiplier: Number((1 + Math.min(0.15, idx * 0.01)).toFixed(2)),
  };
}

function estimateTotemMultiplier(effectText) {
  const t = String(effectText || "").toLowerCase();
  if (!t) return 1;
  if (t.includes("mutation surge")) return 1.22;
  if (t.includes("shiny surge") || t.includes("luminous")) return 1.2;
  if (t.includes("aurora")) return 1.15;
  if (t.includes("blue moon") || t.includes("eclipse") || t.includes("frost moon")) return 1.13;
  if (t.includes("zeus storm") || t.includes("poseidon wrath") || t.includes("cursed storm")) return 1.16;
  if (t.includes("blizzard") || t.includes("avalanche") || t.includes("fog") || t.includes("wind")) return 1.08;
  if (t.includes("rainbow") || t.includes("starfall") || t.includes("meteor")) return 1.1;
  if (t.includes("hunt")) return 1.09;
  if (t.includes("clear") || t.includes("daylight cycle")) return 1.03;
  return 1.05;
}

function extractTotemsFromItemsRaw(raw) {
  const lines = String(raw || "").split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const idLine = lines[i];
    const rowLine = lines[i + 1] || "";
    const idMatch = idLine.match(/^\|-\s*id="([^"]+)"/);
    if (!idMatch) continue;
    if (!rowLine.includes("{{Item|")) continue;
    const nameMatch = rowLine.match(/\{\{Item\|([^|}]+)/);
    const name = String(nameMatch?.[1] || idMatch[1] || "").trim();
    if (!name.toLowerCase().includes("totem")) continue;

    const parts = rowLine.split("||").map((x) => x.trim());
    const effect = parts[3] || "";
    const totem = {
      id: slugify(name.replace(/\s+totem$/i, "_totem")),
      name,
      effect,
      earnings_multiplier: estimateTotemMultiplier(effect),
    };
    out.push(totem);
  }

  const seen = new Set();
  return out.filter((t) => {
    if (!t.id || seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

async function run() {
  const rawData = await fs.readFile(dataPath, "utf8");
  const rawMutations = await fs.readFile(mutationsPath, "utf8");
  const data = JSON.parse(rawData);
  const mutationDoc = JSON.parse(rawMutations);

  const [rodTitles, fishTitles, mutationTitles, islandTitles] = await Promise.all([
    getBestCategory(["Fishing Rods", "Rods", "Fishing_Rods"]),
    getBestCategory(["Fish", "Fishes"]),
    getBestCategory(["Mutations", "Fish Mutations"]),
    getBestCategory(["Locations", "Islands"]),
  ]);
  const itemsRaw = await fetchPageRaw("Items");
  const wikiTotems = extractTotemsFromItemsRaw(itemsRaw);

  data.rods = mergeByName(data.rods || [], rodTitles, (name) => defaultRod(name, (data.rods || []).length));
  data.fish = mergeByName(data.fish || [], fishTitles, (name) => defaultFish(name, (data.fish || []).length));
  data.islands = mergeByName(
    data.islands || [],
    islandTitles,
    (name) => defaultIsland(name, (data.islands || []).length)
  );
  data.mutations = mergeByName(
    normalizeMutations(data.mutations || []),
    mutationTitles.map(canonicalMutationName).filter(isValidMutationName),
    (name) => defaultMutation(canonicalMutationName(name), (data.mutations || []).length)
  );
  const enrichedRods = await enrichRodsFromWiki(data.rods);
  data.rods = enrichedRods.rods;
  const enrichedMutations = await enrichMutationsFromWiki(data.mutations);
  data.mutations = enrichedMutations.mutations;
  data.totems = wikiTotems.length
    ? wikiTotems
    : [{ id: "none", name: "No Totem", effect: "No special event", earnings_multiplier: 1 }];

  mutationDoc.mutations = [...(data.mutations || [])];
  data.source_sync = {
    provider: "Official Fisch Wiki",
    synced_at: new Date().toISOString(),
    imported_counts: {
      rods: rodTitles.length,
      fish: fishTitles.length,
      mutations: mutationTitles.length,
      islands: islandTitles.length,
    },
    rod_pages_updated: enrichedRods.updated,
    mutation_pages_updated: enrichedMutations.updated,
  };

  await fs.writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await fs.writeFile(mutationsPath, `${JSON.stringify(mutationDoc, null, 2)}\n`, "utf8");

  console.log("Sync complete.");
  console.log(data.source_sync);
}

run().catch((err) => {
  console.error("Failed to sync wiki data:", err.message);
  process.exit(1);
});
