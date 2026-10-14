// application.service — Brand / OS strict filter shared by chatbot paths.
// Fixes: "huawei" must only return Huawei, "iphone" only iPhone, "android" only Android, etc.
// Retrieval uses OR keywords, so without this post-filter non-brand rows leak into top-5.

export type BrandRule = {
  id: string;
  label: string;
  family: string;
  triggers: string[];
  matchTerms: string[];
  broad?: boolean;
};

export const BRAND_RULES: BrandRule[] = [
  { id: "huawei", label: "Huawei", family: "huawei", triggers: ["huawei"], matchTerms: ["huawei"], broad: true },
  { id: "pura", label: "Huawei Pura", family: "huawei", triggers: ["pura"], matchTerms: ["pura"] },
  { id: "matepad", label: "Huawei MatePad", family: "huawei", triggers: ["matepad", "mate pad"], matchTerms: ["matepad"] },
  { id: "nova", label: "Nova", family: "huawei", triggers: ["nova 12", "nova12"], matchTerms: ["nova"] },

  { id: "iphone", label: "iPhone", family: "apple", triggers: ["iphone"], matchTerms: ["iphone"] },
  { id: "ipad", label: "iPad", family: "apple", triggers: ["ipad"], matchTerms: ["ipad"] },
  { id: "airpods", label: "AirPods", family: "apple", triggers: ["airpods", "air pods", "airpod"], matchTerms: ["airpods"] },
  { id: "apple", label: "Apple", family: "apple", triggers: ["apple", "ios"], matchTerms: ["iphone", "ipad", "airpods", "apple"], broad: true },

  { id: "samsung", label: "Samsung", family: "samsung", triggers: ["samsung"], matchTerms: ["samsung", "galaxy"], broad: true },
  { id: "galaxy", label: "Samsung Galaxy", family: "samsung", triggers: ["galaxy"], matchTerms: ["galaxy"] },

  { id: "google", label: "Google", family: "google", triggers: ["google"], matchTerms: ["google", "pixel"], broad: true },
  { id: "pixel", label: "Google Pixel", family: "google", triggers: ["pixel"], matchTerms: ["pixel"] },

  { id: "dji", label: "DJI", family: "dji", triggers: ["dji"], matchTerms: ["dji"], broad: true },
  { id: "drone", label: "Drone", family: "dji", triggers: ["drone", "flycam", "mavic", "avata"], matchTerms: ["dji", "drone", "mavic", "avata", "flycam"] },

  { id: "nitro", label: "Nitro", family: "acer", triggers: ["nitro"], matchTerms: ["nitro"] },
  { id: "acer", label: "Acer", family: "acer", triggers: ["acer"], matchTerms: ["acer", "nitro"], broad: true },

  // Brands the shop does NOT carry: detecting them prevents the popular-fallback
  // from leaking unrelated products; callers return empty + honest "shop không có".
  { id: "xiaomi", label: "Xiaomi", family: "xiaomi", triggers: ["xiaomi", "redmi", "poco"], matchTerms: ["xiaomi", "redmi", "poco"] },
  { id: "oppo", label: "Oppo", family: "oppo", triggers: ["oppo"], matchTerms: ["oppo"] },
  { id: "vivo", label: "Vivo", family: "vivo", triggers: ["vivo"], matchTerms: ["vivo"] },
  { id: "realme", label: "Realme", family: "realme", triggers: ["realme"], matchTerms: ["realme"] },
  { id: "oneplus", label: "OnePlus", family: "oneplus", triggers: ["oneplus", "one plus"], matchTerms: ["oneplus"] },
  { id: "nokia", label: "Nokia", family: "nokia", triggers: ["nokia"], matchTerms: ["nokia"] },
  { id: "sony", label: "Sony", family: "sony", triggers: ["sony", "xperia"], matchTerms: ["sony", "xperia"] },
  { id: "asus", label: "Asus", family: "asus", triggers: ["asus"], matchTerms: ["asus"] },
  { id: "dell", label: "Dell", family: "dell", triggers: ["dell"], matchTerms: ["dell"] },
  { id: "lenovo", label: "Lenovo", family: "lenovo", triggers: ["lenovo", "thinkpad"], matchTerms: ["lenovo", "thinkpad"] },
  { id: "hp", label: "HP", family: "hp", triggers: ["hp", "hewlett", "pavilion", "omen", "victus"], matchTerms: ["hewlett", "pavilion", "omen", "victus"] },
  { id: "lg", label: "LG", family: "lg", triggers: [" lg "], matchTerms: [" lg "] },
];

export const ANDROID_TRIGGERS = ["android", "androi"];
export const IOS_TRIGGERS = ["ios", "iphone os"];

const norm = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
const clean = (t: string) =>
  norm(t)
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function padded(text: string): string {
  return ` ${clean(text)} `;
}

// Detect all brand rules mentioned in the text. Longest triggers first so
// "mate pad" wins over short fragments. Returns de-duplicated rules with
// broad family rules dropped when a specific one is present
// ("apple iphone" -> iphone only, not every Apple accessory).
export function detectBrandRules(text: string): BrandRule[] {
  const p = padded(text);
  const hit: BrandRule[] = [];
  const sorted = [...BRAND_RULES].sort((a, b) => {
    const am = Math.max(...a.triggers.map((t) => t.length));
    const bm = Math.max(...b.triggers.map((t) => t.length));
    return bm - am;
  });
  for (const rule of sorted) {
    for (const trig of rule.triggers) {
      const t = trig.trim();
      if (!t) continue;
      // Short triggers ("hp", "lg") need word boundaries; longer ones match as phrases.
      const needle = t.length <= 3 ? ` ${t} ` : ` ${t} `;
      if (t.length <= 3 ? p.includes(needle) : p.includes(needle) || p.includes(` ${t}`)) {
        if (!hit.some((h) => h.id === rule.id)) hit.push(rule);
        break;
      }
    }
  }
  // Same family: keep specifics, drop broad ("apple" when "iphone" present).
  const byFamily = new Map<string, BrandRule[]>();
  for (const r of hit) {
    if (!byFamily.has(r.family)) byFamily.set(r.family, []);
    byFamily.get(r.family)!.push(r);
  }
  const out: BrandRule[] = [];
  for (const group of Array.from(byFamily.values())) {
    if (group.length > 1) {
      const specifics = group.filter((r: BrandRule) => !r.broad);
      out.push(...(specifics.length ? specifics : group));
    } else {
      out.push(...group);
    }
  }
  return out;
}

// --- Model numbers ("iphone 16" must only return iPhone 16, not 15/14) --------

// Words that are NOT model qualifiers after a digit: storage/RAM/battery/camera
// specs and price/quantity context. Without this, "iphone 16" would treat
// "128gb" as a qualifier and "16 128gb" matching iPhone 15 128GB as a hit.
const SPEC_WORDS = new Set([
  "gb", "tb", "mb", "ram", "rom", "mah", "mp", "hz", "inch", "w",
  "chiec", "cai", "chiếc", "cái", "trieu", "tr", "k", "nghin", "ngan", "ty", "tỷ", "dong", "d"
]);
const QTY_WORDS = new Set([
  "chiec", "cai", "chiếc", "cái", "sp", "items", "item", "pcs", "pc", "units", "unit", "x",
  "mot", "hai", "ba", "bon", "nam", "sau", "bay", "tam", "chin", "muoi", "one", "two", "three", "four", "five"
]);
// Model-line qualifiers that extend a model token: "16 pro max", "s24 ultra",
// "z fold 6", "tab s9 fe", "watch 6 classic". Both plain words and
// digit-words (pro-MAX is plain, "6" in "z fold 6" is a digit word).
const MODEL_QUALIFIERS = new Set([
  "pro", "max", "plus", "ultra", "mini", "fe", "lite", "note", "fold", "flip",
  "air", "s", "e", "a", "c", "r", "x", "z", "gt", "se", "classic"
]);
const HAS_DIGIT = /\d/;

// Extract specific model tokens from the user text, e.g. "iphone 16" -> ["16"],
// "s24 ultra" -> ["s24", "ultra"], "z fold 6" -> ["fold", "6"]. Rules:
// - a digit-bearing token always starts a model ("16", "s24", "12/256gb"->"12","256gb").
// - a digit token may JOIN the previous model when glued to it in the raw text
//   ("z fold 6", "12/256gb", "16/512gb"): the raw separator between the two
//   tokens is not whitespace ("/", "-", ...).
// - a qualifier AFTER a digit ("16 pro max", "watch 6 classic") joins the same model.
// - tokens inside price ("duoi 20 trieu") / quantity ("2 chiec") contexts are skipped.
// - pure numbers < 10 with no digit-glued/qualifier context are skipped
//   ("top 5", "2 chiec") — model numbers that matter here are >= 10 or digit-glued.
export function detectModel(text: string): string[] {
  // Tokenize keeping the raw separator between tokens: "12/256gb" splits into
  // ["12", "256gb"] glued by "/", "z fold 6" splits by spaces.
  const scan = norm(text).replace(/[^a-z0-9\s/.-]+/g, " ");
  const toks: string[] = [];
  const seps: string[] = [];
  const re = /[a-z0-9]+/g;
  let m: RegExpExecArray | null;
  let lastEnd = 0;
  while ((m = re.exec(scan)) !== null) {
    toks.push(m[0]);
    seps.push(scan.slice(lastEnd, m.index));
    lastEnd = m.index + m[0].length;
  }
  const glued = (i: number) => i > 0 && !/[\s]/.test(seps[i] || " ");
  const out: string[] = [];
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i];
    if (!HAS_DIGIT.test(w)) continue;
    if (SPEC_WORDS.has(w) || QTY_WORDS.has(w)) continue;
    const next = i + 1 < toks.length ? toks[i + 1] : "";
    // Skip price context ("duoi 20 trieu", "tren 500k": digit followed by a unit).
    if (SPEC_WORDS.has(next)) continue;
    // Skip quantity context ("2 chiec", "mua 2 cai").
    if (QTY_WORDS.has(next)) continue;
    const prev = i > 0 ? toks[i - 1] : "";
    const prevIsDigit = prev !== "" && HAS_DIGIT.test(prev);
    if (prevIsDigit && glued(i) && out.length) {
      // "12/256gb": storage tail of the same model — extend, don't add.
      out[out.length - 1] = `${out[out.length - 1]} ${w}`;
      continue;
    }
    if (/^\d+$/.test(w) && Number(w) < 10) {
      // Bare small number: a model only when it extends a preceding model
      // word ("z fold 6", "watch 6 classic", "tab s9" handled via s9).
      const prevWord = prev !== "" && !HAS_DIGIT.test(prev) ? prev : "";
      if (!(prevWord !== "" && (MODEL_QUALIFIERS.has(prevWord) || prevWord === "fold" || prevWord === "watch" || prevWord === "tab"))) {
        continue;
      }
      const chain = prevWord === "fold" || prevWord === "watch" || prevWord === "tab" ? `${prevWord} ${w}` : w;
      out.push(chain);
      // Absorb trailing qualifiers ("watch 6 classic", "z fold 6" has none).
      let j = i + 1;
      while (j < toks.length && MODEL_QUALIFIERS.has(toks[j]) && !HAS_DIGIT.test(toks[j]) && !SPEC_WORDS.has(toks[j])) {
        out[out.length - 1] = `${out[out.length - 1]} ${toks[j]}`;
        j++;
      }
      i = j - 1;
      continue;
    }
    out.push(w);
    // Absorb a following qualifier chain ("16 pro max", "watch 6 classic"):
    // plain qualifiers and digit qualifiers glued or spaced after the digit.
    let j = i + 1;
    while (j < toks.length && MODEL_QUALIFIERS.has(toks[j]) && !SPEC_WORDS.has(toks[j])) {
      out[out.length - 1] = `${out[out.length - 1]} ${toks[j]}`;
      if (HAS_DIGIT.test(toks[j])) {
        // A digit qualifier ("fold 6") swallows ITS trailing qualifiers too
        // ("watch 6 classic": after "6" comes "classic").
        let k = j + 1;
        while (k < toks.length && MODEL_QUALIFIERS.has(toks[k]) && !HAS_DIGIT.test(toks[k])) {
          out[out.length - 1] = `${out[out.length - 1]} ${toks[k]}`;
          k++;
        }
        j = k;
        break;
      }
      j++;
    }
    i = j - 1;
  }
  // "z fold 6": the digit came after a qualifier — merge backwards.
  const merged: string[] = [];
  for (const m of out) {
    const first = m.split(" ")[0];
    if (
      /^\d+$/.test(first) &&
      merged.length &&
      MODEL_QUALIFIERS.has(merged[merged.length - 1].split(" ").slice(-1)[0])
    ) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${m}`;
    } else {
      merged.push(m);
    }
  }
  return Array.from(new Set(merged));
}

export type OSFilter = "android" | "ios" | null;

// android vs ios are mutually exclusive unless the user compares them
// ("android hay ios") -> no OS restriction, both allowed.
export function detectOS(text: string): OSFilter {
  const p = padded(text);
  const hasAndroid = ANDROID_TRIGGERS.some((t) => p.includes(` ${t} `) || p.includes(` ${t}`));
  // "ios" is short: require word boundary so "xiaomi" etc can't trigger it.
  const hasIOS =
    /(^|\s)ios(\s|$)/.test(p) || p.includes(" iphone os ") || IOS_TRIGGERS.slice(1).some((t) => p.includes(` ${t} `));
  if (hasAndroid && hasIOS) return null;
  if (hasAndroid) return "android";
  if (hasIOS) return "ios";
  return null;
}

type ProductLike = { name: string; category: string; description: string };

const hayOf = (p: ProductLike) => ` ${clean(`${p.name} ${p.category} ${p.description}`)} `;

function hayContains(hay: string, term: string): boolean {
  const t = term.trim();
  if (!t) return false;
  if (t.length <= 3) return hay.includes(` ${t} `);
  return hay.includes(t);
}

export function matchesBrand(p: ProductLike, rules: BrandRule[]): boolean {
  if (!rules.length) return true;
  // Different families (samsung vs iphone compare) -> union: match ANY.
  // Same family already narrowed in detectBrandRules, so ANY is correct here.
  const hay = hayOf(p);
  return rules.some((r) => r.matchTerms.some((m) => hayContains(hay, m)));
}

export function isAndroidProduct(p: ProductLike): boolean {
  const hay = hayOf(p);
  // Apple mobile devices are iOS, everything else mobile is Android.
  if (hay.includes("iphone") || hay.includes("ipad")) return false;
  if (p.category === "Phones") return true;
  // Tablets live in Electronics: only tablet-like rows count as Android tablets.
  if (p.category === "Electronics" && (hay.includes("tablet") || hay.includes("matepad") || hay.includes(" tab ") || hay.includes(" pad ")))
    return true;
  return false;
}

export function isIOSProduct(p: ProductLike): boolean {
  const hay = hayOf(p);
  return hay.includes("iphone") || hay.includes("ipad");
}

export function matchesOS(p: ProductLike, os: OSFilter): boolean {
  if (!os) return true;
  return os === "android" ? isAndroidProduct(p) : isIOSProduct(p);
}

export function matchesBrandAndOS(p: ProductLike, rules: BrandRule[], os: OSFilter): boolean {
  return matchesBrand(p, rules) && matchesOS(p, os);
}

// A product matches the requested model when every model token appears in its
// name as a separate token/phrase ("16" must not match "164", "s24" must not
// match "s25"). Multi-word models ("16 pro max") match as a contiguous phrase
// so "16 pro max" does not match "16 128gb".
export function matchesModel(p: ProductLike, models: string[]): boolean {
  if (!models.length) return true;
  const toks = clean(p.name).split(/[^a-z0-9]+/).filter(Boolean);
  const name = ` ${toks.join(" ")} `;
  return models.every((model) => {
    const parts = model.split(" ").filter(Boolean);
    // All model variants in this shop carry a digit ("16", "s24 ultra",
    // "fold 6"); a digitless model ("classic" alone) matches nothing.
    if (!parts.some((w) => HAS_DIGIT.test(w))) return false;
    if (parts.length > 1) {
      // Contiguous phrase, plural-tolerant ("16 pro max" vs "16 pro max 256gb").
      // Decimal models ("11.5") tokenize to "11 5": allow an optional dot.
      const core = parts.map((w) => (/^\d+$/.test(w) ? w : `${w}s?`)).join("\\.? ");
      return new RegExp(`(^|\\s)${core}(\\s|$)`).test(name);
    }
    const w = parts[0];
    return new RegExp(`(^|\\s)${w}s?(\\s|$)`).test(name);
  });
}

export function brandLabels(rules: BrandRule[], os: OSFilter): string {
  const parts: string[] = [];
  if (rules.length) parts.push(rules.map((r) => r.label).join(" / "));
  if (os === "android") parts.push("Android");
  if (os === "ios") parts.push("iOS");
  return parts.join(" + ");
}

// Words from the user's own brand/OS triggers ("huawei", "android"...).
// Retrieval must drop them from OR keywords: the strict post-filter already
// enforces brand/OS, while keeping them as keywords only narrows the pool
// wrongly (bare "android" matches almost no description, hiding real Android
// phones). Only triggers actually present in the text are returned.
export function matchedTriggerWords(text: string, rules: BrandRule[], os: OSFilter): Set<string> {
  const p = padded(text);
  const out = new Set<string>();
  const addTokens = (t: string) =>
    clean(t)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 2)
      .forEach((w) => out.add(w));
  for (const r of rules)
    for (const t of r.triggers) {
      const tt = t.trim();
      if (!tt) continue;
      if (p.includes(` ${tt} `) || p.includes(` ${tt}`)) addTokens(tt);
    }
  const osTriggers = os === "android" ? ANDROID_TRIGGERS : os === "ios" ? IOS_TRIGGERS : [];
  for (const t of osTriggers) {
    const tt = t.trim();
    if (p.includes(` ${tt} `) || p.includes(` ${tt}`)) addTokens(tt);
  }
  return out;
}
