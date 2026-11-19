import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Heart } from 'lucide-react-native';
import ProductCard from '../ProductCard';
import type { StoreFavorite } from '../types';

type FavoritesProps = {
  favorites: StoreFavorite[];
  favoriteIds: string[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onFavoritePress: (productId: string) => void;
  onAddToCart: (productId: string) => void;
};

export default function Favorites({
  favorites,
  favoriteIds,
  loading,
  error,
  onRetry,
  onFavoritePress,
  onAddToCart,
}: FavoritesProps) {
  return (
    <View className="px-4 pt-5">
      <Text className="mb-4 text-[25px] font-black text-[#351D0E]">Your favorites</Text>
      {loading ? (
        <ActivityIndicator color="#F97316" />
      ) : error ? (
        <View className="items-center rounded-[20px] bg-white px-6 py-8">
          <Text className="text-center text-[13px] text-[#8B2D20]">{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            className="mt-4 rounded-full bg-[#F97316] px-4 py-2">
            <Text className="text-[12px] font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : favorites.length ? (
        <View className="flex-row flex-wrap justify-between">
          {favorites.map(item => {
            const product =
              item.item_type === 'combo'
                ? { ...item, id: `combo-${item.combo_id ?? item.id}` }
                : item;
            return (
              <ProductCard
                key={`${product.item_type ?? 'product'}-${product.id}`}
                product={product}
                favorite={favoriteIds.includes(String(product.id))}
                compact
                onFavoritePress={onFavoritePress}
                onAddToCart={onAddToCart}
              />
            );
          })}
        </View>
      ) : (
        <View className="items-center rounded-[20px] bg-white px-6 py-10">
          <Heart size={34} color="#F97316" />
          <Text className="mt-3 text-[15px] font-bold text-[#351D0E]">No favorites yet</Text>
          <Text className="mt-1 text-center text-[13px] text-[#8B735E]">
            Tap the heart on furniture you love.
          </Text>
        </View>
      )}
    </View>
  );
}
