import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import type { StoreBanner } from '../types';
import { mediaUrl } from '../utils';

type OfferBannersProps = {
  banners: StoreBanner[];
  onShopPress: () => void;
};

export default function OfferBanners({
  banners,
  onShopPress,
}: OfferBannersProps) {
  const { width } = useWindowDimensions();
  const cardWidth = width - 32;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (banners.length < 2) {
      setActiveIndex(0);
      return;
    }

    const intervalId = setInterval(() => {
      setActiveIndex(index => (index + 1) % banners.length);
    }, 4500);

    return () => clearInterval(intervalId);
  }, [banners.length]);

  const renderBanner = (banner: StoreBanner | undefined, key: string) => {
    const imageUri = mediaUrl(banner?.mobile_image ?? banner?.desktop_image);

    return (
      <View
        key={key}
        style={{ width: cardWidth }}
        className="relative min-h-[170px] justify-center overflow-hidden rounded-[20px] bg-[#F5E3D0] px-5 py-4">
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            className="absolute right-0 top-0 h-full w-1/2"
            resizeMode="cover"
          />
        ) : null}
        <View
          pointerEvents="none"
          className="absolute inset-y-0 left-0 w-[60%] rounded-r-[80px] bg-[#F5E3D0]"
        />
        <View className="w-[60%]">
          {banner?.offer ? (
            <Text className="mb-2 self-start rounded-full bg-[#176139] px-3 py-1 text-[10px] font-bold text-white">
              {banner.offer}
            </Text>
          ) : null}
          <Text numberOfLines={2} className="text-[19px] font-black leading-6 text-[#351D0E]">
            {banner?.title || 'Find your next favourite piece'}
          </Text>
          <Text numberOfLines={2} className="mt-1 text-[12px] leading-4 text-[#49392D]">
            {banner?.subtitle || banner?.description || 'Explore furniture for every room.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onShopPress}
            className="mt-3 flex-row items-center self-start rounded-full bg-[#176139] px-3 py-2">
            <Text className="mr-1 text-[11px] font-bold text-white">Shop now</Text>
            <ArrowRight size={13} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View className="mt-5 px-4">
      <View className="mb-3">
        <Text className="text-[10px] font-bold uppercase tracking-[2px] text-[#A06E46]">
          Discover more
        </Text>
        <Text className="mt-1 text-[22px] font-black text-[#351D0E]">
          Collections &amp; offers
        </Text>
      </View>
      {banners.length
        ? renderBanner(
            banners[activeIndex],
            String(banners[activeIndex]?.id ?? activeIndex),
          )
        : renderBanner(undefined, 'empty-offer-banner')}
    </View>
  );
}
