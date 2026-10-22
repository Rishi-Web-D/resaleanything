import { redirect } from "next/navigation";
import PostForm from "@/components/PostForm";
import { getUser } from "@/lib/api";

export default async function PostPage() {
  if (!(await getUser())) redirect("/login?next=/post");
  return <PostForm />;
}
