import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import RazorpayCheckout from 'react-native-razorpay';
import api from '../../api';
import {
  fetchCachedApiData,
  getCachedApiData,
  hasCachedApiData,
} from '../../apiCache';
import type { StoreBuyNowItem, StoreCartItem } from '../types';
import { formatPrice } from '../utils';
import { buildBuyNowOrderItems } from './buyNow';
import { useUserAlert } from '../UserAlert';
import {
  calculateCartSubtotal,
  calculateCheckoutQuote,
  parseGstSettings,
  type CheckoutQuote,
  type GstSettings,
} from './checkoutTax';

type Address = {
  id: string | number;
  label: string;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  street_address: string;
  city: string;
  district?: string;
  state: string;
  country: string;
  zip_code: string;
  is_default?: boolean | number;
};
const ADDRESSES_CACHE_KEY = 'user.addresses';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type AddressDraft = Omit<Address, 'id' | 'is_default'>;

type CustomerDetails = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
};

type PaymentOrderResponse = {
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
};

type CheckoutOrder = {
  id?: string | number;
  order_id?: string | number;
};

type CheckoutOrderResponse = CheckoutOrder & {
  order?: CheckoutOrder;
};

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

function responseMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    ('message' in error || 'description' in error)
  ) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    if ('description' in error && typeof error.description === 'string') {
      return error.description;
    }
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
  keyboardType?: 'default' | 'phone-pad' | 'numeric' | 'email-address';
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
  buyNowItem?: StoreBuyNowItem | null;
  onBack: () => void;
  onOrderPlaced: () => void | Promise<void>;
};

export default function Checkout({
  items,
  buyNowItem = null,
  onBack,
  onOrderPlaced,
}: CheckoutProps) {
  const insets = useSafeAreaInsets();
  const showUserAlert = useUserAlert();
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>(
    'delivery',
  );
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay'>('cod');
  const [addresses, setAddresses] = useState<Address[]>(
    () => getCachedApiData<Address[]>(ADDRESSES_CACHE_KEY) ?? [],
  );
  const [selectedAddressId, setSelectedAddressId] = useState<
    string | number | null
  >(null);
  const [addressesLoading, setAddressesLoading] = useState(
    () => !hasCachedApiData(ADDRESSES_CACHE_KEY),
  );
  const [addressesError, setAddressesError] = useState('');
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
  });
  const [gstSettings, setGstSettings] = useState<GstSettings | null>(null);
  const [gstSettingsLoading, setGstSettingsLoading] = useState(true);
  const [gstSettingsError, setGstSettingsError] = useState('');
  const [gstSettingsLoadKey, setGstSettingsLoadKey] = useState(0);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>(emptyAddress);
  const [addressFormError, setAddressFormError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const loadAddresses = useCallback(async (forceRefresh = false) => {
    if (!hasCachedApiData(ADDRESSES_CACHE_KEY)) setAddressesLoading(true);
    if (hasCachedApiData(ADDRESSES_CACHE_KEY)) setAddressesError('');
    try {
      const data = await fetchCachedApiData(
        ADDRESSES_CACHE_KEY,
        async force => {
          const { data: responseData } = await api.get<Address[]>(
            '/users/me/addresses',
            {
              headers: force ? { 'Cache-Control': 'no-store' } : undefined,
            },
          );
          if (!Array.isArray(responseData)) {
            throw new Error('The saved-address response was invalid.');
          }
          return responseData;
        },
        forceRefresh,
      );
      setAddresses(data);
      setAddressesError('');
      const defaultAddress =
        data.find(address => Boolean(Number(address.is_default))) ?? data[0];
      if (defaultAddress) {
        setCustomerDetails(current => ({
          customer_name: current.customer_name || defaultAddress.customer_name,
          customer_email:
            current.customer_email || defaultAddress.customer_email || '',
          customer_phone:
            current.customer_phone || defaultAddress.customer_phone,
        }));
      }
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
    setGstSettingsLoading(true);
    setGstSettingsError('');
    api
      .get<unknown>('/settings/gst/public')
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
  }, [gstSettingsLoadKey]);

  const subtotal = useMemo(() => calculateCartSubtotal(items), [items]);
  const quote = useMemo<CheckoutQuote | null>(() => {
    if (!gstSettings || subtotal === null) return null;
    return calculateCheckoutQuote(subtotal, gstSettings);
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
        showUserAlert(
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
        showUserAlert(
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
        showUserAlert(
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
      const refreshedAddresses = await loadAddresses(true);
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

  const checkoutPayload = () => {
    const deliveryAddress =
      fulfillment === 'delivery'
        ? addresses.find(address => address.id === selectedAddressId)
        : undefined;

    return {
      customer_name: customerDetails.customer_name.trim(),
      customer_email: customerDetails.customer_email.trim(),
      customer_phone: customerDetails.customer_phone.trim(),
      fulfillment_type: fulfillment === 'pickup' ? 'Pickup' : 'Delivery',
      street_address: deliveryAddress?.street_address ?? '',
      city: deliveryAddress?.city ?? '',
      district: deliveryAddress?.district ?? '',
      state: deliveryAddress?.state ?? '',
      country: deliveryAddress?.country || 'India',
      zip_code: deliveryAddress?.zip_code ?? '',
      payment_method: paymentMethod === 'cod' ? 'Cash' : 'Razorpay',
      ...(buyNowItem
        ? {
            buy_now_items: buildBuyNowOrderItems(buyNowItem),
          }
        : {}),
    };
  };

  const placeOrder = async () => {
    if (!quote || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    let completedPaymentId: string | null = null;
    const payload = checkoutPayload();
    try {
      if (paymentMethod === 'cod') {
        const { data } = await api.post<CheckoutOrderResponse>(
          '/orders/checkout',
          payload,
        );
        const order = data?.order ?? data;
        const orderId = order?.order_id ?? order?.id;
        if (orderId == null) {
          throw new Error(
            'The server did not confirm the order. Please try again.',
          );
        }
        showUserAlert(
          'Order placed',
          `Your order ${order.order_id ?? `#${orderId}`} is confirmed.`,
        );
        await onOrderPlaced();
        return;
      }

      const { data: paymentOrder } = await api.post<PaymentOrderResponse>(
        '/orders/checkout/payment-order',
        payload,
      );
      if (
        !paymentOrder.key_id ||
        !paymentOrder.order_id ||
        !Number.isSafeInteger(paymentOrder.amount) ||
        paymentOrder.amount < 100 ||
        paymentOrder.currency !== 'INR'
      ) {
        throw new Error(
          'The server returned invalid Razorpay payment details.',
        );
      }

      const paymentResponse = await RazorpayCheckout.open({
        key: paymentOrder.key_id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'Q Living Furniture',
        description: 'Furniture order payment',
        order_id: paymentOrder.order_id,
        prefill: {
          name: payload.customer_name,
          email: payload.customer_email,
          contact: payload.customer_phone,
        },
        theme: { color: '#351D0E' },
      });
      completedPaymentId = paymentResponse.razorpay_payment_id;

      const { data } = await api.post<CheckoutOrderResponse>(
        '/orders/checkout/verify-payment',
        { ...payload, ...paymentResponse },
      );
      const order = data?.order ?? data;
      const orderId = order?.order_id ?? order?.id;
      if (orderId == null) {
        throw new Error(
          'The server did not confirm the paid order. Please contact support.',
        );
      }
      showUserAlert(
        'Order placed',
        `Your order ${order.order_id ?? `#${orderId}`} is confirmed.`,
      );
      await onOrderPlaced();
    } catch (error) {
      setSubmitError(
        completedPaymentId
          ? `Payment ${completedPaymentId} was received, but the order could not be confirmed: ${responseMessage(error)} Please contact support if this remains unresolved.`
          : responseMessage(error),
      );
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
      : true;
  const contactReady =
    customerDetails.customer_name.trim().length > 0 &&
    customerDetails.customer_phone.trim().length > 0;
  const orderReady =
    destinationReady &&
    contactReady &&
    quote != null &&
    !quoteLoading &&
    !quoteError &&
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

      <View className="mb-4 rounded-[18px] border border-[#F0E7DE] bg-white p-4">
        <Text className="mb-3 text-[14px] font-black text-[#351D0E]">
          Customer details
        </Text>
        <CheckoutInput
          label="Full name"
          value={customerDetails.customer_name}
          onChangeText={value =>
            setCustomerDetails(current => ({
              ...current,
              customer_name: value,
            }))
          }
          placeholder="Your name"
        />
        <CheckoutInput
          label="Phone number"
          value={customerDetails.customer_phone}
          onChangeText={value =>
            setCustomerDetails(current => ({
              ...current,
              customer_phone: value,
            }))
          }
          keyboardType="phone-pad"
          placeholder="Mobile number"
        />
        <CheckoutInput
          label="Email address (optional)"
          value={customerDetails.customer_email}
          onChangeText={value =>
            setCustomerDetails(current => ({
              ...current,
              customer_email: value,
            }))
          }
          keyboardType="email-address"
          placeholder="you@example.com"
        />
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
          ) : addressesError && addresses.length === 0 ? (
            <Text className="text-[12px] text-[#8B2D20]">{addressesError}</Text>
          ) : addresses.length === 0 ? (
            <Text className="text-[12px] leading-5 text-[#8B735E]">
              Add a delivery address to continue.
            </Text>
          ) : (
            <>
              {addressesError ? (
                <Text className="mb-2 text-[12px] text-[#8B2D20]">
                  {addressesError}
                </Text>
              ) : null}
              {addresses.map(address => {
                const selected = address.id === selectedAddressId;
                return (
                  <Pressable
                    key={address.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                    setSelectedAddressId(address.id);
                    setCustomerDetails(current => ({
                      customer_name:
                        address.customer_name || current.customer_name,
                      customer_email:
                        address.customer_email || current.customer_email,
                      customer_phone:
                        address.customer_phone || current.customer_phone,
                    }));
                  }}
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
              })}
            </>
          )}
          {addressesError ? (
            <Pressable onPress={() => loadAddresses(true)} className="mt-2 self-start">
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
          <Text className="text-[14px] font-black text-[#351D0E]">
            Store pickup
          </Text>
          <Text className="mt-2 text-[12px] leading-5 text-[#8B735E]">
            Pickup was selected. The store will share collection details after
            your order is confirmed.
          </Text>
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
                Number(item.price) * Number(item.quantity),
              )}
            </Text>
          </View>
        ))}
        <View className="mt-1 border-t border-[#F0E7DE] pt-3">
          {quoteLoading ? (
            <View className="flex-row items-center py-2">
              <ActivityIndicator size="small" color="#F97316" />
              <Text className="ml-2 text-[11px] text-[#8B735E]">
                Fetching GST settings from server…
              </Text>
            </View>
          ) : quote ? (
            <>
              <SummaryLine label="Subtotal" value={quote.subtotal} />
              <SummaryLine
                label={
                  !gstSettings?.gst_enabled
                    ? 'GST (disabled)'
                    : gstSettings.tax_mode === 'Tax Inclusive'
                    ? `GST included (${quote.gst_rate}%)`
                    : `GST (${quote.gst_rate}%)`
                }
                value={quote.gst_amount}
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
              GST is calculated using the current tax settings from the server.
            </Text>
          )}
          {quoteError ? (
            <View className="mt-3 flex-row items-center rounded-[11px] bg-red-50 px-3 py-2">
              <Text className="flex-1 text-[11px] leading-4 text-red-700">
                {quoteError}
              </Text>
              {gstSettingsError ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setGstSettingsLoadKey(current => current + 1)
                  }
                  className="ml-3 rounded-full bg-white px-3 py-2">
                  <Text className="text-[11px] font-bold text-red-700">
                    Retry
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {submitError ? (
        <View className="mb-3 rounded-[12px] bg-red-50 px-4 py-3">
          <Text className="text-[12px] text-red-700">{submitError}</Text>
        </View>
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
          GST settings are fetched from the server; order totals are confirmed when submitted
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
