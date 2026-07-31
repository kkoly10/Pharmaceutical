import { garmentCompatibility } from "./colors.ts";
import { OCCASION_RULES } from "./occasions.ts";
import type { ClosetItem, Occasion } from "./types.ts";

// Generous upper bounds per category before combining, purely to bound the
// combinatorial explosion of a brute-force nested-loop generator — realistic
// wardrobes stay far under these, so this never affects real suggestions.
const MAX_TOPS = 12;
const MAX_BOTTOMS = 12;
const MAX_DRESSES = 15;
const MAX_SHOES = 8;
const MAX_OUTERWEAR = 5;
const MAX_ACCESSORY = 5;

const RECENCY_WINDOW_DAYS = 7;
const RECENCY_WEIGHT = 0.2;
const EXACT_REPEAT_WINDOW_DAYS = 14;
const EXACT_REPEAT_PENALTY = 1;
const FORMALITY_FIT_WEIGHT = 0.15;
const WARMTH_FIT_WEIGHT = 0.1;
const PATTERN_CLASH_PENALTY = 0.15;

export interface WornHistoryEntry {
  itemIds: string[];
  wornOn: string; // ISO date string
}

export interface GenerateOutfitsOptions {
  occasion: Occasion;
  wornHistory?: WornHistoryEntry[];
  targetWarmth?: number;
  limit?: number;
  now?: Date;
}

export interface OutfitSuggestion {
  itemIds: string[];
  score: number;
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function lastWornDaysAgoByItem(history: WornHistoryEntry[], now: Date): Map<string, number> {
  const result = new Map<string, number>();
  for (const entry of history) {
    const daysAgo = daysBetween(now, new Date(entry.wornOn));
    for (const itemId of entry.itemIds) {
      const existing = result.get(itemId);
      if (existing === undefined || daysAgo < existing) {
        result.set(itemId, daysAgo);
      }
    }
  }
  return result;
}

function recentExactSets(history: WornHistoryEntry[], now: Date): Set<string>[] {
  return history
    .filter((entry) => daysBetween(now, new Date(entry.wornOn)) <= EXACT_REPEAT_WINDOW_DAYS)
    .map((entry) => new Set(entry.itemIds));
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

function cartesian<A, B>(as: A[], bs: B[]): [A, B][] {
  const pairs: [A, B][] = [];
  for (const a of as) for (const b of bs) pairs.push([a, b]);
  return pairs;
}

function pairwiseColorScore(items: ClosetItem[]): number {
  if (items.length < 2) return 1;
  const scores: number[] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      scores.push(garmentCompatibility(items[i].colors, items[j].colors));
    }
  }
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

function formalityFit(items: ClosetItem[], min: number, max: number): number {
  if (max === min) return 1;
  const mid = (min + max) / 2;
  const halfWidth = (max - min) / 2;
  const deviations = items.map((item) => Math.abs(item.formality - mid) / halfWidth);
  const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
  return 1 - Math.min(1, avgDeviation);
}

function warmthFit(items: ClosetItem[], targetWarmth: number): number {
  const deviations = items.map((item) => Math.abs(item.warmth - targetWarmth));
  const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
  return -avgDeviation;
}

function coreSignature(items: ClosetItem[]): string {
  return items
    .filter((item) => item.category !== "outerwear" && item.category !== "accessory")
    .map((item) => item.id)
    .sort()
    .join("|");
}

export function generateOutfits(
  items: ClosetItem[],
  options: GenerateOutfitsOptions,
): OutfitSuggestion[] {
  const rule = OCCASION_RULES[options.occasion];
  const limit = options.limit ?? 3;
  const now = options.now ?? new Date();
  const history = options.wornHistory ?? [];

  const eligible = items.filter(
    (item) => item.formality >= rule.minFormality && item.formality <= rule.maxFormality,
  );

  const byCategory = (category: ClosetItem["category"], max: number) =>
    eligible.filter((item) => item.category === category).slice(0, max);

  const tops = byCategory("top", MAX_TOPS);
  const bottoms = byCategory("bottom", MAX_BOTTOMS);
  const dresses = rule.allowDress ? byCategory("dress", MAX_DRESSES) : [];
  const shoes = byCategory("shoes", MAX_SHOES);
  const outerwear = rule.allowOuterwear ? byCategory("outerwear", MAX_OUTERWEAR) : [];
  const accessories = rule.allowAccessory ? byCategory("accessory", MAX_ACCESSORY) : [];

  const bases: ClosetItem[][] = [
    ...dresses.map((dress) => [dress]),
    ...cartesian(tops, bottoms).map(([top, bottom]) => [top, bottom]),
  ];

  if (bases.length === 0 || shoes.length === 0) return [];

  const outerwearOptions: (ClosetItem | null)[] = [null, ...outerwear];
  const accessoryOptions: (ClosetItem | null)[] = [null, ...accessories];

  const lastWornByItem = lastWornDaysAgoByItem(history, now);
  const recentSets = recentExactSets(history, now);

  const candidates: OutfitSuggestion[] = [];

  for (const base of bases) {
    for (const shoe of shoes) {
      for (const outerOption of outerwearOptions) {
        for (const accessoryOption of accessoryOptions) {
          const candidateItems = [base, [shoe], outerOption ? [outerOption] : [], accessoryOption ? [accessoryOption] : []].flat();

          const colorScore = pairwiseColorScore(candidateItems);

          const boldCount = candidateItems.filter((item) => item.pattern === "bold").length;
          const patternPenalty = Math.max(0, boldCount - 1) * PATTERN_CLASH_PENALTY;

          const fit = formalityFit(candidateItems, rule.minFormality, rule.maxFormality);

          const warmthScore =
            options.targetWarmth !== undefined
              ? warmthFit(candidateItems, options.targetWarmth)
              : 0;

          const recencyPenalty =
            candidateItems.reduce((sum, item) => {
              const daysAgo = lastWornByItem.get(item.id);
              if (daysAgo === undefined) return sum;
              return sum + Math.max(0, (RECENCY_WINDOW_DAYS - daysAgo) / RECENCY_WINDOW_DAYS);
            }, 0) / candidateItems.length;

          const candidateIdSet = new Set(candidateItems.map((item) => item.id));
          const isExactRepeat = recentSets.some((set) => setsEqual(set, candidateIdSet));

          const score =
            colorScore -
            patternPenalty +
            fit * FORMALITY_FIT_WEIGHT +
            warmthScore * WARMTH_FIT_WEIGHT -
            recencyPenalty * RECENCY_WEIGHT -
            (isExactRepeat ? EXACT_REPEAT_PENALTY : 0);

          candidates.push({
            itemIds: candidateItems.map((item) => item.id),
            score,
          });
        }
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  // Prefer variety in the returned set: skip candidates that only differ
  // from an already-picked suggestion by outerwear/accessory, unless there
  // aren't enough distinct cores to fill out `limit`.
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const seenCores = new Set<string>();
  const diverse: OutfitSuggestion[] = [];
  const rest: OutfitSuggestion[] = [];

  for (const candidate of candidates) {
    const candidateItems = candidate.itemIds.map((id) => itemsById.get(id)!);
    const signature = coreSignature(candidateItems);
    if (!seenCores.has(signature)) {
      seenCores.add(signature);
      diverse.push(candidate);
    } else {
      rest.push(candidate);
    }
  }

  return [...diverse, ...rest].slice(0, limit);
}
