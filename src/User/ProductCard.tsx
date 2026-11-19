import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Armchair, Heart, ShoppingCart } from 'lucide-react-native';
import type { StoreProduct } from './types';
import { formatPrice, productCategory, productImage, productPrice } from './utils';

type ProductCardProps = {
  product: StoreProduct;
  favorite: boolean;
  compact?: boolean;
  onFavoritePress: (productId: string) => void;
  onAddToCart: (productId: string) => void;
};

export default function ProductCard({
  product,
  favorite,
  compact = false,
  onFavoritePress,
  onAddToCart,
}: ProductCardProps) {
  const id = String(product.id);
  const price = productPrice(product);
  const mrp = Number(product.mrp);
  const discount =
    mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const imageUri = productImage(product);

  return (
    <View
      className={`mb-3 overflow-hidden rounded-[20px] border border-[#F0E7DE] bg-white shadow-sm ${
        compact ? 'w-[48%]' : 'w-[258px]'
      }`}>
      <View className="relative h-[170px] overflow-hidden bg-[#F4E9DD]">
        {imageUri ? (
          <Image source={{ uri: imageUri }} className="h-full w-full" resizeMode="cover" />
        ) : (
          <View className="h-full items-center justify-center">
            <Armchair size={46} color="#A78A70" strokeWidth={1.3} />
          </View>
        )}
        {discount > 0 ? (
          <View className="absolute left-3 top-3 rounded-full bg-[#187A45] px-3 py-1">
            <Text className="text-[11px] font-bold text-white">{discount}% OFF</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
          onPress={() => onFavoritePress(id)}
          className="absolute right-3 top-3 h-[36px] w-[36px] items-center justify-center rounded-full bg-white">
          <Heart
            size={19}
            color={favorite ? '#F97316' : '#634D3B'}
            fill={favorite ? '#F97316' : 'transparent'}
          />
        </Pressable>
      </View>
      <View className="p-3">
        <Text className="text-[10px] font-bold uppercase tracking-[1.4px] text-[#A06E46]">
          {productCategory(product) || 'Furniture'}
        </Text>
        <Text numberOfLines={2} className="mt-1 min-h-[40px] text-[14px] font-bold leading-5 text-[#351D0E]">
          {product.name}
        </Text>
        <View className="mt-2 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-[16px] font-black text-[#351D0E]">{formatPrice(price)}</Text>
            {discount > 0 ? (
              <Text className="text-[11px] text-[#9A8B7D] line-through">{formatPrice(mrp)}</Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${product.name} to cart`}
            onPress={() => onAddToCart(id)}
            className="h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#F97316]">
            <ShoppingCart size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
