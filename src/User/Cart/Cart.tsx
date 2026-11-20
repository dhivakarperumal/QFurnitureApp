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
  LockKeyhole,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { StoreCartItem } from '../types';
import { formatPrice, mediaUrl, productImage } from '../utils';

type CartProps = {
  items: StoreCartItem[];
  total: number;
  loading: boolean;
  error: string | null;
  pendingItemIds: string[];
  clearing: boolean;
  onRetry: () => void;
  onRefresh: () => Promise<void>;
  onQuantityChange: (item: StoreCartItem, quantity: number) => void;
  onRemove: (item: StoreCartItem) => void;
  onClear: () => void;
  onExplorePress: () => void;
  onCheckoutPress: () => void;
};

export default function Cart({
  items,
  total,
  loading,
  error,
  pendingItemIds,
  clearing,
  onRetry,
  onRefresh,
  onQuantityChange,
  onRemove,
  onClear,
  onExplorePress,
  onCheckoutPress,
}: CartProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };
  const itemCount = items.reduce(
    (count, item) => count + Number(item.quantity || 0),
    0,
  );
  const savings = items.reduce((amount, item) => {
    const mrp = Number(item.mrp);
    const price = Number(item.price);
    if (!Number.isFinite(mrp) || !Number.isFinite(price)) return amount;
    return amount + Math.max(0, mrp - price) * Number(item.quantity || 0);
  }, 0);

  return (
    <View className="flex-1 bg-[#FCFAF7] px-4 pt-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-[22px] font-black text-[#351D0E]">
            Your cart
          </Text>
          <Text className="mt-0.5 text-[11px] text-[#8B735E]">
            Review your items before checkout
          </Text>
        </View>
        {items.length > 0 && !loading && !error ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all cart items"
            disabled={clearing || pendingItemIds.length > 0}
            onPress={onClear}
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
          <Text className="text-center text-[13px] text-[#8B2D20]">
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            className="mt-4 rounded-full bg-[#F97316] px-4 py-2"
          >
            <Text className="text-[12px] font-bold text-white">Try again</Text>
          </Pressable>
        </View>
      ) : items.length ? (
        <>
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerClassName="pb-3"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#F97316']}
                tintColor="#F97316"
              />
            }
          >
            {items.map(item => {
              const imageUri = mediaUrl(item.image) ?? productImage(item);
              const itemQuantity = Number(item.quantity);
              const busy = pendingItemIds.includes(String(item.id));
              const price = Number(item.price);
              const mrp = Number(item.mrp);
              const hasMrp = Number.isFinite(mrp) && mrp > price;
              return (
                <View
                  key={item.id}
                  className="mb-2.5 flex-row items-center rounded-[18px] border border-[#F0E7DE] bg-white p-2.5 shadow-sm"
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
                    <View className="flex-row items-start justify-between">
                      <View className="mr-2 flex-1">
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
                        {item.variant_color || item.variant_size ? (
                          <View className="mt-1 flex-row flex-wrap">
                            {[item.variant_color, item.variant_size]
                              .filter(Boolean)
                              .map((variant, index) => (
                                <Text
                                  key={`${variant}-${index}`}
                                  numberOfLines={1}
                                  className="mr-1 mt-0.5 rounded-full bg-[#FFF0E1] px-2 py-0.5 text-[9px] font-semibold text-[#8B5E3C]"
                                >
                                  {variant}
                                </Text>
                              ))}
                          </View>
                        ) : null}
                      </View>
                      <View className="items-end">
                        <View className="flex-row items-center rounded-full bg-[#FFF5EC] px-1 py-1">
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Decrease ${item.name} quantity`}
                            disabled={busy || itemQuantity <= 1}
                            onPress={() =>
                              onQuantityChange(item, itemQuantity - 1)
                            }
                            className="h-[24px] w-[24px] items-center justify-center rounded-full bg-white disabled:opacity-40"
                          >
                            <Minus size={12} color="#B94719" />
                          </Pressable>
                          <Text className="mx-1.5 min-w-[14px] text-center text-[11px] font-bold text-[#351D0E]">
                            {itemQuantity}
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Increase ${item.name} quantity`}
                            disabled={busy}
                            onPress={() =>
                              onQuantityChange(item, itemQuantity + 1)
                            }
                            className="h-[24px] w-[24px] items-center justify-center rounded-full bg-white disabled:opacity-40"
                          >
                            <Plus size={12} color="#B94719" />
                          </Pressable>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${item.name} from cart`}
                          disabled={busy}
                          onPress={() => onRemove(item)}
                          className="mt-1.5 h-[28px] w-[28px] items-center justify-center rounded-[6px] border border-[#FCA5A5] bg-[#FEF2F2] disabled:opacity-40"
                        >
                          <Trash2 size={14} color="#DC2626" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <View className="border-t border-[#F0E7DE] bg-[#FCFAF7] px-1 pb-3 pt-2">
            <View className="mb-2.5 rounded-[16px] border border-[#FFE2C2] bg-[#FFF7EC] px-3.5 py-2.5">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-[12px] font-bold text-[#351D0E]">
                    Subtotal
                  </Text>
                  <Text className="mt-0.5 text-[10px] text-[#8B735E]">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </Text>
                </View>
                <Text className="text-[16px] font-black text-[#351D0E]">
                  {formatPrice(total)}
                </Text>
              </View>
              {savings > 0 ? (
                <Text className="mt-1.5 text-[10px] font-bold text-[#B85A1B]">
                  You're saving {formatPrice(savings)}!
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onCheckoutPress}
              className="relative h-[48px] flex-row items-center justify-between overflow-hidden rounded-full px-4 shadow-lg"
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
                      id="cartCheckoutGradient"
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
                    fill="url(#cartCheckoutGradient)"
                  />
                </Svg>
              </View>
              <View className="w-[20px]" />
              <View className="flex-row items-center">
                <LockKeyhole size={13} color="white" />
                <Text className="ml-2 text-[12px] font-black text-white">
                  Continue to checkout
                </Text>
              </View>
              <ArrowRight size={17} color="white" />
            </Pressable>
          </View>
        </>
      ) : (
        <View className="flex-1 items-center justify-center rounded-[20px] bg-white px-6 py-10">
          <ShoppingCart size={36} color="#F97316" />
          <Text className="mt-3 text-[15px] font-bold text-[#351D0E]">
            Your cart is empty
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
