export type StoreTab = 'Home' | 'Explore' | 'Favorites' | 'Cart' | 'Profile';

export type StoreCategory = {
  id?: number | string;
  catId?: number | string;
  name: string;
  images?: string[] | string | null;
  image?: string | null;
};

export type StoreProduct = {
  id: number | string;
  name: string;
  status?: string;
  product_type?: string;
  category?: string | { name?: string };
  category_name?: string;
  images?: string[] | string | null;
  variants?: Array<{ image?: string | null }>;
  main_image_index?: number | string | null;
  selling_price?: number | string | null;
  offer_price?: number | string | null;
  mrp?: number | string | null;
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
