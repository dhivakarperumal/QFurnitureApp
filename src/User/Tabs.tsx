import React from 'react';
import { ImageBackground, Pressable, Text, View } from 'react-native';
import {
  Gift,
  Home,
  Search,
  ShoppingCart,
  UserRound,
} from 'lucide-react-native';
import type { StoreTab } from './types';

type TabsProps = {
  activeTab: StoreTab;
  cartCount: number;
  bottomInset: number;
  onTabPress: (tab: StoreTab) => void;
};

const tabs = [
  { name: 'Home', icon: Home, label: 'Home' },
  { name: 'Explore', icon: Search, label: 'Explore' },
  { name: 'Cart', icon: ShoppingCart, label: 'Cart' },
  { name: 'Combos', icon: Gift, label: 'Combo' },
  { name: 'Profile', icon: UserRound, label: 'Account' },
] as const;

export default function Tabs({
  activeTab,
  cartCount,
  bottomInset,
  onTabPress,
}: TabsProps) {
  return (
    <View
      pointerEvents="box-none"
      style={{ paddingBottom: Math.max(bottomInset + 8, 18) }}
      className="absolute bottom-0 left-0 right-0 px-3">
      <View className="h-[76px] rounded-full border-2 border-[#F4A34B] shadow-[0_8px_24px_rgba(177,83,20,0.28)]">
        <ImageBackground
          source={require('../Assert/images/Cozy Mustard Armchair Living Room.png')}
          resizeMode="cover"
          className="flex-1 overflow-hidden rounded-full">
          <View
            pointerEvents="none"
            className="absolute inset-0 bg-[#FFF6E9]/75"
          />
          <View className="flex-1 flex-row items-center px-1">
            {tabs.map(({ name, icon: Icon, label }) => {
              const active = activeTab === name;
              if (name === 'Cart') {
                return <View key={name} className="flex-1" />;
              }

              return (
                <Pressable
                  key={name}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${label} tab`}
                  onPress={() => onTabPress(name)}
                  className="h-full flex-1 items-center justify-center pt-1">
                  <Icon
                    size={28}
                    color={active ? '#F97316' : '#1E432C'}
                    fill={active && name === 'Home' ? '#F97316' : 'transparent'}
                    strokeWidth={2.2}
                  />
                  <Text
                    className={`mt-1 text-[12px] ${
                      active
                        ? 'font-bold text-[#F97316]'
                        : 'font-semibold text-[#1E432C]'
                    }`}>
                    {label}
                  </Text>
                  {active ? (
                    <View className="absolute bottom-[5px] h-[4px] w-[58%] rounded-full bg-[#F97316]" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </ImageBackground>
        <View
          pointerEvents="box-none"
          className="absolute inset-0 items-center">
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'Cart' }}
            accessibilityLabel={`Cart tab, ${cartCount} items`}
            onPress={() => onTabPress('Cart')}
            className="absolute top-[-4px] h-[84px] w-[84px] self-center items-center justify-center rounded-full border-[5px] border-[#FFF7E9] bg-[#F97316] shadow-lg">
            <ShoppingCart size={38} color="#FFFFFF" strokeWidth={2.4} />
            {cartCount > 0 ? (
              <View className="absolute right-[-2px] top-[-1px] h-[28px] min-w-[28px] items-center justify-center rounded-full border-[3px] border-[#FFF7E9] bg-[#F45112] px-1">
                <Text className="text-[13px] font-black text-white">{cartCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
