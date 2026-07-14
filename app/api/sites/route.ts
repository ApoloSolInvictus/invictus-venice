import { NextResponse } from "next/server";
import { AgoraAccessError, assertAgoraPermission, safePathSegment } from "@/lib/agora";
import { FirebaseConfigError, getAgoraBucket, getAgoraDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_HTML_CHARS = 250_000;
const SIGNED_URL_MS = 15 * 60 * 1000;

type SiteBody = {
  title?: string;
  htmlContent?: string;
  memberId?: string;
};

type SiteRecord = {
  title: string;
  path: string;
  memberId: string;
  memberLabel: string;
  size: number;
  createdAt: string;
};

function routeError(error: unknown) {
  if (error instanceof AgoraAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof FirebaseConfigError) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const message = error instanceof Error ? error.message : "No se pudo completar la accion.";
  return NextResponse.json({ error: message }, { status: 500 });
}

async function signedReadUrl(path: string) {
  const file = getAgoraBucket().file(path);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + SIGNED_URL_MS,
  });

  return url;
}

function normalizeHtml(html: string, title: string) {
  const trimmed = html.trim();

  if (/<!doctype html/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
    return trimmed;
  }

  return [
    "<!doctype html>",
    '<html lang="es">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${title.replace(/[<>]/g, "")}</title>`,
    "</head>",
    "<body>",
    trimmed,
    "</body>",
    "</html>",
  ].join("\n");
}

function siteFromSnapshot(id: string, data: FirebaseFirestore.DocumentData, url: string | null) {
  return {
    id,
    title: String(data.title || "Sitio HTML"),
    path: String(data.path || ""),
    memberId: String(data.memberId || ""),
    memberLabel: String(data.memberLabel || data.memberId || ""),
    size: Number(data.size || 0),
    createdAt: String(data.createdAt || ""),
    url,
  };
}

export async function GET() {
  try {
    const snapshot = await getAgoraDb()
      .collection("agora_sites")
      .orderBy("createdAt", "desc")
      .limit(30)
      .get();

    const sites = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const path = String(data.path || "");
        const url = path ? await signedReadUrl(path).catch(() => null) : null;
        return siteFromSnapshot(doc.id, data, url);
      }),
    );

    return NextResponse.json({ sites });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as SiteBody | null;
    const member = assertAgoraPermission(body?.memberId, "write");
    const rawTitle = body?.title?.trim() || "Sitio HTML Agora";
    const htmlContent = body?.htmlContent?.trim() || "";

    if (!htmlContent) {
      return NextResponse.json({ error: "El codigo HTML esta vacio." }, { status: 400 });
    }

    if (htmlContent.length > MAX_HTML_CHARS) {
      return NextResponse.json(
        { error: "El codigo HTML supera el limite de 250 KB." },
        { status: 413 },
      );
    }

    const title = rawTitle.slice(0, 90);
    const html = normalizeHtml(htmlContent, title);
    const buffer = Buffer.from(html, "utf8");
    const path = [
      "agora",
      "sites",
      safePathSegment(member.id),
      `${Date.now()}-${crypto.randomUUID()}-${safePathSegment(title) || "sitio"}`,
      "index.html",
    ].join("/");

    await getAgoraBucket().file(path).save(buffer, {
      resumable: false,
      metadata: {
        contentType: "text/html; charset=utf-8",
        metadata: {
          memberId: member.id,
          memberLabel: member.label,
          title,
        },
      },
    });

    const record: SiteRecord = {
      title,
      path,
      memberId: member.id,
      memberLabel: member.label,
      size: buffer.byteLength,
      createdAt: new Date().toISOString(),
    };

    const ref = await getAgoraDb().collection("agora_sites").add(record);
    const url = await signedReadUrl(path).catch(() => null);

    return NextResponse.json({
      site: {
        id: ref.id,
        ...record,
        url,
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
