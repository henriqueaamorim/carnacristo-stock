export const ORDER_TITLE_MIN_LENGTH = 5;

export function normalizeOrderTitle(title: string): string {
  return title.trim();
}

export function isOrderTitleValid(title: string): boolean {
  return validateOrderTitle(title).ok;
}

export function validateOrderTitle(
  title: string,
): { ok: true; value: string } | { ok: false; message: string } {
  const value = normalizeOrderTitle(title);

  if (value.length === 0) {
    return { ok: false, message: "O campo título do pedido está vazio." };
  }

  if (value.length < ORDER_TITLE_MIN_LENGTH) {
    return {
      ok: false,
      message: `O título do pedido deve ter no mínimo ${ORDER_TITLE_MIN_LENGTH} caracteres.`,
    };
  }

  return { ok: true, value };
}
