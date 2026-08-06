import type { SupabaseClient } from "@supabase/supabase-js";
import type { WornHistoryEntry } from "@/lib/outfit-matching/generate";
import {
  colorPreferenceKey,
  type ColorPairPreferences,
} from "@/lib/outfit-matching/colors";

const DEFAULT_LOOKBACK_DAYS = 30;
// Preference learning looks at (effectively) all history, not just the recency
// window — capped only so the query stays bounded for a long-lived account.
const MAX_PREFERENCE_WEARS = 500;

// Prefixed because this Supabase project is shared with an unrelated app —
// see the migration file for why.
const WEARS_TABLE = "wardrobe_outfit_wears";
const OUTFIT_ITEMS_TABLE = "wardrobe_outfit_items";
const CLOSET_ITEMS_TABLE = "wardrobe_closet_items";

export async function getRecentWornHistory(
  supabase: SupabaseClient,
  lookbackDays = DEFAULT_LOOKBACK_DAYS,
): Promise<WornHistoryEntry[]> {
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);
  const sinceIso = since.toISOString().slice(0, 10);

  const { data: wears, error: wearsError } = await supabase
    .from(WEARS_TABLE)
    .select("outfit_id, worn_on")
    .gte("worn_on", sinceIso)
    .order("worn_on", { ascending: false });

  if (wearsError) throw new Error(`Failed to load wear history: ${wearsError.message}`);
  if (!wears || wears.length === 0) return [];

  const outfitIds = [...new Set(wears.map((wear) => wear.outfit_id))];

  const { data: outfitItems, error: itemsError } = await supabase
    .from(OUTFIT_ITEMS_TABLE)
    .select("outfit_id, closet_item_id")
    .in("outfit_id", outfitIds);

  if (itemsError) throw new Error(`Failed to load outfit items: ${itemsError.message}`);

  const itemIdsByOutfit = new Map<string, string[]>();
  for (const row of outfitItems ?? []) {
    const list = itemIdsByOutfit.get(row.outfit_id) ?? [];
    list.push(row.closet_item_id);
    itemIdsByOutfit.set(row.outfit_id, list);
  }

  return wears.map((wear) => ({
    wornOn: wear.worn_on,
    itemIds: itemIdsByOutfit.get(wear.outfit_id) ?? [],
  }));
}

/**
 * Build the per-user color-pairing preference map from worn history: for every
 * time an outfit was worn, count each unordered pair of distinct colors it
 * contained. Each *wear* counts once, so an outfit worn repeatedly weighs more.
 * Archived items are intentionally NOT filtered out — a garment you wore is
 * taste signal even if you've since archived it.
 */
export async function getWornColorPairings(
  supabase: SupabaseClient,
): Promise<ColorPairPreferences> {
  const { data: wears, error: wearsError } = await supabase
    .from(WEARS_TABLE)
    .select("outfit_id")
    .order("worn_on", { ascending: false })
    .limit(MAX_PREFERENCE_WEARS);

  if (wearsError) throw new Error(`Failed to load wear history: ${wearsError.message}`);
  if (!wears || wears.length === 0) return {};

  const outfitIds = [...new Set(wears.map((wear) => wear.outfit_id))];

  const { data: outfitItems, error: itemsError } = await supabase
    .from(OUTFIT_ITEMS_TABLE)
    .select("outfit_id, closet_item_id")
    .in("outfit_id", outfitIds);

  if (itemsError) throw new Error(`Failed to load outfit items: ${itemsError.message}`);

  const itemIds = [...new Set((outfitItems ?? []).map((row) => row.closet_item_id))];
  if (itemIds.length === 0) return {};

  const { data: closetItems, error: colorsError } = await supabase
    .from(CLOSET_ITEMS_TABLE)
    .select("id, colors")
    .in("id", itemIds);

  if (colorsError) throw new Error(`Failed to load item colors: ${colorsError.message}`);

  const colorsByItem = new Map<string, string[]>(
    (closetItems ?? []).map((row) => [row.id, row.colors as string[]]),
  );

  // outfit_id -> the set of distinct colors across all its items
  const colorsByOutfit = new Map<string, Set<string>>();
  for (const row of outfitItems ?? []) {
    const set = colorsByOutfit.get(row.outfit_id) ?? new Set<string>();
    for (const color of colorsByItem.get(row.closet_item_id) ?? []) set.add(color);
    colorsByOutfit.set(row.outfit_id, set);
  }

  const counts: ColorPairPreferences = {};
  for (const wear of wears) {
    const colors = [...(colorsByOutfit.get(wear.outfit_id) ?? [])];
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const key = colorPreferenceKey(colors[i], colors[j]);
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
  }
  return counts;
}
