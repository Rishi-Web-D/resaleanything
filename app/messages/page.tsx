import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server/auth";
import { listConversations } from "@/lib/server/chat";
import { timeAgo } from "@/lib/format";

export default async function Inbox() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/messages");
  const convs = await listConversations(user.id);
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-3 text-lg font-bold">Chats</h1>
      {convs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">No conversations yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {convs.map((c) => (
            <li key={c.id}>
              <Link href={`/messages/${c.id}`} className="block p-4 hover:bg-slate-50">
                <div className="flex justify-between"><span className="font-medium">{c.other}</span><span className="text-xs text-slate-500">{timeAgo(c.lastAt)}</span></div>
                <div className="text-xs text-teal-700">{c.adTitle}</div>
                <div className="truncate text-sm text-slate-600">{c.lastMessage ?? "No messages yet"}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
