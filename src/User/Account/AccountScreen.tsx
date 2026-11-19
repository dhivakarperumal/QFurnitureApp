import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  ChevronRight,
  KeyRound,
  LogOut,
  MapPin,
  PackageCheck,
  UserRound,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api';
import { mediaUrl } from '../utils';

export type AccountSubScreen =
  | 'menu'
  | 'profile'
  | 'addresses'
  | 'orders'
  | 'password';

type UserProfile = {
  name: string;
  email: string;
  phone: string;
  profile_image: string;
};

type AccountScreenProps = {
  onLogoutPress: () => void;
  onSubScreenChange?: (screen: AccountSubScreen) => void;
};

type MenuRow = {
  id: AccountSubScreen;
  label: string;
  icon: React.ElementType;
};

const menuRows: MenuRow[] = [
  { id: 'profile',   label: 'Profile',       icon: UserRound },
  { id: 'addresses', label: 'Addresses',      icon: MapPin },
  { id: 'orders',    label: 'Orders',         icon: PackageCheck },
  { id: 'password',  label: 'Set Password',   icon: KeyRound },
];

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
}

export default function AccountScreen({
  onLogoutPress,
  onSubScreenChange,
}: AccountScreenProps) {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    profile_image: '',
  });
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      // Try loading from AsyncStorage first for instant display
      const serializedUser = await AsyncStorage.getItem('user');
      if (serializedUser) {
        const user: unknown = JSON.parse(serializedUser);
        if (typeof user === 'object' && user !== null) {
          const u = user as Record<string, unknown>;
          setProfile({
            name: (u.name as string) || (u.username as string) || '',
            email: (u.email as string) || '',
            phone: (u.phone as string) || '',
            profile_image: (u.profile_image as string) || '',
          });
        }
      }
      // Then load from API for fresh data
      const { data } = await api.get('/users/me');
      setProfile({
        name: data.name || data.username || '',
        email: data.email || '',
        phone: data.phone || '',
        profile_image: data.profile_image || '',
      });
    } catch (error) {
      if (__DEV__) console.warn('[AccountScreen] Could not load profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrderCount = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/mine');
      if (Array.isArray(data)) setOrderCount(data.length);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadOrderCount();
  }, [loadProfile, loadOrderCount]);

  const displayName = profile.name || 'My Account';
  const initials = getInitials(displayName);
  const avatarUri = profile.profile_image ? mediaUrl(profile.profile_image) : undefined;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: onLogoutPress },
    ]);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-6">
      {/* Hero Banner */}
      <View className="relative overflow-hidden bg-[#FDECD9] pb-8 pt-5 px-5">
        {/* Decorative blobs */}
        <View className="absolute right-[-20px] top-[-20px] h-[140px] w-[140px] rounded-full bg-[#F97316]/10" />
        <View className="absolute right-[40px] bottom-[-30px] h-[90px] w-[90px] rounded-full bg-[#F97316]/10" />

        <View className="flex-row items-center gap-4">
          {/* Avatar */}
          <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-[#F5CEAB] overflow-hidden shadow-sm">
            {loading ? (
              <ActivityIndicator size="small" color="#F97316" />
            ) : avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                className="h-full w-full"
                resizeMode="cover"
              />
            ) : (
              <Text className="text-[22px] font-black text-[#B94719]">
                {initials || <UserRound size={28} color="#B94719" />}
              </Text>
            )}
          </View>

          {/* Name / Email */}
          <View className="flex-1">
            {loading ? (
              <>
                <View className="h-[18px] w-[130px] rounded-full bg-[#F5CEAB] mb-2" />
                <View className="h-[13px] w-[170px] rounded-full bg-[#F5CEAB]" />
              </>
            ) : (
              <>
                <Text className="text-[18px] font-black text-[#351D0E]" numberOfLines={1}>
                  {displayName}
                </Text>
                <Text className="mt-0.5 text-[13px] text-[#8B5E3C]" numberOfLines={1}>
                  {profile.email}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Menu Card */}
      <View className="mx-4 mt-[-20px] rounded-[20px] bg-white shadow-sm overflow-hidden border border-[#F0E7DE]">
        <Text className="px-5 pt-5 pb-3 text-[13px] font-black uppercase tracking-widest text-[#B4876A]">
          My Account
        </Text>

        {menuRows.map((row, index) => {
          const Icon = row.icon;
          const isLast = index === menuRows.length - 1;
          return (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              onPress={() => onSubScreenChange?.(row.id)}
              className="flex-row items-center px-5 py-4 active:bg-[#FFF5ED]"
              style={!isLast ? { borderBottomWidth: 1, borderBottomColor: '#F7EDE4' } : undefined}
            >
              <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-[#FFF0E1]">
                <Icon size={18} color="#F97316" />
              </View>
              <Text className="ml-3 flex-1 text-[15px] font-semibold text-[#351D0E]">
                {row.label}
              </Text>
              {row.id === 'orders' && orderCount !== null && orderCount > 0 && (
                <View className="mr-2 h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[#F97316] px-1.5">
                  <Text className="text-[11px] font-black text-white">{orderCount}</Text>
                </View>
              )}
              <ChevronRight size={18} color="#C09A7E" />
            </Pressable>
          );
        })}
      </View>

      {/* Logout */}
      <Pressable
        accessibilityRole="button"
        onPress={handleLogout}
        className="mx-4 mt-4 flex-row items-center rounded-[16px] border border-[#FFD5C2] bg-[#FFF5EF] px-5 py-4 active:bg-[#FFE9DF]"
      >
        <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-[#FFE4D6]">
          <LogOut size={18} color="#B94719" />
        </View>
        <Text className="ml-3 flex-1 text-[15px] font-semibold text-[#B94719]">Logout</Text>
        <ChevronRight size={18} color="#B94719" />
      </Pressable>
    </ScrollView>
  );
}

type SubScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: React.ReactNode;
};

export function SubScreenHeader({ title, subtitle, onBack, right }: SubScreenHeaderProps) {
  return (
    <View className="flex-row items-center px-4 py-3 border-b border-[#F0E7DE] bg-white">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        className="mr-3 h-[38px] w-[38px] items-center justify-center rounded-full bg-[#F4EDE6]"
      >
        <ArrowLeft size={20} color="#351D0E" />
      </Pressable>
      <View className="flex-1">
        <Text className="text-[17px] font-black text-[#351D0E]">{title}</Text>
        {subtitle ? (
          <Text className="text-[12px] text-[#8B735E]">{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
