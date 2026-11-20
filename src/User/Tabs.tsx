import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  Armchair,
  Boxes,
  House,
  Menu,
  ShoppingBasket,
} from 'lucide-react-native';
import type { StoreTab } from './types';

type TabsProps = {
  activeTab: StoreTab;
  cartCount: number;
  bottomInset: number;
  onTabPress: (tab: StoreTab) => void;
};

const tabs = [
  { name: 'Home', icon: House, label: 'Home' },
  { name: 'Shop', icon: Armchair, label: 'Shop' },
  { name: 'Cart', icon: ShoppingBasket, label: 'Cart' },
  { name: 'Combos', icon: Boxes, label: 'Combo' },
  { name: 'Profile', icon: Menu, label: 'More' },
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
      style={{ paddingBottom: Math.max(bottomInset, 8) }}
      className="absolute bottom-0 left-0 right-0 bg-white px-3 pt-2 shadow-lg">
      <View className="h-[64px] flex-row items-center rounded-full border border-[#F2E8DF] bg-[#FFFEFC] px-1.5 shadow-md">
        {tabs.map(({ name, icon: Icon, label }) => {
          const active = activeTab === name;
          if (name === 'Cart') {
            return (
              <View key={name} className="flex-1 items-center">
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Cart tab, ${cartCount} items`}
                  onPress={() => onTabPress('Cart')}
                  className="h-[54px] w-[56px] items-center justify-center rounded-[17px] bg-[#F97316] shadow-sm">
                  <ShoppingBasket size={24} color="#FFFFFF" strokeWidth={2.2} />
                  {cartCount > 0 ? (
                    <View className="absolute right-[-3px] top-[-4px] h-[18px] min-w-[18px] items-center justify-center rounded-full border border-white bg-[#F45112] px-1">
                      <Text className="text-[10px] font-bold text-white">
                        {cartCount}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            );
          }

          return (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label} tab`}
              onPress={() => onTabPress(name)}
              className={`relative h-[50px] flex-1 items-center justify-center rounded-[17px] ${
                active ? 'bg-[#FFF0E4]' : ''
              }`}>
              <Icon
                size={21}
                color={active ? '#F97316' : '#1E432C'}
                fill={active && name === 'Home' ? '#F97316' : 'transparent'}
                strokeWidth={2.2}
              />
              <Text
                className={`mt-[3px] text-[10px] leading-[12px] ${
                  active
                    ? 'font-bold text-[#F97316]'
                    : 'font-medium text-[#1E432C]'
                }`}>
                {label}
              </Text>
              {name === 'Combos' ? (
                <View className="absolute bottom-[8px] right-[-1px] h-[20px] w-px bg-[#E8DDD1]" />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
