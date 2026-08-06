import type { Category } from "./types.ts";

interface ColorInfo {
  neutral: boolean;
  hue?: number; // degrees on the color wheel, 0-360. Omitted for neutrals.
  lightness: number; // approximate perceived lightness, 0 (black) - 1 (white).
}

// Curated on purpose, not a full color picker: this app scores harmony
// between named colors, so every color a user can tag must exist here.
// `lightness` is a rough hand-tagged value (Chinese 明度, "value") used only
// for the top-to-bottom gradient bonus — it doesn't need to be exact.
export const PALETTE: Record<string, ColorInfo> = {
  black: { neutral: true, lightness: 0.05 },
  white: { neutral: true, lightness: 0.98 },
  gray: { neutral: true, lightness: 0.55 },
  navy: { neutral: true, lightness: 0.2 },
  beige: { neutral: true, lightness: 0.8 },
  brown: { neutral: true, lightness: 0.35 },
  cream: { neutral: true, lightness: 0.92 },
  denim: { neutral: true, lightness: 0.45 },
  red: { neutral: false, hue: 0, lightness: 0.45 },
  orange: { neutral: false, hue: 30, lightness: 0.6 },
  yellow: { neutral: false, hue: 55, lightness: 0.8 },
  green: { neutral: false, hue: 120, lightness: 0.45 },
  teal: { neutral: false, hue: 175, lightness: 0.5 },
  blue: { neutral: false, hue: 215, lightness: 0.4 },
  purple: { neutral: false, hue: 275, lightness: 0.35 },
  pink: { neutral: false, hue: 330, lightness: 0.7 },
};

export const COLOR_NAMES = Object.keys(PALETTE);

export function isNeutralColor(name: string): boolean {
  return PALETTE[name]?.neutral ?? false;
}

// A garment reads as neutral only when every color it carries is neutral.
export function isNeutralGarment(colors: string[]): boolean {
  return colors.length > 0 && colors.every(isNeutralColor);
}

function colorLightness(name: string): number {
  return PALETTE[name]?.lightness ?? 0.5;
}

function garmentLightness(colors: string[]): number {
  if (colors.length === 0) return 0.5;
  return colors.reduce((sum, c) => sum + colorLightness(c), 0) / colors.length;
}

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

// Named color-harmony angles from Itten's (Bauhaus) color-wheel theory. Two
// chromatic hues read as intentional when their distance sits on one of these
// named relationships; the score dips toward the midpoints *between* them,
// which is where a pairing reads as an accidental near-miss rather than a
// deliberate choice.
//
// This replaced an earlier 3-bucket model (analogous <=40, complementary
// >=150, else a flat 0.3 "awkward middle") that was measurably wrong: it
// scored red/green — exactly 120 apart in this palette — as a clash, when
// 120 is the canonical *triadic* harmony angle. Scores below rank the
// classic harmonies roughly by how forgiving each is in practice: analogous
// and triadic are the safest, tetradic (a double-contrast) the trickiest.
const HARMONY_ANGLES: { angle: number; score: number }[] = [
  { angle: 30, score: 0.82 }, // analogous
  { angle: 60, score: 0.74 }, // two-step analogous / tetradic-rectangle leg
  { angle: 90, score: 0.7 }, // tetradic (square)
  { angle: 120, score: 0.82 }, // triadic
  { angle: 150, score: 0.76 }, // split-complementary
  { angle: 180, score: 0.8 }, // complementary
];

// Per-degree falloff as a hue-distance moves off the nearest named angle.
// Named angles are 30 apart, so the worst case is a 15-degree miss (a true
// midpoint), bottoming out around 0.6 — bold but never the old 0.3 "clash".
const HARMONY_FALLOFF = 0.01;

function hueHarmonyScore(distance: number): number {
  let bestScore = 0;
  let bestOffset = Infinity;
  for (const harmony of HARMONY_ANGLES) {
    const offset = Math.abs(distance - harmony.angle);
    // On a tie (a midpoint equidistant from two harmonies) prefer the
    // higher-scoring one, so a near-triadic isn't dragged down as if it were
    // a near-tetradic.
    if (offset < bestOffset || (offset === bestOffset && harmony.score > bestScore)) {
      bestOffset = offset;
      bestScore = harmony.score;
    }
  }
  return bestScore - HARMONY_FALLOFF * bestOffset;
}

// French styling guides call out navy+black as a specific "faux pas" — the
// two are too close in hue to read as a deliberate contrast, yet too
// different to read as a matched neutral. Carve such pairs out below the
// generic "neutrals go with anything" score rather than treating every
// neutral-neutral pair as uniformly safe. Extend the list if other named
// near-clash neutral pairs come up; keep it to documented ones.
const NEAR_CLASH_NEUTRAL_PAIRS: [string, string][] = [["navy", "black"]];

function isNearClashNeutralPair(a: string, b: string): boolean {
  return NEAR_CLASH_NEUTRAL_PAIRS.some(
    ([x, y]) => (a === x && b === y) || (a === y && b === x),
  );
}

// Compatibility score for a single pair of named colors, 0-1.
function pairCompatibility(a: string, b: string): number {
  const infoA = PALETTE[a];
  const infoB = PALETTE[b];
  if (!infoA || !infoB) return 0.5; // unknown color: neutral-ish assumption

  if (a === b) return 1; // monochromatic — always safe
  if (isNearClashNeutralPair(a, b)) return 0.7; // navy+black: reads as unintentional
  if (infoA.neutral || infoB.neutral) return 0.9; // a neutral goes with anything

  return hueHarmonyScore(hueDistance(infoA.hue!, infoB.hue!));
}

/**
 * Average pairwise compatibility across every color in `a` against every
 * color in `b`. Each item can carry 1-2 colors (e.g. a striped shirt), so
 * this represents "how well do these two garments' palettes work together."
 */
export function garmentCompatibility(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0.9;
  const scores = a.flatMap((colorA) => b.map((colorB) => pairCompatibility(colorA, colorB)));
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

// --- Outfit-level color scoring ---
//
// These operate on a whole candidate outfit (each garment's category +
// colors) rather than a single pair, so `generate.ts` can weight each concern
// separately. Kept here in the pure color module (no framework imports) so
// the whole color model stays independently unit-testable.

export interface ColorScoredGarment {
  category: Category;
  colors: string[];
}

// Kasane-no-irome (襲の色目, Heian-era kimono-layering theory): in a 3+ item
// outfit a neutral item softens the clash between two chromatic items it
// visually sits between — mirroring the convention of inserting a pale layer
// between two contrasting colors. Only lifts pairs that actually clash (below
// the target), and only when a neutral mediator is present.
const MEDIATION_TARGET = 0.75;
const MEDIATION_STRENGTH = 0.5;

export function outfitHarmonyScore(garments: ColorScoredGarment[]): number {
  if (garments.length < 2) return 1;
  const hasNeutralMediator = garments.some((g) => isNeutralGarment(g.colors));
  const scores: number[] = [];
  for (let i = 0; i < garments.length; i++) {
    for (let j = i + 1; j < garments.length; j++) {
      let pair = garmentCompatibility(garments[i].colors, garments[j].colors);
      const bothChromatic =
        !isNeutralGarment(garments[i].colors) && !isNeutralGarment(garments[j].colors);
      if (
        hasNeutralMediator &&
        garments.length >= 3 &&
        bothChromatic &&
        pair < MEDIATION_TARGET
      ) {
        pair += MEDIATION_STRENGTH * (MEDIATION_TARGET - pair);
      }
      scores.push(pair);
    }
  }
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

// Western 60-30-10 and Korean 무채색+원포인트 ("neutrals + one point color")
// converge on the same structure: an outfit reads as deliberately styled when
// exactly one item is the chromatic "point" against an otherwise-neutral base.
export function hasSinglePointOfColor(garments: ColorScoredGarment[]): boolean {
  return garments.filter((g) => !isNeutralGarment(g.colors)).length === 1;
}

// Chinese 明度排列法 ("lightness-ordering method"): a monotonic light-to-dark
// (or dark-to-light) gradient down the vertical top -> bottom -> shoes stack
// reads as intentional. Only applies when that clear stack exists (not for a
// dress) and only when there's real lightness variation — an all-one-shade
// outfit is trivially "ordered" but isn't a gradient.
const MIN_GRADIENT_SPREAD = 0.2;

export function hasLightnessGradient(garments: ColorScoredGarment[]): boolean {
  const top = garments.find((g) => g.category === "top");
  const bottom = garments.find((g) => g.category === "bottom");
  const shoe = garments.find((g) => g.category === "shoes");
  if (!top || !bottom || !shoe) return false;

  const a = garmentLightness(top.colors);
  const b = garmentLightness(bottom.colors);
  const c = garmentLightness(shoe.colors);
  const spread = Math.max(a, b, c) - Math.min(a, b, c);
  if (spread < MIN_GRADIENT_SPREAD) return false;

  const descending = a >= b && b >= c;
  const ascending = a <= b && b <= c;
  return descending || ascending;
}

// --- Per-user preference learning ---
//
// The only part of the score that gets more personalized over time. A
// "feature" here is an unordered pair of colors the user has actually worn
// together — chosen over per-item or per-single-color signal because (a) it's
// what the product is about (combinations), and (b) it stays orthogonal to
// the per-item recency penalty in generate.ts: favoring the navy+white combo
// doesn't fight rotating *which* navy and white garments you wear.
//
// Positive-only Beta-Bernoulli shrinkage (the founder's decided shape — see
// CLAUDE.md): preference(f) = worn(f) / (worn(f) + PRIOR). A never-worn pair
// scores 0 (inert at cold start — a brand-new user gets no nudge), and the
// PRIOR keeps 1-2 wears from swinging it. There is deliberately no negative
// term for "shown but not chosen": with a tiny user base that signal is noise.

export type ColorPairPreferences = Record<string, number>; // "c1|c2" (sorted) -> worn count

const PREFERENCE_PRIOR = 5;

export function colorPreferenceKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function pairPreference(wornCount: number): number {
  return wornCount / (wornCount + PREFERENCE_PRIOR);
}

// Mean preference across the distinct color pairs present in an outfit. 0 when
// there's no history or fewer than two distinct colors, so the term vanishes
// for a new user rather than pushing anything around.
export function outfitPreferenceScore(
  garments: ColorScoredGarment[],
  preferences: ColorPairPreferences,
): number {
  const colors = [...new Set(garments.flatMap((g) => g.colors))];
  if (colors.length < 2) return 0;

  const scores: number[] = [];
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const key = colorPreferenceKey(colors[i], colors[j]);
      scores.push(pairPreference(preferences[key] ?? 0));
    }
  }
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}
