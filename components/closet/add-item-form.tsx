"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { addClosetItem, type ActionState } from "@/lib/closet/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/outfit-matching/types";
import { COLOR_NAMES } from "@/lib/outfit-matching/colors";

const initialState: ActionState = null;

const FORMALITY_OPTIONS = [
  { value: "1", label: "Athletic / loungewear" },
  { value: "2", label: "Casual" },
  { value: "3", label: "Smart casual" },
  { value: "4", label: "Business" },
  { value: "5", label: "Formal" },
];

const WARMTH_OPTIONS = [
  { value: "1", label: "Light" },
  { value: "2", label: "Medium" },
  { value: "3", label: "Heavy" },
];

const PATTERN_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "subtle", label: "Subtle texture / stripe" },
  { value: "bold", label: "Bold pattern" },
];

export function AddItemForm() {
  const [state, formAction, pending] = useActionState(addClosetItem, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      formRef.current?.reset();
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="category">Category</Label>
          <Select name="category" defaultValue="top" required>
            <SelectTrigger id="category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category} className="capitalize">
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="pattern">Pattern</Label>
          <Select name="pattern" defaultValue="solid" required>
            <SelectTrigger id="pattern" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PATTERN_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="primary-color">Primary color</Label>
          <Select name="colors" defaultValue="black" required>
            <SelectTrigger id="primary-color" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COLOR_NAMES.map((color) => (
                <SelectItem key={color} value={color} className="capitalize">
                  {color}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="secondary-color">Secondary color</Label>
          <Select name="colors" defaultValue="none">
            <SelectTrigger id="secondary-color" className="w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {COLOR_NAMES.map((color) => (
                <SelectItem key={color} value={color} className="capitalize">
                  {color}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="formality">Formality</Label>
          <Select name="formality" defaultValue="2" required>
            <SelectTrigger id="formality" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMALITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="warmth">Warmth</Label>
          <Select name="warmth" defaultValue="2" required>
            <SelectTrigger id="warmth" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WARMTH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="photo">Photo (optional)</Label>
        <Input id="photo" name="photo" type="file" accept="image/*" />
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Adding…" : "Add to closet"}
      </Button>
    </form>
  );
}
