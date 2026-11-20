import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Heart, LogOut, UserRound } from 'lucide-react-native';
import type { StoreTab } from './types';

type HeaderProps = {
  activeTab: StoreTab;
  favoriteCount: number;
  topInset: number;
  onFavoritesPress: () => void;
  onProfilePress: () => void;
  onLogoutPress: () => void;
};

export default function Header({
  activeTab,
  favoriteCount,
  topInset,
  onFavoritesPress,
  onProfilePress,
  onLogoutPress,
}: HeaderProps) {
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      let serializedUser: string | null;
      try {
        serializedUser = await AsyncStorage.getItem('user');
      } catch (error) {
        if (__DEV__) {
          console.warn('[StorefrontHeader] Could not read the saved user:', error);
        }
        return;
      }

      if (!serializedUser) return;

      let user: unknown;
      try {
        user = JSON.parse(serializedUser);
      } catch (error) {
        if (__DEV__) {
          console.warn('[StorefrontHeader] The saved user data is invalid:', error);
        }
        return;
      }

      if (typeof user !== 'object' || user === null) return;
      const name =
        ('name' in user && typeof user.name === 'string'
          ? user.name.trim()
          : '') ||
        ('username' in user && typeof user.username === 'string'
          ? user.username.trim()
          : '');
      const email =
        'email' in user && typeof user.email === 'string'
          ? user.email.trim()
          : '';
      if (mounted) {
        if (name) setUserName(name);
        setUserEmail(email);
      }
    };

    loadUser();
    return () => {
      mounted = false;
    };
  }, []);
  const userInitial = userName.trim().charAt(0).toUpperCase();

  return (
    <View
      style={{ height: 58 + topInset, paddingTop: topInset }}
      className="z-10 flex-row items-center justify-between overflow-hidden px-3 shadow-md elevation-[10]">
      <Image
        source={require('../Assert/images/topheader1.png')}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        className="absolute inset-0 bg-[#F45B00]/75"
      />
      <View className="flex-row items-center">
        <Image
          source={require('../Assert/images/appicon.png')}
          accessibilityLabel="Q Living Furniture"
          resizeMode="contain"
          className="h-[44px] w-[44px] rounded-[12px] bg-white"
        />
        <View className="mx-3 h-[40px] w-px bg-white/45" />
        <View>
          <Text className="text-[17px] font-black italic text-white">Q Living</Text>
          <Text className="text-[8px] font-bold uppercase tracking-[2.4px] text-white/90">
            Furniture
          </Text>
        </View>
      </View>
      <View className="flex-row">
        <View className="relative mr-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open favorites, ${favoriteCount} saved ${
              favoriteCount === 1 ? 'item' : 'items'
            }`}
            accessibilityState={{ selected: activeTab === 'Favorites' }}
            onPress={onFavoritesPress}
            className="h-[42px] w-[42px] items-center justify-center rounded-full bg-white/15">
            <Heart
              size={22}
              color="#FFFFFF"
              fill={activeTab === 'Favorites' ? '#FFFFFF' : 'transparent'}
            />
          </Pressable>
          {favoriteCount > 0 ? (
            <View className="absolute right-0 top-0 min-h-[16px] min-w-[16px] items-center justify-center rounded-full border border-white bg-[#C2410C] px-1">
              <Text className="text-[9px] font-black text-white">
                {favoriteCount > 99 ? '99+' : favoriteCount}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="relative">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile menu"
            accessibilityState={{ expanded: profileMenuVisible }}
            onPress={() => setProfileMenuVisible(visible => !visible)}
            className="h-[42px] w-[42px] items-center justify-center rounded-full bg-white/15">
            {userInitial ? (
              <Text className="text-[18px] font-black text-white">
                {userInitial}
              </Text>
            ) : (
              <UserRound size={22} color="#FFFFFF" />
            )}
          </Pressable>
          {profileMenuVisible ? (
            <View className="absolute right-0 top-[50px] z-[30] w-[230px] rounded-[12px] border border-[#E5E7EB] bg-white p-2 shadow-lg elevation-[12]">
              <View className="border-b border-[#E5E7EB] px-2 pb-2">
                <Text numberOfLines={1} className="text-[14px] font-bold text-[#17191C]">
                  {userName || 'My Account'}
                </Text>
                <Text numberOfLines={1} className="mt-1 text-[12px] text-[#6B7280]">
                  {userEmail || 'Email unavailable'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open account"
                onPress={() => {
                  setProfileMenuVisible(false);
                  onProfilePress();
                }}
                className="h-[42px] flex-row items-center rounded-[8px] px-2">
                <UserRound size={18} color="#17191C" />
                <Text className="ml-2 text-[14px] font-bold text-[#17191C]">
                  Account
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Log out"
                onPress={() => {
                  setProfileMenuVisible(false);
                  onLogoutPress();
                }}
                className="h-[42px] flex-row items-center rounded-[8px] px-2">
                <LogOut size={18} color="#DC2626" />
                <Text className="ml-2 text-[14px] font-bold text-[#DC2626]">
                  Logout
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
