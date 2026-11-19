import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Search, ShoppingCart } from 'lucide-react-native';

type HeaderProps = {
  cartCount: number;
  onSearchPress: () => void;
  onCartPress: () => void;
};

export default function Header({
  cartCount,
  onSearchPress,
  onCartPress,
}: HeaderProps) {
  return (
    <View className="h-[58px] flex-row items-center justify-between px-4">
      <View className="flex-row items-center">
        <Image
          source={require('../Assert/images/appicon.png')}
          accessibilityLabel="Q Living Furniture"
          resizeMode="contain"
          className="h-[42px] w-[42px]"
        />
        <View className="ml-2">
          <Text className="text-[16px] font-black italic text-[#1E432C]">Q Living</Text>
          <Text className="text-[8px] font-bold uppercase tracking-[1.8px] text-[#634D3B]">
            Furniture
          </Text>
        </View>
      </View>
      <View className="flex-row">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search furniture"
          onPress={onSearchPress}
          className="mr-2 h-[42px] w-[42px] items-center justify-center rounded-full bg-white">
          <Search size={21} color="#351D0E" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Cart, ${cartCount} items`}
          onPress={onCartPress}
          className="h-[42px] w-[42px] items-center justify-center rounded-full bg-white">
          <ShoppingCart size={21} color="#351D0E" />
          {cartCount > 0 ? (
            <View className="absolute right-[-3px] top-[-3px] min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#F97316] px-1">
              <Text className="text-[10px] font-bold text-white">{cartCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
