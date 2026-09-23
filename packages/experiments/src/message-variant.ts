export type MessageVariantConfig = {
  headline?: string;
  ctaLabel?: string;
  footer?: string;
};

function cleanSingleLine(
  value: string | undefined,
  maxLength: number
): string | null {
  if (!value) return null;
  const clean = value.replace(/[\r\n]+/g, " ").trim().slice(0, maxLength);
  return clean || null;
}

export function applyMessageVariant(
  baseContent: string,
  config: MessageVariantConfig
): string {
  const headline = cleanSingleLine(config.headline, 90);
  const ctaLabel = cleanSingleLine(config.ctaLabel, 60);
  const footer = cleanSingleLine(config.footer, 160);

  const lines = baseContent.split(/\r?\n/);

  if (headline && lines.length > 0) {
    lines[0] = headline;
  }

  if (ctaLabel) {
    const ctaIndex = lines.findIndex((line) =>
      line.trim().startsWith("👉 ")
    );
    if (ctaIndex >= 0) {
      const url = lines[ctaIndex].trim().slice(2).trim();
      lines[ctaIndex] = `👉 ${ctaLabel}: ${url}`;
    }
  }

  if (footer) {
    lines.push("", footer);
  }

  return lines.join("\n").slice(0, 3900);
}
