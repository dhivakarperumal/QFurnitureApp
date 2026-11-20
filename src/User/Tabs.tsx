import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  Armchair,
  Boxes,
  ShoppingCart,
} from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { StoreTab } from './types';

type TabIconProps = {
  size?: number;
  color?: string;
};

function HomeTabIcon({ size = 24, color = '#FFFFFF' }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M3 10 12 3l9 7M5 9v12h14V9M9 21v-6h6v6"
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MoreTabIcon({ size = 24, color = '#FFFFFF' }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {[3.5, 14.5].flatMap(x =>
        [3.5, 14.5].map(y => (
          <Rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={6}
            height={6}
            rx={0.7}
            fill="none"
            stroke={color}
            strokeWidth={2.2}
          />
        )),
      )}
    </Svg>
  );
}

type TabsProps = {
  activeTab: StoreTab;
  cartCount: number;
  bottomInset: number;
  onTabPress: (tab: StoreTab) => void;
};

const tabs = [
  { name: 'Home', icon: HomeTabIcon, label: 'Home' },
  { name: 'Shop', icon: Armchair, label: 'Shop' },
  { name: 'Cart', icon: ShoppingCart, label: 'Cart' },
  { name: 'Combos', icon: Boxes, label: 'Combo' },
  { name: 'Profile', icon: MoreTabIcon, label: 'More' },
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
                <Stop offset="0%" stopColor="#E9570D" />
                <Stop offset="55%" stopColor="#F97316" />
                <Stop offset="100%" stopColor="#E9570D" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#bottomBarOrangeGradient)" />
          </Svg>
        </View>
        {tabs.map(({ name, icon: Icon, label }) => {
          const active = activeTab === name;
          return (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={
                name === 'Cart'
                  ? `Cart tab, ${cartCount} items`
                  : `${label} tab`
              }
              onPress={() => onTabPress(name)}
              className="relative h-[58px] flex-1 items-center justify-center rounded-[18px]">
              {active ? (
                <View
                  pointerEvents="none"
                  className="absolute bottom-0 left-1 right-1 top-0 rounded-[18px] border border-white bg-white"
                />
              ) : null}
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
              {name === 'Cart' && cartCount > 0 ? (
                <View className="absolute right-2 top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full border border-white bg-[#F45112] px-1">
                    <Text className="text-[10px] font-bold text-white">
                      {cartCount}
                    </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
