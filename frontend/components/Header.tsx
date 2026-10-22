import Link from "next/link";
import { Suspense } from "react";
import { CITIES } from "@/lib/categories";
import { getUser } from "@/lib/api";
import LogoutButton from "./LogoutButton";

async function Account() {
  const user = await getUser();
  if (!user)
    return (
      <>
        <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-teal-700">Login</Link>
        <Link href="/register" className="hidden text-sm font-medium text-slate-700 hover:text-teal-700 sm:block">Sign up</Link>
      </>
    );
  return (
    <>
      <Link href="/messages" className="text-sm font-medium text-slate-700 hover:text-teal-700">Chats</Link>
      <Link href="/my-ads" className="hidden text-sm font-medium text-slate-700 hover:text-teal-700 sm:block">My ads</Link>
      <span className="hidden text-xs text-slate-500 md:block">Hi, {user.name.split(" ")[0]}</span>
      <LogoutButton />
    </>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-teal-700">
          resale<span className="text-amber-500">anything</span>
        </Link>
        <form action="/search" className="flex flex-1 gap-2">
          <select name="city" aria-label="City" className="hidden rounded-lg border border-slate-300 bg-white px-2 text-sm sm:block">
            <option value="">All India</option>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input name="q" placeholder="Search phones, cycles, sofas…" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600" />
          <button className="rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800">Search</button>
        </form>
        <Link href="/favorites" aria-label="Favourites" className="text-xl">♡</Link>
        <Suspense fallback={null}><Account /></Suspense>
        <Link href="/post" className="rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-amber-300">+ Sell</Link>
      </div>
    </header>
  );
}
