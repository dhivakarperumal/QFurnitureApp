import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Bell,
  Ellipsis,
  Home,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

type TopHeaderProps = {
  shopName?: string;
  notificationCount?: number;
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  onLogoutPress?: () => void;
  onDrawerItemPress?: (
    item: 'Home' | 'Products' | 'Orders' | 'More',
  ) => void;
};

const drawerItems = [
  { label: 'Home', icon: Home },
  { label: 'Products', icon: Package },
  { label: 'Orders', icon: ShoppingBag },
  { label: 'More', icon: Ellipsis },
] as const;

export default function TopHeader({
  shopName = 'Q Furniture',
  notificationCount = 0,
  onMenuPress,
  onNotificationPress,
  onProfilePress,
  onLogoutPress,
  onDrawerItemPress,
}: TopHeaderProps) {
  const insets = useSafeAreaInsets();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);

  const openDrawer = () => {
    setProfileVisible(false);
    setDrawerVisible(true);
    onMenuPress?.();
  };

  const toggleProfile = () => {
    setDrawerVisible(false);
    setProfileVisible(value => !value);
    onProfilePress?.();
  };

  return (
    <View
      style={[styles.header, { paddingTop: insets.top }]}
      className="absolute left-0 right-0 top-0 z-10">
      <View className="h-[72px] flex-row items-center px-[12px]">
        <Pressable
          accessibilityLabel="Open menu"
          accessibilityRole="button"
          onPress={openDrawer}
          className="h-[42px] w-[42px] items-center justify-center">
          <Menu size={28} color="#FFFFFF" strokeWidth={2.2} />
        </Pressable>

        <View className="flex-1 flex-row items-center">
          <Image
            source={require('../../Assert/images/appicon.png')}
            className="h-[48px] w-[48px] rounded-full"
            resizeMode="cover"
          />
          <View className="ml-[8px] flex-1">
            <Text numberOfLines={1} className="text-[14px] font-bold text-white">
              {shopName}
            </Text>
            <Text numberOfLines={1} className="text-[10px] text-white/85">
              Hi Welcome, Admin (Admin)
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityLabel="Notifications"
          accessibilityRole="button"
          onPress={onNotificationPress}
          className="mr-[6px] h-[38px] w-[38px] items-center justify-center">
          <Bell size={26} color="#FFFFFF" strokeWidth={2} />
          {notificationCount > 0 && (
            <View className="absolute right-[-2px] top-[-2px] h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#DC2626] px-1">
              <Text className="text-[10px] font-bold text-white">
                {notificationCount > 99 ? '99+' : notificationCount}
              </Text>
            </View>
          )}
        </Pressable>

        <View className="relative">
          <Pressable
            accessibilityLabel="Open profile menu"
            accessibilityRole="button"
            onPress={toggleProfile}
            className="h-[42px] w-[42px] items-center justify-center rounded-full bg-white/20">
              <UserRound size={22} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>

          {profileVisible && (
            <View className="absolute right-0 top-[50px] w-[210px] rounded-[12px] border border-[#E5E7EB] bg-white p-[8px] shadow-lg elevation-[12]">
              <View className="mb-[6px] border-b border-[#E5E7EB] px-[8px] pb-[8px]">
                <Text numberOfLines={1} className="text-[14px] font-bold text-[#17191C]">
                  Account
                </Text>
                <Text numberOfLines={1} className="mt-[2px] text-[12px] text-[#6B7280]">
                  Logged in
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setProfileVisible(false);
                  onProfilePress?.();
                }}
                className="h-[42px] flex-row items-center rounded-[8px] px-[10px]">
                <UserRound size={18} color="#17191C" strokeWidth={2} />
                <View className="ml-[8px]" />
                <Text className="text-[14px] font-bold text-[#17191C]">Profile</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setProfileVisible(false);
                  onLogoutPress?.();
                }}
                className="h-[42px] flex-row items-center rounded-[8px] px-[10px]">
                <LogOut size={18} color="#DC2626" strokeWidth={2} />
                <View className="ml-[8px]" />
                <Text className="text-[14px] font-bold text-[#DC2626]">Logout</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <Modal
        visible={drawerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDrawerVisible(false)}>
        <View
          style={{ paddingTop: insets.top, backgroundColor: colors.primary }}
          className="flex-1">
          <View className="h-[72px] flex-row items-center border-b border-white/30 px-[12px]">
            <Image
              source={require('../../Assert/images/appicon.png')}
              className="h-[48px] w-[48px] rounded-full"
              resizeMode="cover"
            />
            <View className="ml-[10px] flex-1">
              <Text numberOfLines={1} className="text-[16px] font-bold text-white">
                {shopName}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close menu"
              accessibilityRole="button"
              onPress={() => setDrawerVisible(false)}
              className="h-[42px] w-[42px] items-center justify-center">
              <X size={28} color="#FFFFFF" strokeWidth={2.2} />
            </Pressable>
          </View>

          <View className="flex-1 px-[16px] py-[12px]">
            {drawerItems.map(item => {
              const ItemIcon = item.icon;
              return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                onPress={() => {
                  setDrawerVisible(false);
                  onDrawerItemPress?.(item.label);
                }}
                className="mb-[8px] h-[56px] flex-row items-center rounded-[10px] px-[14px]">
                <View className="w-[42px] items-center">
                  <ItemIcon size={24} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Text className="ml-[8px] text-[16px] font-bold text-white">
                  {item.label}
                </Text>
              </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    width: '100%',
  },
});
