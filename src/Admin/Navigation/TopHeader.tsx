import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TopHeaderProps = {
  name?: string;
  shopName?: string;
  notificationCount?: number;
  onMenuPress?: () => void;
  onSearchPress?: () => void;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
};

export default function TopHeader({
  name = 'DHIVA',
  shopName = 'Furniture Shop',
  notificationCount = 3,
  onMenuPress,
  onSearchPress,
  onNotificationPress,
  onProfilePress,
}: TopHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="absolute left-0 right-0 top-0 z-10">
      <View
        className="h-[80px] flex-row items-center overflow-hidden border-b-[2px] border-[#F7A40A] bg-[#073E56] px-[8px] shadow-lg elevation-[10]">
        <Pressable
          accessibilityLabel="Open menu"
          accessibilityRole="button"
          onPress={onMenuPress}
          className="w-[34px] h-[34px] items-center justify-center">
          {[0, 1, 2].map(line => (
            <View
              key={line}
              className={[
                'w-[24px] h-[3px] rounded-full bg-white',
                line === 0 ? '' : 'mt-[5px]',
              ].join(' ')}
            />
          ))}
        </Pressable>

        <View className="mx-[5px] h-[48px] w-[1.5px] bg-[#25A4C7]" />

        

        <View className="ml-1 h-full flex-row items-center">
          <Pressable
            accessibilityLabel="Search"
            accessibilityRole="button"
            onPress={onSearchPress}
            className="mr-[8px] h-[40px] w-[40px] items-center justify-center rounded-[14px] border-[2px] border-[#2A93AE]">
            <View className="h-[18px] w-[18px] rounded-full border-[3px] border-white" />
            <View
              className="absolute bottom-[8px] right-[9px] h-[11px] w-[3px] rounded-full bg-white"
              style={{ transform: [{ rotate: '-45deg' }] }}
            />
          </Pressable>

          <Pressable
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            onPress={onNotificationPress}
            className="mr-[6px] h-[40px] w-[40px] items-center justify-center">
            <View className="mt-[3px] h-[27px] w-[25px] rounded-t-[13px] border-[3px] border-t-white border-x-white border-b-0" />
            <View className="absolute bottom-[5px] h-[4px] w-[11px] rounded-full bg-white" />
            {notificationCount > 0 && (
              <View className="absolute right-[-1px] top-[-1px] h-[24px] w-[24px] items-center justify-center rounded-full border-[2px] border-[#073E56] bg-[#E92B28]">
                <Text className="text-[12px] leading-[14px] font-bold text-white">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </Pressable>

          <View className="mr-[5px] h-[48px] w-[2px] bg-[#F8D65A]" />

          <Pressable
            accessibilityLabel="Open profile"
            accessibilityRole="button"
            onPress={onProfilePress}
            className="h-[42px] w-[42px] items-center justify-center rounded-full bg-[#F6AF1A]">
            <Text className="text-[21px] leading-[24px] font-black text-[#073E56]">
              {name.trim().charAt(0).toUpperCase() || 'D'}
            </Text>
          </Pressable>

          <Text className="ml-[4px] text-[20px] leading-[24px] text-white">
           ⌄
          </Text>
        </View>

        <View className="absolute -bottom-[26px] -right-[3px] h-[66px] w-[420px] rounded-[50%] border-t-[4px] border-[#FFD85A] bg-[#D69A25] opacity-90" />
        <View className="absolute -bottom-[36px] right-[150px] h-[64px] w-[360px] rounded-[50%] border-t-[3px] border-white bg-[#073E56]" />
      </View>
    </View>
  );
}