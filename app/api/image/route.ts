import { NextResponse } from "next/server";
import { AgoraAccessError, assertAgoraPermission } from "@/lib/agora";
import { VENICE_BASE_URL, getImageModel, getVeniceKey, readVeniceError } from "@/lib/venice";

export const dynamic = "force-dynamic";

type ImageBody = {
  prompt?: string;
  negativePrompt?: string;
  model?: string;
  format?: "webp" | "png" | "jpeg";
  width?: number;
  height?: number;
  variants?: number;
  safeMode?: boolean;
  seed?: number;
  cfgScale?: number;
  stylePreset?: string;
  memberId?: string;
};

function numberInRange(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

export async function POST(request: Request) {
  const apiKey = getVeniceKey();

  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta VENICE_API_KEY en las variables de entorno." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as ImageBody | null;
  try {
    assertAgoraPermission(body?.memberId, "write");
  } catch (error) {
    if (error instanceof AgoraAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }

  const prompt = body?.prompt?.trim();

  if (!prompt) {
    return NextResponse.json({ error: "El prompt de imagen esta vacio." }, { status: 400 });
  }

  const model = body?.model?.trim() || getImageModel();
  const payload: Record<string, unknown> = {
    model,
    prompt: prompt.slice(0, 1500),
    format: body?.format || "webp",
    variants: numberInRange(body?.variants, 1, 1, 4),
    return_binary: false,
    safe_mode: body?.safeMode ?? false,
  };

  if (body?.negativePrompt?.trim()) {
    payload.negative_prompt = body.negativePrompt.trim().slice(0, 1500);
  }

  if (body?.stylePreset?.trim()) {
    payload.style_preset = body.stylePreset.trim();
  }

  if (typeof body?.seed === "number" && Number.isFinite(body.seed)) {
    payload.seed = Math.round(body.seed);
  }

  if (typeof body?.cfgScale === "number" && Number.isFinite(body.cfgScale)) {
    payload.cfg_scale = Math.min(20, Math.max(1, body.cfgScale));
  }

  if (model === "qwen-image-2") {
    payload.aspect_ratio = "1:1";
  } else {
    payload.width = numberInRange(body?.width, 1024, 256, 1280);
    payload.height = numberInRange(body?.height, 1024, 256, 1280);
  }

  const response = await fetch(`${VENICE_BASE_URL}/image/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return NextResponse.json(await readVeniceError(response), { status: response.status });
  }

  const data = (await response.json()) as {
    id?: string;
    images?: string[];
    timing?: unknown;
  };

  if (!data.images?.length) {
    return NextResponse.json({ error: "Venice no devolvio imagenes." }, { status: 502 });
  }

  return NextResponse.json({
    id: data.id || null,
    images: data.images.map((image) => `data:image/${payload.format};base64,${image}`),
    timing: data.timing || null,
  });
}
