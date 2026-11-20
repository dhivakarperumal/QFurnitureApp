import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react-native';
import api from '../api';
import { colors } from '../theme/colors';

type RegisterProps = {
  onLoginPress: () => void;
};

export default function Register({ onLoginPress }: RegisterProps) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (!form.username.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
      Alert.alert('Missing details', 'Complete all fields to create your account.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match.');
      return;
    }

    if (form.password.length < 8 || form.password.length > 72) {
      Alert.alert('Invalid password', 'Password must be between 8 and 72 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/register', {
        username: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });

      Alert.alert('Registration successful', 'Please sign in with your new account.', [
        { text: 'Sign in', onPress: onLoginPress },
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.data?.message ||
        error?.message ||
        'Registration failed. Please try again.';
      Alert.alert('Registration failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ImageBackground
      source={require('../Assert/images/login.png')}
      resizeMode="cover"
      style={{ backgroundColor: colors.background, paddingTop: insets.top }}
      className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        className="flex-1 bg-transparent">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View
            className="flex-1">
            <ScrollView
              className="flex-1"
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                flexGrow: 1,
                paddingBottom: Math.max(insets.bottom, 32),
              }}
              contentContainerClassName="flex-grow justify-center px-6 py-8">
              <View
                style={{ backgroundColor: colors.surface }}
                className="mx-auto mt-[60px] w-full max-w-[430px] rounded-[24px] p-6 shadow-lg elevation-[8]">
            <Image
              source={require('../Assert/images/appicon.png')}
              accessibilityLabel="Q Furniture logo"
              resizeMode="contain"
              className="mb-4 mt-2 h-24 w-24 self-center"
            />
            <Text
              style={{ color: colors.textPrimary }}
              className="text-center text-[30px] font-black">
              Create account
            </Text>
            <Text
              style={{ color: colors.textSecondary }}
              className="mb-6 mt-2 text-center text-[13px]">
              Register to continue to Q Furniture
            </Text>

            <Text style={{ color: colors.textPrimary }} className="mb-2 text-[13px] font-bold">
              Full name
            </Text>
            <View
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="mb-4 h-[52px] flex-row items-center rounded-[12px] border px-4">
              <UserRound size={19} color={colors.textSecondary} strokeWidth={2} />
              <TextInput
                value={form.username}
                onChangeText={value => updateField('username', value)}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                editable={!submitting}
                style={{ color: colors.textPrimary }}
                className="ml-3 flex-1 text-[14px]"
              />
            </View>

            <Text style={{ color: colors.textPrimary }} className="mb-2 text-[13px] font-bold">
              Email address
            </Text>
            <View
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="mb-4 h-[52px] flex-row items-center rounded-[12px] border px-4">
              <Mail size={19} color={colors.textSecondary} strokeWidth={2} />
              <TextInput
                value={form.email}
                onChangeText={value => updateField('email', value)}
                placeholder="Enter your email address"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="next"
                editable={!submitting}
                style={{ color: colors.textPrimary }}
                className="ml-3 flex-1 text-[14px]"
              />
            </View>

            <Text style={{ color: colors.textPrimary }} className="mb-2 text-[13px] font-bold">
              Mobile number
            </Text>
            <View
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="mb-4 h-[52px] flex-row items-center rounded-[12px] border px-4">
              <Phone size={19} color={colors.textSecondary} strokeWidth={2} />
              <TextInput
                value={form.phone}
                onChangeText={value => updateField('phone', value)}
                placeholder="Enter your mobile number"
                placeholderTextColor={colors.textSecondary}
                autoComplete="tel"
                keyboardType="phone-pad"
                returnKeyType="next"
                editable={!submitting}
                style={{ color: colors.textPrimary }}
                className="ml-3 flex-1 text-[14px]"
              />
            </View>

            <Text style={{ color: colors.textPrimary }} className="mb-2 text-[13px] font-bold">
              Password
            </Text>
            <View
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="mb-4 h-[52px] flex-row items-center rounded-[12px] border px-4">
              <LockKeyhole size={19} color={colors.textSecondary} strokeWidth={2} />
              <TextInput
                value={form.password}
                onChangeText={value => updateField('password', value)}
                placeholder="Create a password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="next"
                editable={!submitting}
                style={{ color: colors.textPrimary }}
                className="ml-3 flex-1 text-[14px]"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                onPress={() => setShowPassword(visible => !visible)}
                className="h-[44px] w-[44px] items-center justify-center">
                {showPassword ? (
                  <EyeOff size={20} color={colors.textSecondary} strokeWidth={2} />
                ) : (
                  <Eye size={20} color={colors.textSecondary} strokeWidth={2} />
                )}
              </Pressable>
            </View>

            <Text style={{ color: colors.textPrimary }} className="mb-2 text-[13px] font-bold">
              Confirm password
            </Text>
            <View
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="mb-6 h-[52px] flex-row items-center rounded-[12px] border px-4">
              <LockKeyhole size={19} color={colors.textSecondary} strokeWidth={2} />
              <TextInput
                value={form.confirmPassword}
                onChangeText={value => updateField('confirmPassword', value)}
                placeholder="Confirm your password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                editable={!submitting}
                style={{ color: colors.textPrimary }}
                className="ml-3 flex-1 text-[14px]"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                onPress={() => setShowConfirmPassword(visible => !visible)}
                className="h-[44px] w-[44px] items-center justify-center">
                {showConfirmPassword ? (
                  <EyeOff size={20} color={colors.textSecondary} strokeWidth={2} />
                ) : (
                  <Eye size={20} color={colors.textSecondary} strokeWidth={2} />
                )}
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={handleSubmit}
              disabled={submitting}
              style={{ backgroundColor: colors.primary }}
              className="h-[52px] items-center justify-center rounded-[12px] disabled:opacity-60">
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={{ color: colors.white }} className="text-[15px] font-black">
                  Register
                </Text>
              )}
            </Pressable>

            <View className="mt-5 flex-row justify-center">
              <Text style={{ color: colors.textSecondary }} className="text-[13px]">
                Already have an account?{' '}
              </Text>
              <Pressable accessibilityRole="button" onPress={onLoginPress}>
                <Text style={{ color: colors.primary }} className="text-[13px] font-bold">
                  Sign in
                </Text>
              </Pressable>
            </View>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}