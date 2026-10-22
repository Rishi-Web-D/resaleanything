import { notFound, redirect } from "next/navigation";
import Chat from "@/components/Chat";
import { currentUser } from "@/lib/server/auth";
import { getMessages } from "@/lib/server/chat";
import { HttpError } from "@/lib/server/http";

export default async function Thread({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/messages/${id}`);
  const initial = await getMessages(user.id, +id).catch((e) => {
    if (e instanceof HttpError) notFound();
    throw e;
  });
  return <Chat conversationId={+id} meId={user.id} initial={initial} />;
}
