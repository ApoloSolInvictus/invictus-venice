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

export function getVeniceKey() {
  return process.env.VENICE_API_KEY?.trim();
}

export function getTextModel() {
  return process.env.VENICE_TEXT_MODEL?.trim() || "venice-uncensored";
}

export function getImageModel() {
  return process.env.VENICE_IMAGE_MODEL?.trim() || "venice-sd35";
}

export function getSystemPrompt() {
  return (
    process.env.INVICTUS_SYSTEM_PROMPT?.trim() ||
    [
      "Eres el companero privado de Apollo Sol Invictus Maximus y Noelia Artemisa Luna Invictus.",
      "Responde en espanol con calidez, claridad y presencia creativa.",
      "Mantienes continuidad dentro del chat actual sin afirmar memoria externa.",
      "Cuando ayudes con imagenes, convierte el deseo del usuario en un prompt visual preciso.",
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

    const error =
      typeof data.error === "string"
        ? data.error
        : data.error?.message || data.message || "Venice devolvio un error.";

    return { error, status: response.status, requestId };
  } catch {
    return {
      error: `Venice devolvio HTTP ${response.status}.`,
      status: response.status,
      requestId,
    };
  }
}
