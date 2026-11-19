import React, { useMemo } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import ProductCard from '../ProductCard';
import type { StoreProduct } from '../types';
import { productDiscountPercent } from '../utils';

type TopRatedProductsProps = {
  products: StoreProduct[];
  favorites: string[];
  onFavoritePress: (productId: string) => void;
  onAddToCart: (productId: string) => void;
};

export default function TopRatedProducts({
  products,
  favorites,
  onFavoritePress,
  onAddToCart,
}: TopRatedProductsProps) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 44) / 2;
  const topRatedProducts = useMemo(
    () =>
      [...products]
        .sort(
          (first, second) =>
            (Number(second.rating) || 0) - (Number(first.rating) || 0) ||
            productDiscountPercent(second) - productDiscountPercent(first),
        )
        .slice(0, 10),
    [products],
  );

  if (!topRatedProducts.length) return null;

  return (
    <View className="mt-8">
      <View className="mb-4 px-4">
        <Text className="text-[10px] font-bold uppercase tracking-[2px] text-[#A06E46]">
          Customer favourites
        </Text>
        <Text className="mt-1 text-[22px] font-black text-[#351D0E]">
          Top rated products
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-4">
        {topRatedProducts.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            favorite={favorites.includes(String(product.id))}
            cardWidth={cardWidth}
            onFavoritePress={onFavoritePress}
            onAddToCart={onAddToCart}
          />
        ))}
      </ScrollView>
    </View>
  );
}
