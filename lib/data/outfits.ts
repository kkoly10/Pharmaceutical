import type { SupabaseClient } from "@supabase/supabase-js";
import type { WornHistoryEntry } from "@/lib/outfit-matching/generate";

const DEFAULT_LOOKBACK_DAYS = 30;

export async function getRecentWornHistory(
  supabase: SupabaseClient,
  lookbackDays = DEFAULT_LOOKBACK_DAYS,
): Promise<WornHistoryEntry[]> {
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);
  const sinceIso = since.toISOString().slice(0, 10);

  const { data: wears, error: wearsError } = await supabase
    .from("outfit_wears")
    .select("outfit_id, worn_on")
    .gte("worn_on", sinceIso)
    .order("worn_on", { ascending: false });

  if (wearsError) throw new Error(`Failed to load wear history: ${wearsError.message}`);
  if (!wears || wears.length === 0) return [];

  const outfitIds = [...new Set(wears.map((wear) => wear.outfit_id))];

  const { data: outfitItems, error: itemsError } = await supabase
    .from("outfit_items")
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
