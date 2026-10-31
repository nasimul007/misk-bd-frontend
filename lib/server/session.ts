import "server-only";
import { cookies, headers } from "next/headers";
import { createSession, endSession, userForSession, type AuthUser } from "./auth";

const COOKIE = "misk_session";

/** Signs the browser in: new DB session, opaque httpOnly cookie. */
export async function startSession(customerId: string) {
  const { token, expiresAt } = await createSession(customerId, (await headers()).get("user-agent"));
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}

export async function currentUser(): Promise<AuthUser | null> {
  return userForSession((await cookies()).get(COOKIE)?.value);
}

export async function stopSession() {
  const jar = await cookies();
  await endSession(jar.get(COOKIE)?.value);
  jar.delete(COOKIE);
}
