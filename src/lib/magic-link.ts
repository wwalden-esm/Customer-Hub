import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.MAGIC_LINK_SECRET!);
const LINK_EXPIRY = "24h";
const SESSION_EXPIRY = 30 * 24 * 60 * 60; // 30 days in seconds
const COOKIE_NAME = "hub-session";

export async function createMagicLinkToken(projectId: string, email: string) {
  return new SignJWT({ projectId, email, type: "magic-link" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(LINK_EXPIRY)
    .sign(secret);
}

export async function verifyMagicLinkToken(token: string) {
  const { payload } = await jwtVerify(token, secret);
  if (payload.type !== "magic-link") throw new Error("Invalid token type");
  return { projectId: payload.projectId as string, email: payload.email as string };
}

export async function createSessionToken(projectId: string, email: string, contactName: string | null) {
  return new SignJWT({ projectId, email, name: contactName, type: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRY}s`)
    .sign(secret);
}

export async function setCustomerSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_EXPIRY,
    path: "/",
  });
}

export async function getCustomerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "session") return null;
    return {
      projectId: payload.projectId as string,
      email: payload.email as string,
      name: (payload.name as string) || null,
    };
  } catch {
    return null;
  }
}

export async function clearCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
