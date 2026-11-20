import React, { useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import ProductCard from '../ProductCard';
import type { StoreProduct } from '../types';
import { useAutoSwiper } from './useAutoSwiper';

type ProductsProps = {
  products: StoreProduct[];
  favorites: string[];
  onFavoritePress: (productId: string) => void;
  onAddToCart: (productId: string) => void;
  onProductPress: (productId: string) => void;
};

export default function Products({
  products,
  favorites,
  onFavoritePress,
  onAddToCart,
  onProductPress,
}: ProductsProps) {
  const { width } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const featuredProducts = products.slice(0, 10);
  const cardWidth = (width - 56) / 2;
  const cardStep = cardWidth + 12;
  const snapOffsets = featuredProducts.map((_, index) => index * cardStep);
  const { scrollRef, handleScrollBeginDrag, handleScrollSettled } =
    useAutoSwiper({
      itemCount: featuredProducts.length,
      visibleCount: 2,
      itemStep: cardStep,
      contentWidth,
      viewportWidth,
      intervalMs: 5000,
    });

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
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={event => setViewportWidth(event.nativeEvent.layout.width)}
          onContentSizeChange={setContentWidth}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollSettled}
          onMomentumScrollEnd={handleScrollSettled}
          snapToInterval={cardStep}
          snapToAlignment="start"
          snapToOffsets={snapOffsets}
          decelerationRate="fast"
          disableIntervalMomentum
          contentContainerClassName="px-4">
          {featuredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              favorite={favorites.includes(String(product.id))}
              cardWidth={cardWidth}
              onFavoritePress={onFavoritePress}
              onAddToCart={onAddToCart}
              onProductPress={onProductPress}
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
