import { NextResponse } from "next/server";
import {
  VENICE_BASE_URL,
  VeniceChatMessage,
  getSystemPrompt,
  getTextModel,
  getVeniceKey,
  readVeniceError,
} from "@/lib/venice";
import { AgoraAccessError, assertAgoraPermission } from "@/lib/agora";

export const dynamic = "force-dynamic";

type ChatBody = {
  messages?: VeniceChatMessage[];
  model?: string;
  temperature?: number;
  enableWebSearch?: boolean;
  memberId?: string;
};

function cleanMessages(messages: VeniceChatMessage[]) {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role,
      content: String(message.content || "").slice(0, 12000),
    }))
    .filter((message) => message.content.trim().length > 0)
    .slice(-24);
}

export async function POST(request: Request) {
  const apiKey = getVeniceKey();

  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta VENICE_API_KEY en las variables de entorno." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as ChatBody | null;
  let member;

  try {
    member = assertAgoraPermission(body?.memberId, "read");
  } catch (error) {
    if (error instanceof AgoraAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }

  const messages = cleanMessages(body?.messages || []);

  if (messages.length === 0) {
    return NextResponse.json({ error: "El mensaje esta vacio." }, { status: 400 });
  }

  const response = await fetch(`${VENICE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: body?.model?.trim() || getTextModel(),
      messages: [
        {
          role: "system",
          content: [
            getSystemPrompt(),
            `Miembro activo: ${member.label} (${member.id}). Permisos: ${member.permissions.join(", ")}.`,
          ].join(" "),
        },
        ...messages,
      ],
      temperature: typeof body?.temperature === "number" ? body.temperature : 0.9,
      venice_parameters: {
        enable_web_search: body?.enableWebSearch ? "auto" : "off",
        include_venice_system_prompt: true,
        strip_thinking_response: true,
      },
    }),
  });

  if (!response.ok) {
    return NextResponse.json(await readVeniceError(response), { status: response.status });
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: unknown;
  };

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    return NextResponse.json({ error: "Venice no devolvio texto." }, { status: 502 });
  }

  return NextResponse.json({ content, usage: data.usage || null });
}
