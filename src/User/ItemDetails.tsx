import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Armchair, Heart, ShoppingCart, Star } from 'lucide-react-native';
import api from '../api';
import {
  fetchCachedApiData,
  getCachedApiData,
  hasCachedApiData,
} from '../apiCache';
import type { StoreProduct } from './types';
import ProductCard from './ProductCard';
import ReviewForm from './ReviewForm';
import {
  formatPrice,
  mediaUrl,
  parseImages,
  productCategory,
  productDiscountPercent,
  productPrice,
} from './utils';

type DetailItem = StoreProduct & {
  description?: string | null;
  long_description?: string | null;
  specifications?: Record<string, unknown> | null;
  combo_items?: Array<{ quantity?: number | string }> | null;
};

export type ItemDetailsProps = {
  itemId: string;
  itemType: 'product' | 'combo';
  favorite: boolean;
  onFavoritePress: (productId: string, productName?: string) => void;
  onAddToCart: (productId: string, productName?: string) => void;
  onBuyNow?: (productId: string, productName?: string) => void;
  relatedProducts?: StoreProduct[];
  favoriteIds?: string[];
  onProductPress?: (productId: string) => void;
};

function getErrorMessage(
  error: unknown,
  fallback = 'Could not load item details. Please try again.',
) {
  if (typeof error === 'object' && error !== null) {
    if (
      'response' in error &&
      typeof error.response === 'object' &&
      error.response !== null &&
      'data' in error.response &&
      typeof error.response.data === 'object' &&
      error.response.data !== null &&
      'message' in error.response.data &&
      typeof error.response.data.message === 'string'
    ) {
      return error.response.data.message;
    }
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
  }
  return fallback;
}

function getGallery(item: DetailItem) {
  const paths = [
    ...parseImages(item.images),
    ...parseImages(item.image),
    ...(item.variants ?? []).flatMap(variant => parseImages(variant.image)),
  ];
  return [...new Set(paths)]
    .map(path => mediaUrl(path))
    .filter((path): path is string => Boolean(path));
}

export default function ItemDetails({
  itemId,
  itemType,
  favorite,
  onFavoritePress,
  onAddToCart,
  onBuyNow,
  relatedProducts = [],
  favoriteIds = [],
  onProductPress,
}: ItemDetailsProps) {
  const { width } = useWindowDimensions();
  const cacheKey = `user.detail.${itemType}.${itemId}`;
  const [item, setItem] = useState<DetailItem | null>(
    () => getCachedApiData<DetailItem>(cacheKey) ?? null,
  );
  const [loading, setLoading] = useState(
    () => !hasCachedApiData(cacheKey),
  );
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const actionId = itemType === 'combo' ? `combo-${itemId}` : itemId;

  useEffect(() => {
    let active = true;

    const loadItem = async () => {
      if (!hasCachedApiData(cacheKey)) setLoading(true);
      if (hasCachedApiData(cacheKey)) setError(null);
      try {
        const resource = itemType === 'combo' ? 'combos' : 'products';
        const data = await fetchCachedApiData(
          cacheKey,
          async force => {
            const { data: responseData } = await api.get<DetailItem>(
              `/${resource}/${itemId}`,
              {
                headers: force ? { 'Cache-Control': 'no-store' } : undefined,
              },
            );
            if (!responseData || typeof responseData !== 'object') {
              throw new Error('The item details response was invalid.');
            }
            return responseData;
          },
          retryCount > 0,
        );
        if (active) {
          setItem(data);
          setActiveImageIndex(0);
        }
      } catch (requestError) {
        console.error(`Could not load ${itemType} details:`, requestError);
        if (active) setError(getErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadItem();
    return () => {
      active = false;
    };
  }, [cacheKey, itemId, itemType, retryCount]);

  const gallery = item ? getGallery(item) : [];
  const price = item ? productPrice(item) : 0;
  const mrp = Number(item?.mrp) || 0;
  const discount = item ? Math.round(productDiscountPercent(item)) : 0;
  const rating = Number(item?.rating) || 0;
  const stock = Number(item?.available_stock ?? item?.total_stock ?? item?.stock);
  const specifications = item?.specifications;
  const specificationEntries =
    specifications && typeof specifications === 'object' && !Array.isArray(specifications)
      ? Object.entries(specifications).filter(
          ([, value]) =>
            (typeof value === 'string' || typeof value === 'number') &&
            String(value).trim().length > 0,
        )
      : [];
  const description =
    item?.description?.trim() || item?.long_description?.trim() || '';
  const relatedProductIds = new Set(
    [item?.id, item?.product_id, itemId]
      .filter((id): id is string | number => id !== undefined && id !== null)
      .map(String),
  );
  const currentCategory = item ? productCategory(item).trim().toLowerCase() : '';
  const relatedCardWidth = Math.min(258, Math.floor((width - 64) / 2));
  const relatedItems =
    itemType === 'product'
      ? relatedProducts
          .filter(
            product =>
              !relatedProductIds.has(String(product.id)) &&
              !relatedProductIds.has(String(product.product_id)),
          )
          .filter(product =>
            currentCategory
              ? productCategory(product).trim().toLowerCase() === currentCategory
              : true,
          )
          .slice(0, 6)
      : [];
  return (
    <View className="px-4 pb-8 pt-3">

      {loading ? (
        <View className="h-[300px] items-center justify-center rounded-[20px] bg-white">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : error && !hasCachedApiData(cacheKey) ? (
        <View className="items-center rounded-[20px] border border-[#F0E7DE] bg-white px-5 py-8">
          <Text accessibilityRole="alert" className="text-center text-[14px] text-[#8B2D20]">
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRetryCount(count => count + 1)}
            className="mt-4 rounded-full bg-[#FFF0E1] px-5 py-3">
            <Text className="text-[13px] font-bold text-[#351D0E]">Try again</Text>
          </Pressable>
        </View>
      ) : item ? (
        <>
          <View className="h-[300px] overflow-hidden rounded-[20px] bg-white">
            {gallery[activeImageIndex] ? (
              <Image
                source={{ uri: gallery[activeImageIndex] }}
                className="h-full w-full"
                resizeMode="contain"
              />
            ) : (
              <View className="h-full items-center justify-center">
                <Armchair size={64} color="#A78A70" strokeWidth={1.2} />
              </View>
            )}
          </View>
          {gallery.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerClassName="flex-row">
              {gallery.map((image, index) => (
                <Pressable
                  key={image}
                  accessibilityRole="button"
                  accessibilityLabel={`Show product image ${index + 1}`}
                  accessibilityState={{ selected: activeImageIndex === index }}
                  onPress={() => setActiveImageIndex(index)}
                  className={`mr-2 h-[64px] w-[64px] overflow-hidden rounded-[10px] border ${
                    activeImageIndex === index
                      ? 'border-[#F97316]'
                      : 'border-[#F0E7DE]'
                  }`}>
                  <Image source={{ uri: image }} className="h-full w-full" resizeMode="cover" />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <Text className="mt-5 text-[10px] font-bold uppercase tracking-[1.6px] text-[#A06E46]">
            {itemType === 'combo' ? 'Furniture combo' : productCategory(item) || 'Furniture'}
          </Text>
          <Text className="mt-1 text-[24px] font-black leading-8 text-[#351D0E]">
            {item.name}
          </Text>
          {rating > 0 ? (
            <View className="mt-2 flex-row items-center">
              <Star size={15} color="#F97316" fill="#F97316" />
              <Text className="ml-1 text-[13px] font-bold text-[#634D3B]">
                {rating.toFixed(1)}
              </Text>
            </View>
          ) : null}

          <View className="mt-4 flex-row items-center">
            <Text className="text-[24px] font-black text-[#351D0E]">
              {formatPrice(price)}
            </Text>
            {mrp > price ? (
              <>
                <Text className="ml-2 text-[14px] text-[#9A8B7D] line-through">
                  {formatPrice(mrp)}
                </Text>
                {discount > 0 ? (
                  <Text className="ml-2 rounded-full bg-[#E8F4EC] px-2 py-1 text-[11px] font-bold text-[#187A45]">
                    {discount}% OFF
                  </Text>
                ) : null}
              </>
            ) : null}
          </View>
          {Number.isFinite(stock) ? (
            <Text className={`mt-2 text-[12px] font-semibold ${
              stock > 0 ? 'text-[#187A45]' : 'text-[#8B2D20]'
            }`}>
              {stock > 0 ? `${stock} available` : 'Currently unavailable'}
            </Text>
          ) : null}

          {description ? (
            <View className="mt-5 rounded-[16px] bg-white p-4">
              <Text className="text-[15px] font-black text-[#351D0E]">Description</Text>
              <Text className="mt-2 text-[13px] leading-5 text-[#634D3B]">
                {description}
              </Text>
            </View>
          ) : null}

          {itemType === 'combo' ? (
            <View className="mt-4 rounded-[16px] bg-white p-4">
              <Text className="text-[15px] font-black text-[#351D0E]">Combo contents</Text>
              <Text className="mt-2 text-[13px] text-[#634D3B]">
                Includes {item.combo_items?.length ?? 0}{' '}
                {(item.combo_items?.length ?? 0) === 1 ? 'product' : 'products'}
              </Text>
            </View>
          ) : null}

          {specificationEntries.length ? (
            <View className="mt-4 rounded-[16px] bg-white p-4">
              <Text className="mb-2 text-[15px] font-black text-[#351D0E]">
                Specifications
              </Text>
              {specificationEntries.map(([label, value]) => (
                <View
                  key={label}
                  className="flex-row justify-between border-t border-[#F0E7DE] py-3">
                  <Text className="mr-3 flex-1 text-[12px] capitalize text-[#8B735E]">
                    {label.replace(/_/g, ' ')}
                  </Text>
                  <Text className="flex-1 text-right text-[12px] font-semibold text-[#351D0E]">
                    {String(value)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <ReviewForm
            itemId={
              itemType === 'combo'
                ? item.combo_id ?? item.id ?? itemId
                : item.product_id ?? item.id ?? itemId
            }
            itemType={itemType}
          />

          {itemType === 'combo' ? (
            <View className="mt-5 flex-row">
              <Pressable
                accessibilityRole="button"
                disabled={Number.isFinite(stock) && stock <= 0}
                onPress={() => onAddToCart(actionId)}
                className={`mr-3 h-[50px] flex-1 flex-row items-center justify-center rounded-full ${
                  Number.isFinite(stock) && stock <= 0
                    ? 'bg-[#CDBBA8]'
                    : 'bg-[#F97316]'
                }`}>
                <ShoppingCart size={18} color="#FFFFFF" />
                <Text className="ml-2 text-[14px] font-black text-white">
                  {Number.isFinite(stock) && stock <= 0
                    ? 'Out of stock'
                    : 'Add to cart'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={Number.isFinite(stock) && stock <= 0}
                onPress={() => (onBuyNow ?? onAddToCart)(actionId)}
                className={`h-[50px] flex-1 items-center justify-center rounded-full ${
                  Number.isFinite(stock) && stock <= 0
                    ? 'bg-[#CDBBA8]'
                    : 'bg-[#351D0E]'
                }`}>
                <Text className="text-[14px] font-black text-white">
                  {Number.isFinite(stock) && stock <= 0 ? 'Unavailable' : 'Buy now'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-5 flex-row">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
                onPress={() => onFavoritePress(actionId, item.name)}
                className="mr-3 h-[50px] w-[54px] items-center justify-center rounded-full border border-[#F0E7DE] bg-white">
                <Heart
                  size={21}
                  color={favorite ? '#F97316' : '#634D3B'}
                  fill={favorite ? '#F97316' : 'transparent'}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={Number.isFinite(stock) && stock <= 0}
                onPress={() => onAddToCart(actionId, item.name)}
                className={`h-[50px] flex-1 items-center justify-center rounded-full ${
                  Number.isFinite(stock) && stock <= 0
                    ? 'bg-[#CDBBA8]'
                    : 'bg-[#F97316]'
                }`}>
                <Text className="text-[14px] font-black text-white">
                  {Number.isFinite(stock) && stock <= 0 ? 'Out of stock' : 'Add to cart'}
                </Text>
              </Pressable>
            </View>
          )}

          {relatedItems.length > 0 && onProductPress ? (
            <View className="mt-6">
              <View className="mb-3 px-1">
                <Text className="text-[10px] font-bold uppercase tracking-[1.6px] text-[#A06E46]">
                  More to explore
                </Text>
                <Text className="mt-1 text-[20px] font-black text-[#351D0E]">
                  Related products
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="px-1">
                {relatedItems.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    favorite={favoriteIds.includes(
                      String(product.product_id ?? product.id),
                    )}
                    cardWidth={relatedCardWidth}
                    onFavoritePress={onFavoritePress}
                    onAddToCart={onAddToCart}
                    onProductPress={onProductPress}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
