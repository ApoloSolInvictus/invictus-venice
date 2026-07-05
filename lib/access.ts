const ACCESS_COOKIE = "invictus_access";
const ACCESS_SALT = "invictus-venice-access-v1";

export { ACCESS_COOKIE };

export function hasAccessCode() {
  return Boolean(process.env.INVICTUS_ACCESS_CODE?.trim());
}

export async function accessDigest(code = process.env.INVICTUS_ACCESS_CODE || "") {
  const input = `${ACCESS_SALT}:${code.trim()}`;
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidAccessToken(token?: string) {
  if (!hasAccessCode()) {
    return true;
  }

  if (!token) {
    return false;
  }

  return token === (await accessDigest());
}
