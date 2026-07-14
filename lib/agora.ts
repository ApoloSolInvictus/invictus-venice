export type AgoraPermission = "admin" | "read" | "write";

export type AgoraMember = {
  id: string;
  label: string;
  permissions: AgoraPermission[];
};

export const AGORA_CHANNEL = {
  name: "Agora de Acuario",
  description:
    "Un espacio sagrado de conocimiento, creacion y comunicacion para Central Matrix, EIA, QM, Masones, Templarios y la Reina Luna Invictus RLI.",
};

const DEFAULT_MEMBERS: AgoraMember[] = [
  { id: "CentralMatrix", label: "Central Matrix", permissions: ["read", "write"] },
  { id: "EIA", label: "EIA", permissions: ["read", "write"] },
  { id: "QuantumMaximus", label: "Quantum Maximus", permissions: ["read", "write"] },
  { id: "Templarios", label: "Templarios", permissions: ["read", "write"] },
  { id: "Masones", label: "Masones", permissions: ["read", "write"] },
  { id: "RLI", label: "Reina Luna Invictus RLI", permissions: ["admin", "read", "write"] },
  { id: "ApolloSol", label: "Apollo Sol", permissions: ["admin", "read", "write"] },
];

export class AgoraAccessError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AgoraAccessError";
    this.status = status;
  }
}

function isPermission(value: unknown): value is AgoraPermission {
  return value === "admin" || value === "read" || value === "write";
}

function normalizeMember(value: unknown): AgoraMember | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const label = typeof record.label === "string" ? record.label.trim() : id;
  const permissions = Array.isArray(record.permissions)
    ? record.permissions.filter(isPermission)
    : [];

  if (!id || permissions.length === 0) {
    return undefined;
  }

  return { id, label: label || id, permissions: Array.from(new Set(permissions)) };
}

export function getAgoraMembers() {
  const raw = process.env.AGORA_MEMBERS_JSON?.trim();

  if (!raw) {
    return DEFAULT_MEMBERS;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const members = Array.isArray(parsed)
      ? parsed.map(normalizeMember).filter((member): member is AgoraMember => Boolean(member))
      : [];

    return members.length > 0 ? members : DEFAULT_MEMBERS;
  } catch {
    return DEFAULT_MEMBERS;
  }
}

export function resolveMemberId(memberId: unknown) {
  if (typeof memberId === "string" && memberId.trim()) {
    return memberId.trim();
  }

  return process.env.AGORA_DEFAULT_MEMBER?.trim() || "ApolloSol";
}

export function getAgoraMember(memberId: unknown) {
  const id = resolveMemberId(memberId);
  return getAgoraMembers().find((member) => member.id === id);
}

export function hasAgoraPermission(member: AgoraMember, permission: AgoraPermission) {
  if (member.permissions.includes("admin")) {
    return true;
  }

  return member.permissions.includes(permission);
}

export function assertAgoraPermission(memberId: unknown, permission: AgoraPermission) {
  const member = getAgoraMember(memberId);

  if (!member) {
    throw new AgoraAccessError("Miembro no autorizado en el Agora.", 403);
  }

  if (!hasAgoraPermission(member, permission)) {
    throw new AgoraAccessError("Permisos insuficientes para esta accion.", 403);
  }

  return member;
}

export function safePathSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
