export type OrderStatus = "pending" | "completed" | "cancelled";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pendente",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

export function formatOrderStatus(status: string): string {
  return ORDER_STATUS_LABEL[status as OrderStatus] ?? status;
}
