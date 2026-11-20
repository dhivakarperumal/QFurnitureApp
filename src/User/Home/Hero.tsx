import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import type { StoreBanner } from '../types';

type HeroProps = {
  banners: StoreBanner[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onExplorePress: () => void;
};

export default function Hero({
  banners,
  activeIndex,
  onIndexChange,
  onExplorePress,
}: HeroProps) {
  const banner = banners[activeIndex];

  return (
    <View className="relative mx-4 mt-2 min-h-[210px] justify-center overflow-hidden rounded-[24px] border border-[#F6D4B2] bg-[#FFF0E1] px-4 py-3">
      <View className="w-full">
        <Text
          numberOfLines={3}
          className="text-[22px] font-black leading-[26px] text-[#263B2A]">
          {banner?.title || 'Make your home feel like home.'}
        </Text>
        <Text numberOfLines={3} className="mt-1 text-[12px] leading-[17px] text-[#49392D]">
          {banner?.subtitle ||
            banner?.description ||
            'Thoughtful furniture, everyday comfort, and timeless style.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onExplorePress}
          className="mt-2 flex-row items-center self-start rounded-full bg-[#F97316] px-4 py-2">
          <Text className="mr-2 text-[13px] font-bold text-white">Explore collection</Text>
          <ArrowRight size={16} color="#FFFFFF" />
        </Pressable>
      </View>
      {banners.length > 1 ? (
        <View className="mt-2 flex-row items-center">
          {banners.map((item, index) => (
            <Pressable
              key={item.id ?? index}
              accessibilityRole="button"
              accessibilityLabel={`Show promotion ${index + 1}`}
              onPress={() => onIndexChange(index)}
              className={`mr-2 h-[9px] rounded-full ${
                activeIndex === index
                  ? 'w-[22px] bg-[#F97316]'
                  : 'w-[9px] bg-[#B7A58F]'
              }`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
