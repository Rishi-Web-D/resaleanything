import { redirect } from "next/navigation";
import PostForm from "@/components/PostForm";
import { currentUser } from "@/lib/server/auth";

export default async function PostPage() {
  if (!(await currentUser())) redirect("/login?next=/post");
  return <PostForm />;
}
