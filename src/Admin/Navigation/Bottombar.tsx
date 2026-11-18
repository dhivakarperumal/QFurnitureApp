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
  { label: 'Home' },
  { label: 'Products' },
] as const;

const rightNavigationItems = [
  { label: 'Orders' },
  { label: 'More' },
] as const;

function NavigationIcon({
  label,
  active,
}: {
  label: 'Home' | 'Products' | 'Orders' | 'More';
  active: boolean;
}) {
  const color = active ? '#F7A40A' : '#D9E7EC';

  if (label === 'Home') {
    return (
      <View className="h-[24px] w-[24px] items-end justify-end">
        <View
          className="absolute left-[6px] top-[1px] h-[11px] w-[11px] border-l-[2.5px] border-t-[2.5px]"
          style={{
            borderColor: color,
            transform: [{ rotate: '45deg' }],
          }}
        />
        <View
          className="h-[16px] w-[20px] border-[2.5px] border-t-0"
          style={{ borderColor: color }}>
          <View
            className="absolute bottom-0 left-[6px] h-[7px] w-[5px]"
            style={{ backgroundColor: color }}
          />
        </View>
      </View>
    );
  }

  if (label === 'Products') {
    return (
      <View className="h-[24px] w-[24px] items-center justify-center">
        <View
          className="h-[18px] w-[18px] rounded-[3px] border-[2.5px]"
          style={{ borderColor: color }}
        />
        <View
          className="absolute h-[2.5px] w-[11px]"
          style={{ backgroundColor: color }}
        />
        <View className="absolute h-[11px] w-[2.5px]" style={{ backgroundColor: color }} />
      </View>
    );
  }

  if (label === 'Orders') {
    return (
      <View className="h-[24px] w-[24px] items-center justify-center">
        <View
          className="h-[18px] w-[18px] rounded-[3px] border-[2.5px]"
          style={{ borderColor: color }}
        />
        <View
          className="absolute top-[7px] h-[2.5px] w-[9px]"
          style={{ backgroundColor: color }}
        />
        <View
          className="absolute top-[13px] h-[2.5px] w-[9px]"
          style={{ backgroundColor: color }}
        />
      </View>
    );
  }

  return (
    <View className="h-[24px] w-[24px] flex-row flex-wrap content-center justify-center">
      {[0, 1, 2, 3].map(dot => (
        <View
          key={dot}
          className="m-[2.5px] h-[5px] w-[5px] rounded-full"
          style={{ backgroundColor: color }}
        />
      ))}
    </View>
  );
}

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

    return (
      <Pressable
        key={item.label}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        onPress={() => onItemPress?.(item.label)}
        style={({ pressed }) => (pressed ? { opacity: 0.65 } : null)}
        className="flex-1 h-[64px] items-center justify-center">
        <View className="h-[24px] items-center justify-center">
          <NavigationIcon label={item.label} active={isActive} />
        </View>
        <Text
          className="mt-[4px] text-[12px] leading-[14px] font-bold"
          style={{ color: isActive ? '#F7A40A' : '#D9E7EC' }}>
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
      <View className="h-[64px] border-t border-[#24566A] bg-[#073E56] flex-row items-center px-[6px] shadow-lg elevation-[12]">
        <View className="flex-1 h-full flex-row items-center">
          {navigationItems.map(renderItem)}
        </View>

        <View className="w-[58px] h-[64px] items-center justify-center">
          <Pressable
            accessibilityLabel="Add"
            accessibilityRole="button"
            onPress={onAddPress}
            style={({ pressed }) =>
              pressed ? { transform: [{ scale: 0.96 }] } : null
            }
            className="w-[42px] h-[42px] rounded-full items-center justify-center bg-[#F7A40A] border-[3px] border-[#FFD95A] shadow-lg elevation-[8]">
            <View className="absolute w-[24px] h-[6px] rounded-[3px] bg-[#073E56]" />
            <View className="w-[6px] h-[24px] rounded-[3px] bg-[#073E56]" />
          </Pressable>
          <Text className="mt-[1px] text-[11px] leading-[13px] font-bold text-[#D9E7EC]">
            Add
          </Text>
        </View>

        <View className="flex-1 h-full flex-row items-center">
          {rightNavigationItems.map(renderItem)}
        </View>
      </View>
    </View>
  );
}
