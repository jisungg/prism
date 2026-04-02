import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSessionUser, getUserByUsername } from "@/lib/auth";
import { db } from "@/lib/db";

function redirectToDashboard(request: Request, tab = "profile") {
  return NextResponse.redirect(new URL(`/dashboard?tab=${tab}`, request.url), {
    status: 303,
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  const formData = await request.formData();
  const username = String(formData.get("username") ?? "").trim();
  const redirectTab = String(formData.get("redirectTab") ?? "profile");

  if (!username) {
    return redirectToDashboard(request, redirectTab);
  }

  const target = await getUserByUsername(username);

  if (!target || target.id === user.id) {
    return redirectToDashboard(request, redirectTab);
  }

  await db.query(
    `
      INSERT INTO user_follows (follower_user_id, followed_user_id, notify_on_posts)
      VALUES ($1, $2, true)
      ON CONFLICT (follower_user_id, followed_user_id) DO NOTHING
    `,
    [user.id, target.id],
  );

  revalidatePath("/dashboard");
  return redirectToDashboard(request, redirectTab);
}
