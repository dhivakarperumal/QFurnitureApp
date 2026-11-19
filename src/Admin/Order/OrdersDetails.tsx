import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../api';
import TopHeader from '../Navigation/TopHeader';
import type { Order } from './Orders';

type ComboComponent = {
  product_id?: number | string;
  product_name?: string;
  quantity?: number | string;
  variant_color?: string;
  variant_size?: string;
};

type OrderItem = {
  id?: number | string;
  item_type?: string;
  product_name?: string;
  quantity?: number | string;
  price?: number | string;
  variant_color?: string;
  variant_size?: string;
  image?: string;
  images?: string[] | string;
  variants?: Array<{ images?: string[] | string }>;
  combo_items?: ComboComponent[];
};

type OrderDetails = Omit<Order, 'items'> & {
  customer_phone?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  subtotal?: number | string;
  gst_rate?: number | string;
  gst_amount?: number | string;
  discount_amount?: number | string;
  discount_type?: string;
  discount_value?: number | string;
  tracking_number?: string;
  courier_name?: string;
  cancellation_reason?: string;
  items?: OrderItem[];
};

type Props = {
  order: Order;
  onBack: () => void;
};

const formatId = (order: OrderDetails) =>
  order.order_id || `ORD${String(order.id).padStart(4, '0')}`;

const toNumber = (value?: number | string) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatCurrency = (value?: number | string) =>
  `₹${toNumber(value).toLocaleString('en-IN')}`;

const formatDate = (value?: string) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString('en-IN');
};

const resolveImage = (value?: string) => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value) || /^data:/i.test(value)) return value;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  const clean = value.replace(/\\/g, '/');
  return `${origin}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const getImage = (item?: OrderItem) => {
  if (!item) return undefined;
  let value = item.image;
  if (!value && item.images) {
    try {
      const images = typeof item.images === 'string'
        ? JSON.parse(item.images)
        : item.images;
      value = Array.isArray(images) ? images[0] : undefined;
    } catch {
      value = undefined;
    }
  }
  if (!value) {
    const images = item.variants?.[0]?.images;
    try {
      const list = typeof images === 'string' ? JSON.parse(images) : images;
      value = Array.isArray(list) ? list[0] : undefined;
    } catch {
      value = undefined;
    }
  }
  return resolveImage(value);
};

const statusStyles: Record<string, { background: string; color: string }> = {
  'Order Placed': { background: '#DBEAFE', color: '#1D4ED8' },
  Packing: { background: '#E0E7FF', color: '#4338CA' },
  Shipping: { background: '#FEF3C7', color: '#B45309' },
  'Out for Delivery': { background: '#CFFAFE', color: '#0E7490' },
  Delivered: { background: '#DCFCE7', color: '#15803D' },
  Cancelled: { background: '#FFE4E6', color: '#BE123C' },
  Processing: { background: '#E0E7FF', color: '#4338CA' },
  Shipped: { background: '#FEF3C7', color: '#B45309' },
  New: { background: '#F1F5F9', color: '#64748B' },
};

export default function OrdersDetails({ order, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [details, setDetails] = useState<OrderDetails>(order as OrderDetails);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>(order.status || 'New');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierName, setCourierName] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const response = await api.get<OrderDetails>(`/orders/${order.id}`);
        if (!mounted) return;
        setDetails(response.data);
        setSelectedStatus(response.data.status || 'New');
        setTrackingNumber(response.data.tracking_number || '');
        setCourierName(response.data.courier_name || '');
        setCancellationReason(response.data.cancellation_reason || '');
      } catch (error) {
        if (__DEV__) console.warn('[OrdersDetails] Could not load order:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchDetails();
    return () => { mounted = false; };
  }, [order.id]);

  const items = Array.isArray(details.items) ? details.items : [];
  const subtotal = toNumber(details.subtotal ?? details.total_amount);
  const gstAmount = toNumber(details.gst_amount);
  const discountAmount = toNumber(details.discount_amount);
  const statusStyle =
    statusStyles[details.status || 'New'] || statusStyles.New;

  const updateStatus = async () => {
    if (selectedStatus === 'Shipping' &&
      (!trackingNumber.trim() || !courierName.trim())) return;
    if (selectedStatus === 'Cancelled' && !cancellationReason.trim()) return;
    setSaving(true);
    try {
      await api.put(`/orders/${details.id}/status`, {
        status: selectedStatus,
        ...(selectedStatus === 'Shipping'
          ? { tracking_number: trackingNumber.trim(), courier_name: courierName.trim() }
          : {}),
        ...(selectedStatus === 'Cancelled'
          ? { cancellation_reason: cancellationReason.trim(), cancelled_at: new Date().toISOString() }
          : {}),
      });
      setDetails(current => ({
        ...current,
        status: selectedStatus as Order['status'],
      }));
    } catch (error) {
      if (__DEV__) console.warn('[OrdersDetails] Status update failed:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <TopHeader
        pageTitle={`Order ${formatId(details)}`}
        pageSubtitle={formatDate(details.created_at)}
        onBackPress={onBack}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-[255px]"
        style={{ paddingTop: insets.top + 72 }}>
        {loading ? (
          <View className="h-[80px] items-center justify-center">
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : null}

        <View className="mb-4 flex-row items-center justify-between rounded-[18px] bg-white p-4">
          <View>
            <Text className="text-[10px] font-bold uppercase text-[#94A3B8]">Status</Text>
            <View className="mt-2 rounded-full px-3 py-1.5" style={{ backgroundColor: statusStyle.background }}>
              <Text className="text-[10px] font-black" style={{ color: statusStyle.color }}>
                {details.status || 'New'}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-[10px] font-bold uppercase text-[#94A3B8]">Total</Text>
            <Text className="mt-1 text-[22px] font-black text-[#17191C]">
              {formatCurrency(details.total_amount)}
            </Text>
          </View>
        </View>

        <View className="mb-4 rounded-[18px] bg-white p-4">
          <Text className="mb-3 text-[13px] font-black text-[#17191C]">Customer</Text>
          {[
            ['Name', details.customer_name || 'Guest Customer'],
            ['Email', details.customer_email || 'Unavailable'],
            ['Phone', details.customer_phone || 'Unavailable'],
            ['Address', [details.street_address, details.city, details.state, details.zip_code, details.country].filter(Boolean).join(', ') || 'Unavailable'],
          ].map(([label, value]) => (
            <View key={label} className="flex-row justify-between border-b border-[#F1F5F9] py-3">
              <Text className="text-[11px] font-semibold text-[#94A3B8]">{label}</Text>
              <Text className="ml-4 max-w-[65%] text-right text-[11px] font-bold text-[#334155]">{value}</Text>
            </View>
          ))}
        </View>

        <View className="mb-4 rounded-[18px] bg-white p-4">
          <Text className="mb-3 text-[13px] font-black text-[#17191C]">Manifest Items</Text>
          {items.length ? items.map((item, index) => {
            const quantity = toNumber(item.quantity ?? 1);
            const price = toNumber(item.price);
            const imageUri = getImage(item);
            return (
              <View key={item.id || index} className="mb-3 rounded-[14px] border border-[#F1F5F9] p-3">
                <View className="flex-row">
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} className="mr-3 h-[68px] w-[68px] rounded-[10px]" resizeMode="cover" />
                  ) : (
                    <View className="mr-3 h-[68px] w-[68px] items-center justify-center rounded-[10px] bg-[#FFF7ED]">
                      <Text className="text-[18px] font-black text-[#F97316]">P</Text>
                    </View>
                  )}
                  <View className="flex-1 justify-center">
                    <Text className="text-[13px] font-black text-[#17191C]">{item.product_name || 'Product'}</Text>
                    {item.variant_size ? <Text className="mt-1 text-[10px] text-[#64748B]">Size: {item.variant_size}</Text> : null}
                    {item.variant_color ? <Text className="mt-1 text-[10px] text-[#64748B]">Color: {item.variant_color}</Text> : null}
                    <Text className="mt-1 text-[10px] text-[#64748B]">Qty: {quantity}</Text>
                  </View>
                  <Text className="text-[13px] font-black text-[#F97316]">
                    {formatCurrency(quantity * price)}
                  </Text>
                </View>
                {item.item_type === 'combo' && item.combo_items?.length ? (
                  <View className="mt-3 rounded-[10px] bg-[#FFF7ED] p-3">
                    <Text className="mb-2 text-[9px] font-black uppercase text-[#C2410C]">Included Products</Text>
                    {item.combo_items.map((component, componentIndex) => (
                      <View key={`${component.product_id}-${componentIndex}`} className="mb-2 flex-row justify-between">
                        <Text className="mr-2 flex-1 text-[11px] text-[#334155]">
                          {component.product_name || `Product #${component.product_id}`}
                        </Text>
                        <Text className="text-[11px] font-bold text-[#C2410C]">
                          Qty: {toNumber(component.quantity || 1) * quantity}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          }) : (
            <Text className="py-4 text-center text-[12px] text-[#94A3B8]">No item details available.</Text>
          )}

          <View className="mt-2 border-t border-[#F1F5F9] pt-3">
            {[
              ['Subtotal', subtotal],
              [`GST (${toNumber(details.gst_rate)}%)`, gstAmount],
              [details.discount_type === 'percentage'
                ? `Discount (${toNumber(details.discount_value)}%)`
                : 'Discount', discountAmount],
              ['Shipping', 0],
              ['Total', details.total_amount],
            ].map(([label, value]) => (
              <View key={String(label)} className="mt-2 flex-row justify-between">
                <Text className="text-[11px] font-semibold text-[#64748B]">{label}</Text>
                <Text className="text-[12px] font-black text-[#17191C]">
                  {formatCurrency(value as number)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View className="mb-4 rounded-[18px] bg-[#17191C] p-4">
          <Text className="mb-3 text-[13px] font-black text-white">Update Order Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            {['Order Placed', 'Packing', 'Shipping', 'Out for Delivery', 'Delivered', 'Cancelled'].map(status => (
              <Pressable
                key={status}
                onPress={() => setSelectedStatus(status)}
                className="mr-2 rounded-full border px-3 py-2"
                style={{
                  borderColor: selectedStatus === status ? '#F97316' : '#475569',
                  backgroundColor: selectedStatus === status ? '#F97316' : 'transparent',
                }}>
                <Text className="text-[10px] font-bold text-white">{status}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {selectedStatus === 'Shipping' ? (
            <>
              <TextInput value={trackingNumber} onChangeText={setTrackingNumber} placeholder="Tracking / AWB number" placeholderTextColor="#94A3B8" className="mb-3 h-[48px] rounded-[12px] border border-white/20 bg-white/10 px-4 text-[12px] text-white" />
              <TextInput value={courierName} onChangeText={setCourierName} placeholder="Courier name" placeholderTextColor="#94A3B8" className="mb-3 h-[48px] rounded-[12px] border border-white/20 bg-white/10 px-4 text-[12px] text-white" />
            </>
          ) : null}
          {selectedStatus === 'Cancelled' ? (
            <TextInput value={cancellationReason} onChangeText={setCancellationReason} placeholder="Cancellation reason" placeholderTextColor="#94A3B8" multiline className="mb-3 min-h-[76px] rounded-[12px] border border-white/20 bg-white/10 px-4 py-3 text-[12px] text-white" />
          ) : null}
          <Pressable onPress={updateStatus} disabled={saving} className="h-[48px] items-center justify-center rounded-[12px] bg-[#F97316]">
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-[12px] font-black text-white">Update Status</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
