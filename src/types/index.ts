export type UserRole = "admin" | "vendedor";

export type PaymentMethod =
  | "pix"
  | "dinheiro"
  | "credito"
  | "debito"
  | "doacao"
  | "parceria";

export type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  image_path: string | null;
  created_at: string;
};

export type ProductDTO = ProductRow & {
  imageSignedUrl: string | null;
};

export type OrderItemInput = {
  productId: string;
  quantity: number;
};

export type CreateOrderResponse = {
  order_id: string;
  order_id_display: string;
  total_amount: number;
};
