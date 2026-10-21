"use client";
import { useActionState } from "react";
import { postAd, type PostState } from "@/app/actions";
import { CATEGORIES, CITIES } from "@/lib/categories";
import { CONDITIONS } from "@/lib/types";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

export default function PostPage() {
  const [state, action, pending] = useActionState<PostState, FormData>(postAd, {});
  const err = (k: string) => state.errors?.[k] && <p className="mt-1 text-xs text-rose-600">{state.errors[k]}</p>;
  return (
    <form action={action} className="mx-auto max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-bold">Post your ad</h1>
      <label className="block text-sm font-medium">Title<input name="title" className={field} />{err("title")}</label>
      <label className="block text-sm font-medium">Category
        <select name="category" className={field} defaultValue="">
          <option value="" disabled>Select…</option>
          {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>{err("category")}
      </label>
      <label className="block text-sm font-medium">Condition
        <select name="condition" className={field} defaultValue="">
          <option value="" disabled>Select…</option>
          {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>{err("condition")}
      </label>
      <label className="block text-sm font-medium">Description<textarea name="description" rows={4} className={field} />{err("description")}</label>
      <label className="block text-sm font-medium">Price (₹)<input name="price" type="number" min={1} className={field} />{err("price")}</label>
      <label className="block text-sm font-medium">City
        <select name="city" className={field} defaultValue="">
          <option value="" disabled>Select…</option>
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>{err("city")}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">Your name<input name="seller" className={field} />{err("seller")}</label>
        <label className="block text-sm font-medium">Mobile<input name="phone" inputMode="numeric" className={field} />{err("phone")}</label>
      </div>
      <button disabled={pending} className="w-full rounded-lg bg-teal-700 py-2.5 font-semibold text-white disabled:opacity-60">
        {pending ? "Posting…" : "Post now"}
      </button>
    </form>
  );
}
