export type Product = {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  cost_cents?: number;
  stock_qty: number;
  is_active: boolean;
  photo_url: string | null;
};

export type CartItem = {
  product: Product;
  qty: number;
};
