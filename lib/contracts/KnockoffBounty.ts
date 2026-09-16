import { createClient } from "genlayer-js";
import { GENLAYER_CHAIN } from "../genlayer/network";
import type { Claim, Design, ReporterStats, Rubric, Stats } from "./types";

/**
 * genlayer-js decodes GenVM dicts as `Map` and integers as `bigint`. The UI
 * wants plain JSON, so every read goes through one normaliser instead of each
 * call unwrapping its own shape.
 */
function plain(value: unknown): any {
  if (value instanceof Map) {
    const out: Record<string, any> = {};
    for (const [k, v] of value.entries()) out[String(k)] = plain(v);
    return out;
  }
  if (Array.isArray(value)) return value.map(plain);
  if (typeof value === "bigint") return value.toString();
  return value;
}

export class KnockoffBounty {
  private address: `0x${string}`;
  private client: ReturnType<typeof createClient>;

  constructor(address: string, account?: string | null) {
    this.address = address as `0x${string}`;
    const config: any = { chain: GENLAYER_CHAIN };
    if (account) config.account = account as `0x${string}`;
    this.client = createClient(config);
  }

  private async call<T>(functionName: string, args: any[] = []): Promise<T> {
    const raw = await this.client.readContract({
      address: this.address,
      functionName,
      args,
    });
    return plain(raw) as T;
  }

  getDesigns() {
    return this.call<Design[]>("get_designs");
  }

  getDesign(id: string) {
    return this.call<Design>("get_design", [id]);
  }

  getClaims() {
    return this.call<Claim[]>("get_claims");
  }

  getClaim(id: string) {
    return this.call<Claim>("get_claim", [id]);
  }

  getClaimsForDesign(id: string) {
    return this.call<Claim[]>("get_claims_for_design", [id]);
  }

  getStats() {
    return this.call<Stats>("get_stats");
  }

  getRubric() {
    return this.call<Rubric>("get_rubric");
  }

  getReporterStats(account: string) {
    return this.call<ReporterStats>("get_reporter_stats", [account]);
  }
}

export default KnockoffBounty;
