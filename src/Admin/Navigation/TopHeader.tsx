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
        className="h-[104px] flex-row items-center overflow-hidden border-b-[2px] border-[#F7A40A] bg-[#073E56] px-[12px] shadow-lg elevation-[10]">
        <Pressable
          accessibilityLabel="Open menu"
          accessibilityRole="button"
          onPress={onMenuPress}
          className="w-[42px] h-[42px] items-center justify-center">
          {[0, 1, 2].map(line => (
            <View
              key={line}
              className={[
                'w-[30px] h-[4px] rounded-full bg-white',
                line === 0 ? '' : 'mt-[6px]',
              ].join(' ')}
            />
          ))}
        </Pressable>

        <View className="mx-[7px] h-[62px] w-[1.5px] bg-[#25A4C7]" />

        <View className="mr-1 h-[78px] w-[60px] items-center justify-end">
          <View className="absolute left-[23px] top-0 h-[26px] w-[19px] rounded-t-[8px] bg-[#FFF6A8] border-[2px] border-[#FFC845]" />
          <View className="absolute left-[31px] top-[24px] h-[29px] w-[3px] bg-[#D89A23]" />
          <View className="absolute bottom-[14px] left-[12px] h-[38px] w-[38px] rounded-t-[16px] bg-[#F3A51A] border-[2px] border-[#9B6208]" />
          <View className="absolute bottom-[25px] left-[14px] h-[13px] w-[34px] rounded-[8px] bg-[#FFC84A]" />
          <View className="absolute bottom-[14px] left-[17px] h-[22px] w-[28px] rounded-[12px] bg-[#D98A0A]" />
          <View className="absolute bottom-[13px] left-[15px] h-[27px] w-[3px] rounded-full bg-[#6E3E09]" />
          <View className="absolute bottom-[13px] right-[12px] h-[27px] w-[3px] rounded-full bg-[#6E3E09]" />
          <View className="absolute bottom-0 left-[3px] h-[6px] w-[54px] rounded-full bg-[#F7A40A] border border-[#C37A08]" />

          <View className="absolute right-[3px] bottom-[12px] h-[24px] w-[13px] rounded-t-[9px] bg-[#E7F0C3] border-[2px] border-[#9ACB55]" />
          {[0, 1, 2, 3].map(level => (
            <View
              key={level}
              className="absolute w-[5px] h-[16px] rounded-full bg-[#2A9A43]"
              style={{
                right: 7 + (level % 2) * 5,
                bottom: 26 + level * 4,
                transform: [{ rotate: level % 2 === 0 ? '-28deg' : '28deg' }],
              }}
            />
          ))}
        </View>

        <View className="flex-1 justify-center">
          <Text
            numberOfLines={1}
            className="text-[28px] leading-[31px] font-black text-white">
            {name}
          </Text>
          <Text
            numberOfLines={1}
            className="-mt-[1px] text-[18px] leading-[21px] font-black text-[#FFD45A]">
            {shopName}
          </Text>
          <View className="mt-[3px] h-[26px] max-w-[180px] flex-row items-center justify-center rounded-full border-[2px] border-[#24C8EA] bg-[#075170] px-[8px]">
            <Text className="mr-[5px] text-[15px] leading-[18px]">♛</Text>
            <Text className="text-[13px] leading-[16px] font-bold text-white">
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