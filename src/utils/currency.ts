/** Converte número (ex.: 1500.6) para exibição BRL: "R$ 1.500,60" */
export function formatNumberToBrl(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Extrai apenas dígitos e interpreta como centavos (4569 → 45,69). */
export function digitsToAmount(digits: string): number | null {
  if (!digits) return null;
  return Number(digits) / 100;
}

/** Formata string de dígitos (centavos) para máscara BRL. */
export function formatDigitsToBrl(digits: string): string {
  const amount = digitsToAmount(digits);
  if (amount == null) return "";
  return formatNumberToBrl(amount);
}

/** Valor numérico com ponto decimal para envio à API (ex.: "1500.60"). */
export function amountToApiPrice(amount: number): string {
  return amount.toFixed(2);
}
