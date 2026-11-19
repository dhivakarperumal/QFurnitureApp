import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import type { StoreBanner } from '../types';
import { mediaUrl } from '../utils';

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
  const imageUri = mediaUrl(banner?.mobile_image ?? banner?.desktop_image);

  return (
    <View className="relative mx-4 mt-2 min-h-[310px] justify-center overflow-hidden rounded-[26px] bg-[#F2E0CC] px-5 py-6">
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}
      <View pointerEvents="none" className="absolute inset-0 bg-white/25" />
      <View className="w-[70%]">
        <View className="self-start rounded-full border border-[#D9C4AA] bg-white/80 px-3 py-2">
          <Text className="text-[10px] font-bold uppercase tracking-[1.3px] text-[#351D0E]">
            Q Living Furniture
          </Text>
        </View>
        <Text numberOfLines={3} className="mt-4 text-[28px] font-black leading-[34px] text-[#263B2A]">
          {banner?.title || 'Make your home feel like home.'}
        </Text>
        <Text numberOfLines={3} className="mt-2 text-[14px] leading-5 text-[#49392D]">
          {banner?.subtitle ||
            banner?.description ||
            'Thoughtful furniture, everyday comfort, and timeless style.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onExplorePress}
          className="mt-4 flex-row items-center self-start rounded-full bg-[#F97316] px-4 py-3">
          <Text className="mr-2 text-[13px] font-bold text-white">Explore collection</Text>
          <ArrowRight size={16} color="#FFFFFF" />
        </Pressable>
      </View>
      {banners.length > 1 ? (
        <View className="absolute bottom-4 left-5 flex-row items-center">
          {banners.map((item, index) => (
            <Pressable
              key={item.id ?? index}
              accessibilityRole="button"
              accessibilityLabel={`Show promotion ${index + 1}`}
              onPress={() => onIndexChange(index)}
              className={`mr-2 h-[9px] rounded-full ${
                activeIndex === index ? 'w-[22px] bg-[#F97316]' : 'w-[9px] bg-white'
              }`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
