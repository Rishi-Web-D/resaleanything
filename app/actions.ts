"use server";
import { redirect } from "next/navigation";
import { CATEGORIES, CITIES } from "@/lib/categories";
import { createAd } from "@/lib/store";
import { CONDITIONS, type Condition } from "@/lib/types";

export type PostState = { errors?: Record<string, string> };

export async function postAd(_prev: PostState, form: FormData): Promise<PostState> {
  const s = (k: string) => String(form.get(k) ?? "").trim();
  const errors: Record<string, string> = {};
  const title = s("title");
  const description = s("description");
  const price = Number(s("price"));
  const category = s("category");
  const condition = s("condition") as Condition;
  const city = s("city");
  const seller = s("seller");
  const phone = s("phone").replace(/\D/g, "");

  if (title.length < 5 || title.length > 80) errors.title = "Title must be 5–80 characters.";
  if (description.length < 20) errors.description = "Describe the item in at least 20 characters.";
  if (!Number.isFinite(price) || price <= 0 || price > 100_000_000) errors.price = "Enter a valid price.";
  if (!CATEGORIES.some((c) => c.slug === category)) errors.category = "Pick a category.";
  if (!CONDITIONS.some((c) => c.value === condition)) errors.condition = "Pick a condition.";
  if (!CITIES.includes(city)) errors.city = "Pick a city.";
  if (seller.length < 2) errors.seller = "Enter your name.";
  if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = "Enter a valid 10-digit Indian mobile number.";
  if (Object.keys(errors).length) return { errors };

  const emoji = CATEGORIES.find((c) => c.slug === category)!.emoji;
  const ad = createAd({ title, description, price, category, condition, city, seller, phone, emoji });
  redirect(`/ads/${ad.id}`);
}
