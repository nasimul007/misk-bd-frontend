import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createStaffSession, endStaffSession, staffForSession, type Staff } from "./staff";

const COOKIE = "misk_staff";

export async function startStaffSession(staffId: string) {
  const token = await createStaffSession(staffId);
  // SameSite=Strict and a path limited to /admin: the cookie is never sent on storefront requests.
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/admin" });
}

export async function staffToken() {
  return (await cookies()).get(COOKIE)?.value;
}

export async function getStaff(): Promise<Staff | null> {
  return staffForSession(await staffToken());
}

export async function stopStaffSession() {
  const jar = await cookies();
  await endStaffSession(jar.get(COOKIE)?.value);
  jar.delete({ name: COOKIE, path: "/admin" });
}

/** For pages: send signed-out visitors to the login page. */
export async function requireStaffPage(role?: "owner"): Promise<Staff> {
  const s = await getStaff();
  if (!s) redirect("/admin/login");
  if (role && s.role !== role) redirect("/admin");
  return s;
}

export class Forbidden extends Error {}

/**
 * For server actions. The UI hiding a button is cosmetic; this is the real check, run on every mutation.
 * Staff who still have to change their one-time password can do nothing else.
 */
export async function assertStaff(role?: "owner", opts: { allowMustChange?: boolean } = {}): Promise<Staff> {
  const s = await getStaff();
  if (!s) throw new Forbidden("Please sign in again.");
  if (s.mustChangePassword && !opts.allowMustChange) throw new Forbidden("Change your password first.");
  if (role && s.role !== role) throw new Forbidden("Only the owner can do that.");
  return s;
}
