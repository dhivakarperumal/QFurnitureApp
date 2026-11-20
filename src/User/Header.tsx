import React from 'react';
import { Image, ImageBackground, Pressable, Text, View } from 'react-native';
import { Heart, UserRound } from 'lucide-react-native';
import type { StoreTab } from './types';

type HeaderProps = {
  activeTab: StoreTab;
  topInset: number;
  onFavoritesPress: () => void;
  onProfilePress: () => void;
};

export default function Header({
  activeTab,
  topInset,
  onFavoritesPress,
  onProfilePress,
}: HeaderProps) {
  return (
    <ImageBackground
      source={require('../Assert/images/topheader1.png')}
      resizeMode="cover"
      style={{ height: 58 + topInset, paddingTop: topInset }}
      className="flex-row items-center justify-between overflow-hidden px-3 shadow-md">
      <View
        pointerEvents="none"
        className="absolute inset-0 bg-[#F45B00]/75"
      />
      <View className="flex-row items-center">
        <Image
          source={require('../Assert/images/appicon.png')}
          accessibilityLabel="Q Living Furniture"
          resizeMode="contain"
          className="h-[44px] w-[44px] rounded-[12px] bg-white"
        />
        <View className="mx-3 h-[40px] w-px bg-white/45" />
        <View>
          <Text className="text-[17px] font-black italic text-white">Q Living</Text>
          <Text className="text-[8px] font-bold uppercase tracking-[2.4px] text-white/90">
            Furniture
          </Text>
        </View>
      </View>
      <View className="flex-row">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open favorites"
          accessibilityState={{ selected: activeTab === 'Favorites' }}
          onPress={onFavoritesPress}
          className="mr-2 h-[42px] w-[42px] items-center justify-center rounded-full bg-white/15">
          <Heart
            size={22}
            color="#FFFFFF"
            fill={activeTab === 'Favorites' ? '#FFFFFF' : 'transparent'}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          accessibilityState={{ selected: activeTab === 'Profile' }}
          onPress={onProfilePress}
          className="h-[42px] w-[42px] items-center justify-center rounded-full bg-white/15">
          <UserRound size={22} color="#FFFFFF" />
        </Pressable>
      </View>
    </ImageBackground>
  );
}
