import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  Armchair,
  Boxes,
  House,
  Menu,
  ShoppingCart,
} from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
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
  { name: 'Cart', icon: ShoppingCart, label: 'Cart' },
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
      className="absolute bottom-0 left-0 right-0 bg-white px-3 pt-2">
      <View className="relative h-[72px] flex-row items-center overflow-hidden rounded-full border border-[#FFB46B] bg-[#F97316] px-1.5 shadow-lg">
        <View pointerEvents="none" className="absolute inset-0">
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 400 72"
            preserveAspectRatio="none">
            <Defs>
              <LinearGradient
                id="bottomBarOrangeGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%">
                <Stop offset="0%" stopColor="#FF9B36" />
                <Stop offset="55%" stopColor="#F97316" />
                <Stop offset="100%" stopColor="#E9570D" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#bottomBarOrangeGradient)" />
          </Svg>
        </View>
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
                  className={`h-[60px] w-[62px] items-center justify-center rounded-[18px] border shadow-sm ${
                    active
                      ? 'border-white/80 bg-white'
                      : 'border-white/40 bg-white/20'
                  }`}>
                  <ShoppingCart
                    size={26}
                    color={active ? '#F97316' : '#FFFFFF'}
                    strokeWidth={2.2}
                  />
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
              className={`relative h-[58px] flex-1 items-center justify-center rounded-[18px] ${
                active ? 'border border-white bg-white' : ''
              }`}>
              <Icon
                size={23}
                color={active ? '#F97316' : '#FFFFFF'}
                fill="transparent"
                strokeWidth={2.2}
              />
              <Text
                className={`mt-[3px] text-[10px] leading-[12px] ${
                  active
                    ? 'font-bold text-[#F97316]'
                    : 'font-medium text-white/85'
                }`}>
                {label}
              </Text>
              {name === 'Combos' ? (
                <View className="absolute bottom-[8px] right-[-1px] h-[20px] w-px bg-white/35" />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
