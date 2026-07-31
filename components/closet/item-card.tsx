import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArchiveButton } from "./archive-button";
import type { ClosetItemWithPhotoUrl } from "@/lib/data/closet-items";

const FORMALITY_LABELS: Record<number, string> = {
  1: "Athletic",
  2: "Casual",
  3: "Smart casual",
  4: "Business",
  5: "Formal",
};

export function ItemCard({ item }: { item: ClosetItemWithPhotoUrl }) {
  return (
    <Card size="sm" className="overflow-hidden">
      <div className="flex aspect-square w-full items-center justify-center bg-muted">
        {item.photoUrl ? (
          <Image
            src={item.photoUrl}
            alt={`${item.category} (${item.colors.join(", ")})`}
            width={200}
            height={200}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs text-muted-foreground capitalize">{item.category}</span>
        )}
      </div>
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="capitalize">
            {item.category}
          </Badge>
          {item.colors.map((color) => (
            <Badge key={color} variant="outline" className="capitalize">
              {color}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{FORMALITY_LABELS[item.formality]}</p>
        <ArchiveButton id={item.id} />
      </CardContent>
    </Card>
  );
}
