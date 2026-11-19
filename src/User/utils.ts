import { API_BASE_URL } from '../api';
import type { StoreCategory, StoreProduct } from './types';

const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');

export function mediaUrl(path?: string | null) {
  if (!path?.trim()) return undefined;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${apiOrigin}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function parseImages(images?: string[] | string | null): string[] {
  if (Array.isArray(images)) return images.filter(Boolean);
  if (!images) return [];
  try {
    const parsed: unknown = JSON.parse(images);
    if (Array.isArray(parsed)) {
      return parsed.filter((image): image is string => typeof image === 'string');
    }
  } catch {
    return [images];
  }
  return [images];
}

export function productImage(product: StoreProduct) {
  const images = parseImages(product.images);
  const preferredIndex = Number(product.main_image_index);
  const path =
    (Number.isInteger(preferredIndex) && preferredIndex >= 0
      ? images[preferredIndex]
      : undefined) ??
    images[0] ??
    product.variants?.find(variant => variant.image)?.image;
  return mediaUrl(path);
}

export function categoryImage(category: StoreCategory) {
  return mediaUrl(parseImages(category.images ?? category.image)[0]);
}

export function productCategory(product: StoreProduct) {
  return typeof product.category === 'string'
    ? product.category
    : product.category?.name ?? product.category_name ?? '';
}

export function productPrice(product: StoreProduct) {
  const price = Number(
    product.offer_price ?? product.selling_price ?? product.mrp,
  );
  return Number.isFinite(price) ? price : 0;
}

export function productDiscountPercent(product: StoreProduct) {
  const mrp = Number(product.mrp) || 0;
  const price = productPrice(product);
  return mrp > price ? ((mrp - price) / mrp) * 100 : 0;
}

export function formatPrice(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
