import React, { useState } from 'react';
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

type LoginProps = {
  onLogin: () => void;
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
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

      await AsyncStorage.setItem('userToken', data.token);
      if (data.user) {
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
      }
      setTokenCache(data.token);
      onLogin();
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
      style={{ backgroundColor: colors.background }}
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