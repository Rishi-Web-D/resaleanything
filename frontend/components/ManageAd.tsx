"use client";
import { useRouter } from "next/navigation";

export default function ManageAd({ id, sold }: { id: number; sold: boolean }) {
  const router = useRouter();
  async function toggle() {
    await fetch(`/api/ads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: sold ? "active" : "sold" }) });
    router.refresh();
  }
  async function remove() {
    if (!confirm("Delete this ad permanently?")) return;
    const r = await fetch(`/api/ads/${id}`, { method: "DELETE" });
    if (r.ok) { router.push("/my-ads"); router.refresh(); }
  }
  return (
    <div className="flex gap-2">
      <button onClick={toggle} className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium">{sold ? "Mark as available" : "Mark as sold"}</button>
      <button onClick={remove} className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600">Delete</button>
    </div>
  );
}
