export type OfferMessageInput = {
  productName: string;
  price?: number | null;
  priceMin?: number | null;
  discountRate?: number | null;
  rating?: number | null;
  sales?: number | null;
  shortUrl: string;
};

function brl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2
  }).format(value);
}

export function buildDeterministicOfferMessage(input: OfferMessageInput): string {
  const price = input.priceMin ?? input.price ?? null;
  const discount =
    typeof input.discountRate === "number" && Number.isFinite(input.discountRate)
      ? Math.abs(input.discountRate) <= 1
        ? input.discountRate * 100
        : input.discountRate
      : null;

  const lines = ["🔥 OFERTA BOA AGORA", "", input.productName.trim()];

  if (price !== null && Number.isFinite(price)) {
    lines.push("", `💰 ${brl(price)}`);
  }

  if (discount !== null && discount >= 10) {
    lines.push(`🏷️ ${Math.round(discount)}% de desconto`);
  }

  if (typeof input.rating === "number" && input.rating >= 4) {
    lines.push(`⭐ ${input.rating.toFixed(1)}/5`);
  }

  if (typeof input.sales === "number" && input.sales >= 100) {
    lines.push(`🔥 +${Math.trunc(input.sales).toLocaleString("pt-BR")} vendidos`);
  }

  lines.push("", `👉 ${input.shortUrl}`);

  return lines.join("\n").slice(0, 3900);
}

export function replaceOfferTrackingUrl(content: string, shortUrl: string): string {
  const lines = content.split(/\r?\n/);
  const index = lines.findIndex((line) => line.trim().startsWith("👉 "));

  if (index >= 0) {
    lines[index] = `👉 ${shortUrl}`;
    return lines.join("\n").slice(0, 3900);
  }

  return `${content.trim()}\n\n👉 ${shortUrl}`.slice(0, 3900);
}
