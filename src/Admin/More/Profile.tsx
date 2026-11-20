import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  launchImageLibrary,
  type Asset,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, {
  API_BASE_URL,
  invalidateApiResponseCache,
} from '../../api';
import TopHeader from '../Navigation/TopHeader';

type ProfileUser = {
  id?: number | string;
  user_id?: string;
  username?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  date_of_birth?: string | null;
  profile_image?: string | null;
  auth_provider?: string;
  role?: string;
  status?: string;
  created_at?: string;
};

type UserAddress = {
  id: number | string;
  label?: string;
  customer_name?: string;
  customer_phone?: string;
  street_address?: string;
  city?: string;
  district?: string | null;
  state?: string;
  country?: string;
  zip_code?: string;
  is_default?: boolean | number;
};

type ProfileForm = {
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type AddressForm = {
  label: string;
  customer_name: string;
  customer_phone: string;
  street_address: string;
  city: string;
  district: string;
  state: string;
  country: string;
  zip_code: string;
};

type ProfileProps = {
  onBackPress: () => void;
  onScrollVisibilityChange?: (visible: boolean) => void;
  onLogoutPress?: () => void;
};

const initialForm: ProfileForm = {
  name: '',
  email: '',
  phone: '',
  date_of_birth: '',
};

const initialPassword: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const initialAddress: AddressForm = {
  label: 'Home',
  customer_name: '',
  customer_phone: '',
  street_address: '',
  city: '',
  district: '',
  state: '',
  country: 'India',
  zip_code: '',
};

const modalStyles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    flexShrink: 1,
  },
  scroll: {
    flexShrink: 1,
    minHeight: 0,
  },
});

const resolveImageUri = (path?: string | null) => {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error !== 'object' || error === null) return fallback;
  if (
    'response' in error &&
    typeof error.response === 'object' &&
    error.response
  ) {
    const response = error.response as { data?: { message?: unknown } };
    if (typeof response.data?.message === 'string')
      return response.data.message;
  }
  if ('message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
};

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
};

const imageFileName = (asset: Asset) => {
  if (asset.fileName) return asset.fileName;
  const extension = asset.type?.split('/')[1] || 'jpg';
  return `profile-${Date.now()}.${extension}`;
};

const initialsFor = (user: ProfileUser | null) =>
  (user?.name || user?.username || 'User')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');

const getDefaultAddress = (addresses: UserAddress[]) =>
  addresses.find(address => Boolean(address.is_default)) ??
  addresses[0] ??
  null;

export default function Profile({
  onBackPress,
  onScrollVisibilityChange,
  onLogoutPress,
}: ProfileProps) {
  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);
  const editVisibleRef = useRef(false);
  const hasLoadedProfile = useRef(false);
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [address, setAddress] = useState<UserAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [addressVisible, setAddressVisible] = useState(false);
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [passwordForm, setPasswordForm] =
    useState<PasswordForm>(initialPassword);
  const [addressForm, setAddressForm] = useState<AddressForm>(initialAddress);
  const [savingAddress, setSavingAddress] = useState(false);

  const loadProfile = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
      invalidateApiResponseCache();
    } else if (!hasLoadedProfile.current) {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const response = await api.get<ProfileUser>('/users/me');
      setProfile(response.data);
      hasLoadedProfile.current = true;
      if (!editVisibleRef.current) {
        setForm({
          name: response.data.name || response.data.username || '',
          email: response.data.email || '',
          phone: response.data.phone || '',
          date_of_birth: response.data.date_of_birth?.slice(0, 10) || '',
        });
      }
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Could not load your profile.');
      setLoadError(message);
      if (__DEV__) console.warn('[Profile] Could not load profile:', error);
    } finally {
      setLoading(false);
    }

    setAddressError(null);
    try {
      const response = await api.get<UserAddress[]>('/users/me/addresses');
      if (!Array.isArray(response.data)) {
        throw new Error('The saved address response was invalid.');
      }
      setAddress(getDefaultAddress(response.data));
    } catch (error: unknown) {
      if (!hasLoadedProfile.current) setAddress(null);
      setAddressError(
        getErrorMessage(error, 'Could not load your saved address.'),
      );
      if (__DEV__) console.warn('[Profile] Could not load addresses:', error);
    }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    editVisibleRef.current = editVisible;
  }, [editVisible]);

  const openEdit = () => {
    setForm({
      name: profile?.name || profile?.username || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      date_of_birth: profile?.date_of_birth?.slice(0, 10) || '',
    });
    setEditVisible(true);
  };

  const closePassword = () => {
    if (changingPassword) return;
    setPasswordVisible(false);
    setPasswordForm(initialPassword);
  };

  const openAddressEditor = () => {
    setAddressForm({
      label: address?.label || 'Home',
      customer_name:
        address?.customer_name || profile?.name || profile?.username || '',
      customer_phone: address?.customer_phone || profile?.phone || '',
      street_address: address?.street_address || '',
      city: address?.city || '',
      district: address?.district || '',
      state: address?.state || '',
      country: address?.country || 'India',
      zip_code: address?.zip_code || '',
    });
    setAddressVisible(true);
  };

  const saveAddress = async () => {
    const body = {
      ...addressForm,
      label: addressForm.label.trim() || 'Home',
      customer_name: addressForm.customer_name.trim(),
      customer_phone: addressForm.customer_phone.trim(),
      street_address: addressForm.street_address.trim(),
      city: addressForm.city.trim(),
      district: addressForm.district.trim(),
      state: addressForm.state.trim(),
      country: addressForm.country.trim(),
      zip_code: addressForm.zip_code.trim(),
      is_default: true,
    };
    if (body.customer_name.length < 2) {
      Alert.alert(
        'Name required',
        'Enter the recipient name for this address.',
      );
      return;
    }
    if (body.customer_phone.length < 6 || body.customer_phone.length > 32) {
      Alert.alert('Phone required', 'Enter a valid address contact number.');
      return;
    }
    if (
      !body.street_address ||
      !body.city ||
      !body.state ||
      !body.country ||
      !body.zip_code
    ) {
      Alert.alert(
        'Address incomplete',
        'Enter the street, city, state, country, and PIN code.',
      );
      return;
    }

    setSavingAddress(true);
    try {
      const response = address
        ? await api.put<UserAddress>(`/users/me/addresses/${address.id}`, body)
        : await api.post<UserAddress>('/users/me/addresses', body);
      setAddress(response.data);
      setAddressVisible(false);
      Alert.alert('Address saved', 'Your default address has been updated.');
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Profile] Address update failed:', error);
      Alert.alert(
        'Address update failed',
        getErrorMessage(error, 'Could not save your address.'),
      );
    } finally {
      setSavingAddress(false);
    }
  };

  const saveProfile = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const dateOfBirth = form.date_of_birth.trim();
    if (name.length < 2) {
      Alert.alert('Name required', 'Enter a name with at least 2 characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Email required', 'Enter a valid email address.');
      return;
    }
    if (phone && (phone.length < 6 || phone.length > 32)) {
      Alert.alert('Phone number invalid', 'Enter a valid phone number.');
      return;
    }
    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      Alert.alert('Date format', 'Enter your date of birth as YYYY-MM-DD.');
      return;
    }

    setSaving(true);
    try {
      const response = await api.put<{ user: ProfileUser }>('/users/me', {
        name,
        email,
        phone,
        date_of_birth: dateOfBirth || null,
      });
      const updatedProfile = response.data.user;
      setProfile(updatedProfile);
      setForm({
        name: updatedProfile.name || updatedProfile.username || '',
        email: updatedProfile.email || '',
        phone: updatedProfile.phone || '',
        date_of_birth: updatedProfile.date_of_birth?.slice(0, 10) || '',
      });
      setEditVisible(false);
      try {
        await AsyncStorage.setItem('user', JSON.stringify(updatedProfile));
      } catch (storageError) {
        if (__DEV__) {
          console.warn(
            '[Profile] Could not update saved user data:',
            storageError,
          );
        }
        Alert.alert(
          'Profile saved',
          'Your profile was updated, but the local account display could not be refreshed.',
        );
        return;
      }
      Alert.alert('Profile updated', 'Your profile has been saved.');
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Profile] Profile update failed:', error);
      Alert.alert(
        'Update failed',
        getErrorMessage(error, 'Could not save your profile.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword.trim()) {
      Alert.alert('Current password required', 'Enter your current password.');
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      Alert.alert(
        'Password requirements',
        'Your new password must be between 8 and 72 characters.',
      );
      return;
    }
    if (
      !/[A-Z]/.test(newPassword) ||
      !/\d/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      Alert.alert(
        'Password requirements',
        'Include an uppercase letter, a number, and a special character.',
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Re-enter the same new password.');
      return;
    }

    setChangingPassword(true);
    try {
      await api.put('/users/me/password', {
        currentPassword,
        newPassword,
      });
      setPasswordVisible(false);
      setPasswordForm(initialPassword);
      Alert.alert('Password updated', 'Your password has been changed.');
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Profile] Password update failed:', error);
      Alert.alert(
        'Password update failed',
        getErrorMessage(error, 'Could not change your password.'),
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const uploadProfileImage = async () => {
    if (uploadingImage) return;
    let result: ImagePickerResponse;
    try {
      result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.9,
      });
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Profile] Photo selection failed:', error);
      Alert.alert(
        'Photo unavailable',
        getErrorMessage(error, 'Could not open the photo library.'),
      );
      return;
    }
    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert(
        'Photo unavailable',
        result.errorMessage || 'Could not open the photo library.',
      );
      return;
    }
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      Alert.alert('Photo unavailable', 'No photo was selected.');
      return;
    }
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert('Photo too large', 'Choose an image smaller than 5 MB.');
      return;
    }
    const allowedTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ]);
    const mimeType = asset.type || 'image/jpeg';
    if (!allowedTypes.has(mimeType)) {
      Alert.alert(
        'Unsupported photo',
        'Choose a JPG, PNG, GIF, or WEBP image.',
      );
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: imageFileName(asset),
        type: mimeType,
      } as unknown as Blob);
      const response = await api.post<{
        user?: ProfileUser;
        url?: string;
      }>('/uploads/profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updatedProfile = response.data.user;
      if (!updatedProfile) {
        throw new Error('The server did not return the updated profile.');
      }
      setProfile(updatedProfile);
      try {
        await AsyncStorage.setItem('user', JSON.stringify(updatedProfile));
      } catch (storageError) {
        if (__DEV__) {
          console.warn(
            '[Profile] Could not update saved user data:',
            storageError,
          );
        }
        Alert.alert(
          'Photo uploaded',
          'Your photo was updated, but the local account display could not be refreshed.',
        );
        return;
      }
      Alert.alert('Photo updated', 'Your profile photo has been changed.');
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Profile] Photo upload failed:', error);
      Alert.alert(
        'Upload failed',
        getErrorMessage(error, 'Could not upload your profile photo.'),
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const fullName = profile?.name || profile?.username || 'User';
  const memberSince = formatDate(profile?.created_at);
  const location = [address?.city, address?.state, address?.country]
    .filter(Boolean)
    .join(', ');
  const isGoogleAccount = profile?.auth_provider === 'google';
  const profileImage = resolveImageUri(profile?.profile_image);

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <TopHeader
        pageTitle="Profile"
        pageSubtitle="Your account details"
        onBackPress={onBackPress}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-[255px]"
        style={{ paddingTop: insets.top + 72 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadProfile(true)}
            tintColor="#F97316"
            colors={['#F97316']}
          />
        }
        scrollEventThrottle={16}
        onScroll={event => {
          const currentScrollY = event.nativeEvent.contentOffset.y;
          if (currentScrollY < 20 || currentScrollY < lastScrollY.current - 8) {
            onScrollVisibilityChange?.(true);
          } else if (currentScrollY > lastScrollY.current + 8) {
            onScrollVisibilityChange?.(false);
          }
          lastScrollY.current = currentScrollY;
        }}
      >
        {loading ? (
          <View className="items-center rounded-[20px] bg-white py-12">
            <ActivityIndicator size="large" color="#F97316" />
            <Text className="mt-3 text-[11px] text-[#64748B]">
              Loading your profile...
            </Text>
          </View>
        ) : loadError && !profile ? (
          <View className="items-center rounded-[20px] bg-white px-5 py-10">
            <Text className="mb-4 text-center text-[12px] text-[#B91C1C]">
              {loadError}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => loadProfile()}
              className="rounded-[11px] bg-[#C2410C] px-5 py-3"
            >
              <Text className="text-[11px] font-bold text-white">
                Try again
              </Text>
            </Pressable>
          </View>
        ) : profile ? (
          <>
            {loadError ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => loadProfile()}
                className="mb-3 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-3"
              >
                <Text className="text-[10px] text-[#B91C1C]">
                  {loadError}
                </Text>
              </Pressable>
            ) : null}
            <View className="mb-4 overflow-hidden rounded-[22px] border border-[#FCE6D7] bg-white p-5 shadow-sm">
              <View className="items-center border-b border-[#F1F5F9] pb-5">
                <View className="relative">
                  <View className="h-[104px] w-[104px] items-center justify-center overflow-hidden rounded-full bg-[#FFF1D6]">
                    {profileImage ? (
                      <Image
                        source={{ uri: profileImage }}
                        accessibilityLabel="Profile photo"
                        className="h-full w-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Text className="text-[30px] font-black text-[#C2410C]">
                        {initialsFor(profile)}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Change profile photo"
                    disabled={uploadingImage}
                    onPress={uploadProfileImage}
                    className="absolute bottom-0 right-0 h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-white bg-[#C2410C] disabled:opacity-60"
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Camera size={16} color="#FFFFFF" />
                    )}
                  </Pressable>
                </View>
                <Text
                  numberOfLines={1}
                  className="mt-4 max-w-full text-center text-[20px] font-black uppercase text-[#17191C]"
                >
                  {fullName}
                </Text>
                <Text className="mt-1 text-[11px] text-[#64748B]">
                  @{profile.username || 'account'} · {profile.role || 'User'}
                </Text>
                <View className="mt-4 flex-row flex-wrap justify-center">
                  {location ? (
                    <View className="mb-2 mr-2 flex-row items-center rounded-full bg-[#F8FAFC] px-3 py-2">
                      <MapPin size={13} color="#F97316" />
                      <Text className="ml-1.5 text-[9px] text-[#64748B]">
                        {location}
                      </Text>
                    </View>
                  ) : null}
                  <View className="mb-2 mr-2 flex-row items-center rounded-full bg-[#ECFDF5] px-3 py-2">
                    <ShieldCheck size={13} color="#059669" />
                    <Text className="ml-1.5 text-[9px] font-semibold text-[#047857]">
                      {profile.status?.toLowerCase() === 'active'
                        ? 'Active account'
                        : profile.status || 'Account'}
                    </Text>
                  </View>
                  {memberSince ? (
                    <View className="mb-2 flex-row items-center rounded-full bg-[#F5F3FF] px-3 py-2">
                      <CalendarDays size={13} color="#7C3AED" />
                      <Text className="ml-1.5 text-[9px] text-[#64748B]">
                        Joined {memberSince}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View className="mt-4 flex-row">
                <Pressable
                  accessibilityRole="button"
                  onPress={openEdit}
                  className="mr-2 flex-1 flex-row items-center justify-center rounded-[11px] bg-[#C2410C] py-3"
                >
                  <Pencil size={14} color="#FFFFFF" />
                  <Text className="ml-2 text-[10px] font-bold text-white">
                    Edit profile
                  </Text>
                </Pressable>
                {!isGoogleAccount ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPasswordVisible(true)}
                    className="flex-1 flex-row items-center justify-center rounded-[11px] border border-[#E2E8F0] py-3"
                  >
                    <LockKeyhole size={14} color="#C2410C" />
                    <Text className="ml-2 text-[10px] font-bold text-[#334155]">
                      Change password
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              {isGoogleAccount ? (
                <Text className="mt-3 text-center text-[9px] text-[#64748B]">
                  This account uses Google sign-in. Manage its password through
                  Google.
                </Text>
              ) : null}
            </View>

            <View className="mb-3 rounded-[18px] border border-[#E2E8F0] bg-white p-4">
              <Text className="mb-3 text-[13px] font-black text-[#17191C]">
                Account information
              </Text>
              <InfoRow
                icon={<UserRound size={17} color="#2563EB" />}
                label="Username"
                value={profile.username || 'Not set'}
              />
              <InfoRow
                icon={<Mail size={17} color="#2563EB" />}
                label="Email"
                value={profile.email || 'Not set'}
              />
              <InfoRow
                icon={<Phone size={17} color="#2563EB" />}
                label="Phone"
                value={profile.phone || 'Not set'}
              />
              <InfoRow
                icon={<MapPin size={17} color="#2563EB" />}
                label="Default address"
                value={
                  address
                    ? [
                        address.street_address,
                        address.city,
                        address.district,
                        address.state,
                        address.zip_code,
                      ]
                        .filter(Boolean)
                        .join(', ')
                    : addressError || 'No address saved'
                }
              />
              {addressError ? (
                <Text className="mt-1 text-[9px] text-[#B45309]">
                  {addressError}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={openAddressEditor}
                className="mt-2 flex-row items-center justify-between border-t border-[#F1F5F9] pt-3"
              >
                <View className="flex-row items-center">
                  <Pencil size={13} color="#C2410C" />
                  <Text className="ml-2 text-[10px] font-bold text-[#C2410C]">
                    {address ? 'Edit default address' : 'Add default address'}
                  </Text>
                </View>
                <ChevronRight size={15} color="#94A3B8" />
              </Pressable>
              {address ? (
                <View className="mt-2 flex-row items-center justify-between border-t border-[#F1F5F9] pt-3">
                  <Text className="text-[9px] text-[#64748B]">
                    {address.label || 'Address'} ·{' '}
                    {address.customer_name || fullName}
                  </Text>
                  <ChevronRight size={15} color="#94A3B8" />
                </View>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => loadProfile()}
              className="mb-2 flex-row items-center justify-center py-3"
            >
              <Text className="text-[10px] font-bold text-[#C2410C]">
                Refresh profile
              </Text>
            </Pressable>
          </>
        ) : null}
        {onLogoutPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            onPress={() =>
              Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out',
                  style: 'destructive',
                  onPress: onLogoutPress,
                },
              ])
            }
            className="mb-4 mt-2 flex-row items-center rounded-[18px] border border-[#FECACA] bg-[#FEF2F2] p-4"
          >
            <View className="h-[44px] w-[44px] items-center justify-center rounded-full bg-[#FEE2E2]">
              <LogOut size={20} color="#DC2626" />
            </View>
            <Text className="ml-3 flex-1 text-[13px] font-bold text-[#B91C1C]">
              Logout
            </Text>
            <ChevronRight size={19} color="#DC2626" />
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!saving) setEditVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={modalStyles.keyboardAvoiding}
        >
          <View className="flex-1 justify-end bg-black/55">
            <View
              className="rounded-t-[22px] bg-white"
              style={modalStyles.sheet}
            >
              <View className="flex-row items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
                <View>
                  <Text className="text-[15px] font-black text-[#17191C]">
                    Edit profile
                  </Text>
                  <Text className="mt-1 text-[9px] text-[#64748B]">
                    Update your account information
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close edit profile"
                  disabled={saving}
                  onPress={() => setEditVisible(false)}
                  className="h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F1F5F9]"
                >
                  <X size={17} color="#64748B" />
                </Pressable>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="always"
                keyboardDismissMode={
                  Platform.OS === 'ios' ? 'interactive' : 'on-drag'
                }
                nestedScrollEnabled
                style={modalStyles.scroll}
                contentContainerClassName="px-5 py-4"
              >
                <ProfileInput
                  label="Full name *"
                  value={form.name}
                  onChangeText={name =>
                    setForm(current => ({ ...current, name }))
                  }
                  placeholder="Your name"
                  autoCapitalize="words"
                />
                <ProfileInput
                  label="Email *"
                  value={form.email}
                  onChangeText={email =>
                    setForm(current => ({ ...current, email }))
                  }
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <ProfileInput
                  label="Phone"
                  value={form.phone}
                  onChangeText={phone =>
                    setForm(current => ({ ...current, phone }))
                  }
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />
                <ProfileInput
                  label="Date of birth"
                  value={form.date_of_birth}
                  onChangeText={date_of_birth =>
                    setForm(current => ({ ...current, date_of_birth }))
                  }
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                />
                <Text className="mb-2 text-[9px] leading-[14px] text-[#94A3B8]">
                  Address details are managed separately from your account
                  profile.
                </Text>
              </ScrollView>
              <View
                className="flex-row justify-end border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 pt-4"
                style={{ paddingBottom: Math.max(insets.bottom, 12) }}
              >
                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={() => setEditVisible(false)}
                  className="mr-2 rounded-[10px] px-4 py-3"
                >
                  <Text className="text-[10px] font-bold text-[#64748B]">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={saving}
                  onPress={saveProfile}
                  className="min-w-[130px] flex-row items-center justify-center rounded-[10px] bg-[#C2410C] px-4 py-3 disabled:opacity-60"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Check size={15} color="#FFFFFF" />
                      <Text className="ml-2 text-[10px] font-bold text-white">
                        Save changes
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={addressVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!savingAddress) setAddressVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={modalStyles.keyboardAvoiding}
        >
          <View className="flex-1 justify-end bg-black/55">
            <View
              className="rounded-t-[22px] bg-white"
              style={modalStyles.sheet}
            >
              <View className="flex-row items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
                <View>
                  <Text className="text-[15px] font-black text-[#17191C]">
                    {address ? 'Edit default address' : 'Add default address'}
                  </Text>
                  <Text className="mt-1 text-[9px] text-[#64748B]">
                    Address fields are saved to your account
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close address editor"
                  disabled={savingAddress}
                  onPress={() => setAddressVisible(false)}
                  className="h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F1F5F9]"
                >
                  <X size={17} color="#64748B" />
                </Pressable>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="always"
                keyboardDismissMode={
                  Platform.OS === 'ios' ? 'interactive' : 'on-drag'
                }
                nestedScrollEnabled
                style={modalStyles.scroll}
                contentContainerClassName="px-5 py-4"
              >
                <ProfileInput
                  label="Address label"
                  value={addressForm.label}
                  onChangeText={label =>
                    setAddressForm(current => ({ ...current, label }))
                  }
                  placeholder="Home"
                />
                <ProfileInput
                  label="Recipient name *"
                  value={addressForm.customer_name}
                  onChangeText={customer_name =>
                    setAddressForm(current => ({ ...current, customer_name }))
                  }
                  placeholder="Recipient name"
                />
                <ProfileInput
                  label="Contact phone *"
                  value={addressForm.customer_phone}
                  onChangeText={customer_phone =>
                    setAddressForm(current => ({ ...current, customer_phone }))
                  }
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />
                <ProfileInput
                  label="Street address *"
                  value={addressForm.street_address}
                  onChangeText={street_address =>
                    setAddressForm(current => ({ ...current, street_address }))
                  }
                  placeholder="House number, street, area"
                />
                <ProfileInput
                  label="City *"
                  value={addressForm.city}
                  onChangeText={city =>
                    setAddressForm(current => ({ ...current, city }))
                  }
                  placeholder="City"
                />
                <ProfileInput
                  label="District"
                  value={addressForm.district}
                  onChangeText={district =>
                    setAddressForm(current => ({ ...current, district }))
                  }
                  placeholder="District"
                />
                <ProfileInput
                  label="State *"
                  value={addressForm.state}
                  onChangeText={state =>
                    setAddressForm(current => ({ ...current, state }))
                  }
                  placeholder="State"
                />
                <ProfileInput
                  label="Country *"
                  value={addressForm.country}
                  onChangeText={country =>
                    setAddressForm(current => ({ ...current, country }))
                  }
                  placeholder="Country"
                />
                <ProfileInput
                  label="PIN code *"
                  value={addressForm.zip_code}
                  onChangeText={zip_code =>
                    setAddressForm(current => ({ ...current, zip_code }))
                  }
                  placeholder="PIN code"
                  keyboardType="number-pad"
                />
              </ScrollView>
              <View
                className="flex-row justify-end border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 pt-4"
                style={{ paddingBottom: Math.max(insets.bottom, 12) }}
              >
                <Pressable
                  accessibilityRole="button"
                  disabled={savingAddress}
                  onPress={() => setAddressVisible(false)}
                  className="mr-2 rounded-[10px] px-4 py-3"
                >
                  <Text className="text-[10px] font-bold text-[#64748B]">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={savingAddress}
                  onPress={saveAddress}
                  className="min-w-[130px] flex-row items-center justify-center rounded-[10px] bg-[#C2410C] px-4 py-3 disabled:opacity-60"
                >
                  {savingAddress ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Check size={15} color="#FFFFFF" />
                      <Text className="ml-2 text-[10px] font-bold text-white">
                        Save address
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={passwordVisible}
        transparent
        animationType="slide"
        onRequestClose={closePassword}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={modalStyles.keyboardAvoiding}
        >
          <View className="flex-1 justify-end bg-black/55">
            <View
              className="rounded-t-[22px] bg-white"
              style={modalStyles.sheet}
            >
              <View className="flex-row items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
                <View>
                  <Text className="text-[15px] font-black text-[#17191C]">
                    Change password
                  </Text>
                  <Text className="mt-1 text-[9px] text-[#64748B]">
                    Keep your account secure
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close change password"
                  disabled={changingPassword}
                  onPress={closePassword}
                  className="h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F1F5F9]"
                >
                  <X size={17} color="#64748B" />
                </Pressable>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="always"
                keyboardDismissMode={
                  Platform.OS === 'ios' ? 'interactive' : 'on-drag'
                }
                nestedScrollEnabled
                style={modalStyles.scroll}
                contentContainerClassName="px-5 py-4"
              >
                <ProfileInput
                  label="Current password"
                  value={passwordForm.currentPassword}
                  onChangeText={currentPassword =>
                    setPasswordForm(current => ({
                      ...current,
                      currentPassword,
                    }))
                  }
                  placeholder="Current password"
                  secureTextEntry
                  autoCapitalize="none"
                />
                <ProfileInput
                  label="New password"
                  value={passwordForm.newPassword}
                  onChangeText={newPassword =>
                    setPasswordForm(current => ({ ...current, newPassword }))
                  }
                  placeholder="New password"
                  secureTextEntry
                  autoCapitalize="none"
                />
                <ProfileInput
                  label="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChangeText={confirmPassword =>
                    setPasswordForm(current => ({
                      ...current,
                      confirmPassword,
                    }))
                  }
                  placeholder="Confirm new password"
                  secureTextEntry
                  autoCapitalize="none"
                />
                <Text className="mb-2 text-[9px] leading-[14px] text-[#64748B]">
                  Use 8–72 characters with an uppercase letter, a number, and a
                  special character.
                </Text>
              </ScrollView>
              <View
                className="flex-row justify-end border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 pt-4"
                style={{ paddingBottom: Math.max(insets.bottom, 12) }}
              >
                <Pressable
                  accessibilityRole="button"
                  disabled={changingPassword}
                  onPress={closePassword}
                  className="mr-2 rounded-[10px] px-4 py-3"
                >
                  <Text className="text-[10px] font-bold text-[#64748B]">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={changingPassword}
                  onPress={changePassword}
                  className="min-w-[130px] flex-row items-center justify-center rounded-[10px] bg-[#C2410C] px-4 py-3 disabled:opacity-60"
                >
                  {changingPassword ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <LockKeyhole size={14} color="#FFFFFF" />
                      <Text className="ml-2 text-[10px] font-bold text-white">
                        Update password
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

type InfoRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View className="mb-2 flex-row items-center rounded-[12px] bg-[#F8FAFC] p-3">
      <View className="mr-3 h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-[#DBEAFE]">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-[9px] text-[#94A3B8]">{label}</Text>
        <Text className="mt-1 text-[10px] font-bold text-[#334155]">
          {value}
        </Text>
      </View>
    </View>
  );
}

type ProfileInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'phone-pad'
    | 'numbers-and-punctuation'
    | 'number-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

function ProfileInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'sentences',
}: ProfileInputProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-[10px] font-bold text-[#64748B]">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        className="h-[46px] rounded-[11px] border border-[#E2E8F0] bg-white px-3 text-[11px] text-[#17191C]"
      />
    </View>
  );
}
