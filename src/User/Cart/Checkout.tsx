import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  Alert,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  CreditCard,
  MapPin,
  Navigation,
  PackageCheck,
  Store,
  Wallet,
  X,
} from 'lucide-react-native';
import api from '../../api';
import type { StoreCartItem } from '../types';
import { formatPrice } from '../utils';

type Address = {
  id: string | number;
  label: string;
  customer_name: string;
  customer_phone: string;
  street_address: string;
  city: string;
  district?: string;
  state: string;
  country: string;
  zip_code: string;
  is_default?: boolean | number;
};

type PickupLocation = {
  id: string | number;
  name: string;
  address: string;
};

type CheckoutQuote = {
  subtotal: number | string;
  gst_rate?: number | string;
  gst_amount: number | string;
  discount_amount?: number | string;
  shipping_amount?: number | string;
  total_amount: number | string;
};

type GstSettings = {
  gst_enabled: boolean;
  gst_rate: number;
  tax_mode: 'Tax Exclusive' | 'Tax Inclusive';
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type AddressDraft = Omit<Address, 'id' | 'is_default'>;

const emptyAddress: AddressDraft = {
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

function amount(value: number | string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseGstSettings(data: unknown): GstSettings {
  if (!isRecord(data)) {
    throw new Error('The GST settings response was invalid.');
  }

  const settings = isRecord(data.settings) ? data.settings : data;
  const enabledValue = settings.gst_enabled;
  const gstEnabled =
    enabledValue === true ||
    enabledValue === 1 ||
    enabledValue === 'true';
  const gstDisabled =
    enabledValue === false ||
    enabledValue === 0 ||
    enabledValue === 'false';
  const rateValue = settings.gst_rate;
  const rate =
    typeof rateValue === 'number' || typeof rateValue === 'string'
      ? amount(rateValue)
      : null;
  const rawTaxMode = (
    typeof settings.tax_mode === 'string' ? settings.tax_mode : ''
  )
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  const taxMode =
    rawTaxMode === 'taxexclusive'
      ? 'Tax Exclusive'
      : rawTaxMode === 'taxinclusive'
      ? 'Tax Inclusive'
      : null;

  if (
    (!gstEnabled && !gstDisabled) ||
    rate === null ||
    rate < 0 ||
    rate > 100 ||
    !taxMode
  ) {
    throw new Error('The GST settings response was invalid.');
  }

  return {
    gst_enabled: gstEnabled,
    gst_rate: rate,
    tax_mode: taxMode,
  };
}

function cartSubtotal(items: StoreCartItem[]) {
  let subtotal = 0;

  for (const item of items) {
    const price = amount(item.price);
    const quantity = amount(item.quantity);
    const lineTotal = item.total_price != null
      ? amount(item.total_price)
      : price !== null && quantity !== null
      ? price * quantity
      : null;

    if (lineTotal === null || lineTotal < 0) return null;
    subtotal += lineTotal;
  }

  return roundCurrency(subtotal);
}

function responseMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Please try again.';
}

function RadioMark({ selected }: { selected: boolean }) {
  return (
    <View
      className={`h-[20px] w-[20px] items-center justify-center rounded-full border-2 ${
        selected ? 'border-[#F97316]' : 'border-[#D5C5B6]'
      }`}
    >
      {selected ? (
        <View className="h-[10px] w-[10px] rounded-full bg-[#F97316]" />
      ) : null}
    </View>
  );
}

function CheckoutInput({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  placeholder?: string;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-[11px] font-bold text-[#5B4839]">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#C0A99A"
        className="h-[44px] rounded-[11px] border border-[#E7DCCF] bg-white px-3 text-[13px] text-[#351D0E]"
      />
    </View>
  );
}

type CheckoutProps = {
  items: StoreCartItem[];
  onBack: () => void;
  onOrderPlaced: () => void;
};

export default function Checkout({
  items,
  onBack,
  onOrderPlaced,
}: CheckoutProps) {
  const insets = useSafeAreaInsets();
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>(
    'delivery',
  );
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay'>('cod');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<
    string | number | null
  >(null);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressesError, setAddressesError] = useState('');
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [selectedPickupId, setSelectedPickupId] = useState<
    string | number | null
  >(null);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [pickupError, setPickupError] = useState('');
  const [gstSettings, setGstSettings] = useState<GstSettings | null>(null);
  const [gstSettingsLoading, setGstSettingsLoading] = useState(true);
  const [gstSettingsError, setGstSettingsError] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(emptyAddress);
  const [addressFormError, setAddressFormError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [pendingPaymentOrderId, setPendingPaymentOrderId] = useState<
    string | number | null
  >(null);

  const loadAddresses = useCallback(async () => {
    setAddressesLoading(true);
    setAddressesError('');
    try {
      const { data } = await api.get<Address[]>('/users/me/addresses');
      if (!Array.isArray(data)) {
        throw new Error('The saved-address response was invalid.');
      }
      setAddresses(data);
      setSelectedAddressId(
        current =>
          current ??
          data.find(address => Boolean(Number(address.is_default)))?.id ??
          data[0]?.id ??
          null,
      );
      return data;
    } catch (error) {
      setAddressesError(responseMessage(error));
      return [];
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  useEffect(() => {
    let active = true;
    api
      .get<unknown>('/settings/gst')
      .then(({ data }) => {
        const settings = parseGstSettings(data);
        if (active) setGstSettings(settings);
      })
      .catch(error => {
        if (active) setGstSettingsError(responseMessage(error));
      })
      .finally(() => {
        if (active) setGstSettingsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (fulfillment !== 'pickup') return;
    let active = true;
    setPickupLoading(true);
    setPickupError('');
    api
      .get<PickupLocation[] | { locations?: PickupLocation[] }>(
        '/pickup-locations',
      )
      .then(({ data }) => {
        const locations = Array.isArray(data) ? data : data?.locations;
        if (!Array.isArray(locations)) {
          throw new Error('The pickup-location response was invalid.');
        }
        if (!active) return;
        setPickupLocations(locations);
        setSelectedPickupId(current => current ?? locations[0]?.id ?? null);
      })
      .catch(error => {
        if (active) setPickupError(responseMessage(error));
      })
      .finally(() => {
        if (active) setPickupLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fulfillment]);

  const quoteRequestBody = useMemo(
    () => ({
      fulfillment_type: fulfillment,
      address_id: fulfillment === 'delivery' ? selectedAddressId : undefined,
      pickup_location_id:
        fulfillment === 'pickup' ? selectedPickupId : undefined,
      items: items.map(item => ({
        cart_item_id: item.id,
        product_id:
          item.item_type === 'combo' ? undefined : item.product_id ?? item.id,
        combo_id:
          item.item_type === 'combo' ? item.combo_id ?? item.id : undefined,
        quantity: Number(item.quantity),
      })),
    }),
    [fulfillment, items, selectedAddressId, selectedPickupId],
  );

  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const quote = useMemo<CheckoutQuote | null>(() => {
    if (!gstSettings || subtotal === null) return null;

    const gstRate = gstSettings.gst_enabled ? gstSettings.gst_rate : 0;
    const taxInclusive = gstSettings.tax_mode === 'Tax Inclusive';
    const gstAmount = gstSettings.gst_enabled
      ? roundCurrency(
          taxInclusive
            ? (subtotal * gstRate) / (100 + gstRate)
            : (subtotal * gstRate) / 100,
        )
      : 0;

    return {
      subtotal,
      gst_rate: gstRate,
      gst_amount: gstAmount,
      total_amount: roundCurrency(
        taxInclusive ? subtotal : subtotal + gstAmount,
      ),
    };
  }, [gstSettings, subtotal]);
  const quoteLoading = gstSettingsLoading;
  const quoteError =
    gstSettingsError ||
    (subtotal === null ? 'Cart prices are invalid. Please refresh your cart.' : '');

  const requestLocation = async () => {
    if (Platform.OS === 'android') {
      const permissions = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
      const granted = Object.values(permissions).some(
        result => result === PermissionsAndroid.RESULTS.GRANTED,
      );
      if (!granted) {
        Alert.alert(
          'Location permission needed',
          'Allow location access to attach your current GPS coordinates to the delivery.',
        );
        return;
      }
    } else {
      const authorized = await new Promise<boolean>(resolve => {
        Geolocation.requestAuthorization(
          () => resolve(true),
          () => resolve(false),
        );
      });
      if (!authorized) {
        Alert.alert(
          'Location permission needed',
          'Allow location access to attach your current GPS coordinates to the delivery.',
        );
        return;
      }
    }

    setLocationLoading(true);
    Geolocation.getCurrentPosition(
      position => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationLoading(false);
      },
      error => {
        setLocationLoading(false);
        Alert.alert(
          'Could not fetch location',
          error.message || 'Check location settings and try again.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const saveAddress = async () => {
    if (
      !addressDraft.customer_name.trim() ||
      !/^\+?[0-9\s()-]{8,18}$/.test(addressDraft.customer_phone.trim()) ||
      !addressDraft.street_address.trim() ||
      !addressDraft.city.trim() ||
      !addressDraft.state.trim() ||
      !/^[0-9]{6}$/.test(addressDraft.zip_code.trim())
    ) {
      setAddressFormError(
        'Enter a valid name, phone, street, city, state, and 6-digit PIN code.',
      );
      return;
    }
    setSavingAddress(true);
    setAddressFormError('');
    try {
      const { data } = await api.post<Address>('/users/me/addresses', {
        ...addressDraft,
        is_default: addresses.length === 0,
      });
      const refreshedAddresses = await loadAddresses();
      const savedAddress = data?.id
        ? data
        : refreshedAddresses.find(
            address =>
              address.customer_phone === addressDraft.customer_phone &&
              address.street_address === addressDraft.street_address,
          );
      if (savedAddress?.id) setSelectedAddressId(savedAddress.id);
      setAddressModalOpen(false);
      setAddressDraft(emptyAddress);
    } catch (error) {
      setAddressFormError(responseMessage(error));
    } finally {
      setSavingAddress(false);
    }
  };

  const orderPayload = () => ({
    fulfillment_type: fulfillment,
    address_id: fulfillment === 'delivery' ? selectedAddressId : undefined,
    shipping_address:
      fulfillment === 'delivery'
        ? addresses.find(address => address.id === selectedAddressId)
        : undefined,
    delivery_coordinates:
      fulfillment === 'delivery' && coordinates ? coordinates : undefined,
    pickup_location_id: fulfillment === 'pickup' ? selectedPickupId : undefined,
    payment_method: paymentMethod === 'cod' ? 'cash_on_delivery' : 'razorpay',
    quote_id: quote?.quote_id,
    items: quoteRequestBody.items,
  });

  const checkPaymentStatus = useCallback(
    async (orderId: string | number) => {
      try {
        const { data } = await api.get(`/orders/${orderId}`);
        const status = String(
          data?.payment_status ?? data?.payment?.status ?? '',
        ).toLowerCase();
        if (['paid', 'captured', 'completed', 'success'].includes(status)) {
          setPendingPaymentOrderId(null);
          Alert.alert(
            'Payment confirmed',
            'Your order has been placed successfully.',
          );
          onOrderPlaced();
        } else if (['failed', 'cancelled', 'canceled'].includes(status)) {
          setPendingPaymentOrderId(null);
          Alert.alert(
            'Payment not completed',
            'Your order is not confirmed. You can try again.',
          );
        } else {
          Alert.alert(
            'Payment confirmation pending',
            'The server has not confirmed this payment yet. Check your orders again shortly.',
          );
        }
      } catch (error) {
        Alert.alert('Could not verify payment', responseMessage(error));
      }
    },
    [onOrderPlaced],
  );

  useEffect(() => {
    if (pendingPaymentOrderId == null) return;
    let backgrounded = false;
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        backgrounded = true;
      } else if (backgrounded) {
        backgrounded = false;
        checkPaymentStatus(pendingPaymentOrderId);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [checkPaymentStatus, pendingPaymentOrderId]);

  const placeOrder = async () => {
    if (!quote || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      if (paymentMethod === 'cod') {
        const { data } = await api.post('/orders', orderPayload());
        const order = data?.order ?? data;
        if (order?.id == null) {
          throw new Error(
            'The server did not confirm the order. Please try again.',
          );
        }
        Alert.alert(
          'Order placed',
          `Your order ${order.order_id ?? `#${order.id}`} is confirmed.`,
        );
        onOrderPlaced();
        return;
      }

      const { data } = await api.post(
        '/payments/razorpay/checkout',
        orderPayload(),
      );
      const checkoutUrl = data?.checkout_url;
      const orderId = data?.order_id ?? data?.order?.id;
      if (
        typeof checkoutUrl !== 'string' ||
        !/^https:\/\//i.test(checkoutUrl) ||
        orderId == null
      ) {
        throw new Error(
          'The server did not provide a secure Razorpay checkout link and order ID.',
        );
      }
      await Linking.openURL(checkoutUrl);
      setPendingPaymentOrderId(orderId);
      Alert.alert(
        'Complete your payment',
        'Razorpay checkout opened. Return here after paying; the server will confirm your order.',
      );
    } catch (error) {
      setSubmitError(responseMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAddress = addresses.find(
    address => address.id === selectedAddressId,
  );
  const destinationReady =
    fulfillment === 'delivery'
      ? selectedAddress != null
      : selectedPickupId != null;
  const requestKey = JSON.stringify(quoteRequestBody);
  const orderReady =
    destinationReady &&
    quote != null &&
    quotedRequestKey === requestKey &&
    !quoteLoading &&
    !submitting;

  return (
    <View className="px-4 pb-8 pt-3">
      <View className="mb-5 flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to cart"
          onPress={onBack}
          className="mr-3 h-[40px] w-[40px] items-center justify-center rounded-full bg-white"
        >
          <ArrowLeft size={19} color="#351D0E" />
        </Pressable>
        <View>
          <Text className="text-[23px] font-black text-[#351D0E]">
            Checkout
          </Text>
          <Text className="text-[12px] text-[#8B735E]">
            Secure your furniture order
          </Text>
        </View>
      </View>

      <View className="mb-4 rounded-[18px] border border-[#F0E7DE] bg-white p-4">
        <Text className="mb-3 text-[14px] font-black text-[#351D0E]">
          Fulfilment
        </Text>
        <View className="flex-row gap-3">
          {(
            [
              ['delivery', 'Home delivery', MapPin],
              ['pickup', 'Pick up', Store],
            ] as const
          ).map(([value, label, Icon]) => {
            const selected = fulfillment === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setFulfillment(value)}
                className={`flex-1 flex-row items-center rounded-[13px] border p-3 ${
                  selected
                    ? 'border-[#F97316] bg-[#FFF5ED]'
                    : 'border-[#E7DCCF] bg-white'
                }`}
              >
                <Icon size={17} color={selected ? '#F97316' : '#8B735E'} />
                <Text className="ml-2 flex-1 text-[12px] font-bold text-[#351D0E]">
                  {label}
                </Text>
                <RadioMark selected={selected} />
              </Pressable>
            );
          })}
        </View>
      </View>

      {fulfillment === 'delivery' ? (
        <View className="mb-4 rounded-[18px] border border-[#F0E7DE] bg-white p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[14px] font-black text-[#351D0E]">
              Delivery address
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAddressFormError('');
                setAddressDraft(emptyAddress);
                setAddressModalOpen(true);
              }}
              className="rounded-full bg-[#FFF0E1] px-3 py-2"
            >
              <Text className="text-[11px] font-bold text-[#B94719]">
                + Add new
              </Text>
            </Pressable>
          </View>
          {addressesLoading ? (
            <ActivityIndicator color="#F97316" />
          ) : addressesError ? (
            <Text className="text-[12px] text-[#8B2D20]">{addressesError}</Text>
          ) : addresses.length === 0 ? (
            <Text className="text-[12px] leading-5 text-[#8B735E]">
              Add a delivery address to continue.
            </Text>
          ) : (
            addresses.map(address => {
              const selected = address.id === selectedAddressId;
              return (
                <Pressable
                  key={address.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedAddressId(address.id)}
                  className={`mb-2 flex-row items-start rounded-[13px] border p-3 ${
                    selected
                      ? 'border-[#F97316] bg-[#FFF9F4]'
                      : 'border-[#EFE6DC]'
                  }`}
                >
                  <View className="mr-3 mt-0.5">
                    <RadioMark selected={selected} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[12px] font-bold text-[#351D0E]">
                      {address.label || 'Address'} · {address.customer_name}
                    </Text>
                    <Text className="mt-1 text-[11px] leading-4 text-[#725D4B]">
                      {[
                        address.street_address,
                        address.city,
                        address.state,
                        address.zip_code,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                    <Text className="mt-1 text-[11px] text-[#8B735E]">
                      {address.customer_phone}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
          {addressesError ? (
            <Pressable onPress={loadAddresses} className="mt-2 self-start">
              <Text className="text-[12px] font-bold text-[#B94719]">
                Try loading addresses again
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={locationLoading}
            onPress={requestLocation}
            className="mt-2 flex-row items-center self-start rounded-full border border-[#F1D5C2] px-3 py-2 disabled:opacity-60"
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#F97316" />
            ) : (
              <Navigation size={14} color="#B94719" />
            )}
            <Text className="ml-2 text-[11px] font-bold text-[#B94719]">
              {locationLoading ? 'Fetching GPS…' : 'Use current location'}
            </Text>
          </Pressable>
          {coordinates ? (
            <Text className="mt-2 text-[10px] leading-4 text-[#8B735E]">
              GPS saved for this order ({coordinates.latitude.toFixed(5)},{' '}
              {coordinates.longitude.toFixed(5)}). Add a street address above;
              GPS does not convert to an address.
            </Text>
          ) : null}
        </View>
      ) : (
        <View className="mb-4 rounded-[18px] border border-[#F0E7DE] bg-white p-4">
          <Text className="mb-3 text-[14px] font-black text-[#351D0E]">
            Choose a pickup point
          </Text>
          {pickupLoading ? (
            <ActivityIndicator color="#F97316" />
          ) : pickupError ? (
            <Text className="text-[12px] leading-5 text-[#8B2D20]">
              Pickup locations could not be loaded: {pickupError}
            </Text>
          ) : pickupLocations.length === 0 ? (
            <Text className="text-[12px] leading-5 text-[#8B735E]">
              No pickup locations are available right now.
            </Text>
          ) : (
            pickupLocations.map(location => {
              const selected = location.id === selectedPickupId;
              return (
                <Pressable
                  key={location.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedPickupId(location.id)}
                  className={`mb-2 flex-row items-start rounded-[13px] border p-3 ${
                    selected
                      ? 'border-[#F97316] bg-[#FFF9F4]'
                      : 'border-[#EFE6DC]'
                  }`}
                >
                  <View className="mr-3 mt-0.5">
                    <RadioMark selected={selected} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[12px] font-bold text-[#351D0E]">
                      {location.name}
                    </Text>
                    <Text className="mt-1 text-[11px] leading-4 text-[#725D4B]">
                      {location.address}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
          {pickupError ? (
            <Pressable
              onPress={() => setFulfillment('delivery')}
              className="mt-2 self-start"
            >
              <Text className="text-[12px] font-bold text-[#B94719]">
                Switch to delivery
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <View className="mb-4 rounded-[18px] border border-[#F0E7DE] bg-white p-4">
        <Text className="mb-3 text-[14px] font-black text-[#351D0E]">
          Payment method
        </Text>
        {(
          [
            ['razorpay', 'Pay online', 'UPI, cards & net banking', CreditCard],
            ['cod', 'Cash on delivery', 'Pay when your order arrives', Wallet],
          ] as const
        ).map(([value, label, detail, Icon]) => {
          const selected = paymentMethod === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setPaymentMethod(value)}
              className={`mb-2 flex-row items-center rounded-[13px] border p-3 ${
                selected ? 'border-[#F97316] bg-[#FFF9F4]' : 'border-[#EFE6DC]'
              }`}
            >
              <Icon size={18} color={selected ? '#F97316' : '#8B735E'} />
              <View className="ml-3 flex-1">
                <Text className="text-[12px] font-bold text-[#351D0E]">
                  {label}
                </Text>
                <Text className="mt-0.5 text-[10px] text-[#8B735E]">
                  {detail}
                </Text>
              </View>
              <RadioMark selected={selected} />
            </Pressable>
          );
        })}
      </View>

      <View className="mb-4 rounded-[18px] border border-[#F0E7DE] bg-white p-4">
        <View className="mb-3 flex-row items-center">
          <PackageCheck size={17} color="#F97316" />
          <Text className="ml-2 text-[14px] font-black text-[#351D0E]">
            Order summary
          </Text>
        </View>
        {items.map(item => (
          <View key={item.id} className="mb-2 flex-row justify-between">
            <Text
              numberOfLines={1}
              className="mr-3 flex-1 text-[11px] text-[#725D4B]"
            >
              {item.name} × {Number(item.quantity)}
            </Text>
            <Text className="text-[11px] font-semibold text-[#351D0E]">
              {formatPrice(
                Number(
                  item.total_price ??
                    Number(item.price) * Number(item.quantity),
                ),
              )}
            </Text>
          </View>
        ))}
        <View className="mt-1 border-t border-[#F0E7DE] pt-3">
          {quoteLoading ? (
            <View className="flex-row items-center py-2">
              <ActivityIndicator size="small" color="#F97316" />
              <Text className="ml-2 text-[11px] text-[#8B735E]">
                Getting taxes and total from server…
              </Text>
            </View>
          ) : quote && quotedRequestKey === requestKey ? (
            <>
              <SummaryLine label="Subtotal" value={quote.subtotal} />
              <SummaryLine
                label={
                  quote.gst_rate != null ? `GST (${quote.gst_rate}%)` : 'GST'
                }
                value={quote.gst_amount}
              />
              {amount(quote.discount_amount) ? (
                <SummaryLine
                  label="Discount"
                  value={-Number(quote.discount_amount)}
                />
              ) : null}
              <SummaryLine
                label="Delivery"
                value={quote.shipping_amount ?? 0}
              />
              <View className="mt-2 flex-row justify-between border-t border-[#F0E7DE] pt-3">
                <Text className="text-[13px] font-black text-[#351D0E]">
                  Total
                </Text>
                <Text className="text-[16px] font-black text-[#351D0E]">
                  {formatPrice(Number(quote.total_amount))}
                </Text>
              </View>
            </>
          ) : (
            <Text className="text-[11px] leading-4 text-[#8B735E]">
              Select a{' '}
              {fulfillment === 'delivery' ? 'saved address' : 'pickup point'} to
              get server-calculated GST and your final total.
            </Text>
          )}
          {quoteError ? (
            <View className="mt-3 rounded-[11px] bg-red-50 px-3 py-2">
              <Text className="text-[11px] leading-4 text-red-700">
                {quoteError}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {submitError ? (
        <View className="mb-3 rounded-[12px] bg-red-50 px-4 py-3">
          <Text className="text-[12px] text-red-700">{submitError}</Text>
        </View>
      ) : null}
      {pendingPaymentOrderId != null ? (
        <Pressable
          onPress={() => checkPaymentStatus(pendingPaymentOrderId)}
          className="mb-3 rounded-[12px] border border-[#F1D5C2] bg-[#FFF5ED] px-4 py-3"
        >
          <Text className="text-center text-[12px] font-bold text-[#B94719]">
            I’ve returned from Razorpay · Check payment status
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={!orderReady}
        onPress={placeOrder}
        className="mb-2 h-[52px] flex-row items-center justify-center rounded-[15px] bg-[#F97316] disabled:opacity-50"
      >
        {submitting ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Check size={17} color="white" />
        )}
        <Text className="ml-2 text-[14px] font-black text-white">
          {submitting
            ? 'Processing…'
            : paymentMethod === 'cod'
            ? 'Place order'
            : 'Continue to Razorpay'}
        </Text>
      </Pressable>
      <View className="mb-3 flex-row items-center justify-center">
        <Check size={12} color="#8B735E" />
        <Text className="ml-1 text-[10px] text-[#8B735E]">
          GST and order total are verified by the server
        </Text>
      </View>

      <Modal
        visible={addressModalOpen}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="max-h-[90%] rounded-t-[24px] bg-[#FCFAF7] px-5 pt-4"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <View>
                <Text className="text-[16px] font-black text-[#351D0E]">
                  Add delivery address
                </Text>
                <Text className="mt-0.5 text-[11px] text-[#8B735E]">
                  Saved securely for your orders
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close address form"
                onPress={() => setAddressModalOpen(false)}
                className="h-[34px] w-[34px] items-center justify-center rounded-full bg-white"
              >
                <X size={16} color="#351D0E" />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <CheckoutInput
                    label="Label"
                    value={addressDraft.label}
                    onChangeText={value =>
                      setAddressDraft(current => ({ ...current, label: value }))
                    }
                    placeholder="Home"
                  />
                </View>
                <View className="flex-1">
                  <CheckoutInput
                    label="Full name"
                    value={addressDraft.customer_name}
                    onChangeText={value =>
                      setAddressDraft(current => ({
                        ...current,
                        customer_name: value,
                      }))
                    }
                    placeholder="Recipient name"
                  />
                </View>
              </View>
              <CheckoutInput
                label="Phone number"
                value={addressDraft.customer_phone}
                onChangeText={value =>
                  setAddressDraft(current => ({
                    ...current,
                    customer_phone: value,
                  }))
                }
                keyboardType="phone-pad"
                placeholder="Mobile number"
              />
              <CheckoutInput
                label="Street address"
                value={addressDraft.street_address}
                onChangeText={value =>
                  setAddressDraft(current => ({
                    ...current,
                    street_address: value,
                  }))
                }
                placeholder="Door no, street, area"
              />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <CheckoutInput
                    label="City"
                    value={addressDraft.city}
                    onChangeText={value =>
                      setAddressDraft(current => ({ ...current, city: value }))
                    }
                  />
                </View>
                <View className="flex-1">
                  <CheckoutInput
                    label="State"
                    value={addressDraft.state}
                    onChangeText={value =>
                      setAddressDraft(current => ({ ...current, state: value }))
                    }
                  />
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <CheckoutInput
                    label="District (optional)"
                    value={addressDraft.district ?? ''}
                    onChangeText={value =>
                      setAddressDraft(current => ({
                        ...current,
                        district: value,
                      }))
                    }
                  />
                </View>
                <View className="flex-1">
                  <CheckoutInput
                    label="PIN code"
                    value={addressDraft.zip_code}
                    onChangeText={value =>
                      setAddressDraft(current => ({
                        ...current,
                        zip_code: value,
                      }))
                    }
                    keyboardType="numeric"
                    placeholder="6-digit PIN"
                  />
                </View>
              </View>
              {addressFormError ? (
                <Text className="mb-3 text-[11px] text-red-700">
                  {addressFormError}
                </Text>
              ) : null}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              disabled={savingAddress}
              onPress={saveAddress}
              className="h-[48px] flex-row items-center justify-center rounded-[14px] bg-[#F97316] disabled:opacity-60"
            >
              {savingAddress ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Check size={15} color="white" />
              )}
              <Text className="ml-2 text-[13px] font-bold text-white">
                {savingAddress ? 'Saving…' : 'Save address'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SummaryLine({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  const parsed = Number(value);
  return (
    <View className="mb-2 flex-row justify-between">
      <Text className="text-[11px] text-[#725D4B]">{label}</Text>
      <Text className="text-[11px] font-semibold text-[#351D0E]">
        {formatPrice(Number.isFinite(parsed) ? parsed : 0)}
      </Text>
    </View>
  );
}
