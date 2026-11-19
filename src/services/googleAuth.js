import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { initializeGoogleSignIn as configureGoogleSignIn } from '../config/googleConfig';

export function googleAuthError(error) {
  if (isErrorWithCode(error)) {
    if (String(error.code).includes('DEVELOPER_ERROR')) {
      return 'Google OAuth is not registered for this app. Add package com.qfurnitureapp and SHA-1 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25 in Google Cloud Console.';
    }
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return 'Google sign-in was cancelled.';
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      return 'Google sign-in is already in progress.';
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return 'Google Play Services is unavailable or outdated.';
    }
    if (error.code === statusCodes.SIGN_IN_REQUIRED) {
      return 'Please sign in with Google again.';
    }
  }
  if (error?.message) return error.message;
  return 'Unable to sign in with Google. Please try again.';
}

export async function initializeGoogleSignIn() {
  configureGoogleSignIn();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
}

export async function signInWithGoogle() {
  await initializeGoogleSignIn();

  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error('Google did not return an ID token.');
  }

  return {
    idToken,
    userId: response.data.user.id,
    fullName: response.data.user.name || '',
    email: response.data.user.email,
    profileImageUrl: response.data.user.photo || null,
  };
}

export async function signOutGoogle() {
  await GoogleSignin.signOut();
}

export async function getCurrentGoogleUser() {
  const response = await GoogleSignin.getCurrentUser();
  if (!response) return null;
  return {
    userId: response.id,
    fullName: response.name || '',
    email: response.email,
    profileImageUrl: response.photo || null,
  };
}
