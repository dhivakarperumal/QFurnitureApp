import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Heart, UserRound } from 'lucide-react-native';
import type { StoreTab } from './types';

type HeaderProps = {
  activeTab: StoreTab;
  onFavoritesPress: () => void;
  onProfilePress: () => void;
};

export default function Header({
  activeTab,
  onFavoritesPress,
  onProfilePress,
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
          accessibilityLabel="Open favorites"
          accessibilityState={{ selected: activeTab === 'Favorites' }}
          onPress={onFavoritesPress}
          className="mr-2 h-[42px] w-[42px] items-center justify-center rounded-full bg-white">
          <Heart
            size={21}
            color={activeTab === 'Favorites' ? '#F97316' : '#351D0E'}
            fill={activeTab === 'Favorites' ? '#F97316' : 'transparent'}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          accessibilityState={{ selected: activeTab === 'Profile' }}
          onPress={onProfilePress}
          className="h-[42px] w-[42px] items-center justify-center rounded-full bg-white">
          <UserRound
            size={21}
            color={activeTab === 'Profile' ? '#F97316' : '#351D0E'}
          />
        </Pressable>
      </View>
    </View>
  );
}
