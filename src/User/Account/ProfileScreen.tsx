import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Camera, Check, UserRound, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';
import { mediaUrl } from '../utils';
import { useUserAlert } from '../UserAlert';

type Profile = {
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  profile_image: string;
};

type ProfileScreenProps = {
  onBack: () => void;
};

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoComplete,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoComplete?: 'name' | 'email' | 'tel' | 'off';
  editable?: boolean;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-[12px] font-bold text-[#5B4839]">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#C0A99A"
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        editable={editable}
        className={`h-[48px] rounded-[12px] border px-4 text-[14px] text-[#351D0E] ${
          editable
            ? 'border-[#E7DCCF] bg-white'
            : 'border-[#F0E7DE] bg-[#FAF5EF] text-[#8B735E]'
        }`}
      />
    </View>
  );
}

export default function ProfileScreen({ onBack }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const showUserAlert = useUserAlert();
  const [profile, setProfile] = useState<Profile>({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    profile_image: '',
  });
  const [savedProfile, setSavedProfile] = useState<Profile>({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    profile_image: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Instant display from cache
      const serializedUser = await AsyncStorage.getItem('user');
      if (serializedUser) {
        const user: unknown = JSON.parse(serializedUser);
        if (typeof user === 'object' && user !== null) {
          const u = user as Record<string, unknown>;
          const cached: Profile = {
            name: (u.name as string) || (u.username as string) || '',
            email: (u.email as string) || '',
            phone: (u.phone as string) || '',
            date_of_birth: ((u.date_of_birth as string) || '').slice(0, 10),
            profile_image: (u.profile_image as string) || '',
          };
          setProfile(cached);
          setSavedProfile(cached);
        }
      }
      // Refresh from API
      const { data } = await api.get('/users/me');
      const fresh: Profile = {
        name: data.name || data.username || '',
        email: data.email || '',
        phone: data.phone || '',
        date_of_birth: (data.date_of_birth || '').slice(0, 10),
        profile_image: data.profile_image || '',
      };
      setProfile(fresh);
      setSavedProfile(fresh);
    } catch (err) {
      setError('Could not load your profile. Please try again.');
      if (__DEV__) console.warn('[ProfileScreen] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProfile();
    } finally {
      setRefreshing(false);
    }
  }, [loadProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = async () => {
    if (!profile.name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!profile.email.trim()) {
      setError('Email address is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put('/users/me', {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        date_of_birth: profile.date_of_birth || undefined,
      });
      const updated: Profile = {
        name: data.user?.name || data.user?.username || profile.name,
        email: data.user?.email || profile.email,
        phone: data.user?.phone || profile.phone,
        date_of_birth: (data.user?.date_of_birth || profile.date_of_birth || '').slice(0, 10),
        profile_image: data.user?.profile_image || profile.profile_image,
      };
      setProfile(updated);
      setSavedProfile(updated);
      // Update AsyncStorage cache
      const serializedUser = await AsyncStorage.getItem('user');
      if (serializedUser) {
        const user = JSON.parse(serializedUser);
        await AsyncStorage.setItem('user', JSON.stringify({ ...user, ...data.user }));
      }
      showUserAlert('Success', 'Profile updated successfully.');
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Could not update your profile. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const cancelChanges = () => {
    setProfile(savedProfile);
    setError('');
  };

  const displayName = profile.name || 'Profile';
  const initials = getInitials(displayName);
  const avatarUri = profile.profile_image ? mediaUrl(profile.profile_image) : undefined;

  return (
    <View className="flex-1 bg-[#FCFAF7]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 65, 100) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#F97316']}
            tintColor="#F97316"
          />
        }
      >
        {/* Avatar section */}
        <View className="items-center bg-white py-6 border-b border-[#F0E7DE]">
          <View className="relative">
            <View className="h-[88px] w-[88px] items-center justify-center rounded-full bg-[#F5CEAB] overflow-hidden shadow-sm">
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <Text className="text-[28px] font-black text-[#B94719]">
                  {initials || '?'}
                </Text>
              )}
            </View>
            {/* Camera button — placeholder; actual upload requires native picker */}
            <View className="absolute bottom-0 right-0 h-[28px] w-[28px] items-center justify-center rounded-full bg-[#F97316] border-2 border-white shadow-sm">
              <Camera size={14} color="white" />
            </View>
          </View>
          <Text className="mt-3 text-[16px] font-bold text-[#351D0E]">
            {displayName}
          </Text>
          {profile.email ? (
            <Text className="mt-0.5 text-[13px] text-[#8B735E]">{profile.email}</Text>
          ) : null}
        </View>

        {/* Form */}
        <View className="px-5 pt-6">
          {loading ? (
            <View className="items-center py-10">
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          ) : (
            <>
              <InputField
                label="Full Name *"
                value={profile.name}
                onChangeText={text => setProfile(p => ({ ...p, name: text }))}
                placeholder="Enter your full name"
                autoComplete="name"
              />
              <InputField
                label="Email Address *"
                value={profile.email}
                onChangeText={text => setProfile(p => ({ ...p, email: text }))}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoComplete="email"
              />
              <InputField
                label="Phone Number"
                value={profile.phone}
                onChangeText={text => setProfile(p => ({ ...p, phone: text }))}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                autoComplete="tel"
              />
              <InputField
                label="Date of Birth (YYYY-MM-DD)"
                value={profile.date_of_birth}
                onChangeText={text => setProfile(p => ({ ...p, date_of_birth: text }))}
                placeholder="YYYY-MM-DD"
              />

              {error ? (
                <View className="mb-4 rounded-[12px] bg-red-50 border border-red-200 px-4 py-3">
                  <Text className="text-[13px] text-red-700">{error}</Text>
                </View>
              ) : null}

              {/* Actions */}
              <View className="flex-row gap-3 mt-2">
                <Pressable
                  onPress={saveProfile}
                  disabled={saving}
                  className="flex-1 h-[50px] flex-row items-center justify-center rounded-[14px] bg-[#F97316] active:opacity-80"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Check size={18} color="white" />
                  )}
                  <Text className="ml-2 text-[14px] font-bold text-white">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={cancelChanges}
                  disabled={saving}
                  className="h-[50px] items-center justify-center rounded-[14px] border border-[#E7DCCF] bg-white px-5 active:bg-[#F9F3ED]"
                >
                  <Text className="text-[14px] font-semibold text-[#5B4839]">Cancel</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
