import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  CheckCircle2,
  LayoutGrid,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Truck,
  XCircle,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';
import { mediaUrl } from '../utils';
import { formatPrice } from '../utils';

type OrderItem = {
  product_name?: string;
  name?: string;
  image?: string | null;
  quantity?: number;
};

type Order = {
  id: number | string;
  order_id?: string;
  status?: string;
  total_amount?: number | string;
  items?: OrderItem[];
  created_at?: string;
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

type OrdersScreenProps = {
  onBack: () => void;
};

export default function OrdersScreen({ onBack }: OrdersScreenProps) {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<OrderFilter>('All Orders');

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

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-4 py-4" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 65, 100) }}>
          {visibleOrders.map(order => {
            const firstItem = Array.isArray(order.items) ? order.items[0] : null;
            const status = order.status || 'Order Placed';
            const orderNumber =
              order.order_id || `ORD${String(order.id).padStart(4, '0')}`;
            const { bg, text } = statusColor(status);
            const imgUri = firstItem?.image ? mediaUrl(firstItem.image) : undefined;
            const amount = Number(order.total_amount ?? 0);

            return (
              <View
                key={orderNumber}
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
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
