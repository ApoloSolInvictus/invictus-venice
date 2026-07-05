import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE } from "./lib/access";

const ACCESS_SALT = "invictus-venice-access-v1";

async function digestAccess(code: string) {
  const bytes = new TextEncoder().encode(`${ACCESS_SALT}:${code.trim()}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function proxy(request: NextRequest) {
  const accessCode = process.env.INVICTUS_ACCESS_CODE?.trim();

  if (!accessCode) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const isGate = pathname === "/gate";
  const isAuth = pathname.startsWith("/api/auth");
  const isAsset =
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt";

  if (isGate || isAuth || isAsset) {
    return NextResponse.next();
  }

  const expectedToken = await digestAccess(accessCode);
  const token = request.cookies.get(ACCESS_COOKIE)?.value;

  if (token === expectedToken) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Acceso Invictus requerido." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/gate";
  url.searchParams.set("next", pathname);

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/api/:path*"],
};
