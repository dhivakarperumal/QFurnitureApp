import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BottomBarProps = {
  activeItem?: 'Home' | 'Products' | 'Orders' | 'More';
  onItemPress?: (
    item: 'Home' | 'Products' | 'Orders' | 'More',
  ) => void;
  onAddPress?: () => void;
  className?: string;
};

const navigationItems = [
  { label: 'Home', icon: '⌂' },
  { label: 'Products', icon: '⬡' },
] as const;

const rightNavigationItems = [
  { label: 'Orders', icon: '🛒' },
  { label: 'More', icon: '⊞' },
] as const;

export default function Bottombar({
  activeItem = 'Home',
  onItemPress,
  onAddPress,
  className,
}: BottomBarProps) {
  const insets = useSafeAreaInsets();

  const renderItem = (
    item:
      | (typeof navigationItems)[number]
      | (typeof rightNavigationItems)[number],
  ) => {
    const isActive = activeItem === item.label;
    const isMore = item.label === 'More';

    return (
      <Pressable
        key={item.label}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        onPress={() => onItemPress?.(item.label)}
        style={({ pressed }) => (pressed ? { opacity: 0.72 } : null)}
        className={[
          'flex-1 h-[56px] items-center justify-center',
          isMore
            ? 'h-[52px] rounded-[22px] bg-[#F7A40A] border-2 border-[#FFD95A]'
            : '',
          isMore && isActive ? 'border-[#FFE289]' : '',
        ].join(' ')}>
        <Text
          className={[
            'h-[28px] text-white text-[24px] leading-[28px] text-center',
            isMore ? 'text-[#073E56]' : '',
          ].join(' ')}>
          {item.icon}
        </Text>
        <Text
          className={[
            'text-white text-[11px] leading-[13px] font-bold',
            isMore ? 'text-[#071F2B]' : '',
          ].join(' ')}>
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={{ bottom: Math.max(insets.bottom, 10) }}
      className={`absolute left-0 right-0 ${className ?? ''}`}>
      <View className="h-[72px] border-t-[2px] border-[#E9A91A] bg-[#073E56] flex-row items-center px-[10px] shadow-lg elevation-[14]">
        <View className="flex-1 h-full flex-row items-center">
          {navigationItems.map(renderItem)}
        </View>

        <View className="w-[68px] h-[72px] items-center">
          <Pressable
            accessibilityLabel="Add"
            accessibilityRole="button"
            onPress={onAddPress}
            style={({ pressed }) =>
              pressed ? { transform: [{ scale: 0.96 }] } : null
            }
            className="w-[64px] h-[64px] rounded-full items-center justify-center bg-[#F7A40A] border-[4px] border-[#C87808] -mt-[18px] shadow-lg elevation-[10]">
            <View className="absolute w-[32px] h-[8px] rounded-[4px] bg-white" />
            <View className="w-[8px] h-[32px] rounded-[4px] bg-white" />
          </Pressable>
        </View>

        <View className="flex-1 h-full flex-row items-center">
          {rightNavigationItems.map(renderItem)}
        </View>
      </View>
    </View>
  );
}
