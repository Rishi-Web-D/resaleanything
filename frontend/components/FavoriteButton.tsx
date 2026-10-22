"use client";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

// Favourites live on the server; this is a small client cache of the viewer's ids.
let ids: string[] | null = null; // null = not loaded yet, [] = loaded (or logged out)
let loading = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function load() {
  if (loading) return;
  loading = true;
  try {
    const r = await fetch("/api/favorites?ids=only");
    ids = r.ok ? (await r.json()).ids : [];
  } catch {
    ids = [];
  }
  loading = false;
  emit();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  if (ids === null) void load();
  return () => void listeners.delete(cb);
}
const EMPTY: string[] = [];
const snapshot = () => ids ?? EMPTY;

export default function FavoriteButton({ id }: { id: string }) {
  const router = useRouter();
  const favs = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const on = favs.includes(id);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    const res = await fetch(`/api/favorites/${id}`, { method: on ? "DELETE" : "PUT" });
    if (res.status === 401) return router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
    if (res.ok) {
      ids = on ? favs.filter((f) => f !== id) : [...favs, id];
      emit();
    }
  }
  return (
    <button onClick={toggle} aria-pressed={on} aria-label={on ? "Remove favourite" : "Add favourite"} className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-lg shadow">
      <span className={on ? "text-rose-500" : "text-slate-500"}>{on ? "♥" : "♡"}</span>
    </button>
  );
}
