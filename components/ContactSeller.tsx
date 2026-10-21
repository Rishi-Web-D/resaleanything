"use client";
import { useState } from "react";

export default function ContactSeller({ phone, seller }: { phone: string; seller: string }) {
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("Hi, is this still available?");
  const [sent, setSent] = useState(false);
  return (
    <div className="space-y-3">
      <button onClick={() => setShow(true)} className="w-full rounded-lg border-2 border-teal-700 py-2 font-semibold text-teal-700">
        {show ? `📞 ${phone}` : "Show phone number"}
      </button>
      {sent ? (
        <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-800">Message sent to {seller} (demo — nothing leaves your browser).</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-2">
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 p-2 text-sm" />
          <button className="w-full rounded-lg bg-teal-700 py-2 font-semibold text-white">Chat with seller</button>
        </form>
      )}
    </div>
  );
}
