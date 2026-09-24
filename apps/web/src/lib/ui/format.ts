export function money(value: unknown) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2
  }).format(Number.isFinite(number) ? number : 0);
}

export function compact(value: unknown) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Number.isFinite(number) ? number : 0);
}

export function percent(value: unknown, assumeRatio = true) {
  const number = Number(value ?? 0);
  const normalized = assumeRatio && Math.abs(number) <= 1 ? number * 100 : number;
  return `${normalized.toFixed(normalized >= 10 ? 0 : 1)}%`;
}

export function decimal(value: unknown, digits = 2) {
  const number = Number(value ?? 0);
  return (Number.isFinite(number) ? number : 0).toFixed(digits);
}
