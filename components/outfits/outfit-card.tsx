"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { markOutfitWorn } from "@/lib/outfits/actions";
import type { ClosetItemWithPhotoUrl } from "@/lib/data/closet-items";
import type { Occasion } from "@/lib/outfit-matching/types";

export function OutfitCard({
  occasion,
  items,
  rank,
}: {
  occasion: Occasion;
  items: ClosetItemWithPhotoUrl[];
  rank: number;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs font-medium text-muted-foreground">Option {rank}</p>
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col items-center gap-1">
              <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-muted">
                {item.photoUrl ? (
                  <Image
                    src={item.photoUrl}
                    alt={item.category}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-center text-[10px] text-muted-foreground capitalize">
                    {item.category}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-1">
                {item.colors.map((color) => (
                  <Badge
                    key={color}
                    variant="outline"
                    className="px-1 py-0 text-[10px] capitalize"
                  >
                    {color}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await markOutfitWorn(
                occasion,
                items.map((item) => item.id),
              );
              if (result?.ok) {
                toast.success(result.message);
                router.refresh();
              } else {
                toast.error(result?.message ?? "Something went wrong");
              }
            })
          }
        >
          {isPending ? "Saving…" : "Wear this"}
        </Button>
      </CardFooter>
    </Card>
  );
}
