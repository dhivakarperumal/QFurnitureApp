import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Heart, UserRound } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
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
    <View
      style={{ height: topInset + 58 }}
      className="relative w-full">
      <Svg
        pointerEvents="none"
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient
            id="storefrontHeaderGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%">
            <Stop offset="0%" stopColor="#FF7900" />
            <Stop offset="55%" stopColor="#F96500" />
            <Stop offset="100%" stopColor="#EF4D00" />
          </LinearGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#storefrontHeaderGradient)"
        />
      </Svg>
      <View style={{ height: topInset }} />
      <View className="h-[58px] flex-row items-center justify-between px-3">
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
      </View>
    </View>
  );
}
