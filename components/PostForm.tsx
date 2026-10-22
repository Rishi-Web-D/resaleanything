"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIES, CITIES } from "@/lib/categories";
import { CONDITIONS } from "@/lib/types";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

export default function PostForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-rose-600">{errors[k]}</p>;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErrors({}); setMessage("");
    const res = await fetch("/api/ads", { method: "POST", body: new FormData(e.currentTarget) });
    if (res.status === 401) return router.push("/login?next=/post");
    const d = await res.json().catch(() => ({}));
    if (res.ok) return router.push(`/ads/${d.id}`);
    setErrors(d.fields ?? {});
    setMessage(d.error ?? "Could not post your ad");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6">
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
      <label className="block text-sm font-medium">Price (₹)<input name="price" type="number" min={1} step={1} className={field} />{err("price")}</label>
      <label className="block text-sm font-medium">City
        <select name="city" className={field} defaultValue="">
          <option value="" disabled>Select…</option>
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>{err("city")}
      </label>
      <label className="block text-sm font-medium">Photos (up to 4, JPEG/PNG/WebP, 3 MB each)
        <input name="images" type="file" multiple accept="image/jpeg,image/png,image/webp" className={field} />{err("images")}
      </label>
      {message && !Object.keys(errors).length && <p role="alert" className="text-sm text-rose-600">{message}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-teal-700 py-2.5 font-semibold text-white disabled:opacity-60">{busy ? "Posting…" : "Post now"}</button>
    </form>
  );
}
