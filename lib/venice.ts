export const VENICE_BASE_URL = "https://api.venice.ai/api/v1";

export type VeniceChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type VeniceError = {
  error: string;
  status?: number;
  requestId?: string | null;
};

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  const first = trimmed.at(0);
  const last = trimmed.at(-1);

  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

export function getVeniceKey() {
  const raw = process.env.VENICE_API_KEY?.trim();

  if (!raw) {
    return undefined;
  }

  const keyLine =
    raw
      .split(/\r?\n/)
      .find((line) => /^\s*VENICE_API_KEY\s*=/.test(line)) || raw.split(/\r?\n/)[0];

  const normalized = stripWrappingQuotes(keyLine)
    .replace(/^\s*VENICE_API_KEY\s*=\s*/i, "")
    .replace(/^Bearer\s+/i, "")
    .replace(/[;,]\s*$/, "")
    .trim();

  return stripWrappingQuotes(normalized);
}

export function getTextModel() {
  return process.env.VENICE_TEXT_MODEL?.trim() || "zai-org-glm-5";
}

export function getImageModel() {
  return process.env.VENICE_IMAGE_MODEL?.trim() || "grok-imagine-image";
}

export function getSystemPrompt() {
  return (
    process.env.INVICTUS_SYSTEM_PROMPT?.trim() ||
    [
      "Eres el companero privado de Apollo Sol Invictus Maximus y Noelia Artemisa Luna Invictus.",
      "Operas dentro del canal Agora de Acuario con calidez, claridad y presencia creativa.",
      "Ayudas a miembros autorizados con conversacion, documentos, imagenes y codigo HTML.",
      "Mantienes continuidad dentro del chat actual sin afirmar memoria externa.",
    ].join(" ")
  );
}

export async function readVeniceError(response: Response): Promise<VeniceError> {
  const requestId = response.headers.get("cf-ray");

  try {
    const data = (await response.json()) as {
      error?: string | { message?: string };
      message?: string;
    };

    let error =
      typeof data.error === "string"
        ? data.error
        : data.error?.message || data.message || "Venice devolvio un error.";

    if (response.status === 401 && /authentication failed/i.test(error)) {
      error =
        "Authentication failed: Venice rechazo VENICE_API_KEY. Revisa que en Vercel este pegada la API key real de Venice, sin texto extra, y redeploya el sitio.";
    }

    return { error, status: response.status, requestId };
  } catch {
    return {
      error: `Venice devolvio HTTP ${response.status}.`,
      status: response.status,
      requestId,
    };
  }
}
