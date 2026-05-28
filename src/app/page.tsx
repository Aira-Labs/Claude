import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default function RootPage() {
  const session = cookies().get("aira-session");
  if (session?.value) redirect("/chat");
  redirect("/login");
}
