import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Armchair, Heart, ShoppingCart, Star } from 'lucide-react-native';
import type { StoreProduct } from './types';
import {
  formatPrice,
  productCategory,
  productDiscountPercent,
  productImage,
  productPrice,
} from './utils';

type ProductCardProps = {
  product: StoreProduct;
  favorite: boolean;
  compact?: boolean;
  cardWidth?: number;
  onFavoritePress: (productId: string) => void;
  onAddToCart: (productId: string) => void;
  onProductPress: (productId: string) => void;
};

export default function ProductCard({
  product,
  favorite,
  compact = false,
  cardWidth,
  onFavoritePress,
  onAddToCart,
  onProductPress,
}: ProductCardProps) {
  const id = String(product.id);
  const price = productPrice(product);
  const mrp = Number(product.mrp);
  const discount = Math.round(productDiscountPercent(product));
  const rating = Number(product.rating);
  const imageUri = productImage(product);

  return (
    <View
      style={cardWidth ? { width: cardWidth } : undefined}
      className={`${compact ? 'mb-2 rounded-[18px]' : 'mb-3 rounded-[20px]'} overflow-hidden border border-[#F0E7DE] bg-white shadow-sm ${
        cardWidth ? 'mr-3' : ''
      } ${
        cardWidth ? '' : compact ? 'w-[48%]' : 'w-[258px]'
      }`}>
      <View
        className={`relative ${
          compact ? 'h-[128px]' : 'h-[170px]'
        } overflow-hidden bg-[#F4E9DD]`}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${product.name} details`}
          onPress={() => onProductPress(id)}
          className="h-full w-full">
          {imageUri ? (
            <Image source={{ uri: imageUri }} className="h-full w-full" resizeMode="contain" />
          ) : (
            <View className="h-full items-center justify-center">
              <Armchair size={46} color="#A78A70" strokeWidth={1.3} />
            </View>
          )}
        </Pressable>
        {discount > 0 ? (
          <View
            className={`absolute rounded-full bg-[#187A45] ${
              compact ? 'left-2 top-2 px-2 py-1' : 'left-3 top-3 px-3 py-1'
            }`}>
            <Text className={`font-bold text-white ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
              {discount}% OFF
            </Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
          onPress={() => onFavoritePress(id)}
          className={`absolute items-center justify-center rounded-full bg-white ${
            compact ? 'right-2 top-2 h-[32px] w-[32px]' : 'right-3 top-3 h-[36px] w-[36px]'
          }`}>
          <Heart
            size={compact ? 17 : 19}
            color={favorite ? '#F97316' : '#634D3B'}
            fill={favorite ? '#F97316' : 'transparent'}
          />
        </Pressable>
      </View>
      <View className={compact ? 'p-2' : 'p-3'}>
        <Text
          numberOfLines={compact ? 1 : 2}
          className={`font-bold uppercase text-[#A06E46] ${
            compact
              ? 'text-[9px] leading-[12px] tracking-[0.8px]'
              : 'text-[10px] tracking-[1.4px]'
          }`}>
          {productCategory(product) || 'Furniture'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => onProductPress(id)}
          className={`mt-1 ${compact ? 'min-h-[34px]' : 'min-h-[40px]'}`}>
          <Text
            numberOfLines={compact ? 1 : 2}
            className={`font-bold text-[#351D0E] ${
              compact ? 'text-[12px] leading-[16px]' : 'text-[14px] leading-5'
            }`}>
            {product.name}
          </Text>
        </Pressable>
        {Number.isFinite(rating) && rating > 0 ? (
          <View className={`flex-row items-center ${compact ? 'mt-0' : 'mt-1'}`}>
            <Star size={compact ? 12 : 13} color="#F97316" fill="#F97316" />
            <Text className={`ml-1 font-semibold text-[#634D3B] ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
              {rating.toFixed(1)}
            </Text>
          </View>
        ) : null}
        <View className={`flex-row items-center justify-between ${compact ? 'mt-1' : 'mt-2'}`}>
          <View className="flex-1">
            <Text className={`font-black text-[#351D0E] ${compact ? 'text-[14px]' : 'text-[16px]'}`}>
              {formatPrice(price)}
            </Text>
            {discount > 0 ? (
              <Text className={`text-[#9A8B7D] line-through ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                {formatPrice(mrp)}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${product.name} to cart`}
            onPress={() => onAddToCart(id)}
            className={`items-center justify-center rounded-[12px] bg-[#F97316] ${
              compact ? 'h-[36px] w-[36px]' : 'h-[42px] w-[42px]'
            }`}>
            <ShoppingCart size={compact ? 18 : 20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
