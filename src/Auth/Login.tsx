import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react-native';
import api, { setTokenCache } from '../api';
import { colors } from '../theme/colors';
import { googleAuthError, signInWithGoogle } from '../services/googleAuth';
import { normalizeRole, type AppRole } from './roles';

type LoginProps = {
  onLogin: (role: AppRole) => void;
  onRegisterPress: () => void;
};

type LoginResponse = {
  token: string;
  user: {
    id?: string | number;
    name?: string;
    role?: string;
  };
};

export default function Login({ onLogin, onRegisterPress }: LoginProps) {
  const insets = useSafeAreaInsets();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    if (googleSubmitting) return;
    setGoogleSubmitting(true);
    try {
      const googleUser = await signInWithGoogle();
      if (!googleUser) return;

      const { data } = await api.post<LoginResponse>('/auth/google-login', {
        credential: googleUser.idToken,
      });
      if (!data.token) {
        throw new Error('The server did not return an authentication token.');
      }
      if (!data.user) {
        throw new Error('The server did not return the signed-in user.');
      }

      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      setTokenCache(data.token);
      onLogin(normalizeRole(data.user.role));
    } catch (error: any) {
      const message =
        error?.data?.message ||
        error?.message ||
        googleAuthError(error);
      Alert.alert('Google login failed', message);
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier || !password) {
      Alert.alert('Missing details', 'Enter your username, email or mobile number and password.');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const { data } = await api.post<LoginResponse>('/auth/login', {
        identifier: normalizedIdentifier,
        password,
      });

      if (!data.token) {
        throw new Error('The server did not return an authentication token.');
      }
      if (!data.user) {
        throw new Error('The server did not return the signed-in user.');
      }

      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      setTokenCache(data.token);
      onLogin(normalizeRole(data.user.role));
    } catch (error: any) {
      const message =
        error?.message ||
        error?.data?.message ||
        'Unable to sign in. Please check your details and try again.';
      Alert.alert('Login failed', message);
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
        className="flex-1 bg-transparent">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="flex-grow justify-center px-6 py-8">
          <View
            style={{ backgroundColor: colors.surface }}
            className="mx-auto mt-10 w-full max-w-[430px] rounded-[24px] p-6 shadow-lg elevation-[8]">
            <Image
              source={require('../Assert/images/appicon.png')}
              accessibilityLabel="Q Furniture logo"
              resizeMode="contain"
              className="mb-4 mt-2 h-24 w-24 self-center"
            />
            <Text
              style={{ color: colors.textPrimary }}
              className="text-center text-[30px] font-black">
              Welcome <Text style={{ color: colors.primary }}>back</Text>
            </Text>
            <Text
              style={{ color: colors.textSecondary }}
              className="mb-6 mt-2 text-center text-[13px]">
              Sign in to continue to Q Furniture
            </Text>

            <Text
              style={{ color: colors.textPrimary }}
              className="mb-2 text-[13px] font-bold">
              Username, email or mobile number
            </Text>
            <View
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="mb-4 h-[52px] flex-row items-center rounded-[12px] border px-4">
              <UserRound size={19} color={colors.textSecondary} strokeWidth={2} />
              <TextInput
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="Enter username, email or mobile"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="next"
                editable={!submitting}
                style={{ color: colors.textPrimary }}
                className="ml-3 flex-1 text-[14px]"
              />
            </View>

            <Text
              style={{ color: colors.textPrimary }}
              className="mb-2 text-[13px] font-bold">
              Password
            </Text>
            <View
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="mb-6 h-[52px] flex-row items-center rounded-[12px] border px-4">
              <LockKeyhole size={19} color={colors.textSecondary} strokeWidth={2} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                editable={!submitting}
                style={{ color: colors.textPrimary }}
                className="ml-3 flex-1 text-[14px]"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                onPress={() => setShowPassword(value => !value)}
                className="h-[44px] w-[44px] items-center justify-center">
                {showPassword ? (
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
                  Sign in
                </Text>
              )}
            </Pressable>

            <View className="mt-5 flex-row items-center">
              <View className="h-[1px] flex-1 bg-[#E5E7EB]" />
              <Text className="mx-3 text-[12px] text-[#94A3B8]">or</Text>
              <View className="h-[1px] flex-1 bg-[#E5E7EB]" />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              onPress={handleGoogleLogin}
              disabled={submitting || googleSubmitting}
              className="mt-5 h-[52px] flex-row items-center justify-center rounded-[12px] border border-[#D1D5DB] bg-white disabled:opacity-60">
              {googleSubmitting ? (
                <ActivityIndicator color="#4285F4" />
              ) : (
                <>
                  <View className="mr-3 h-[22px] w-[22px] items-center justify-center rounded-full bg-white">
                    <Text className="text-[18px] font-black text-[#4285F4]">G</Text>
                  </View>
                  <Text className="text-[15px] font-bold text-[#202124]">
                    Continue with Google
                  </Text>
                </>
              )}
            </Pressable>

            <View className="mt-5 flex-row justify-center">
              <Text style={{ color: colors.textSecondary }} className="text-[13px]">
                Don&apos;t have an account?{' '}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={onRegisterPress}>
                <Text style={{ color: colors.primary }} className="text-[13px] font-bold">
                  Register
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}