import React from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import {
  Armchair,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from 'lucide-react-native';
import type { StoreCartItem } from '../types';
import { formatPrice, mediaUrl, productImage } from '../utils';

type CartProps = {
  items: StoreCartItem[];
  total: number;
  loading: boolean;
  error: string | null;
  pendingItemIds: string[];
  onRetry: () => void;
  onQuantityChange: (item: StoreCartItem, quantity: number) => void;
  onRemove: (item: StoreCartItem) => void;
  onExplorePress: () => void;
  onCheckoutPress: () => void;
};

export default function Cart({
  items,
  total,
  loading,
  error,
  pendingItemIds,
  onRetry,
  onQuantityChange,
  onRemove,
  onExplorePress,
  onCheckoutPress,
}: CartProps) {
  return (
    <View className="px-4 pt-5">
      <Text className="mb-4 text-[25px] font-black text-[#351D0E]">
        Your cart
      </Text>
      {loading ? (
        <ActivityIndicator color="#F97316" />
      ) : error ? (
        <View className="items-center rounded-[20px] bg-white px-6 py-8">
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
          {items.map(item => {
            const imageUri = mediaUrl(item.image) ?? productImage(item);
            const itemQuantity = Number(item.quantity);
            const busy = pendingItemIds.includes(String(item.id));
            return (
              <View
                key={item.id}
                className="mb-3 flex-row items-center rounded-[16px] bg-white p-3"
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
                <View className="ml-3 flex-1">
                  <Text
                    numberOfLines={2}
                    className="text-[13px] font-bold text-[#351D0E]"
                  >
                    {item.name}
                  </Text>
                  <Text className="mt-1 text-[13px] text-[#634D3B]">
                    {formatPrice(Number(item.price))} · Qty {itemQuantity}
                  </Text>
                  {item.variant_color || item.variant_size ? (
                    <Text
                      numberOfLines={1}
                      className="mt-1 text-[10px] text-[#8B735E]"
                    >
                      {[item.variant_color, item.variant_size]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  ) : null}
                  <Text className="mt-1 text-[12px] font-bold text-[#351D0E]">
                    {formatPrice(
                      Number(
                        item.total_price ?? Number(item.price) * itemQuantity,
                      ),
                    )}
                  </Text>
                </View>
                <View className="items-center">
                  <View className="mb-2 flex-row items-center">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Decrease ${item.name} quantity`}
                      disabled={busy || itemQuantity <= 1}
                      onPress={() => onQuantityChange(item, itemQuantity - 1)}
                      className="h-[30px] w-[30px] items-center justify-center rounded-full bg-[#FFF0E1] disabled:opacity-40"
                    >
                      <Minus size={15} color="#B94719" />
                    </Pressable>
                    <Text className="mx-2 min-w-[16px] text-center text-[12px] font-bold text-[#351D0E]">
                      {itemQuantity}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Increase ${item.name} quantity`}
                      disabled={busy}
                      onPress={() => onQuantityChange(item, itemQuantity + 1)}
                      className="h-[30px] w-[30px] items-center justify-center rounded-full bg-[#FFF0E1] disabled:opacity-40"
                    >
                      <Plus size={15} color="#B94719" />
                    </Pressable>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.name} from cart`}
                    disabled={busy}
                    onPress={() => onRemove(item)}
                    className="h-[30px] w-[30px] items-center justify-center rounded-full disabled:opacity-40"
                  >
                    <Trash2 size={16} color="#8B735E" />
                  </Pressable>
                </View>
              </View>
            );
          })}
          <View className="mt-2 flex-row items-center justify-between rounded-[16px] bg-white p-4">
            <Text className="text-[14px] font-bold text-[#351D0E]">
              Subtotal
            </Text>
            <Text className="text-[17px] font-black text-[#351D0E]">
              {formatPrice(total)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onCheckoutPress}
            className="mt-3 h-[50px] flex-row items-center justify-center rounded-[14px] bg-[#F97316]"
          >
            <Text className="text-[14px] font-black text-white">
              Continue to checkout
            </Text>
          </Pressable>
        </>
      ) : (
        <View className="items-center rounded-[20px] bg-white px-6 py-10">
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
