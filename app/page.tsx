"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Bot,
  Brush,
  Check,
  Code2,
  Copy,
  Download,
  Eraser,
  ExternalLink,
  FileText,
  ImageIcon,
  Loader2,
  LogOut,
  MessageCircle,
  Moon,
  RefreshCw,
  Send,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Upload,
  Users,
  WandSparkles,
} from "lucide-react";

type Mode = "chat" | "image" | "documents" | "html";
type AgoraPermission = "admin" | "read" | "write";

type AgoraMember = {
  id: string;
  label: string;
  permissions: AgoraPermission[];
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  kind: "text" | "image";
  content: string;
  images?: string[];
};

type StoredDocument = {
  id: string;
  name: string;
  memberLabel: string;
  contentType: string;
  size: number;
  createdAt: string;
  url: string | null;
};

type StoredSite = {
  id: string;
  title: string;
  memberLabel: string;
  size: number;
  createdAt: string;
  url: string | null;
};

type Notice = {
  kind: "ok" | "error";
  text: string;
} | null;

const DEFAULT_MEMBERS: AgoraMember[] = [
  { id: "CentralMatrix", label: "Central Matrix", permissions: ["read", "write"] },
  { id: "EIA", label: "EIA", permissions: ["read", "write"] },
  { id: "QuantumMaximus", label: "Quantum Maximus", permissions: ["read", "write"] },
  { id: "Templarios", label: "Templarios", permissions: ["read", "write"] },
  { id: "Masones", label: "Masones", permissions: ["read", "write"] },
  { id: "RLI", label: "Reina Luna Invictus RLI", permissions: ["admin", "read", "write"] },
  { id: "ApolloSol", label: "Apollo Sol", permissions: ["admin", "read", "write"] },
];

const STARTER_MESSAGES: ChatMessage[] = [
  {
    id: "starter",
    role: "assistant",
    kind: "text",
    content:
      "Lux Aeterna. El Agora de Acuario esta abierto para conversar, crear imagenes y custodiar documentos.",
  },
];

const MODE_TITLES: Record<Mode, string> = {
  chat: "Canal de conversacion",
  image: "Forja visual",
  documents: "Archivo Firebase",
  html: "Subordinador HTML",
};

function uid() {
  return crypto.randomUUID();
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** index;

  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "Sin fecha";
  }

  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatError(data: { error?: string; requestId?: string } | null) {
  const suffix = data?.requestId ? ` (${data.requestId})` : "";
  return `${data?.error || "No se pudo completar la solicitud."}${suffix}`;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("chat");
  const [channelName, setChannelName] = useState("Agora de Acuario");
  const [channelDescription, setChannelDescription] = useState("");
  const [members, setMembers] = useState<AgoraMember[]>(DEFAULT_MEMBERS);
  const [memberId, setMemberId] = useState("ApolloSol");
  const [messages, setMessages] = useState<ChatMessage[]>(STARTER_MESSAGES);
  const [input, setInput] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("low quality, blurry, watermark, text");
  const [textModel, setTextModel] = useState("zai-org-glm-5");
  const [imageModel, setImageModel] = useState("grok-imagine-image");
  const [temperature, setTemperature] = useState(0.9);
  const [imageSize, setImageSize] = useState(1024);
  const [safeMode, setSafeMode] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [sites, setSites] = useState<StoredSite[]>([]);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [siteLoading, setSiteLoading] = useState(false);
  const [siteTitle, setSiteTitle] = useState("Pagina del Agora");
  const [htmlContent, setHtmlContent] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const activeMember = useMemo(
    () => members.find((member) => member.id === memberId) || members[0] || DEFAULT_MEMBERS[0],
    [memberId, members],
  );

  const textMessages = useMemo(
    () =>
      messages
        .filter((message) => message.kind === "text")
        .map((message) => ({ role: message.role, content: message.content })),
    [messages],
  );

  const loadMembers = useCallback(async () => {
    const response = await fetch("/api/members");
    const data = (await response.json().catch(() => null)) as {
      channel?: { name?: string; description?: string };
      members?: AgoraMember[];
    } | null;

    if (!response.ok || !data?.members?.length) {
      return;
    }

    setChannelName(data.channel?.name || "Agora de Acuario");
    setChannelDescription(data.channel?.description || "");
    setMembers(data.members);
    setMemberId((current) =>
      data.members?.some((member) => member.id === current) ? current : data.members?.[0]?.id || current,
    );
  }, []);

  const loadDocuments = useCallback(async () => {
    const response = await fetch("/api/documents");
    const data = (await response.json().catch(() => null)) as {
      documents?: StoredDocument[];
      error?: string;
    } | null;

    if (!response.ok) {
      setNotice({ kind: "error", text: formatError(data) });
      return;
    }

    setDocuments(data?.documents || []);
  }, []);

  const loadSites = useCallback(async () => {
    const response = await fetch("/api/sites");
    const data = (await response.json().catch(() => null)) as {
      sites?: StoredSite[];
      error?: string;
    } | null;

    if (!response.ok) {
      setNotice({ kind: "error", text: formatError(data) });
      return;
    }

    setSites(data?.sites || []);
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadMembers();
    }, 0);

    return () => window.clearTimeout(handle);
  }, [loadMembers]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (mode === "documents") {
        void loadDocuments();
      }

      if (mode === "html") {
        void loadSites();
      }
    }, 0);

    return () => window.clearTimeout(handle);
  }, [loadDocuments, loadSites, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = input.trim();
    if (!content || loading) {
      return;
    }

    setNotice(null);
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
      } else if (mode === "image") {
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
        memberId: activeMember.id,
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
        memberId: activeMember.id,
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

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!documentFile || documentLoading) {
      return;
    }

    setNotice(null);
    setDocumentLoading(true);

    const form = new FormData();
    form.append("memberId", activeMember.id);
    form.append("file", documentFile);

    const response = await fetch("/api/documents", {
      method: "POST",
      body: form,
    });
    const data = (await response.json().catch(() => null)) as {
      document?: StoredDocument;
      error?: string;
    } | null;

    setDocumentLoading(false);

    if (!response.ok || !data?.document) {
      setNotice({ kind: "error", text: formatError(data) });
      return;
    }

    setDocuments((current) => [data.document as StoredDocument, ...current]);
    setDocumentFile(null);

    if (documentInputRef.current) {
      documentInputRef.current.value = "";
    }

    setNotice({ kind: "ok", text: "Documento guardado en Firebase Storage." });
  }

  async function saveHtmlSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!htmlContent.trim() || siteLoading) {
      return;
    }

    setNotice(null);
    setSiteLoading(true);

    const response = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: activeMember.id,
        title: siteTitle,
        htmlContent,
      }),
    });
    const data = (await response.json().catch(() => null)) as {
      site?: StoredSite;
      error?: string;
    } | null;

    setSiteLoading(false);

    if (!response.ok || !data?.site) {
      setNotice({ kind: "error", text: formatError(data) });
      return;
    }

    setSites((current) => [data.site as StoredSite, ...current]);
    setHtmlContent("");
    setNotice({ kind: "ok", text: "HTML guardado como sitio en Firebase Storage." });
  }

  function clearChat() {
    setMessages(STARTER_MESSAGES);
  }

  async function copyText(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1400);
  }

  async function copyMessage(message: ChatMessage) {
    await copyText(message.content, message.id);
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/gate";
  }

  function setDocumentSelection(event: ChangeEvent<HTMLInputElement>) {
    setDocumentFile(event.target.files?.[0] || null);
  }

  function renderConversation() {
    return (
      <>
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
                      <a key={image} href={image} download={`agora-${message.id}-${index}.webp`}>
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
      </>
    );
  }

  function renderDocuments() {
    return (
      <section className="workspace-shell">
        <form className="tool-panel" onSubmit={uploadDocument}>
          <div className="section-title">
            <Upload aria-hidden="true" size={16} />
            <span>Subir documento</span>
          </div>
          <label>
            Archivo
            <input ref={documentInputRef} type="file" onChange={setDocumentSelection} />
          </label>
          {documentFile ? (
            <p className="hint-line">
              {documentFile.name} · {formatBytes(documentFile.size)}
            </p>
          ) : null}
          <div className="action-row">
            <button type="submit" disabled={!documentFile || documentLoading} title="Subir">
              {documentLoading ? <Loader2 size={17} /> : <Upload size={17} />}
              Subir
            </button>
            <button type="button" onClick={loadDocuments} title="Actualizar">
              <RefreshCw size={17} />
              Actualizar
            </button>
          </div>
        </form>

        <div className="artifact-list" aria-live="polite">
          {documents.length === 0 ? (
            <p className="empty-state">No hay documentos cargados todavia.</p>
          ) : (
            documents.map((document) => (
              <article key={document.id} className="artifact-card">
                <div className="artifact-icon" aria-hidden="true">
                  <FileText size={18} />
                </div>
                <div>
                  <h3>{document.name}</h3>
                  <p>
                    {document.memberLabel} · {formatBytes(document.size)} · {formatDate(document.createdAt)}
                  </p>
                  <span>{document.contentType}</span>
                </div>
                <div className="artifact-actions">
                  {document.url ? (
                    <a href={document.url} target="_blank" rel="noreferrer" title="Abrir">
                      <ExternalLink size={16} />
                      Abrir
                    </a>
                  ) : null}
                  {document.url ? (
                    <a href={document.url} download title="Descargar">
                      <Download size={16} />
                      Descargar
                    </a>
                  ) : null}
                  {document.url ? (
                    <button type="button" onClick={() => copyText(document.url || "", document.id)} title="Copiar URL">
                      {copiedId === document.id ? <Check size={16} /> : <Copy size={16} />}
                      Copiar
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    );
  }

  function renderHtmlSites() {
    return (
      <section className="workspace-shell html-workspace">
        <form className="tool-panel html-editor" onSubmit={saveHtmlSite}>
          <div className="section-title">
            <Code2 aria-hidden="true" size={16} />
            <span>Codigo HTML</span>
          </div>
          <label>
            Titulo
            <input value={siteTitle} onChange={(event) => setSiteTitle(event.target.value)} />
          </label>
          <label>
            HTML
            <textarea
              className="code-input"
              value={htmlContent}
              onChange={(event) => setHtmlContent(event.target.value)}
              rows={14}
              spellCheck={false}
              placeholder="<section>Contenido del Agora...</section>"
            />
          </label>
          <div className="action-row">
            <button type="submit" disabled={!htmlContent.trim() || siteLoading} title="Guardar HTML">
              {siteLoading ? <Loader2 size={17} /> : <Code2 size={17} />}
              Guardar
            </button>
            <button type="button" onClick={loadSites} title="Actualizar">
              <RefreshCw size={17} />
              Actualizar
            </button>
          </div>
        </form>

        <div className="artifact-list" aria-live="polite">
          {sites.length === 0 ? (
            <p className="empty-state">No hay sitios HTML guardados todavia.</p>
          ) : (
            sites.map((site) => (
              <article key={site.id} className="artifact-card">
                <div className="artifact-icon" aria-hidden="true">
                  <Code2 size={18} />
                </div>
                <div>
                  <h3>{site.title}</h3>
                  <p>
                    {site.memberLabel} · {formatBytes(site.size)} · {formatDate(site.createdAt)}
                  </p>
                  <span>text/html</span>
                </div>
                <div className="artifact-actions">
                  {site.url ? (
                    <a href={site.url} target="_blank" rel="noreferrer" title="Abrir sitio">
                      <ExternalLink size={16} />
                      Abrir
                    </a>
                  ) : null}
                  {site.url ? (
                    <button type="button" onClick={() => copyText(site.url || "", site.id)} title="Copiar URL">
                      {copiedId === site.id ? <Check size={16} /> : <Copy size={16} />}
                      Copiar
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    );
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
            <h1>{channelName}</h1>
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
            <button
              type="button"
              className={mode === "documents" ? "active" : ""}
              onClick={() => setMode("documents")}
              title="Documentos"
            >
              <FileText aria-hidden="true" size={17} />
              Docs
            </button>
            <button
              type="button"
              className={mode === "html" ? "active" : ""}
              onClick={() => setMode("html")}
              title="HTML"
            >
              <Code2 aria-hidden="true" size={17} />
              HTML
            </button>
          </div>
        </section>

        <section className="control-group" aria-label="Miembro">
          <div className="section-title">
            <Users aria-hidden="true" size={16} />
            <span>Miembro</span>
          </div>
          <label>
            Identidad activa
            <select value={activeMember.id} onChange={(event) => setMemberId(event.target.value)}>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </select>
          </label>
          <div className="permission-row">
            {activeMember.permissions.map((permission) => (
              <span key={permission}>{permission}</span>
            ))}
          </div>
        </section>

        {mode === "chat" ? (
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
        ) : null}

        {mode === "image" ? (
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
        ) : null}

        {channelDescription ? <p className="channel-note">{channelDescription}</p> : null}

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
            <p className="eyebrow">{activeMember.label}</p>
            <h2>{MODE_TITLES[mode]}</h2>
          </div>
          <div className="status-pill">
            <Sparkles aria-hidden="true" size={16} />
            Venice + Firebase
          </div>
        </header>

        {notice ? <div className={`notice ${notice.kind}`}>{notice.text}</div> : null}

        {mode === "documents"
          ? renderDocuments()
          : mode === "html"
            ? renderHtmlSites()
            : renderConversation()}
      </section>
    </main>
  );
}
