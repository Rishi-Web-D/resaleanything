"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const reg = mode === "register";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setErrors({}); setMessage("");
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
    });
    if (res.ok) {
      const next = new URLSearchParams(location.search).get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
      return;
    }
    const d = await res.json().catch(() => ({}));
    setErrors(d.fields ?? {});
    setMessage(d.error ?? "Something went wrong");
    setBusy(false);
  }
  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-rose-600">{errors[k]}</p>;

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-bold">{reg ? "Create your account" : "Welcome back"}</h1>
      {reg && <label className="block text-sm font-medium">Name<input name="name" autoComplete="name" className={field} />{err("name")}</label>}
      <label className="block text-sm font-medium">Email<input name="email" type="email" autoComplete="email" className={field} />{err("email")}</label>
      {reg && <label className="block text-sm font-medium">Mobile<input name="phone" inputMode="numeric" autoComplete="tel" className={field} />{err("phone")}</label>}
      <label className="block text-sm font-medium">Password<input name="password" type="password" autoComplete={reg ? "new-password" : "current-password"} className={field} />{err("password")}</label>
      {message && !Object.keys(errors).length && <p role="alert" className="text-sm text-rose-600">{message}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-teal-700 py-2.5 font-semibold text-white disabled:opacity-60">{busy ? "…" : reg ? "Sign up" : "Log in"}</button>
      <p className="text-center text-sm text-slate-500">
        {reg ? <>Have an account? <Link className="text-teal-700" href="/login">Log in</Link></> : <>New here? <Link className="text-teal-700" href="/register">Create an account</Link></>}
      </p>
    </form>
  );
}
