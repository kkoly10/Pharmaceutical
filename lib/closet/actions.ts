"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { closetItemInputSchema } from "@/lib/validation/closet-item";
import {
  archiveClosetItem as archiveClosetItemRow,
  createClosetItem,
} from "@/lib/data/closet-items";

export type ActionState = { ok: boolean; message: string } | null;

export async function addClosetItem(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const colors = formData
    .getAll("colors")
    .map(String)
    .filter((color) => color && color !== "none");

  const parsed = closetItemInputSchema.safeParse({
    category: formData.get("category"),
    colors,
    pattern: formData.get("pattern"),
    formality: Number(formData.get("formality")),
    warmth: Number(formData.get("warmth")),
    photoPath: null,
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const photo = formData.get("photo");
  let photoPath: string | null = null;

  if (photo instanceof File && photo.size > 0) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, message: "Your session expired — please log in again." };
    }

    const extension = photo.name.split(".").pop() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("closet-photos")
      .upload(path, photo, { contentType: photo.type });

    if (uploadError) {
      return { ok: false, message: `Photo upload failed: ${uploadError.message}` };
    }
    photoPath = path;
  }

  await createClosetItem(supabase, { ...parsed.data, photoPath });
  revalidatePath("/closet");
  return { ok: true, message: "Added to your closet." };
}

export async function archiveItem(id: string): Promise<void> {
  const supabase = await createClient();
  await archiveClosetItemRow(supabase, id);
  revalidatePath("/closet");
  revalidatePath("/");
}
