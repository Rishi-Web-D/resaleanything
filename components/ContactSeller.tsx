"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ContactSeller({ adId, seller, loggedIn }: { adId: string; seller: string; loggedIn: boolean }) {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [error, setError] = useState("");
  const login = () => router.push(`/login?next=${encodeURIComponent(`/ads/${adId}`)}`);

  async function reveal() {
    if (!loggedIn) return login();
    const r = await fetch(`/api/ads/${adId}/phone`);
    if (r.ok) setPhone((await r.json()).phone);
    else setError("Could not load the number");
  }
  async function chat() {
    if (!loggedIn) return login();
    const r = await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adId: Number(adId) }) });
    const d = await r.json();
    if (r.ok) router.push(`/messages/${d.id}`);
    else setError(d.error ?? "Could not start chat");
  }
  return (
    <div className="space-y-3">
      <button onClick={reveal} className="w-full rounded-lg border-2 border-teal-700 py-2 font-semibold text-teal-700">
        {phone ? `📞 ${phone}` : "Show phone number"}
      </button>
      <button onClick={chat} className="w-full rounded-lg bg-teal-700 py-2 font-semibold text-white">Chat with {seller}</button>
      {!loggedIn && <p className="text-xs text-slate-500">Log in to contact the seller.</p>}
      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
