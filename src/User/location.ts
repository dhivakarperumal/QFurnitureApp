import { NativeModules, Linking, Platform } from 'react-native';
import Geolocation, {
  type GeolocationError,
  type GeolocationResponse,
} from '@react-native-community/geolocation';

export type LocationAddress = {
  street_address: string;
  city: string;
  district: string;
  state: string;
  country: string;
  zip_code: string;
};

type AddressGeocoderModule = {
  openLocationPermissionSettings?: () => Promise<void>;
  reverseGeocode: (
    latitude: number,
    longitude: number,
  ) => Promise<LocationAddress>;
};

function getCurrentPosition(): Promise<GeolocationResponse> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
    });
  });
}

export async function fetchCurrentAddress(): Promise<LocationAddress> {
  const position = await getCurrentPosition();
  const { latitude, longitude } = position.coords;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('Your device returned invalid location coordinates.');
  }

  const geocoder = NativeModules.AddressGeocoder as
    | AddressGeocoderModule
    | undefined;
  if (typeof geocoder?.reverseGeocode !== 'function') {
    throw new Error('Address lookup is unavailable on this device.');
  }

  const address = await geocoder.reverseGeocode(latitude, longitude);
  if (
    !address ||
    ![
      address.street_address,
      address.city,
      address.district,
      address.state,
      address.country,
      address.zip_code,
    ].some(value => typeof value === 'string' && value.trim())
  ) {
    throw new Error('No address details were found for your location.');
  }

  return {
    street_address: address.street_address?.trim() ?? '',
    city: address.city?.trim() ?? '',
    district: address.district?.trim() ?? '',
    state: address.state?.trim() ?? '',
    country: address.country?.trim() || 'India',
    zip_code: address.zip_code?.trim() ?? '',
  };
}

export function getLocationErrorCode(error: unknown): number | null {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'number'
  ) {
    return error.code;
  }
  return null;
}

export function locationErrorMessage(error: unknown): string {
  const code = getLocationErrorCode(error);
  if (code === 1) {
    return 'Location permission is disabled. Enable location access for Q Furniture in your device settings.';
  }
  if (code === 2) {
    return 'Device location is turned off or unavailable. Turn on Location Services and try again.';
  }
  if (code === 3) {
    return 'Your location could not be found in time. Move to an area with a clear signal and try again.';
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Could not fetch your current address. Please try again.';
}

export async function openLocationSettings(error: unknown): Promise<void> {
  if (Platform.OS === 'android' && getLocationErrorCode(error) === 1) {
    const geocoder = NativeModules.AddressGeocoder as
      | AddressGeocoderModule
      | undefined;
    if (typeof geocoder?.openLocationPermissionSettings === 'function') {
      await geocoder.openLocationPermissionSettings();
      return;
    }
  }

  if (Platform.OS === 'android' && getLocationErrorCode(error) === 2) {
    try {
      await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
      return;
    } catch {
      await Linking.openSettings();
      return;
    }
  }

  await Linking.openSettings();
}

export type { GeolocationError };
