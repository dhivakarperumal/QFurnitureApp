import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  Armchair,
  ArrowRight,
  Heart,
  ShoppingCart,
  Trash2,
} from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { StoreFavorite } from '../types';
import {
  formatPrice,
  mediaUrl,
  productImage,
  productPrice,
} from '../utils';

type FavoritesProps = {
  favorites: StoreFavorite[];
  pendingFavoriteIds: string[];
  loading: boolean;
  error: string | null;
  clearing: boolean;
  addingAllToCart: boolean;
  onRetry: () => void;
  onRefresh: () => Promise<void>;
  onRemoveFavorite: (productId: string) => void;
  onProductPress: (productId: string) => void;
  onClearAll: () => void;
  onAddAllToCart: () => void;
  onExplorePress: () => void;
};

export default function Favorites({
  favorites,
  pendingFavoriteIds,
  loading,
  error,
  clearing,
  addingAllToCart,
  onRetry,
  onRefresh,
  onRemoveFavorite,
  onProductPress,
  onClearAll,
  onAddAllToCart,
  onExplorePress,
}: FavoritesProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };
  const subtotal = favorites.reduce(
    (amount, item) => amount + productPrice(item),
    0,
  );

  return (
    <View className="flex-1 bg-[#FCFAF7] px-4 pt-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-[22px] font-black text-[#351D0E]">
            Your favorites
          </Text>
          <Text className="mt-0.5 text-[11px] text-[#8B735E]">
            {favorites.length} saved{' '}
            {favorites.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
        {favorites.length > 0 && !loading && !error ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all favorites"
            disabled={clearing || addingAllToCart || pendingFavoriteIds.length > 0}
            onPress={onClearAll}
            className="ml-3 h-[32px] flex-row items-center rounded-full border border-[#F4C8B8] bg-[#FFF0E8] px-3 disabled:opacity-50"
          >
            {clearing ? (
              <ActivityIndicator size="small" color="#C2410C" />
            ) : (
              <Trash2 size={12} color="#C2410C" />
            )}
            <Text className="ml-1 text-[10px] font-bold text-[#C2410C]">
              Clear All
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F97316" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center rounded-[20px] bg-white px-6 py-8">
          <Text className="text-center text-[13px] text-[#8B2D20]">{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            className="mt-4 rounded-full bg-[#F97316] px-4 py-2"
          >
            <Text className="text-[12px] font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : favorites.length ? (
        <>
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerClassName="pb-3"
          >
            {favorites.map(item => {
              const productId =
                item.item_type === 'combo'
                  ? `combo-${String(item.combo_id ?? item.id).replace(
                      /^combo-/,
                      '',
                    )}`
                  : String(item.product_id ?? item.id);
              const imageUri = mediaUrl(item.image) ?? productImage(item);
              const price = productPrice(item);
              const mrp = Number(item.mrp);
              const hasMrp = Number.isFinite(mrp) && mrp > price;
              const busy = pendingFavoriteIds.includes(productId);

              return (
                <View
                  key={productId}
                  className="mb-2.5 flex-row items-center rounded-[18px] border border-[#F0E7DE] bg-white p-2.5 shadow-sm"
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View ${item.name}`}
                    onPress={() => onProductPress(productId)}
                    className="flex-1 flex-row items-center"
                  >
                    {imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        className="h-[72px] w-[72px] rounded-[12px]"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="h-[72px] w-[72px] items-center justify-center rounded-[12px] bg-[#F1E5D7]">
                        <Armchair size={30} color="#A78A70" />
                      </View>
                    )}
                    <View className="ml-2.5 flex-1">
                      <Text
                        numberOfLines={2}
                        className="text-[12px] font-bold text-[#351D0E]"
                      >
                        {item.name}
                      </Text>
                      <View className="mt-1 flex-row items-center">
                        <Text className="text-[13px] font-black text-[#C2410C]">
                          {formatPrice(price)}
                        </Text>
                        {hasMrp ? (
                          <Text className="ml-1.5 text-[10px] text-[#9A8878] line-through">
                            {formatPrice(mrp)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.name} from favorites`}
                    disabled={busy || clearing || addingAllToCart}
                    onPress={() => onRemoveFavorite(productId)}
                    className="ml-2 h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] disabled:opacity-40"
                  >
                    <Heart size={16} color="#DC2626" fill="#DC2626" />
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>

          <View className="border-t border-[#F0E7DE] bg-[#FCFAF7] px-1 pb-3 pt-2">
            <View className="mb-2.5 flex-row items-center justify-between rounded-[16px] border border-[#FFE2C2] bg-[#FFF7EC] px-3.5 py-3">
              <Text className="text-[12px] font-bold text-[#351D0E]">
                Subtotal
              </Text>
              <Text className="text-[16px] font-black text-[#351D0E]">
                {formatPrice(subtotal)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add all favorites to cart"
              disabled={addingAllToCart || clearing}
              onPress={onAddAllToCart}
              className="relative h-[48px] flex-row items-center justify-between overflow-hidden rounded-full px-4 shadow-lg disabled:opacity-60"
            >
              <View pointerEvents="none" className="absolute inset-0">
                <Svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 400 48"
                  preserveAspectRatio="none"
                >
                  <Defs>
                    <LinearGradient
                      id="favoritesAddAllGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <Stop offset="0%" stopColor="#F97316" />
                      <Stop offset="100%" stopColor="#E9570D" />
                    </LinearGradient>
                  </Defs>
                  <Rect
                    width="100%"
                    height="100%"
                    fill="url(#favoritesAddAllGradient)"
                  />
                </Svg>
              </View>
              <View className="w-[20px]" />
              <View className="flex-row items-center">
                {addingAllToCart ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <ShoppingCart size={15} color="white" />
                )}
                <Text className="ml-2 text-[12px] font-black text-white">
                  Add all to cart
                </Text>
              </View>
              <ArrowRight size={17} color="white" />
            </Pressable>
          </View>
        </>
      ) : (
        <View className="flex-1 items-center justify-center rounded-[20px] bg-white px-6 py-10">
          <Heart size={34} color="#F97316" />
          <Text className="mt-3 text-[15px] font-bold text-[#351D0E]">
            No favorites yet
          </Text>
          <Text className="mt-1 text-center text-[13px] text-[#8B735E]">
            Tap the heart on furniture you love.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onExplorePress}
            className="mt-4 rounded-full bg-[#F97316] px-5 py-3"
          >
            <Text className="text-[13px] font-bold text-white">
              Explore furniture
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
