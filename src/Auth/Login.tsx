import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Keyboard,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  findNodeHandle,
} from 'react-native';
import type { ScrollViewInstance, ViewInstance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import api, { setTokenCache } from '../api';
import { colors } from '../theme/colors';
import { googleAuthError, signInWithGoogle } from '../services/googleAuth';
import { normalizeRole, type AppRole } from './roles';
import { useUserAlert } from '../User/UserAlert';

type LoginProps = {
  onLogin: (role: AppRole) => void;
  onRegisterPress: () => void;
  onContinueAsGuest: () => void;
};

type LoginResponse = {
  token: string;
  user: {
    id?: string | number;
    name?: string;
    role?: string;
  };
};

export default function Login({
  onLogin,
  onRegisterPress,
  onContinueAsGuest,
}: LoginProps) {
  const insets = useSafeAreaInsets();
  const showUserAlert = useUserAlert();
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);
  const signInButtonRef = useRef<ViewInstance | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollSignInButtonIntoView = useCallback(() => {
    const buttonHandle = signInButtonRef.current
      ? findNodeHandle(signInButtonRef.current)
      : null;
    if (buttonHandle == null) return;
    scrollViewRef.current?.scrollResponderScrollNativeHandleToKeyboard(
      buttonHandle,
      24,
      true,
    );
  }, []);

  useEffect(() => {
    const keyboardShown = Keyboard.addListener('keyboardDidShow', event => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const keyboardHidden = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardShown.remove();
      keyboardHidden.remove();
    };
  }, []);

  useEffect(() => {
    if (keyboardHeight > 0) scrollSignInButtonIntoView();
  }, [keyboardHeight, scrollSignInButtonIntoView]);

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
      showUserAlert('Google login failed', message);
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier || !password) {
      showUserAlert(
        'Missing details',
        'Enter your username, email or mobile number and password.',
      );
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
      showUserAlert('Login failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      style={{ backgroundColor: colors.background, paddingTop: insets.top }}
      className="flex-1">
      <Image
        source={require('../Assert/images/login.png')}
        resizeMode="cover"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        className="flex-1 bg-transparent">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View
            className="flex-1">
            <ScrollView
              ref={scrollViewRef}
              className="flex-1"
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                flexGrow: 1,
                paddingBottom:
                  Math.max(insets.bottom, 32) +
                  (Platform.OS === 'android' ? keyboardHeight : 0),
              }}
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
              ref={signInButtonRef}
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
              className="mt-5 h-[52px] w-full flex-row items-center justify-center rounded-[12px] border border-[#D1D5DB] bg-white disabled:opacity-60">
              {googleSubmitting ? (
                <ActivityIndicator color="#4285F4" />
              ) : (
                <>
                  <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v2.95h3.88c2.27-2.09 3.56-5.17 3.56-8.59Z"
                    />
                    <Path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.96-1.08 7.95-2.92l-3.88-2.95c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.04A12 12 0 0 0 12 24Z"
                    />
                    <Path
                      fill="#FBBC05"
                      d="M5.27 14.32a7.2 7.2 0 0 1 0-4.64V6.64H1.26a12 12 0 0 0 0 10.72l4.01-3.04Z"
                    />
                    <Path
                      fill="#EA4335"
                      d="M12 4.72c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.13 15.24 0 12 0A12 12 0 0 0 1.26 6.64l4.01 3.04C6.22 6.83 8.87 4.72 12 4.72Z"
                    />
                  </Svg>
                  <Text className="ml-3 text-[15px] font-bold text-[#202124]">
                    Continue with Google
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onContinueAsGuest}
              className="mt-3 h-[48px] items-center justify-center rounded-[12px] border border-[#F97316] bg-white">
              <Text
                style={{ color: colors.primary }}
                className="text-[14px] font-bold">
                Continue as guest
              </Text>
            </Pressable>

            <View className="mt-5 flex-row justify-center">
              <Text
                style={{ color: colors.textSecondary }}
                className="text-[13px]">
                Don&apos;t have an account?{' '}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={onRegisterPress}>
                <Text
                  style={{ color: colors.primary }}
                  className="text-[13px] font-bold">
                  Register
                </Text>
              </Pressable>
            </View>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}