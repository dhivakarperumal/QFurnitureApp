import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';
import { useUserAlert } from '../UserAlert';

type Passwords = {
  current: string;
  next: string;
  confirm: string;
};

type Visibility = {
  current: boolean;
  next: boolean;
  confirm: boolean;
};

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 8 characters',       test: (v: string) => v.length >= 8 },
  { label: 'One uppercase letter',         test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number',                   test: (v: string) => /\d/.test(v) },
  { label: 'One special character',        test: (v: string) => /[^A-Za-z0-9]/.test(v) },
  { label: 'No more than 72 characters',   test: (v: string) => v.length > 0 && v.length <= 72 },
];

type PasswordFieldProps = {
  label: string;
  value: string;
  visible: boolean;
  onChangeText: (text: string) => void;
  onToggleVisibility: () => void;
  placeholder?: string;
};

function PasswordField({
  label,
  value,
  visible,
  onChangeText,
  onToggleVisibility,
  placeholder,
}: PasswordFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-[12px] font-bold text-[#5B4839]">{label}</Text>
      <View className="flex-row items-center rounded-[12px] border border-[#E7DCCF] bg-white overflow-hidden">
        {/* Lock icon prefix */}
        <View className="pl-3 pr-2">
          <KeyRound size={16} color="#C0A99A" />
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || '••••••••'}
          placeholderTextColor="#C0A99A"
          secureTextEntry={!visible}
          autoComplete="off"
          className="flex-1 h-[48px] text-[14px] text-[#351D0E]"
        />
        <Pressable
          onPress={onToggleVisibility}
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          className="px-3 h-[48px] items-center justify-center"
        >
          {visible ? (
            <Eye size={18} color="#8B735E" />
          ) : (
            <EyeOff size={18} color="#8B735E" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

type SetPasswordScreenProps = {
  onBack: () => void;
};

export default function SetPasswordScreen({ onBack }: SetPasswordScreenProps) {
  const insets = useSafeAreaInsets();
  const showUserAlert = useUserAlert();
  const [passwords, setPasswords] = useState<Passwords>({
    current: '',
    next: '',
    confirm: '',
  });
  const [visibility, setVisibility] = useState<Visibility>({
    current: false,
    next: false,
    confirm: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleVisibility = (key: keyof Visibility) =>
    setVisibility(v => ({ ...v, [key]: !v[key] }));

  const setPassword = (key: keyof Passwords) => (text: string) =>
    setPasswords(p => ({ ...p, [key]: text }));

  const allRequirementsMet = PASSWORD_REQUIREMENTS.every(r => r.test(passwords.next));

  const handleSubmit = async () => {
    setError('');
    if (!passwords.current) {
      setError('Please enter your current password.');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setError('New passwords do not match.');
      return;
    }
    if (!allRequirementsMet) {
      setError('Please meet all password requirements.');
      return;
    }

    setSaving(true);
    try {
      await api.put('/users/me/password', {
        currentPassword: passwords.current,
        newPassword: passwords.next,
      });
      setPasswords({ current: '', next: '', confirm: '' });
      showUserAlert('Success', 'Your password has been updated.');
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Could not update your password. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-[#FCFAF7]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 65, 100) }}
      >
        {/* Illustration header */}
        <View className="items-center bg-white py-6 border-b border-[#F0E7DE]">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-[#FFF0E1]">
            <KeyRound size={36} color="#F97316" />
          </View>
          <Text className="mt-3 text-[15px] font-bold text-[#351D0E]">Change Password</Text>
          <Text className="mt-1 text-[12px] text-[#8B735E]">
            Create a strong password to keep your account secure.
          </Text>
        </View>

        <View className="px-5 pt-6">
          <PasswordField
            label="Current Password"
            value={passwords.current}
            visible={visibility.current}
            onChangeText={setPassword('current')}
            onToggleVisibility={() => toggleVisibility('current')}
            placeholder="Enter current password"
          />
          <PasswordField
            label="New Password"
            value={passwords.next}
            visible={visibility.next}
            onChangeText={setPassword('next')}
            onToggleVisibility={() => toggleVisibility('next')}
            placeholder="Enter new password"
          />
          <PasswordField
            label="Confirm New Password"
            value={passwords.confirm}
            visible={visibility.confirm}
            onChangeText={setPassword('confirm')}
            onToggleVisibility={() => toggleVisibility('confirm')}
            placeholder="Confirm new password"
          />

          {/* Requirements */}
          {passwords.next.length > 0 && (
            <View className="mb-5 rounded-[14px] border border-[#F0E7DE] bg-[#FAF5EF] p-4">
              <Text className="mb-3 text-[12px] font-bold text-[#5B4839]">
                Password Requirements
              </Text>
              {PASSWORD_REQUIREMENTS.map(req => {
                const met = req.test(passwords.next);
                return (
                  <View key={req.label} className="mb-2 flex-row items-center gap-2">
                    <CheckCircle2
                      size={15}
                      color={met ? '#16A34A' : '#C0A99A'}
                    />
                    <Text
                      className={`text-[12px] ${
                        met ? 'font-semibold text-[#166534]' : 'text-[#8B735E]'
                      }`}
                    >
                      {req.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {error ? (
            <View className="mb-4 rounded-[12px] bg-red-50 border border-red-200 px-4 py-3">
              <Text className="text-[13px] text-red-700">{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={saving}
            className="h-[52px] flex-row items-center justify-center rounded-[14px] bg-[#F97316] active:opacity-80"
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Check size={18} color="white" />
            )}
            <Text className="ml-2 text-[15px] font-bold text-white">
              {saving ? 'Updating...' : 'Update Password'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
