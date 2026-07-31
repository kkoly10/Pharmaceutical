interface ColorInfo {
  neutral: boolean;
  hue?: number; // degrees on the color wheel, 0-360. Omitted for neutrals.
}

// Curated on purpose, not a full color picker: this app scores harmony
// between named colors, so every color a user can tag must exist here.
export const PALETTE: Record<string, ColorInfo> = {
  black: { neutral: true },
  white: { neutral: true },
  gray: { neutral: true },
  navy: { neutral: true },
  beige: { neutral: true },
  brown: { neutral: true },
  cream: { neutral: true },
  denim: { neutral: true },
  red: { neutral: false, hue: 0 },
  orange: { neutral: false, hue: 30 },
  yellow: { neutral: false, hue: 55 },
  green: { neutral: false, hue: 120 },
  teal: { neutral: false, hue: 175 },
  blue: { neutral: false, hue: 215 },
  purple: { neutral: false, hue: 275 },
  pink: { neutral: false, hue: 330 },
};

export const COLOR_NAMES = Object.keys(PALETTE);

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

// Compatibility score for a single pair of named colors, 0-1.
function pairCompatibility(a: string, b: string): number {
  const infoA = PALETTE[a];
  const infoB = PALETTE[b];
  if (!infoA || !infoB) return 0.5; // unknown color: neutral-ish assumption

  if (a === b) return 1;
  if (infoA.neutral || infoB.neutral) return 0.9;

  const distance = hueDistance(infoA.hue!, infoB.hue!);
  if (distance <= 40) return 0.75; // analogous
  if (distance >= 150) return 0.7; // complementary — bold but intentional
  return 0.3; // the awkward middle distance: highest clash risk
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
