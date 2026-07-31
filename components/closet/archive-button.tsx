"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { archiveItem } from "@/lib/closet/actions";
import { Button } from "@/components/ui/button";

export function ArchiveButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await archiveItem(id);
          toast.success("Archived.");
        })
      }
    >
      {isPending ? "Archiving…" : "Archive"}
    </Button>
  );
}
