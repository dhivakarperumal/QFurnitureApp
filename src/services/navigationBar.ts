import { NativeModules, Platform } from 'react-native';

type NavigationBarManager = {
  setUserNavigationBarAppearance: (enabled: boolean) => Promise<void>;
};

const navigationBarManager = NativeModules
  .NavigationBarManager as NavigationBarManager | undefined;

export async function setUserNavigationBarAppearance(enabled: boolean) {
  if (Platform.OS !== 'android') return;
  if (!navigationBarManager) {
    throw new Error(
      'NavigationBarManager is unavailable. Rebuild the Android app to include the native module.',
    );
  }
  await navigationBarManager.setUserNavigationBarAppearance(enabled);
}
