import { test } from "node:test";
import assert from "node:assert/strict";
import { generateOutfits } from "./generate.ts";
import { garmentCompatibility } from "./colors.ts";
import type { ClosetItem } from "./types.ts";

function item(overrides: Partial<ClosetItem> & Pick<ClosetItem, "id" | "category">): ClosetItem {
  return {
    colors: ["black"],
    pattern: "solid",
    formality: 2,
    warmth: 2,
    ...overrides,
  };
}

test("forms a basic top+bottom+shoes outfit for a casual occasion", () => {
  const items: ClosetItem[] = [
    item({ id: "top-1", category: "top" }),
    item({ id: "bottom-1", category: "bottom" }),
    item({ id: "shoes-1", category: "shoes" }),
  ];

  const result = generateOutfits(items, { occasion: "casual" });

  assert.equal(result.length, 1);
  assert.deepEqual(new Set(result[0].itemIds), new Set(["top-1", "bottom-1", "shoes-1"]));
});

test("returns no suggestions when a required category is missing", () => {
  const items: ClosetItem[] = [
    item({ id: "top-1", category: "top" }),
    item({ id: "bottom-1", category: "bottom" }),
    // no shoes
  ];

  const result = generateOutfits(items, { occasion: "casual" });

  assert.deepEqual(result, []);
});

test("a dress alone can satisfy the base slot", () => {
  const items: ClosetItem[] = [
    item({ id: "dress-1", category: "dress", formality: 4 }),
    item({ id: "shoes-1", category: "shoes", formality: 4 }),
  ];

  const result = generateOutfits(items, { occasion: "work" });

  assert.equal(result.length, 1);
  assert.deepEqual(new Set(result[0].itemIds), new Set(["dress-1", "shoes-1"]));
});

test("excludes items outside the occasion's formality range", () => {
  const items: ClosetItem[] = [
    item({ id: "gym-top", category: "top", formality: 1 }),
    item({ id: "gym-bottom", category: "bottom", formality: 1 }),
    item({ id: "gym-shoes", category: "shoes", formality: 1 }),
    // Too formal for workout (formality range is [1,1]) — must be excluded.
    item({ id: "dress-shirt", category: "top", formality: 4 }),
  ];

  const result = generateOutfits(items, { occasion: "workout" });

  assert.equal(result.length, 1);
  assert.ok(!result[0].itemIds.includes("dress-shirt"));
});

test("never uses a dress for an occasion that disallows it, even if formality matches", () => {
  const items: ClosetItem[] = [
    item({ id: "dress-1", category: "dress", formality: 1 }),
    item({ id: "top-1", category: "top", formality: 1 }),
    item({ id: "bottom-1", category: "bottom", formality: 1 }),
    item({ id: "shoes-1", category: "shoes", formality: 1 }),
  ];

  const result = generateOutfits(items, { occasion: "workout" });

  for (const suggestion of result) {
    assert.ok(!suggestion.itemIds.includes("dress-1"));
  }
});

test("prefers an all-neutral outfit over a bold two-color outfit, all else equal", () => {
  const base: ClosetItem[] = [
    item({ id: "shoes-1", category: "shoes" }),
  ];

  const neutralOutfit = generateOutfits(
    [
      item({ id: "top-neutral", category: "top", colors: ["black"] }),
      item({ id: "bottom-neutral", category: "bottom", colors: ["white"] }),
      ...base,
    ],
    { occasion: "casual" },
  );

  const boldOutfit = generateOutfits(
    [
      item({ id: "top-bold", category: "top", colors: ["orange"] }),
      item({ id: "bottom-bold", category: "bottom", colors: ["purple"] }),
      ...base,
    ],
    { occasion: "casual" },
  );

  assert.ok(neutralOutfit[0].score > boldOutfit[0].score);
});

// Regression guard for the color-harmony fix: the old 3-bucket model scored
// red/green (120 apart) as the worst-case 0.3 "awkward middle", but 120 is
// the canonical triadic-harmony angle and should read as intentional.
test("scores a triadic pairing (red/green, 120 apart) as harmonious, not a clash", () => {
  const redGreen = garmentCompatibility(["red"], ["green"]);
  assert.ok(
    redGreen >= 0.75,
    `expected red/green triadic harmony >= 0.75, got ${redGreen}`,
  );
});

test("scores a named harmony above an off-angle near-miss", () => {
  // red/green = 120 (triadic, a named harmony); green/blue = 95 (a near-miss
  // sitting between the 90 tetradic and 120 triadic angles).
  const triadic = garmentCompatibility(["red"], ["green"]);
  const nearMiss = garmentCompatibility(["green"], ["blue"]);
  assert.ok(triadic > nearMiss, `expected triadic ${triadic} > near-miss ${nearMiss}`);
});

test("keeps neutrals as the safest pairing, above any chromatic harmony", () => {
  const neutralPair = garmentCompatibility(["black"], ["white"]);
  const bestChromatic = garmentCompatibility(["red"], ["green"]);
  assert.ok(neutralPair > bestChromatic);
});

test("penalizes combining two bold patterns", () => {
  const oneBold = generateOutfits(
    [
      item({ id: "top-1", category: "top", pattern: "bold" }),
      item({ id: "bottom-1", category: "bottom", pattern: "solid" }),
      item({ id: "shoes-1", category: "shoes" }),
    ],
    { occasion: "casual" },
  );

  const twoBold = generateOutfits(
    [
      item({ id: "top-2", category: "top", pattern: "bold" }),
      item({ id: "bottom-2", category: "bottom", pattern: "bold" }),
      item({ id: "shoes-2", category: "shoes" }),
    ],
    { occasion: "casual" },
  );

  assert.ok(oneBold[0].score > twoBold[0].score);
});

test("penalizes items worn within the recency window", () => {
  const items: ClosetItem[] = [
    item({ id: "top-1", category: "top" }),
    item({ id: "bottom-1", category: "bottom" }),
    item({ id: "shoes-1", category: "shoes" }),
  ];
  const now = new Date("2026-07-31T00:00:00.000Z");

  const fresh = generateOutfits(items, { occasion: "casual", now });
  const recentlyWorn = generateOutfits(items, {
    occasion: "casual",
    now,
    wornHistory: [{ itemIds: ["top-1"], wornOn: "2026-07-30T00:00:00.000Z" }],
  });

  assert.ok(fresh[0].score > recentlyWorn[0].score);
});

test("ranks an exact recent repeat below a fresh alternative", () => {
  const items: ClosetItem[] = [
    item({ id: "top-1", category: "top" }),
    item({ id: "bottom-1", category: "bottom" }),
    item({ id: "top-2", category: "top" }),
    item({ id: "bottom-2", category: "bottom" }),
    item({ id: "shoes-1", category: "shoes" }),
  ];
  const now = new Date("2026-07-31T00:00:00.000Z");

  const result = generateOutfits(items, {
    occasion: "casual",
    now,
    limit: 10,
    wornHistory: [
      { itemIds: ["top-1", "bottom-1", "shoes-1"], wornOn: "2026-07-25T00:00:00.000Z" },
    ],
  });

  const repeatIndex = result.findIndex(
    (s) => new Set(s.itemIds).size === 3 && s.itemIds.includes("top-1") && s.itemIds.includes("bottom-1"),
  );

  assert.ok(repeatIndex > 0, "the exact repeat should not rank first when a fresh alternative exists");
});

test("prefers diverse cores across the returned suggestions when enough variety exists", () => {
  const items: ClosetItem[] = [
    item({ id: "top-1", category: "top" }),
    item({ id: "top-2", category: "top" }),
    item({ id: "top-3", category: "top" }),
    item({ id: "bottom-1", category: "bottom" }),
    item({ id: "bottom-2", category: "bottom" }),
    item({ id: "bottom-3", category: "bottom" }),
    item({ id: "shoes-1", category: "shoes" }),
  ];

  const result = generateOutfits(items, { occasion: "casual", limit: 3 });

  const cores = result.map((s) => [...s.itemIds].sort().join("|"));
  assert.equal(new Set(cores).size, cores.length, "all returned outfits should be distinct");
});

test("respects the limit option", () => {
  const items: ClosetItem[] = [
    item({ id: "top-1", category: "top" }),
    item({ id: "top-2", category: "top" }),
    item({ id: "bottom-1", category: "bottom" }),
    item({ id: "bottom-2", category: "bottom" }),
    item({ id: "shoes-1", category: "shoes" }),
  ];

  const result = generateOutfits(items, { occasion: "casual", limit: 1 });

  assert.equal(result.length, 1);
});
