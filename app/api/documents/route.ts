import { NextResponse } from "next/server";
import { AgoraAccessError, assertAgoraPermission, safePathSegment } from "@/lib/agora";
import { FirebaseConfigError, getAgoraBucket, getAgoraDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_MS = 15 * 60 * 1000;

type DocumentRecord = {
  name: string;
  path: string;
  memberId: string;
  memberLabel: string;
  contentType: string;
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

function documentFromSnapshot(
  id: string,
  data: FirebaseFirestore.DocumentData,
  url: string | null,
) {
  return {
    id,
    name: String(data.name || "documento"),
    path: String(data.path || ""),
    memberId: String(data.memberId || ""),
    memberLabel: String(data.memberLabel || data.memberId || ""),
    contentType: String(data.contentType || "application/octet-stream"),
    size: Number(data.size || 0),
    createdAt: String(data.createdAt || ""),
    url,
  };
}

export async function GET() {
  try {
    const snapshot = await getAgoraDb()
      .collection("agora_documents")
      .orderBy("createdAt", "desc")
      .limit(30)
      .get();

    const documents = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const path = String(data.path || "");
        const url = path ? await signedReadUrl(path).catch(() => null) : null;
        return documentFromSnapshot(doc.id, data, url);
      }),
    );

    return NextResponse.json({ documents });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const member = assertAgoraPermission(form.get("memberId"), "write");
    const upload = form.get("file");

    if (!upload || typeof upload !== "object" || !("arrayBuffer" in upload)) {
      return NextResponse.json({ error: "Falta el archivo para subir." }, { status: 400 });
    }

    const file = upload as File;
    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: "El archivo esta vacio." }, { status: 400 });
    }

    if (buffer.byteLength > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "El archivo supera el limite de 10 MB." },
        { status: 413 },
      );
    }

    const originalName = file.name || `documento-${Date.now()}`;
    const safeName = safePathSegment(originalName) || `documento-${Date.now()}`;
    const contentType = file.type || "application/octet-stream";
    const path = [
      "agora",
      "documents",
      safePathSegment(member.id),
      `${Date.now()}-${crypto.randomUUID()}-${safeName}`,
    ].join("/");

    await getAgoraBucket().file(path).save(buffer, {
      resumable: false,
      metadata: {
        contentType,
        metadata: {
          memberId: member.id,
          memberLabel: member.label,
          originalName,
        },
      },
    });

    const record: DocumentRecord = {
      name: originalName,
      path,
      memberId: member.id,
      memberLabel: member.label,
      contentType,
      size: buffer.byteLength,
      createdAt: new Date().toISOString(),
    };

    const ref = await getAgoraDb().collection("agora_documents").add(record);
    const url = await signedReadUrl(path).catch(() => null);

    return NextResponse.json({
      document: {
        id: ref.id,
        ...record,
        url,
      },
    });
  } catch (error) {
    return routeError(error);
  }
}
