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
import { Armchair, ShoppingCart, Star } from 'lucide-react-native';
import api from '../api';
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

type ComboComponent = {
  product_id?: number | string;
  product_name?: string;
  quantity?: number | string;
  variant_color?: string;
  variant_size?: string;
};

type Combo = StoreProduct & {
  description?: string | null;
  long_description?: string | null;
  specifications?: Record<string, unknown> | null;
  combo_items?: ComboComponent[] | null;
};

type ComboDetailsProps = {
  itemId: string;
  onFavoritePress: (productId: string, productName?: string) => void;
  onAddToCart: (productId: string, productName?: string) => void;
  onBuyNow?: (productId: string, productName?: string) => void;
  relatedProducts?: StoreProduct[];
  favoriteIds?: string[];
  onProductPress?: (productId: string) => void;
};

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Could not load combo details. Please try again.';
}

function getGallery(combo: Combo) {
  const paths = [
    ...parseImages(combo.images),
    ...parseImages(combo.image),
    ...(combo.variants ?? []).flatMap(variant => parseImages(variant.image)),
  ];
  return [...new Set(paths)]
    .map(path => mediaUrl(path))
    .filter((path): path is string => Boolean(path));
}

export default function ComboDetails({
  itemId,
  onFavoritePress,
  onAddToCart,
  onBuyNow,
  relatedProducts = [],
  favoriteIds = [],
  onProductPress,
}: ComboDetailsProps) {
  const { width } = useWindowDimensions();
  const [combo, setCombo] = useState<Combo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const actionId = `combo-${itemId}`;

  useEffect(() => {
    let active = true;

    const loadCombo = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<Combo>(`/combos/${itemId}`);
        if (!data || typeof data !== 'object') {
          throw new Error('The combo details response was invalid.');
        }
        if (active) {
          setCombo(data);
          setActiveImageIndex(0);
        }
      } catch (requestError) {
        console.error('Could not load combo details:', requestError);
        if (active) setError(getErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCombo();
    return () => {
      active = false;
    };
  }, [itemId, retryCount]);

  const gallery = combo ? getGallery(combo) : [];
  const price = combo ? productPrice(combo) : 0;
  const mrp = Number(combo?.mrp) || 0;
  const discount = combo ? Math.round(productDiscountPercent(combo)) : 0;
  const rating = Number(combo?.rating) || 0;
  const stock = Number(
    combo?.available_stock ?? combo?.total_stock ?? combo?.stock,
  );
  const components = combo?.combo_items ?? [];
  const includedProductIds = new Set(
    components
      .map(component => component.product_id)
      .filter((id): id is string | number => id !== undefined && id !== null)
      .map(String),
  );
  const componentCategories = new Set(
    relatedProducts
      .filter(
        product =>
          includedProductIds.has(String(product.id)) ||
          includedProductIds.has(String(product.product_id)),
      )
      .map(product => productCategory(product).trim().toLowerCase())
      .filter(Boolean),
  );
  const otherProducts = relatedProducts.filter(
    product =>
      !includedProductIds.has(String(product.id)) &&
      !includedProductIds.has(String(product.product_id)),
  );
  const categoryMatches = componentCategories.size
    ? otherProducts.filter(product =>
        componentCategories.has(productCategory(product).trim().toLowerCase()),
      )
    : [];
  const relatedItems = (categoryMatches.length ? categoryMatches : otherProducts).slice(
    0,
    6,
  );
  const relatedCardWidth = Math.min(258, Math.floor((width - 65) / 2));
  const description =
    combo?.description?.trim() || combo?.long_description?.trim() || '';
  const specifications =
    combo?.specifications &&
    typeof combo.specifications === 'object' &&
    !Array.isArray(combo.specifications)
      ? Object.entries(combo.specifications).filter(
          ([, value]) =>
            (typeof value === 'string' || typeof value === 'number') &&
            String(value).trim().length > 0,
        )
      : [];
  const unavailable = Number.isFinite(stock) && stock <= 0;

  return (
    <View className="px-4 pb-8 pt-3">
      {loading ? (
        <View className="h-[300px] items-center justify-center rounded-[20px] bg-white">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : error ? (
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
      ) : combo ? (
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
                  accessibilityLabel={`Show combo image ${index + 1}`}
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
            Furniture combo
          </Text>
          <Text className="mt-1 text-[24px] font-black leading-8 text-[#351D0E]">
            {combo.name}
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
              <Text className="text-[15px] font-black text-[#351D0E]">About this combo</Text>
              <Text className="mt-2 text-[13px] leading-5 text-[#634D3B]">
                {description}
              </Text>
            </View>
          ) : null}

          <View className="mt-4 rounded-[16px] bg-white p-4">
            <Text className="text-[15px] font-black text-[#351D0E]">Included products</Text>
            {components.length ? (
              components.map((component, index) => (
                <View
                  key={`${component.product_id ?? component.product_name ?? 'product'}-${index}`}
                  className="flex-row items-center justify-between border-t border-[#F0E7DE] py-3">
                  <View className="mr-3 flex-1">
                    <Text className="text-[13px] font-semibold text-[#351D0E]">
                      {component.product_name ??
                        (component.product_id
                          ? `Product #${component.product_id}`
                          : 'Product')}
                    </Text>
                    {component.variant_size || component.variant_color ? (
                      <Text className="mt-1 text-[11px] text-[#8B735E]">
                        {[component.variant_size, component.variant_color]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    ) : null}
                  </View>
                  <Text className="text-[12px] font-bold text-[#A34720]">
                    Qty: {Number(component.quantity) || 1}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="mt-2 text-[13px] text-[#8B735E]">
                No product details are available for this combo.
              </Text>
            )}
          </View>

          {specifications.length ? (
            <View className="mt-4 rounded-[16px] bg-white p-4">
              <Text className="mb-2 text-[15px] font-black text-[#351D0E]">
                Specifications
              </Text>
              {specifications.map(([label, value]) => (
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
            itemId={combo.combo_id ?? combo.id ?? itemId}
            itemType="combo"
          />

          <View className="mt-5 flex-row">
            <Pressable
              accessibilityRole="button"
              disabled={unavailable}
              onPress={() => onAddToCart(actionId, combo.name)}
              className={`mr-3 h-[50px] flex-1 flex-row items-center justify-center rounded-full ${
                unavailable ? 'bg-[#CDBBA8]' : 'bg-[#F97316]'
              }`}>
              <ShoppingCart size={18} color="#FFFFFF" />
              <Text className="ml-2 text-[14px] font-black text-white">
                {unavailable ? 'Out of stock' : 'Add to cart'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={unavailable}
              onPress={() => (onBuyNow ?? onAddToCart)(actionId, combo.name)}
              className={`h-[50px] flex-1 items-center justify-center rounded-full ${
                unavailable ? 'bg-[#CDBBA8]' : 'bg-[#351D0E]'
              }`}>
              <Text className="text-[14px] font-black text-white">
                {unavailable ? 'Unavailable' : 'Buy now'}
              </Text>
            </Pressable>
          </View>

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
