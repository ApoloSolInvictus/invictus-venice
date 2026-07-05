import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE, accessDigest, hasAccessCode } from "@/lib/access";

export async function POST(request: Request) {
  if (!hasAccessCode()) {
    return NextResponse.json({ ok: true });
  }

  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  const code = body?.code?.trim();

  if (!code || code !== process.env.INVICTUS_ACCESS_CODE?.trim()) {
    return NextResponse.json({ error: "Codigo incorrecto." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, await accessDigest(code), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);

  return NextResponse.json({ ok: true });
}
