import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClosetItemInput } from "@/lib/validation/closet-item";
import type { Category, ClosetItem, Pattern } from "@/lib/outfit-matching/types";

export interface StoredClosetItem extends ClosetItem {
  photoPath: string | null;
  archived: boolean;
}

interface ClosetItemDbRow {
  id: string;
  category: string;
  colors: string[];
  pattern: string;
  formality: number;
  warmth: number;
  photo_path: string | null;
  archived: boolean;
}

// Prefixed because this Supabase project is shared with an unrelated app —
// see the migration file for why. Exported so callers never hardcode a
// second copy of the bucket name to drift out of sync with this one.
const TABLE = "wardrobe_closet_items";
export const CLOSET_PHOTOS_BUCKET = "wardrobe-closet-photos";

const SELECT_COLUMNS = "id, category, colors, pattern, formality, warmth, photo_path, archived";

function fromRow(row: ClosetItemDbRow): StoredClosetItem {
  return {
    id: row.id,
    category: row.category as Category,
    colors: row.colors,
    pattern: row.pattern as Pattern,
    formality: row.formality,
    warmth: row.warmth,
    photoPath: row.photo_path,
    archived: row.archived,
  };
}

export async function listActiveClosetItems(
  supabase: SupabaseClient,
): Promise<StoredClosetItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_COLUMNS)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load closet items: ${error.message}`);
  return (data ?? []).map(fromRow);
}

export async function createClosetItem(
  supabase: SupabaseClient,
  input: ClosetItemInput,
): Promise<StoredClosetItem> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      category: input.category,
      colors: input.colors,
      pattern: input.pattern,
      formality: input.formality,
      warmth: input.warmth,
      photo_path: input.photoPath ?? null,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw new Error(`Failed to create closet item: ${error.message}`);
  return fromRow(data);
}

export async function archiveClosetItem(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ archived: true }).eq("id", id);
  if (error) throw new Error(`Failed to archive closet item: ${error.message}`);
}

export interface ClosetItemWithPhotoUrl extends StoredClosetItem {
  photoUrl: string | null;
}

const SIGNED_URL_TTL_SECONDS = 3600;

export async function withSignedPhotoUrls(
  supabase: SupabaseClient,
  items: StoredClosetItem[],
): Promise<ClosetItemWithPhotoUrl[]> {
  const paths = items
    .map((item) => item.photoPath)
    .filter((path): path is string => Boolean(path));

  if (paths.length === 0) {
    return items.map((item) => ({ ...item, photoUrl: null }));
  }

  const { data } = await supabase.storage
    .from(CLOSET_PHOTOS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  const urlByPath = new Map((data ?? []).map((entry) => [entry.path, entry.signedUrl]));

  return items.map((item) => ({
    ...item,
    photoUrl: item.photoPath ? (urlByPath.get(item.photoPath) ?? null) : null,
  }));
}
