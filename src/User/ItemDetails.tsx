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
import {
  Armchair,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Star,
} from 'lucide-react-native';
import api from '../api';
import {
  fetchCachedApiData,
  getCachedApiData,
  hasCachedApiData,
} from '../apiCache';
import type {
  StoreAddToCartOptions,
  StoreBuyNowItem,
  StoreProduct,
} from './types';
import ProductCard from './ProductCard';
import ReviewForm from './ReviewForm';
import {
  formatPrice,
  mediaUrl,
  parseImages,
  productCategory,
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
  isGuest?: boolean;
  initialItem?: StoreProduct;
  favorite: boolean;
  onFavoritePress: (productId: string, productName?: string) => void;
  onAddToCart: (
    productId: string,
    options?: string | StoreAddToCartOptions,
  ) => void;
  onBuyNow?: (item: StoreBuyNowItem) => void;
  relatedProducts?: StoreProduct[];
  favoriteIds?: string[];
  onProductPress?: (productId: string) => void;
  onNameLoaded?: (name: string) => void;
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

function isUnauthorizedError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    Number(error.status) === 401
  );
}

function getGallery(
  item: DetailItem,
  variant: NonNullable<StoreProduct['variants']>[number] | null,
) {
  const paths = [
    ...parseImages(variant?.images),
    ...parseImages(variant?.image),
  ];
  const variantPaths = [...new Set(paths)];
  const imagePaths = variantPaths.length
    ? variantPaths
    : [...parseImages(item.images), ...parseImages(item.image)];
  return [...new Set(imagePaths)]
    .map(path => mediaUrl(path))
    .filter((path): path is string => Boolean(path));
}

export default function ItemDetails({
  itemId,
  itemType,
  isGuest = false,
  initialItem,
  favorite,
  onFavoritePress,
  onAddToCart,
  onBuyNow,
  relatedProducts = [],
  favoriteIds = [],
  onProductPress,
  onNameLoaded,
}: ItemDetailsProps) {
  const { width } = useWindowDimensions();
  const cacheKey = `user.detail.${itemType}.${itemId}`;
  const [item, setItem] = useState<DetailItem | null>(
    () => getCachedApiData<DetailItem>(cacheKey) ?? initialItem ?? null,
  );
  const [loading, setLoading] = useState(
    () => !hasCachedApiData(cacheKey) && !(isGuest && initialItem),
  );
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const actionId = itemType === 'combo' ? `combo-${itemId}` : itemId;

  useEffect(() => {
    setActiveImageIndex(0);
    setActiveVariantIndex(0);
    setSelectedSize('');
    setQuantity(1);
  }, [itemId, itemType]);

  useEffect(() => {
    let active = true;

    const loadItem = async () => {
      if (isGuest) {
        if (initialItem) {
          setItem(initialItem);
          setError(null);
          if (initialItem.name.trim()) {
            onNameLoaded?.(initialItem.name.trim());
          }
        } else {
          setError('This product is no longer available.');
        }
        setLoading(false);
        return;
      }

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
          const itemName =
            typeof data.name === 'string' ? data.name.trim() : '';
          if (itemName) onNameLoaded?.(itemName);
          setActiveImageIndex(0);
        }
      } catch (requestError) {
        if (active) {
          if (initialItem && isUnauthorizedError(requestError)) {
            setItem(initialItem);
            setError(null);
            if (initialItem.name.trim()) {
              onNameLoaded?.(initialItem.name.trim());
            }
          } else {
            setError(getErrorMessage(requestError));
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadItem();
    return () => {
      active = false;
    };
  }, [
    cacheKey,
    initialItem,
    isGuest,
    itemId,
    itemType,
    onNameLoaded,
    retryCount,
  ]);

  const variants = item?.variants ?? [];
  const activeVariant = variants[activeVariantIndex] ?? null;
  const variantSizes = Array.isArray(activeVariant?.selectedSizes)
    ? activeVariant.selectedSizes
    : activeVariant?.size
      ? [activeVariant.size]
      : [];
  const effectiveSize = selectedSize || variantSizes[0] || '';
  const gallery = item ? getGallery(item, activeVariant) : [];
  const price = item
    ? Number(
        activeVariant?.selling_price ??
          activeVariant?.offer_price ??
          item.selling_price ??
          item.offer_price ??
          item.mrp,
      ) || 0
    : 0;
  const mrp = Number(activeVariant?.mrp ?? item?.mrp) || 0;
  const discount =
    mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const rating = Number(item?.rating) || 0;
  const totalStock =
    Number(item?.total_stock ?? item?.available_stock ?? item?.stock) || 0;
  const sizeStockAvailable =
    Boolean(effectiveSize) &&
    activeVariant?.sizesStock != null &&
    Object.prototype.hasOwnProperty.call(activeVariant.sizesStock, effectiveSize);
  const variantStock = sizeStockAvailable
    ? Number(activeVariant?.sizesStock?.[effectiveSize]) || 0
    : activeVariant?.stock != null
      ? Number(activeVariant.stock) || 0
      : totalStock;
  const stock = totalStock > 0 ? Math.min(totalStock, variantStock) : 0;
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
  const handleBuyNow = () => {
    if (!item) return;
    if (!onBuyNow) {
      onAddToCart(actionId, item.name);
      return;
    }

    const isCombo = itemType === 'combo';
    const itemIdForCheckout = isCombo
      ? item.combo_id ?? item.id
      : item.product_id ?? item.id;
    onBuyNow({
      ...item,
      id: `buy-now-${isCombo ? 'combo-' : ''}${itemIdForCheckout}`,
      product_id: isCombo ? null : itemIdForCheckout,
      combo_id: isCombo ? itemIdForCheckout : null,
      item_type: itemType,
      quantity,
      price,
      image:
        gallery[activeImageIndex] ??
        gallery[0] ??
        mediaUrl(item.image) ??
        null,
      ...(isCombo
        ? {}
        : {
            variant_color:
              activeVariant?.colorName ||
              activeVariant?.color ||
              activeVariant?.colour ||
              'Default',
            variant_size: effectiveSize || 'Free Size',
          }),
    });
  };
  const handleAddToCart = () => {
    if (!item) return;
    if (itemType === 'combo') {
      onAddToCart(actionId, item.name);
      return;
    }

    onAddToCart(actionId, {
      name: item.name,
      quantity,
      variantColor:
        activeVariant?.colorName ||
        activeVariant?.color ||
        activeVariant?.colour ||
        'Default',
      variantSize: effectiveSize || 'Free Size',
    });
  };

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
          {itemType === 'combo' ? (
            <Text className={`mt-2 text-[12px] font-semibold ${
              stock > 0 ? 'text-[#187A45]' : 'text-[#8B2D20]'
            }`}>
              {stock > 0 ? `${stock} available` : 'Currently unavailable'}
            </Text>
          ) : null}

          {itemType === 'product' && variants.length > 0 ? (
            <View className="mt-5">
              <Text className="mb-3 text-[13px] font-bold text-[#493522]">
                Finish:{' '}
                <Text className="font-normal text-[#8B735E]">
                  {activeVariant?.colorName ||
                    activeVariant?.color ||
                    activeVariant?.colour ||
                    'Default'}
                </Text>
              </Text>
              <View className="flex-row flex-wrap">
                {variants.map((variant, index) => {
                  const label =
                    variant.colorName ||
                    variant.color ||
                    variant.colour ||
                    `Option ${index + 1}`;
                  const selected = activeVariantIndex === index;
                  return (
                    <Pressable
                      key={`${label}-${index}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setActiveVariantIndex(index);
                        setActiveImageIndex(0);
                        setSelectedSize('');
                        setQuantity(1);
                      }}
                      className={`mb-2 mr-2 rounded-full border px-4 py-2 ${
                        selected
                          ? 'border-[#351D0E] bg-[#351D0E]'
                          : 'border-[#E5D8CA] bg-white'
                      }`}>
                      <Text
                        className={`text-[12px] font-semibold ${
                          selected ? 'text-white' : 'text-[#634D3B]'
                        }`}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {itemType === 'product' && variantSizes.length > 1 ? (
            <View className="mt-3">
              <Text className="mb-3 text-[13px] font-bold text-[#493522]">
                Size
              </Text>
              <View className="flex-row flex-wrap">
                {variantSizes.map(size => {
                  const selected = effectiveSize === size;
                  return (
                    <Pressable
                      key={size}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setSelectedSize(size);
                        setQuantity(1);
                      }}
                      className={`mb-2 mr-2 rounded-lg border px-4 py-2 ${
                        selected
                          ? 'border-[#351D0E] bg-[#351D0E]'
                          : 'border-[#E5D8CA] bg-white'
                      }`}>
                      <Text
                        className={`text-[12px] font-semibold ${
                          selected ? 'text-white' : 'text-[#634D3B]'
                        }`}>
                        {size}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {itemType === 'product' ? (
            <View className="mt-4 flex-row items-center justify-between gap-3">
              <View className="h-11 flex-row items-center overflow-hidden rounded-xl border border-[#E5D8CA]">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Decrease quantity"
                  disabled={quantity <= 1}
                  onPress={() => setQuantity(value => Math.max(1, value - 1))}
                  className={`h-full w-10 items-center justify-center ${
                    quantity <= 1 ? 'opacity-40' : ''
                  }`}>
                  <Minus size={16} color="#634D3B" />
                </Pressable>
                <Text
                  accessibilityLiveRegion="polite"
                  className="min-w-[40px] text-center text-[14px] font-semibold text-[#351D0E]">
                  {quantity}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Increase quantity"
                  disabled={quantity >= stock}
                  onPress={() =>
                    setQuantity(value => Math.min(stock, value + 1))
                  }
                  className={`h-full w-10 items-center justify-center ${
                    quantity >= stock ? 'opacity-40' : ''
                  }`}>
                  <Plus size={16} color="#634D3B" />
                </Pressable>
              </View>
              <Text
                className={`text-[12px] font-semibold ${
                  stock > 0 ? 'text-[#187A45]' : 'text-[#8B2D20]'
                }`}>
                {stock > 0 ? `${stock} available` : 'Out of stock'}
              </Text>
            </View>
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
                onPress={handleAddToCart}
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
                onPress={handleBuyNow}
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
                onPress={handleAddToCart}
                className={`mr-3 h-[50px] flex-1 items-center justify-center rounded-full ${
                  Number.isFinite(stock) && stock <= 0
                    ? 'bg-[#CDBBA8]'
                    : 'bg-[#F97316]'
                }`}>
                <Text className="text-[14px] font-black text-white">
                  {Number.isFinite(stock) && stock <= 0 ? 'Out of stock' : 'Add to cart'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={Number.isFinite(stock) && stock <= 0}
                onPress={handleBuyNow}
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
