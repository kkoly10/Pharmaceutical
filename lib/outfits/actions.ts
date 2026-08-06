"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { saveOutfitSchema } from "@/lib/validation/outfit";

export type ActionState = { ok: boolean; message: string } | null;

export async function markOutfitWorn(occasion: string, itemIds: string[]): Promise<ActionState> {
  const parsed = saveOutfitSchema.safeParse({ occasion, itemIds });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("wardrobe_mark_outfit_worn", {
    p_occasion: parsed.data.occasion,
    p_item_ids: parsed.data.itemIds,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  return {
    ok: true,
    message: "Marked as worn — you won't see this exact combo again for a couple weeks.",
  };
}
