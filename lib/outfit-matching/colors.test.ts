import { test } from "node:test";
import assert from "node:assert/strict";
import {
  colorPreferenceKey,
  garmentCompatibility,
  hasLightnessGradient,
  hasSinglePointOfColor,
  outfitHarmonyScore,
  outfitPreferenceScore,
  type ColorScoredGarment,
} from "./colors.ts";
import type { Category } from "./types.ts";

function g(category: Category, ...colors: string[]): ColorScoredGarment {
  return { category, colors };
}

// --- Named-harmony-angle scoring (regression guards for the bucket fix) ---

test("scores a triadic pairing (red/green, 120 apart) as harmonious, not a clash", () => {
  const redGreen = garmentCompatibility(["red"], ["green"]);
  assert.ok(redGreen >= 0.75, `expected red/green >= 0.75, got ${redGreen}`);
});

test("scores a named harmony above an off-angle near-miss", () => {
  const triadic = garmentCompatibility(["red"], ["green"]); // 120
  const nearMiss = garmentCompatibility(["green"], ["blue"]); // 95, between 90 and 120
  assert.ok(triadic > nearMiss, `expected triadic ${triadic} > near-miss ${nearMiss}`);
});

test("keeps neutrals as the safest pairing, above any chromatic harmony", () => {
  const neutralPair = garmentCompatibility(["black"], ["white"]);
  const bestChromatic = garmentCompatibility(["red"], ["green"]);
  assert.ok(neutralPair > bestChromatic);
});

// --- Navy+black near-clash exception (French "faux pas") ---

test("scores navy+black below other neutral pairings", () => {
  const navyBlack = garmentCompatibility(["navy"], ["black"]);
  const navyGray = garmentCompatibility(["navy"], ["gray"]);
  assert.ok(navyBlack < navyGray, `expected navy/black ${navyBlack} < navy/gray ${navyGray}`);
  // Still well above a real clash — just not the uniform 0.9 other neutrals get.
  assert.ok(navyBlack >= 0.65 && navyBlack < 0.85);
});

// --- Kasane-no-irome neutral mediation ---

test("a neutral mediator lifts a clashing chromatic pair in a 3+ item outfit", () => {
  // green/blue alone score 0.65 (a near-miss). Without mediation, the 3-item
  // average would be (0.65 + 0.9 + 0.9) / 3 = 0.8167; the lift pushes it above.
  const mediated = outfitHarmonyScore([g("top", "green"), g("bottom", "blue"), g("shoes", "gray")]);
  assert.ok(mediated > 0.82, `expected mediated harmony > 0.82, got ${mediated}`);
});

test("does not mediate a two-item outfit (no third item to sit between)", () => {
  const twoItem = outfitHarmonyScore([g("top", "green"), g("bottom", "blue")]);
  const rawPair = garmentCompatibility(["green"], ["blue"]);
  assert.ok(Math.abs(twoItem - rawPair) < 1e-9, `expected ${rawPair}, got ${twoItem}`);
});

test("does not mediate when no neutral is present", () => {
  // green/blue (0.65) must stay un-lifted with an all-chromatic third item.
  // If it had been lifted to ~0.70, the average would exceed 0.69.
  const allChromatic = outfitHarmonyScore([g("top", "green"), g("bottom", "blue"), g("shoes", "teal")]);
  assert.ok(allChromatic < 0.69, `expected no lift (< 0.69), got ${allChromatic}`);
});

// --- One-point-of-color accent (60-30-10 / 무채색+원포인트) ---

test("detects an outfit with exactly one chromatic point of color", () => {
  const outfit = [g("top", "black"), g("bottom", "red"), g("shoes", "white")];
  assert.equal(hasSinglePointOfColor(outfit), true);
});

test("does not flag an outfit with two chromatic items as a single point of color", () => {
  const outfit = [g("top", "red"), g("bottom", "blue"), g("shoes", "white")];
  assert.equal(hasSinglePointOfColor(outfit), false);
});

test("does not flag an all-neutral outfit as a point of color", () => {
  const outfit = [g("top", "black"), g("bottom", "gray"), g("shoes", "white")];
  assert.equal(hasSinglePointOfColor(outfit), false);
});

test("treats a garment as chromatic if any of its colors is chromatic", () => {
  const outfit = [g("top", "white", "red"), g("bottom", "black"), g("shoes", "gray")];
  assert.equal(hasSinglePointOfColor(outfit), true);
});

// --- Lightness gradient (Chinese 明度排列法) ---

test("rewards a monotonic top-to-bottom lightness gradient", () => {
  // cream (0.92) -> gray (0.55) -> black (0.05): a clean light-to-dark stack.
  const outfit = [g("top", "cream"), g("bottom", "gray"), g("shoes", "black")];
  assert.equal(hasLightnessGradient(outfit), true);
});

test("does not reward a flat (single-shade) stack as a gradient", () => {
  const outfit = [g("top", "black"), g("bottom", "black"), g("shoes", "black")];
  assert.equal(hasLightnessGradient(outfit), false);
});

test("does not reward a non-monotonic stack", () => {
  // black (0.05) -> white (0.98) -> black (0.05): up then down, not a gradient.
  const outfit = [g("top", "black"), g("bottom", "white"), g("shoes", "black")];
  assert.equal(hasLightnessGradient(outfit), false);
});

test("does not apply a gradient when there is no top/bottom/shoes stack", () => {
  const outfit = [g("dress", "cream"), g("shoes", "black")];
  assert.equal(hasLightnessGradient(outfit), false);
});

// --- Per-user preference learning (positive-only Bayesian shrinkage) ---

test("color preference key is order-independent", () => {
  assert.equal(colorPreferenceKey("navy", "white"), colorPreferenceKey("white", "navy"));
});

test("preference score is zero at cold start (no history)", () => {
  const outfit = [g("top", "red"), g("bottom", "white"), g("shoes", "black")];
  assert.equal(outfitPreferenceScore(outfit, {}), 0);
});

test("preference score is zero for an outfit with fewer than two distinct colors", () => {
  const outfit = [g("top", "black"), g("bottom", "black"), g("shoes", "black")];
  assert.equal(outfitPreferenceScore(outfit, { "black|black": 99 }), 0);
});

test("a worn color pairing scores above an unworn one", () => {
  const outfit = [g("top", "navy"), g("bottom", "white")];
  const worn = outfitPreferenceScore(outfit, { "navy|white": 10 });
  const unworn = outfitPreferenceScore(outfit, {});
  assert.ok(worn > unworn, `expected worn ${worn} > unworn ${unworn}`);
});

test("preference score increases monotonically with wear count (with diminishing returns)", () => {
  const outfit = [g("top", "navy"), g("bottom", "white")];
  const few = outfitPreferenceScore(outfit, { "navy|white": 2 });
  const many = outfitPreferenceScore(outfit, { "navy|white": 20 });
  assert.ok(many > few);
  // Bounded below 1 by the shrinkage prior even at high counts.
  assert.ok(many < 1);
});
