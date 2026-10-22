import { notFound, redirect } from "next/navigation";
import Chat from "@/components/Chat";
import { api, getUser } from "@/lib/api";
import type { MessageView } from "@/lib/types";

export default async function Thread({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect(`/login?next=/messages/${id}`);
  const r = await api<MessageView[]>(`/api/conversations/${encodeURIComponent(id)}/messages`, { auth: true });
  if (r.status === 404) notFound();
  if (!r.ok) throw new Error("Could not load conversation");
  return <Chat conversationId={id} meId={user.id} initial={r.data} />;
}
