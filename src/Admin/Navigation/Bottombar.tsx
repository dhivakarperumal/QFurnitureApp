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
          'flex-1 h-[72px] items-center justify-center',
          isMore
            ? 'h-[68px] rounded-[28px] bg-[#F7A40A] border-2 border-[#FFD95A]'
            : '',
          isMore && isActive ? 'border-[#FFE289]' : '',
        ].join(' ')}>
        <Text
          className={[
            'h-[42px] text-white text-[38px] leading-[42px] text-center',
            isMore ? 'text-[#073E56]' : '',
          ].join(' ')}>
          {item.icon}
        </Text>
        <Text
          className={[
            'text-white text-[17px] leading-[20px] font-bold',
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
      className={`absolute left-3 right-3 ${className ?? ''}`}>
      <View className="h-[92px] rounded-[46px] border-[3px] border-[#E9A91A] bg-[#073E56] flex-row items-center px-[14px] pt-[5px] shadow-lg elevation-[14]">
        <View className="flex-1 h-full flex-row items-center">
          {navigationItems.map(renderItem)}
        </View>

        <View className="w-[82px] h-[92px] items-center">
          <Pressable
            accessibilityLabel="Add"
            accessibilityRole="button"
            onPress={onAddPress}
            style={({ pressed }) =>
              pressed ? { transform: [{ scale: 0.96 }] } : null
            }
            className="w-[82px] h-[82px] rounded-full items-center justify-center bg-[#F7A40A] border-[5px] border-[#C87808] -mt-[28px] shadow-lg elevation-[10]">
            <View className="absolute w-[42px] h-[10px] rounded-[5px] bg-white" />
            <View className="w-[10px] h-[42px] rounded-[5px] bg-white" />
          </Pressable>
        </View>

        <View className="flex-1 h-full flex-row items-center">
          {rightNavigationItems.map(renderItem)}
        </View>
      </View>
    </View>
  );
}
