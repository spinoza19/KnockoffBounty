import { ARCHIVE_HOSTS } from "./constants";

const WEI = 10n ** 18n;

export function toAtto(gen: string | number): bigint {
  const value = String(gen ?? "0").trim();
  if (!value) return 0n;
  const [whole, frac = ""] = value.split(".");
  const padded = (frac + "000000000000000000").slice(0, 18);
  return BigInt(whole || "0") * WEI + BigInt(padded || "0");
}

export function fromAtto(atto: string | bigint | number | undefined, decimals = 2): string {
  let raw: bigint;
  try {
    raw = BigInt(atto ?? 0);
  } catch {
    return "0";
  }
  const negative = raw < 0n;
  const value = negative ? -raw : raw;
  const whole = value / WEI;
  const frac = (value % WEI).toString().padStart(18, "0").slice(0, decimals);
  const trimmed = frac.replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole.toLocaleString("en-US")}${trimmed ? "." + trimmed : ""}`;
}

export function gen(atto: string | bigint | undefined, decimals = 2): string {
  return `${fromAtto(atto, decimals)} GEN`;
}

export function shortAddress(address?: string | null, size = 4): string {
  if (!address) return "—";
  if (address.length <= size * 2 + 2) return address;
  return `${address.slice(0, size + 2)}…${address.slice(-size)}`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export function formatDateShort(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().slice(0, 10);
}

/**
 * Mirrors the contract's `_is_archive_url` so the UI can refuse a live
 * marketplace URL before it costs the user a transaction.
 */
export function isArchiveUrl(url: string): boolean {
  const low = (url || "").trim().toLowerCase();
  if (!low.startsWith("http://") && !low.startsWith("https://")) return false;
  return ARCHIVE_HOSTS.some((marker) => low.includes(marker));
}

export function evidenceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "—";
  }
}

/** Pulls the original target out of a Wayback URL, for display only. */
export function archivedTarget(url: string): string | null {
  const match = /web\.archive\.org\/web\/[^/]+\/(https?:\/\/.+)$/i.exec(url || "");
  if (!match) return null;
  try {
    return new URL(match[1]).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function archivedOn(url: string): string | null {
  const match = /web\.archive\.org\/web\/(\d{4})(\d{2})(\d{2})/i.exec(url || "");
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}
