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

// Named color-harmony angles from Itten's (Bauhaus) color-wheel theory. Two
// chromatic hues read as intentional when their distance sits on one of these
// named relationships; the score dips toward the midpoints *between* them,
// which is where a pairing reads as an accidental near-miss rather than a
// deliberate choice.
//
// This replaces an earlier 3-bucket model (analogous <=40, complementary
// >=150, else a flat 0.3 "awkward middle") that was measurably wrong: it
// scored red/green — exactly 120 apart in this palette — as a clash, when
// 120 is the canonical *triadic* harmony angle. Scores below rank the
// classic harmonies roughly by how forgiving each is in practice: analogous
// and triadic are the safest, tetradic (a double-contrast) the trickiest.
const HARMONY_ANGLES: { angle: number; score: number }[] = [
  { angle: 30, score: 0.82 }, // analogous
  { angle: 60, score: 0.74 }, // two-step analogous / tetradic-rectangle leg
  { angle: 90, score: 0.7 }, // tetradic (square)
  { angle: 120, score: 0.82 }, // triadic
  { angle: 150, score: 0.76 }, // split-complementary
  { angle: 180, score: 0.8 }, // complementary
];

// Per-degree falloff as a hue-distance moves off the nearest named angle.
// Named angles are 30 apart, so the worst case is a 15-degree miss (a true
// midpoint), bottoming out around 0.6 — bold but never the old 0.3 "clash".
const HARMONY_FALLOFF = 0.01;

function hueHarmonyScore(distance: number): number {
  let bestScore = 0;
  let bestOffset = Infinity;
  for (const harmony of HARMONY_ANGLES) {
    const offset = Math.abs(distance - harmony.angle);
    // On a tie (a midpoint equidistant from two harmonies) prefer the
    // higher-scoring one, so a near-triadic isn't dragged down as if it were
    // a near-tetradic.
    if (offset < bestOffset || (offset === bestOffset && harmony.score > bestScore)) {
      bestOffset = offset;
      bestScore = harmony.score;
    }
  }
  return bestScore - HARMONY_FALLOFF * bestOffset;
}

// Compatibility score for a single pair of named colors, 0-1.
function pairCompatibility(a: string, b: string): number {
  const infoA = PALETTE[a];
  const infoB = PALETTE[b];
  if (!infoA || !infoB) return 0.5; // unknown color: neutral-ish assumption

  if (a === b) return 1; // monochromatic — always safe
  if (infoA.neutral || infoB.neutral) return 0.9; // a neutral goes with anything

  return hueHarmonyScore(hueDistance(infoA.hue!, infoB.hue!));
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
