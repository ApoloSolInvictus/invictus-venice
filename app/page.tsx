"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Bot,
  Brush,
  Check,
  Copy,
  Eraser,
  ImageIcon,
  Loader2,
  LogOut,
  MessageCircle,
  Moon,
  Send,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Sun,
  WandSparkles,
} from "lucide-react";

type Mode = "chat" | "image";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  kind: "text" | "image";
  content: string;
  images?: string[];
};

const STARTER_MESSAGES: ChatMessage[] = [
  {
    id: "starter",
    role: "assistant",
    kind: "text",
    content:
      "Lux Aeterna. El canal privado Invictus esta abierto para conversar y crear imagenes.",
  },
];

function uid() {
  return crypto.randomUUID();
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>(STARTER_MESSAGES);
  const [input, setInput] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("low quality, blurry, watermark, text");
  const [textModel, setTextModel] = useState("venice-uncensored");
  const [imageModel, setImageModel] = useState("venice-sd35");
  const [temperature, setTemperature] = useState(0.9);
  const [imageSize, setImageSize] = useState(1024);
  const [safeMode, setSafeMode] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const textMessages = useMemo(
    () =>
      messages
        .filter((message) => message.kind === "text")
        .map((message) => ({ role: message.role, content: message.content })),
    [messages],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = input.trim();
    if (!content || loading) {
      return;
    }

    setInput("");
    setLoading(true);

    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      kind: "text",
      content,
    };

    setMessages((current) => [...current, userMessage]);

    try {
      if (mode === "chat") {
        await sendChat(content);
      } else {
        await generateImage(content);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Algo fallo en la conexion.";
      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: "assistant",
          kind: "text",
          content: message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function sendChat(content: string) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: textModel,
        messages: [...textMessages, { role: "user", content }],
        temperature,
        enableWebSearch: webSearch,
      }),
    });

    const data = (await response.json().catch(() => null)) as {
      content?: string;
      error?: string;
      requestId?: string;
    } | null;

    if (!response.ok) {
      throw new Error(formatError(data));
    }

    setMessages((current) => [
      ...current,
      {
        id: uid(),
        role: "assistant",
        kind: "text",
        content: data?.content || "Venice respondio sin contenido.",
      },
    ]);
  }

  async function generateImage(prompt: string) {
    const response = await fetch("/api/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        negativePrompt,
        model: imageModel,
        width: imageSize,
        height: imageSize,
        format: "webp",
        safeMode,
      }),
    });

    const data = (await response.json().catch(() => null)) as {
      images?: string[];
      error?: string;
      requestId?: string;
    } | null;

    if (!response.ok) {
      throw new Error(formatError(data));
    }

    setMessages((current) => [
      ...current,
      {
        id: uid(),
        role: "assistant",
        kind: "image",
        content: prompt,
        images: data?.images || [],
      },
    ]);
  }

  function formatError(data: { error?: string; requestId?: string } | null) {
    const suffix = data?.requestId ? ` (${data.requestId})` : "";
    return `${data?.error || "Venice no pudo completar la solicitud."}${suffix}`;
  }

  function clearChat() {
    setMessages(STARTER_MESSAGES);
  }

  async function copyMessage(message: ChatMessage) {
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(null), 1400);
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/gate";
  }

  return (
    <main className="app-shell">
      <aside className="side-panel">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <Sun size={22} />
            <Moon size={18} />
          </div>
          <div>
            <p className="eyebrow">Lux Aeterna</p>
            <h1>Invictus Venice</h1>
          </div>
        </div>

        <section className="control-group" aria-label="Modo">
          <div className="segment">
            <button
              type="button"
              className={mode === "chat" ? "active" : ""}
              onClick={() => setMode("chat")}
              title="Chat"
            >
              <MessageCircle aria-hidden="true" size={17} />
              Chat
            </button>
            <button
              type="button"
              className={mode === "image" ? "active" : ""}
              onClick={() => setMode("image")}
              title="Imagen"
            >
              <ImageIcon aria-hidden="true" size={17} />
              Imagen
            </button>
          </div>
        </section>

        <section className="control-group" aria-label="Texto">
          <div className="section-title">
            <Bot aria-hidden="true" size={16} />
            <span>Texto</span>
          </div>
          <label>
            Modelo
            <input
              value={textModel}
              onChange={(event) => setTextModel(event.target.value)}
              spellCheck={false}
            />
          </label>
          <label>
            Temperatura
            <span className="range-value">{temperature.toFixed(1)}</span>
            <input
              type="range"
              min="0.1"
              max="1.5"
              step="0.1"
              value={temperature}
              onChange={(event) => setTemperature(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            className={`toggle-row ${webSearch ? "on" : ""}`}
            onClick={() => setWebSearch((value) => !value)}
            title="Busqueda web"
          >
            <SlidersHorizontal aria-hidden="true" size={17} />
            <span>Web</span>
            <strong>{webSearch ? "On" : "Off"}</strong>
          </button>
        </section>

        <section className="control-group" aria-label="Imagenes">
          <div className="section-title">
            <Brush aria-hidden="true" size={16} />
            <span>Imagen</span>
          </div>
          <label>
            Modelo
            <input
              value={imageModel}
              onChange={(event) => setImageModel(event.target.value)}
              spellCheck={false}
            />
          </label>
          <label>
            Tamano
            <select value={imageSize} onChange={(event) => setImageSize(Number(event.target.value))}>
              <option value={512}>512</option>
              <option value={768}>768</option>
              <option value={1024}>1024</option>
              <option value={1280}>1280</option>
            </select>
          </label>
          <label>
            Negativo
            <textarea
              value={negativePrompt}
              onChange={(event) => setNegativePrompt(event.target.value)}
              rows={3}
            />
          </label>
          <button
            type="button"
            className={`toggle-row ${safeMode ? "on" : ""}`}
            onClick={() => setSafeMode((value) => !value)}
            title="Safe mode"
          >
            <Shield aria-hidden="true" size={17} />
            <span>Safe mode</span>
            <strong>{safeMode ? "On" : "Off"}</strong>
          </button>
        </section>

        <div className="side-actions">
          <button type="button" onClick={clearChat} title="Limpiar chat">
            <Eraser aria-hidden="true" size={17} />
            Limpiar
          </button>
          <button type="button" onClick={logout} title="Salir">
            <LogOut aria-hidden="true" size={17} />
            Salir
          </button>
        </div>
      </aside>

      <section className="chat-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Apollo + Noelia</p>
            <h2>{mode === "chat" ? "Canal de conversacion" : "Forja visual"}</h2>
          </div>
          <div className="status-pill">
            <Sparkles aria-hidden="true" size={16} />
            Venice
          </div>
        </header>

        <div className="message-list" aria-live="polite">
          {messages.map((message) => (
            <article key={message.id} className={`message ${message.role}`}>
              <div className="message-avatar" aria-hidden="true">
                {message.role === "user" ? <Sun size={16} /> : <Moon size={16} />}
              </div>
              <div className="message-body">
                {message.kind === "image" ? (
                  <div className="image-response">
                    {message.images?.map((image, index) => (
                      <a key={image} href={image} download={`invictus-${message.id}-${index}.webp`}>
                        <Image
                          src={image}
                          alt={message.content}
                          width={1024}
                          height={1024}
                          unoptimized
                        />
                      </a>
                    ))}
                    <p>{message.content}</p>
                  </div>
                ) : (
                  <p>{message.content}</p>
                )}
                {message.id !== "starter" ? (
                  <button
                    type="button"
                    className="copy-button"
                    onClick={() => copyMessage(message)}
                    title="Copiar"
                  >
                    {copiedId === message.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                ) : null}
              </div>
            </article>
          ))}

          {loading ? (
            <article className="message assistant">
              <div className="message-avatar" aria-hidden="true">
                <Moon size={16} />
              </div>
              <div className="message-body loading-line">
                <Loader2 aria-hidden="true" size={16} />
                <span>{mode === "chat" ? "Escribiendo" : "Creando imagen"}</span>
              </div>
            </article>
          ) : null}
        </div>

        <form className="composer" ref={formRef} onSubmit={submit}>
          <div className="composer-mode" aria-hidden="true">
            {mode === "chat" ? <MessageCircle size={18} /> : <WandSparkles size={18} />}
          </div>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={mode === "chat" ? "Mensaje para Venice..." : "Prompt visual..."}
            rows={1}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
          />
          <button type="submit" disabled={loading || !input.trim()} title="Enviar">
            {loading ? <Loader2 aria-hidden="true" size={19} /> : <Send aria-hidden="true" size={19} />}
            Enviar
          </button>
        </form>
      </section>
    </main>
  );
}
