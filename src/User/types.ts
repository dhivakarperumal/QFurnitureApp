export type StoreTab =
  | 'Home'
  | 'Shop'
  | 'Combos'
  | 'Favorites'
  | 'Cart'
  | 'Profile';

export type StoreCategory = {
  id?: number | string;
  catId?: number | string;
  name: string;
  images?: string[] | string | null;
  image?: string | null;
};

export type StoreProduct = {
  id: number | string;
  product_id?: number | string | null;
  combo_id?: number | string | null;
  item_type?: 'product' | 'combo';
  name: string;
  status?: string;
  product_type?: string;
  category?: string | { name?: string };
  category_name?: string;
  images?: string[] | string | null;
  variants?: Array<{
    image?: string | null;
    images?: string[] | string | null;
    colorName?: string;
    color?: string;
    colour?: string;
    size?: string;
    selectedSizes?: string[];
    sizesStock?: Record<string, number | string | null>;
    stock?: number | string | null;
    total_stock?: number | string | null;
    mrp?: number | string | null;
    offer_price?: number | string | null;
    selling_price?: number | string | null;
  }>;
  main_image_index?: number | string | null;
  selling_price?: number | string | null;
  offer_price?: number | string | null;
  mrp?: number | string | null;
  rating?: number | string | null;
  available_stock?: number | string | null;
  total_stock?: number | string | null;
  stock?: number | string | null;
  image?: string | null;
};

export type StoreFavorite = StoreProduct & {
  created_at?: string;
};

export type StoreCartItem = StoreProduct & {
  quantity: number | string;
  price: number | string;
  total_price?: number | string;
  image?: string | null;
  variant_color?: string | null;
  variant_size?: string | null;
};

export type StoreBuyNowItem = StoreCartItem & {
  item_type: 'product' | 'combo';
};

export type StoreAddToCartOptions = {
  name?: string;
  quantity?: number;
  variantColor?: string;
  variantSize?: string;
  refreshCart?: boolean;
  showError?: boolean;
};

export type StoreBanner = {
  id?: number | string;
  title?: string;
  subtitle?: string;
  description?: string;
  offer?: string;
  desktop_image?: string | null;
  mobile_image?: string | null;
};
