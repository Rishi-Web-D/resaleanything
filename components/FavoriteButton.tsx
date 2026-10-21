"use client";
import { useSyncExternalStore } from "react";

const KEY = "ra-favs";
const listeners = new Set<() => void>();

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
export function useFavorites(): string[] {
  return JSON.parse(useSyncExternalStore(subscribe, read, () => "[]"));
}

export default function FavoriteButton({ id }: { id: string }) {
  const favs = useFavorites();
  const on = favs.includes(id);
  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    const next = on ? favs.filter((f) => f !== id) : [...favs, id];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    listeners.forEach((l) => l());
  }
  return (
    <button onClick={toggle} aria-pressed={on} aria-label={on ? "Remove favourite" : "Add favourite"}
      className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-lg shadow">
      <span className={on ? "text-rose-500" : "text-slate-500"}>{on ? "♥" : "♡"}</span>
    </button>
  );
}
