// Creates a staff account and prints a one-time password (shown once, must be changed at first sign-in).
// Usage: npm run admin:create -- <username> "<Full name>" [owner|admin]
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { createStaff } from "@/lib/server/staff";

async function main() {
  const [username, name, role = "admin"] = process.argv.slice(2);
  if (!username || !name || (role !== "owner" && role !== "admin")) {
    console.error('Usage: npm run admin:create -- <username> "<Full name>" [owner|admin]');
    process.exit(1);
  }
  const password = `${randomBytes(9).toString("base64url")}a1`;
  const r = await createStaff(username, name, password, role);
  if (!r.ok) { console.error(r.error); process.exit(1); }
  console.log(`Created ${role} "${r.staff.username}".\nOne-time password (change it at first sign-in): ${password}`);
}
main().finally(() => db.$disconnect());
