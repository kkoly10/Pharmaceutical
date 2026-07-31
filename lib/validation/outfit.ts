import { z } from "zod";
import { OCCASIONS } from "@/lib/outfit-matching/types";

export const outfitRequestSchema = z.object({
  occasion: z.enum(OCCASIONS),
});

export type OutfitRequest = z.infer<typeof outfitRequestSchema>;

// Marking a suggestion "worn" is also what persists it — there is no
// separate "save an outfit without wearing it" flow in v1, so this is the
// only shape needed: which items, for which occasion.
export const saveOutfitSchema = z.object({
  occasion: z.enum(OCCASIONS),
  itemIds: z.array(z.string().uuid()).min(1),
});

export type SaveOutfitInput = z.infer<typeof saveOutfitSchema>;
