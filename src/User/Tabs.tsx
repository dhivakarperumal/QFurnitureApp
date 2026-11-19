import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  Home,
  Search,
  ShoppingCart,
  Tag,
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
  { name: 'Home',      icon: Home },
  { name: 'Explore',   icon: Search },
  { name: 'Combos',    icon: Tag },
  { name: 'Cart',      icon: ShoppingCart },
  { name: 'Profile',   icon: UserRound },
] as const;

export default function Tabs({
  activeTab,
  cartCount,
  bottomInset,
  onTabPress,
}: TabsProps) {
  return (
    <View
      style={{ paddingBottom: Math.max(bottomInset, 8) }}
      className="absolute bottom-0 left-0 right-0 flex-row items-center justify-around border-t border-[#F0E7DE] bg-white pt-2 shadow-lg">
      {tabs.map(({ name, icon: Icon, ...rest }) => {
        const label = 'label' in rest ? (rest as { label: string }).label : name;
        const active = activeTab === name;
        return (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${label} tab`}
            onPress={() => onTabPress(name)}
            className="min-w-0 flex-1 items-center py-1">
            <View className="relative">
              <Icon
                size={23}
                color={active ? '#F97316' : '#351D0E'}
                fill={active && name === 'Home' ? '#F97316' : 'transparent'}
              />
              {name === 'Cart' && cartCount > 0 ? (
                <View className="absolute right-[-9px] top-[-7px] min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#F97316] px-1">
                  <Text className="text-[9px] font-bold text-white">{cartCount}</Text>
                </View>
              ) : null}
            </View>
            <Text
              className={`mt-1 text-[10px] ${
                active ? 'font-bold text-[#F97316]' : 'text-[#351D0E]'
              }`}>
              {name === 'Profile' ? 'Account' : name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
