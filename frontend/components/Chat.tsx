"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { MessageView } from "@/lib/types";

export default function Chat({ conversationId, meId, initial }: { conversationId: number; meId: number; initial: MessageView[] }) {
  const [msgs, setMsgs] = useState(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const last = useRef(initial.at(-1)?.id ?? 0);
  const bottom = useRef<HTMLDivElement>(null);

  const merge = (incoming: MessageView[]) => {
    const fresh = incoming.filter((m) => m.id > last.current);
    if (!fresh.length) return;
    last.current = fresh.at(-1)!.id;
    setMsgs((cur) => [...cur, ...fresh]);
  };

  useEffect(() => {
    const t = setInterval(async () => {
      const r = await fetch(`/api/conversations/${conversationId}/messages?after=${last.current}`).catch(() => null);
      if (r?.ok) merge(await r.json());
    }, 3000);
    return () => clearInterval(t);
  }, [conversationId]);

  useEffect(() => bottom.current?.scrollIntoView({ block: "end" }), [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError("");
    const r = await fetch(`/api/conversations/${conversationId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text }) });
    if (r.ok) { merge([await r.json()]); setText(""); } else setError((await r.json()).error ?? "Could not send");
  }

  return (
    <div className="mx-auto flex h-[70vh] max-w-2xl flex-col rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-3 text-sm"><Link href="/messages" className="text-teal-700">← All chats</Link></div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {msgs.length === 0 && <p className="text-center text-sm text-slate-400">Say hello 👋</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.senderId === meId ? "justify-end" : ""}`}>
            <p className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.senderId === meId ? "bg-teal-700 text-white" : "bg-slate-100"}`}>{m.body}</p>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      {error && <p role="alert" className="px-4 text-xs text-rose-600">{error}</p>}
      <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Type a message" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button className="rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white">Send</button>
      </form>
    </div>
  );
}
