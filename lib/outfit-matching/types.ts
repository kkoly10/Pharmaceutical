export const CATEGORIES = [
  "top",
  "bottom",
  "dress",
  "outerwear",
  "shoes",
  "accessory",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PATTERNS = ["solid", "subtle", "bold"] as const;
export type Pattern = (typeof PATTERNS)[number];

// Ordered scale: lower = less formal. Ranges below are inclusive on both ends.
export const FORMALITY = {
  ATHLETIC: 1,
  CASUAL: 2,
  SMART_CASUAL: 3,
  BUSINESS: 4,
  FORMAL: 5,
} as const;

// 1 = light layers only, 3 = heavy/insulated.
export const WARMTH = {
  LIGHT: 1,
  MEDIUM: 2,
  HEAVY: 3,
} as const;

export const OCCASIONS = [
  "work",
  "casual",
  "date_night",
  "formal",
  "workout",
  "travel",
] as const;
export type Occasion = (typeof OCCASIONS)[number];

export interface ClosetItem {
  id: string;
  category: Category;
  colors: string[];
  pattern: Pattern;
  formality: number;
  warmth: number;
}
