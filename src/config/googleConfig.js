import Config from 'react-native-config';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const GOOGLE_WEB_CLIENT_ID =
  Config.VITE_GOOGLE_CLIENT_ID ||
  Config.GOOGLE_WEB_CLIENT_ID ||
  '';

export function initializeGoogleSignIn() {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error(
      'Google Sign-In is not configured. Set VITE_GOOGLE_CLIENT_ID in .env.',
    );
  }

  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
    forceCodeForRefreshToken: false,
    profileImageSize: 120,
  });
}
