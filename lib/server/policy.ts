import "server-only";
import { db } from "@/lib/db";
import { parseBlock } from "@/lib/site-blocks";
import { siteContent } from "@/lib/data/seed";
import type { OrderPolicy } from "@/lib/types";

/** The owner's cancel and return rules, read fresh (not from the page cache) so a change applies at once. */
export async function getPolicy(): Promise<OrderPolicy> {
  const row = await db.siteBlock.findUnique({ where: { key: "policy" } });
  const parsed = row ? parseBlock("policy", row.data) : null;
  return parsed?.ok ? (parsed.data as OrderPolicy) : siteContent.policy;
}
