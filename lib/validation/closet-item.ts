import { z } from "zod";
import { CATEGORIES, PATTERNS } from "@/lib/outfit-matching/types";
import { COLOR_NAMES } from "@/lib/outfit-matching/colors";

export const closetItemInputSchema = z.object({
  category: z.enum(CATEGORIES),
  colors: z
    .array(z.string().refine((color) => COLOR_NAMES.includes(color), "Unknown color"))
    .min(1)
    .max(2),
  pattern: z.enum(PATTERNS),
  formality: z.number().int().min(1).max(5),
  warmth: z.number().int().min(1).max(3),
  // Storage object path in the closet-photos bucket, not a public URL.
  photoPath: z.string().min(1).nullable().optional(),
});

export type ClosetItemInput = z.infer<typeof closetItemInputSchema>;
