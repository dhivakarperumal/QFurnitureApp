import React from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import ProductCard from '../ProductCard';
import type { StoreProduct } from '../types';

type ProductsProps = {
  products: StoreProduct[];
  favorites: string[];
  onFavoritePress: (productId: string) => void;
  onAddToCart: (productId: string) => void;
};

export default function Products({
  products,
  favorites,
  onFavoritePress,
  onAddToCart,
}: ProductsProps) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 40) / 2;

  return (
    <View className="mt-8">
      <View className="mb-4 px-4">
        <Text className="text-[10px] font-bold uppercase tracking-[2px] text-[#A06E46]">
          Made for your space
        </Text>
        <Text className="mt-1 text-[22px] font-black text-[#351D0E]">
          Featured furniture
        </Text>
      </View>
      {products.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-4">
          {products.slice(0, 10).map(product => (
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
      ) : (
        <Text className="px-4 py-5 text-[13px] text-[#8B735E]">
          No featured furniture is available right now.
        </Text>
      )}
    </View>
  );
}
