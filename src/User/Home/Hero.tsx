import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { StoreBanner } from '../types';

type HeroProps = {
  banners: StoreBanner[];
  activeIndex: number;
  onExplorePress: () => void;
};

export default function Hero({
  banners,
  activeIndex,
  onExplorePress,
}: HeroProps) {
  const banner = banners[activeIndex];
  const title = banner?.title?.trim();
  const subtitle = banner?.subtitle?.trim();
  const description = banner?.description?.trim();
  const offer = banner?.offer?.trim();

  if (!title && !subtitle && !description && !offer) return null;

  return (
    <View className="relative mx-4 mt-2 min-h-[210px] justify-center overflow-hidden rounded-[24px] border border-[#F6D4B2] bg-[#FFF0E1] px-4 py-3">
      <View pointerEvents="none" className="absolute inset-0">
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="heroOrangeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#FFF7ED" />
              <Stop offset="100%" stopColor="#FFD0A3" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#heroOrangeGradient)" />
        </Svg>
      </View>
      <View className="w-full">
        {offer ? (
          <Text className="mb-1 text-[11px] font-bold text-[#E87424]">
            {offer}
          </Text>
        ) : null}
        {title ? (
          <Text
            numberOfLines={3}
            className="text-[22px] font-black leading-[26px] text-[#263B2A]">
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text className="mt-1 text-[14px] font-semibold leading-[18px] text-[#E87424]">
            {subtitle}
          </Text>
        ) : null}
        {description ? (
          <Text numberOfLines={3} className="mt-1 text-[12px] leading-[17px] text-[#49392D]">
            {description}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={onExplorePress}
          className="mt-2 flex-row items-center self-start rounded-full bg-[#F97316] px-4 py-2">
          <Text className="mr-2 text-[13px] font-bold text-white">Explore collection</Text>
          <ArrowRight size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
