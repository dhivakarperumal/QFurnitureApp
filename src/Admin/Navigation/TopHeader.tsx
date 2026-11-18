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
      className="absolute left-0 right-0 top-0 z-10 px-3">
      <View
        className="h-[150px] flex-row items-center overflow-hidden rounded-[44px] border-[3px] border-[#F7A40A] bg-[#073E56] px-[20px] shadow-lg elevation-[10]">
        <Pressable
          accessibilityLabel="Open menu"
          accessibilityRole="button"
          onPress={onMenuPress}
          className="w-[54px] h-[54px] items-center justify-center">
          {[0, 1, 2].map(line => (
            <View
              key={line}
              className={[
                'w-[42px] h-[5px] rounded-full bg-white',
                line === 0 ? '' : 'mt-[9px]',
              ].join(' ')}
            />
          ))}
        </Pressable>

        <View className="mx-[10px] h-[88px] w-[1.5px] bg-[#25A4C7]" />

        <View className="mr-2 h-[112px] w-[82px] items-center justify-end">
          <View className="absolute left-[31px] top-0 h-[36px] w-[26px] rounded-t-[10px] bg-[#FFF6A8] border-[2px] border-[#FFC845]" />
          <View className="absolute left-[42px] top-[34px] h-[42px] w-[4px] bg-[#D89A23]" />
          <View className="absolute bottom-[20px] left-[17px] h-[54px] w-[52px] rounded-t-[22px] bg-[#F3A51A] border-[2px] border-[#9B6208]" />
          <View className="absolute bottom-[36px] left-[20px] h-[18px] w-[46px] rounded-[10px] bg-[#FFC84A]" />
          <View className="absolute bottom-[20px] left-[24px] h-[31px] w-[38px] rounded-[16px] bg-[#D98A0A]" />
          <View className="absolute bottom-[19px] left-[20px] h-[38px] w-[4px] rounded-full bg-[#6E3E09]" />
          <View className="absolute bottom-[19px] right-[16px] h-[38px] w-[4px] rounded-full bg-[#6E3E09]" />
          <View className="absolute bottom-[0px] left-[5px] h-[8px] w-[72px] rounded-full bg-[#F7A40A] border border-[#C37A08]" />

          <View className="absolute right-[5px] bottom-[17px] h-[34px] w-[18px] rounded-t-[12px] bg-[#E7F0C3] border-[2px] border-[#9ACB55]" />
          {[0, 1, 2, 3].map(level => (
            <View
              key={level}
              className="absolute w-[7px] h-[23px] rounded-full bg-[#2A9A43]"
              style={{
                right: 10 + (level % 2) * 7,
                bottom: 38 + level * 5,
                transform: [{ rotate: level % 2 === 0 ? '-28deg' : '28deg' }],
              }}
            />
          ))}
        </View>

        <View className="flex-1 justify-center">
          <Text
            numberOfLines={1}
            className="text-[48px] leading-[52px] font-black text-white">
            {name}
          </Text>
          <Text
            numberOfLines={1}
            className="-mt-[2px] text-[33px] leading-[38px] font-black text-[#FFD45A]">
            {shopName}
          </Text>
          <View className="mt-[7px] h-[48px] max-w-[310px] flex-row items-center justify-center rounded-full border-[3px] border-[#24C8EA] bg-[#075170] px-[12px]">
            <Text className="mr-[8px] text-[27px] leading-[32px]">♛</Text>
            <Text className="text-[24px] leading-[28px] font-bold text-white">
              Admin Panel
            </Text>
          </View>
        </View>

        <View className="ml-1 h-full flex-row items-center">
          <Pressable
            accessibilityLabel="Search"
            accessibilityRole="button"
            onPress={onSearchPress}
            className="mr-[22px] h-[76px] w-[76px] items-center justify-center rounded-[26px] border-[4px] border-[#2A93AE]">
            <View className="h-[34px] w-[34px] rounded-full border-[5px] border-white" />
            <View
              className="absolute bottom-[16px] right-[17px] h-[20px] w-[5px] rounded-full bg-white"
              style={{ transform: [{ rotate: '-45deg' }] }}
            />
          </Pressable>

          <Pressable
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            onPress={onNotificationPress}
            className="mr-[20px] h-[76px] w-[76px] items-center justify-center">
            <View className="mt-[6px] h-[52px] w-[48px] rounded-t-[26px] border-[6px] border-t-white border-x-white border-b-0" />
            <View className="absolute bottom-[11px] h-[7px] w-[20px] rounded-full bg-white" />
            {notificationCount > 0 && (
              <View className="absolute right-[0px] top-[0px] h-[54px] w-[54px] items-center justify-center rounded-full border-[3px] border-[#073E56] bg-[#E92B28]">
                <Text className="text-[31px] leading-[36px] font-bold text-white">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </Pressable>

          <View className="mr-[12px] h-[92px] w-[2px] bg-[#F8D65A]" />

          <Pressable
            accessibilityLabel="Open profile"
            accessibilityRole="button"
            onPress={onProfilePress}
            className="h-[92px] w-[92px] items-center justify-center rounded-full bg-[#F6AF1A]">
            <Text className="text-[50px] leading-[56px] font-black text-[#073E56]">
              {name.trim().charAt(0).toUpperCase() || 'D'}
            </Text>
          </Pressable>

          <Text className="ml-[12px] text-[50px] leading-[54px] text-white">
           ⌄
          </Text>
        </View>

        <View className="absolute -bottom-[26px] -right-[3px] h-[66px] w-[420px] rounded-[50%] border-t-[4px] border-[#FFD85A] bg-[#D69A25] opacity-90" />
        <View className="absolute -bottom-[36px] right-[150px] h-[64px] w-[360px] rounded-[50%] border-t-[3px] border-white bg-[#073E56]" />
      </View>
    </View>
  );
}