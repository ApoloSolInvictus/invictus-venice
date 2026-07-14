import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

type FirebaseRuntimeConfig = {
  serviceAccount: ServiceAccount;
  storageBucket: string;
};

export class FirebaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebaseConfigError";
  }
}

let cachedConfig: FirebaseRuntimeConfig | undefined;

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n").trim();
}

function parseServiceAccountJson(raw: string): ServiceAccount | undefined {
  try {
    const text = raw.trim().startsWith("{")
      ? raw.trim()
      : Buffer.from(raw.trim(), "base64").toString("utf8");
    const parsed = JSON.parse(text) as {
      project_id?: string;
      projectId?: string;
      client_email?: string;
      clientEmail?: string;
      private_key?: string;
      privateKey?: string;
    };

    const projectId = parsed.projectId || parsed.project_id;
    const clientEmail = parsed.clientEmail || parsed.client_email;
    const privateKey = parsed.privateKey || parsed.private_key;

    if (!projectId || !clientEmail || !privateKey) {
      return undefined;
    }

    return {
      projectId,
      clientEmail,
      privateKey: normalizePrivateKey(privateKey),
    };
  } catch {
    return undefined;
  }
}

function readServiceAccount() {
  const serviceJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  if (serviceJson) {
    return parseServiceAccountJson(serviceJson);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

  if (!projectId || !clientEmail || !privateKey) {
    return undefined;
  }

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
  };
}

export function getFirebaseConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  const serviceAccount = readServiceAccount();
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET?.replace(/^gs:\/\//, "").trim();

  if (!serviceAccount || !storageBucket) {
    return undefined;
  }

  cachedConfig = { serviceAccount, storageBucket };
  return cachedConfig;
}

export function assertFirebaseConfig() {
  const config = getFirebaseConfig();

  if (!config) {
    throw new FirebaseConfigError(
      "Faltan variables de Firebase Admin: FIREBASE_STORAGE_BUCKET y FIREBASE_SERVICE_ACCOUNT_JSON, o FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.",
    );
  }

  return config;
}

export function getFirebaseAdminApp() {
  const existing = getApps()[0];

  if (existing) {
    return existing;
  }

  const config = assertFirebaseConfig();

  return initializeApp({
    credential: cert(config.serviceAccount),
    storageBucket: config.storageBucket,
  });
}

export function getAgoraBucket() {
  return getStorage(getFirebaseAdminApp()).bucket();
}

export function getAgoraDb() {
  return getFirestore(getFirebaseAdminApp());
}
