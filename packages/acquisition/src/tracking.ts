const SAFE = /[^a-z0-9_-]+/g;

export function normalizeNiche(value: string | null | undefined): string {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(SAFE, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || "general";
}

export function normalizeUtm(value: string | null | undefined): string | null {
  const clean = String(value ?? "").trim().slice(0, 160);
  return clean || null;
}

export function buildCampaignKey(input: {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
}): string {
  return [
    normalizeUtm(input.source) ?? "unknown",
    normalizeUtm(input.medium) ?? "unknown",
    normalizeUtm(input.campaign) ?? "unknown"
  ].join("|");
}
