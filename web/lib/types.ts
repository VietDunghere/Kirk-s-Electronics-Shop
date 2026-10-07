export type ProductDTO = {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  category: string;
  rating: number;
  sold: number;
  isNew: boolean;
  isFeatured: boolean;
  createdAt: string;
};

export type CartItemDTO = {
  id: number;
  productId: number;
  quantity: number;
  product: ProductDTO;
  subtotal: number;
};

export type CartDTO = {
  items: CartItemDTO[];
  totalCount: number;
  subtotal: number;
};

export type ShippingInfo = {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  ward: string;
  note?: string;
};

export type OrderDTO = {
  id: number;
  orderCode: string;
  totalAmount: number;
  subtotal: number;
  shippingFee: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  shippingFullName: string;
  shippingPhone: string;
  shippingAddress: string;
  city: string;
  district: string;
  ward: string;
  note: string;
  createdAt: string;
  items: {
    id: number;
    productId: number;
    productName: string;
    price: number;
    quantity: number;
  }[];
  user?: { fullName: string; email: string };
};
