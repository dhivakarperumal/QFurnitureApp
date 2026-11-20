import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  LayoutGrid,
  PackageCheck,
  RefreshCw,
  Store,
  ShoppingBag,
  Truck,
  UserRound,
  X,
  XCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';
import { mediaUrl } from '../utils';
import { formatPrice, parseImages } from '../utils';

type OrderItem = {
  product_name?: string;
  name?: string;
  image?: string | null;
  images?: string[] | string | null;
  quantity?: number | string;
  price?: number | string;
  variant_color?: string;
  variant_size?: string;
};

type Order = {
  id: number | string;
  order_id?: string;
  status?: string;
  total_amount?: number | string;
  items?: OrderItem[];
  created_at?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  fulfillment_type?: string;
  payment_method?: string;
  payment_status?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  courier_name?: string;
  tracking_number?: string;
  subtotal?: number | string;
  gst_rate?: number | string;
  gst_amount?: number | string;
  discount_amount?: number | string;
};

type OrderFilter = 'All Orders' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

const ORDER_FILTERS: { label: OrderFilter; icon: React.ElementType }[] = [
  { label: 'All Orders',  icon: LayoutGrid },
  { label: 'Processing',  icon: RefreshCw },
  { label: 'Shipped',     icon: Truck },
  { label: 'Delivered',   icon: CheckCircle2 },
  { label: 'Cancelled',   icon: XCircle },
];

function statusColor(status: string) {
  if (status === 'Delivered') return { bg: '#DCFCE7', text: '#166534' };
  if (status === 'Cancelled') return { bg: '#FEE2E2', text: '#991B1B' };
  if (status === 'Shipped' || status === 'Shipping' || status === 'Out for Delivery')
    return { bg: '#FEF3C7', text: '#92400E' };
  return { bg: '#EFF6FF', text: '#1E40AF' };
}

function orderFilterGroup(status: string): OrderFilter {
  if (status === 'Delivered' || status === 'Cancelled') return status as OrderFilter;
  if (status === 'Shipping' || status === 'Shipped' || status === 'Out for Delivery') return 'Shipped';
  return 'Processing';
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value?: number | string) {
  const amount = Number(value ?? 0);
  return `₹${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getOrderNumber(order: Order) {
  return order.order_id || `ORD${String(order.id).padStart(4, '0')}`;
}

function orderStage(status?: string) {
  const stages = ['Order Placed', 'Packing', 'Shipping', 'Out for Delivery', 'Delivered'];
  if (status === 'Cancelled') return -1;
  if (status === 'Shipped') return stages.indexOf('Shipping');
  const index = stages.indexOf(status || 'Order Placed');
  return index < 0 ? 0 : index;
}

function OrderDetailModal({
  order,
  loading,
  error,
  onClose,
  onRetry,
}: {
  order: Order | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onRetry: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!order) return null;

  const status = order.status || 'Order Placed';
  const statusStyle = statusColor(status);
  const orderNumber = getOrderNumber(order);
  const items = Array.isArray(order.items) ? order.items : [];
  const address = [
    order.street_address,
    order.city,
    order.state,
    order.zip_code,
    order.country,
  ].filter(Boolean).join(', ');
  const isPickup = order.fulfillment_type?.toLowerCase() === 'pickup';
  const stage = orderStage(status);
  const subtotal = Number(order.subtotal ?? order.total_amount ?? 0);
  const gstAmount = Number(order.gst_amount ?? 0);
  const discount = Number(order.discount_amount ?? 0);
  const paymentMethod = order.payment_method?.toLowerCase() === 'razorpay'
    ? 'Online'
    : order.payment_method || 'Payment';
  const paymentStatus = order.payment_status ||
    (order.payment_method?.toLowerCase() === 'razorpay' ? 'Paid' : '');

  return (
    <Modal
      visible
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-[#FCFAF7]">
        <View
          className="flex-row items-center justify-between border-b border-[#F0E7DE] bg-white px-4 pb-3"
          style={{ paddingTop: insets.top + 10 }}
        >
          <View>
            <Text className="text-[10px] font-bold uppercase tracking-widest text-[#B4876A]">
              Order Details
            </Text>
            <Text className="mt-0.5 text-[18px] font-black text-[#351D0E]">{orderNumber}</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: statusStyle.bg }}>
              <Text className="text-[11px] font-bold" style={{ color: statusStyle.text }}>{status}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close order details"
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-full"
            >
              <X size={20} color="#8B735E" />
            </Pressable>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="p-4"
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 40) }}
        >
          {loading ? (
            <View className="mb-3 flex-row items-center justify-center rounded-xl bg-white py-3">
              <ActivityIndicator size="small" color="#F97316" />
              <Text className="ml-2 text-[12px] text-[#8B735E]">Loading order details...</Text>
            </View>
          ) : null}
          {error ? (
            <View className="mb-3 flex-row items-center justify-between rounded-xl bg-[#FFF1F0] px-3 py-2">
              <Text className="mr-3 flex-1 text-[12px] text-[#B42318]">{error}</Text>
              <Pressable onPress={onRetry} accessibilityRole="button">
                <Text className="text-[12px] font-bold text-[#B42318]">Retry</Text>
              </Pressable>
            </View>
          ) : null}

          <View className="mb-3 flex-row items-center rounded-xl bg-[#FAF5EF] px-3 py-2.5">
            <CalendarDays size={14} color="#B94719" />
            <Text className="ml-2 text-[11px] text-[#725B49]">
              {order.created_at ? `Placed ${formatDate(order.created_at)}` : 'Order date unavailable'}
            </Text>
            <View className="mx-2 h-3 border-l border-[#E7DCCF]" />
            <CreditCard size={14} color="#B94719" />
            <Text className="ml-1.5 flex-1 text-[11px] text-[#725B49]">
              {paymentMethod}{paymentStatus ? ` · ${paymentStatus}` : ''}
            </Text>
          </View>

          <View className="mb-3 rounded-[14px] border border-[#F0E1D2] bg-white p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-[12px] font-bold text-[#351D0E]">Order tracking</Text>
              <View className="rounded-full bg-[#FFF0E1] px-2.5 py-1">
                <Text className="text-[10px] font-bold text-[#B94719]">Current: {status}</Text>
              </View>
            </View>
            <View className="mt-4 flex-row items-start">
              {['Order Placed', 'Packing', 'Shipping', 'Out for Delivery', 'Delivered'].map((step, index) => {
                const complete = stage >= index;
                const current = stage === index;
                return (
                  <React.Fragment key={step}>
                    <View className="w-[18%] items-center">
                      <View
                        className={`h-[18px] w-[18px] items-center justify-center rounded-full ${
                          complete ? 'bg-[#278246]' : 'bg-[#E7E1DA]'
                        }`}
                      >
                        {complete ? <CheckCircle2 size={17} color="white" fill="#278246" /> : null}
                      </View>
                      <Text className="mt-1.5 text-center text-[8px] text-[#725B49]">{step}</Text>
                      {current ? <Text className="mt-0.5 text-[8px] font-bold text-[#B94719]">Current</Text> : null}
                    </View>
                    {index < 4 ? (
                      <View className={`mt-[8px] h-[2px] flex-1 ${stage > index ? 'bg-[#278246]' : 'bg-[#E7E1DA]'}`} />
                    ) : null}
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          <View className="mb-3 flex-row gap-3">
            <View className="min-h-[130px] flex-1 rounded-[14px] border border-[#F0E1D2] bg-white p-3">
              <View className="mb-2 flex-row items-center">
                <View className="mr-2 h-7 w-7 items-center justify-center rounded-lg bg-[#FFF0E1]">
                  <UserRound size={15} color="#B94719" />
                </View>
                <Text className="text-[11px] font-bold text-[#351D0E]">Customer details</Text>
              </View>
              <Text className="mt-1 text-[10px] text-[#8B735E]">Full name</Text>
              <Text className="text-[11px] text-[#351D0E]">{order.customer_name || 'Unavailable'}</Text>
              <Text className="mt-1 text-[10px] text-[#8B735E]">Email address</Text>
              <Text className="text-[11px] text-[#351D0E]">{order.customer_email || 'Unavailable'}</Text>
              <Text className="mt-1 text-[10px] text-[#8B735E]">Phone number</Text>
              <Text className="text-[11px] text-[#351D0E]">{order.customer_phone || 'Unavailable'}</Text>
            </View>
            <View className="min-h-[130px] flex-1 rounded-[14px] border border-[#F0E1D2] bg-white p-3">
              <View className="mb-2 flex-row items-center">
                <View className="mr-2 h-7 w-7 items-center justify-center rounded-lg bg-[#FFF0E1]">
                  <Store size={15} color="#B94719" />
                </View>
                <Text className="text-[11px] font-bold text-[#351D0E]">{isPickup ? 'Pickup' : 'Delivery'}</Text>
              </View>
              <Text className="text-[11px] leading-4 text-[#8B735E]">
                {isPickup
                  ? 'Pickup was selected. Collection details will be shared by the store.'
                  : address || 'Delivery address unavailable.'}
              </Text>
            </View>
          </View>

          <View className="mb-3 rounded-[14px] border border-[#F0E1D2] bg-white p-3">
            <View className="mb-2 flex-row items-center">
              <View className="mr-2 h-7 w-7 items-center justify-center rounded-lg bg-[#FFF0E1]">
                <PackageCheck size={15} color="#B94719" />
              </View>
              <Text className="text-[11px] font-bold text-[#351D0E]">Items ({items.length})</Text>
            </View>
            {items.length ? items.map((item, index) => {
              const image = item.image || parseImages(item.images)[0];
              const quantity = Number(item.quantity ?? 1);
              const price = Number(item.price ?? 0);
              return (
                <View key={`${item.product_name || item.name || 'item'}-${index}`} className="flex-row items-center border-t border-[#F7EDE4] py-2.5">
                  <View className="mr-3 h-[54px] w-[54px] items-center justify-center overflow-hidden rounded-[10px] bg-[#F8F1EA]">
                    {image ? (
                      <Image source={{ uri: mediaUrl(image) }} className="h-full w-full" resizeMode="cover" />
                    ) : (
                      <PackageCheck size={22} color="#C0A99A" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text numberOfLines={2} className="text-[11px] font-bold text-[#351D0E]">
                      {item.product_name || item.name || 'Furniture item'}
                    </Text>
                    <Text className="mt-1 text-[9px] text-[#8B735E]">
                      Qty {quantity}{Number.isFinite(price) && price ? ` · ${formatCurrency(price)} each` : ''}
                      {item.variant_color ? ` · ${item.variant_color}` : ''}
                      {item.variant_size ? ` · ${item.variant_size}` : ''}
                    </Text>
                  </View>
                  <Text className="ml-2 text-[11px] font-black text-[#351D0E]">
                    {formatCurrency((Number.isFinite(price) ? price : 0) * (Number.isFinite(quantity) ? quantity : 1))}
                  </Text>
                </View>
              );
            }) : (
              <Text className="py-3 text-center text-[11px] text-[#8B735E]">No item details available.</Text>
            )}
          </View>

          <View className="flex-row gap-3">
            <View className="min-h-[115px] flex-1 rounded-[14px] border border-[#F0E1D2] bg-white p-3">
              <View className="mb-2 flex-row items-center">
                <View className="mr-2 h-7 w-7 items-center justify-center rounded-lg bg-[#FFF0E1]">
                  <Truck size={15} color="#B94719" />
                </View>
                <Text className="text-[11px] font-bold text-[#351D0E]">Shipment details</Text>
              </View>
              <Text className="mt-1 text-[10px] text-[#8B735E]">Courier</Text>
              <Text className="text-[11px] text-[#351D0E]">{order.courier_name || 'Not available'}</Text>
              <Text className="mt-1 text-[10px] text-[#8B735E]">Tracking number</Text>
              <Text className="text-[11px] text-[#351D0E]">{order.tracking_number || 'Not available'}</Text>
            </View>
            <View className="min-h-[115px] flex-1 rounded-[14px] border border-[#F0E1D2] bg-white p-3">
              <View className="mb-2 flex-row items-center">
                <View className="mr-2 h-7 w-7 items-center justify-center rounded-lg bg-[#FFF0E1]">
                  <CreditCard size={15} color="#B94719" />
                </View>
                <Text className="text-[11px] font-bold text-[#351D0E]">Payment summary</Text>
              </View>
              <View className="mt-1 flex-row justify-between">
                <Text className="text-[10px] text-[#725B49]">Subtotal</Text>
                <Text className="text-[10px] text-[#351D0E]">{formatCurrency(subtotal)}</Text>
              </View>
              <View className="mt-1 flex-row justify-between">
                <Text className="text-[10px] text-[#725B49]">GST ({Number(order.gst_rate ?? 0)}%)</Text>
                <Text className="text-[10px] text-[#351D0E]">{formatCurrency(gstAmount)}</Text>
              </View>
              {discount > 0 ? (
                <View className="mt-1 flex-row justify-between">
                  <Text className="text-[10px] text-[#725B49]">Discount</Text>
                  <Text className="text-[10px] text-[#351D0E]">-{formatCurrency(discount)}</Text>
                </View>
              ) : null}
              <View className="mt-2 flex-row justify-between border-t border-[#F0E1D2] pt-2">
                <Text className="text-[11px] font-black text-[#351D0E]">Order total</Text>
                <Text className="text-[11px] font-black text-[#351D0E]">{formatCurrency(order.total_amount)}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

type OrdersScreenProps = {
  onBack: () => void;
};

export default function OrdersScreen({ onBack: _onBack }: OrdersScreenProps) {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<OrderFilter>('All Orders');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [orderDetailsError, setOrderDetailsError] = useState('');
  const [orderDetailsRetry, setOrderDetailsRetry] = useState(0);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/orders/mine');
      if (!Array.isArray(data)) throw new Error('Invalid response');
      setOrders(data);
    } catch (err) {
      setError('Could not load your orders. Please try again.');
      if (__DEV__) console.warn('[OrdersScreen] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadOrders();
    } finally {
      setRefreshing(false);
    }
  }, [loadOrders]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const selectedOrderId = selectedOrder?.id;
  useEffect(() => {
    if (selectedOrderId === undefined) return;
    let active = true;
    setOrderDetailsLoading(true);
    setOrderDetailsError('');
    api.get<Order>(`/orders/${selectedOrderId}`).then(({ data }) => {
      if (active) {
        setSelectedOrder(current =>
          current?.id === selectedOrderId ? { ...current, ...data } : current,
        );
      }
    }).catch(err => {
      if (active) {
        setOrderDetailsError('Could not load the latest order details.');
        if (__DEV__) console.warn('[OrdersScreen] Order details error:', err);
      }
    }).finally(() => {
      if (active) setOrderDetailsLoading(false);
    });
    return () => { active = false; };
  }, [selectedOrderId, orderDetailsRetry]);

  const orderCounts = useMemo(() => {
    const counts: Record<OrderFilter, number> = {
      'All Orders': orders.length,
      Processing: 0,
      Shipped: 0,
      Delivered: 0,
      Cancelled: 0,
    };
    orders.forEach(order => {
      const group = orderFilterGroup(order.status || '');
      counts[group] += 1;
    });
    return counts;
  }, [orders]);

  const visibleOrders = useMemo(
    () =>
      filter === 'All Orders'
        ? orders
        : orders.filter(o => orderFilterGroup(o.status || '') === filter),
    [orders, filter],
  );

  return (
    <View className="flex-1 bg-[#FCFAF7]">
      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="border-b border-[#F0E7DE] bg-white"
        contentContainerClassName="px-4 py-3 gap-2"
      >
        {ORDER_FILTERS.map(({ label, icon: Icon }) => {
          const active = filter === label;
          return (
            <Pressable
              key={label}
              onPress={() => setFilter(label)}
              className={`flex-row items-center rounded-full px-3 py-2 ${
                active ? 'bg-[#F97316]' : 'bg-[#F4EDE6]'
              }`}
            >
              <Icon size={13} color={active ? 'white' : '#8B735E'} />
              <Text className={`ml-1.5 text-[12px] font-bold ${active ? 'text-white' : 'text-[#5B4839]'}`}>
                {label}
                {orderCounts[label] > 0 ? ` (${orderCounts[label]})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[14px] text-red-700">{error}</Text>
          <Pressable onPress={loadOrders} className="mt-4 rounded-full bg-[#F97316] px-5 py-3">
            <Text className="text-[13px] font-bold text-white">Try Again</Text>
          </Pressable>
        </View>
      ) : orders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-[#FFF0E1]">
            <ShoppingBag size={32} color="#F97316" />
          </View>
          <Text className="mt-4 text-[16px] font-bold text-[#351D0E]">No orders yet</Text>
          <Text className="mt-2 text-center text-[13px] text-[#8B735E]">
            Your furniture orders will appear here.
          </Text>
        </View>
      ) : visibleOrders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <PackageCheck size={36} color="#C0A99A" />
          <Text className="mt-4 text-[15px] font-bold text-[#351D0E]">
            No {filter.toLowerCase()} orders
          </Text>
          <Text className="mt-1 text-center text-[13px] text-[#8B735E]">
            Choose another filter to see more orders.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-4 py-4" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 65, 100) }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#F97316']}
              tintColor="#F97316"
            />
          }>
          {visibleOrders.map(order => {
            const firstItem = Array.isArray(order.items) ? order.items[0] : null;
            const status = order.status || 'Order Placed';
            const orderNumber =
              order.order_id || `ORD${String(order.id).padStart(4, '0')}`;
            const { bg, text } = statusColor(status);
            const imgUri = firstItem?.image ? mediaUrl(firstItem.image) : undefined;
            const amount = Number(order.total_amount ?? 0);

            return (
              <Pressable
                key={orderNumber}
                accessibilityRole="button"
                accessibilityLabel={`View details for order ${orderNumber}`}
                onPress={() => setSelectedOrder(order)}
                className="mb-3 overflow-hidden rounded-[18px] border border-[#F0E7DE] bg-white shadow-sm"
              >
                <View className="flex-row p-4 gap-3">
                  {/* Product image */}
                  <View className="h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[12px] bg-[#F4EDE6]">
                    {imgUri ? (
                      <Image source={{ uri: imgUri }} className="h-full w-full" resizeMode="cover" />
                    ) : (
                      <PackageCheck size={28} color="#C0A99A" />
                    )}
                  </View>

                  {/* Info */}
                  <View className="flex-1">
                    {/* Status badge */}
                    <View
                      className="mb-1.5 self-start rounded-full px-2.5 py-1"
                      style={{ backgroundColor: bg }}
                    >
                      <Text className="text-[11px] font-bold" style={{ color: text }}>
                        {status}
                      </Text>
                    </View>
                    <Text numberOfLines={2} className="text-[14px] font-bold text-[#351D0E]">
                      {firstItem?.product_name || firstItem?.name || 'Furniture order'}
                      {Number(firstItem?.quantity) > 1 ? ` × ${firstItem!.quantity}` : ''}
                    </Text>
                    {Array.isArray(order.items) && order.items.length > 1 && (
                      <Text className="mt-0.5 text-[12px] text-[#8B735E]">
                        + {order.items.length - 1} more item(s)
                      </Text>
                    )}
                  </View>
                </View>

                {/* Footer */}
                <View className="flex-row items-center justify-between border-t border-[#F0E7DE] bg-[#FAF5EF] px-4 py-3">
                  <Text className="text-[12px] text-[#8B735E]">{orderNumber}</Text>
                  <View className="flex-row items-center gap-3">
                    {order.created_at ? (
                      <Text className="text-[12px] text-[#8B735E]">
                        {formatDate(order.created_at)}
                      </Text>
                    ) : null}
                    <Text className="text-[14px] font-black text-[#351D0E]">
                      Qty: {firstItem?.quantity ?? 1} · {formatPrice(amount)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <OrderDetailModal
        order={selectedOrder}
        loading={orderDetailsLoading}
        error={orderDetailsError}
        onClose={() => {
          setSelectedOrder(null);
          setOrderDetailsError('');
        }}
        onRetry={() => setOrderDetailsRetry(retry => retry + 1)}
      />
    </View>
  );
}
