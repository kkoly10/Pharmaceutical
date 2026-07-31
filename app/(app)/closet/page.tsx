import { AddItemForm } from "@/components/closet/add-item-form";
import { ItemCard } from "@/components/closet/item-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listActiveClosetItems, withSignedPhotoUrls } from "@/lib/data/closet-items";
import { createClient } from "@/lib/supabase/server";

export default async function ClosetPage() {
  const supabase = await createClient();
  const items = await listActiveClosetItems(supabase);
  const itemsWithPhotos = await withSignedPhotoUrls(supabase, items);

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Add a closet item</CardTitle>
          <CardDescription>
            Tag it once — the app uses this to build outfits later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddItemForm />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold">
          Your closet ({itemsWithPhotos.length})
        </h2>
        {itemsWithPhotos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing here yet — add your first item above.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {itemsWithPhotos.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
