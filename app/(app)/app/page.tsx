import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { OutfitCard } from "@/components/outfits/outfit-card";
import { getRecentWornHistory, getWornColorPairings } from "@/lib/data/outfits";
import { listActiveClosetItems, withSignedPhotoUrls } from "@/lib/data/closet-items";
import { generateOutfits } from "@/lib/outfit-matching/generate";
import { OCCASIONS, type Occasion } from "@/lib/outfit-matching/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const OCCASION_LABELS: Record<Occasion, string> = {
  work: "Work",
  casual: "Casual",
  date_night: "Date night",
  formal: "Formal",
  workout: "Workout",
  travel: "Travel",
};

function isOccasion(value: string | undefined): value is Occasion {
  return (OCCASIONS as readonly string[]).includes(value ?? "");
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ occasion?: string }>;
}) {
  const { occasion: occasionParam } = await searchParams;
  const occasion = isOccasion(occasionParam) ? occasionParam : undefined;

  const supabase = await createClient();
  const items = await listActiveClosetItems(supabase);
  const itemsWithPhotos = await withSignedPhotoUrls(supabase, items);
  const itemsWithPhotosById = new Map(itemsWithPhotos.map((item) => [item.id, item]));

  const suggestions = occasion
    ? generateOutfits(items, {
        occasion,
        wornHistory: await getRecentWornHistory(supabase),
        colorPreferences: await getWornColorPairings(supabase),
      })
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">What should I wear?</h1>
        <p className="text-sm text-muted-foreground">
          Pick an occasion to get outfit ideas built from your own closet.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {OCCASIONS.map((option) => (
          <Link
            key={option}
            href={`/?occasion=${option}`}
            className={cn(
              buttonVariants({
                variant: option === occasion ? "default" : "outline",
                size: "sm",
              }),
            )}
          >
            {OCCASION_LABELS[option]}
          </Link>
        ))}
      </div>

      {occasion &&
        (suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Not enough items in your closet for this occasion yet — you need at least a top +
            bottom (or a dress) plus shoes in the right formality range. Add a few more pieces in{" "}
            <Link href="/closet" className="underline underline-offset-4">
              your closet
            </Link>{" "}
            and try again.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {suggestions.map((suggestion, index) => (
              <OutfitCard
                key={suggestion.itemIds.join("-")}
                occasion={occasion}
                rank={index + 1}
                items={suggestion.itemIds
                  .map((id) => itemsWithPhotosById.get(id))
                  .filter((item): item is NonNullable<typeof item> => Boolean(item))}
              />
            ))}
          </div>
        ))}
    </div>
  );
}
