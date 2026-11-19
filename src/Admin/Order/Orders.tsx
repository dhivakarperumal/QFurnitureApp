import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChevronDown, Eye, Printer, X } from 'lucide-react-native';
import RNPrint from 'react-native-print';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { invalidateApiResponseCache } from '../../api';

type OrderStatus =
  | 'Order Placed'
  | 'Packing'
  | 'Shipping'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Processing'
  | 'New'
  | 'Shipped';

type OrderItem = {
  item_type?: string;
  combo_id?: number | string | null;
  product_id?: number | string | null;
  product_name?: string;
  quantity?: number | string;
  price?: number | string;
};

export type Order = {
  id: number | string;
  order_id?: string;
  status?: OrderStatus;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  user_id?: string;
  total_amount?: number | string;
  payment_method?: string;
  created_at?: string;
  updated_at?: string;
  items?: OrderItem[];
};

type OrdersProps = {
  statusFilter?: 'All' | OrderStatus;
  onOrderPress?: (order: Order) => void;
  onScrollVisibilityChange?: (visible: boolean) => void;
};

type UpdateModalData = {
  order: Order;
  status: string;
  tracking: string;
  courier: string;
  reason: string;
};

const orderStatuses: Array<'All' | OrderStatus> = [
  'All',
  'Order Placed',
  'Packing',
  'Shipping',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

const statusColors: Record<string, { background: string; color: string }> = {
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

function getAvailableStatuses(currentStatus: OrderStatus): OrderStatus[] {
  const flow: OrderStatus[] = [
    'Order Placed',
    'Packing',
    'Shipping',
    'Out for Delivery',
    'Delivered',
  ];
  const currentIndex = flow.indexOf(currentStatus);
  return currentIndex === -1
    ? [currentStatus, ...flow, 'Cancelled']
    : [
        ...flow.slice(currentIndex),
        ...(currentIndex < 2 ? ['Cancelled' as const] : []),
      ];
}

function formatOrderId(order: Order) {
  return order.order_id || `ORD${String(order.id).padStart(4, '0')}`;
}

function getOrderType(order: Order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const hasCombos = items.some(
    item => item.item_type === 'combo' || item.combo_id != null,
  );
  const hasProducts = items.some(
    item =>
      item.item_type !== 'combo' &&
      item.combo_id == null &&
      item.product_id != null,
  );
  if (hasCombos && hasProducts) return 'Mixed';
  if (hasCombos) return 'Combo';
  if (hasProducts) return 'Single';
  return 'Unknown';
}

function formatDate(value?: string) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value?: string | number) {
  const amount = Number(value);
  return `₹${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-IN')}`;
}

const toNumber = (value?: string | number) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

export default function Orders({
  statusFilter = 'All',
  onOrderPress,
  onScrollVisibilityChange,
}: OrdersProps) {
  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);
  const hasLoadedOrders = useRef(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatus, setActiveStatus] = useState<'All' | OrderStatus>(
    statusFilter,
  );
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [currentPage, setCurrentPage] = useState(1);
  const [updateModal, setUpdateModal] = useState<UpdateModalData | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
      invalidateApiResponseCache();
    } else if (!hasLoadedOrders.current) {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const response = await api.get('/orders', {
        params: { status: activeStatus },
      });
      if (!Array.isArray(response.data)) {
        throw new Error('The orders response was not a list.');
      }
      setOrders(response.data);
      hasLoadedOrders.current = true;
    } catch (error) {
      console.error('Fetch Orders Error:', error);
      setLoadError('Could not load orders. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setActiveStatus(statusFilter);
  }, [statusFilter]);

  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return orders.filter(order => {
      if (!search) return true;
      return [
        formatOrderId(order),
        order.customer_name,
        order.customer_email,
        order.customer_phone,
        order.user_id,
        String(order.id),
      ].some(value => value?.toLowerCase().includes(search));
    });
  }, [orders, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / 10));
  const pageOrders = filteredOrders.slice((currentPage - 1) * 10, currentPage * 10);
  const summaryStats = [
    {
      label: 'Total Orders',
      value: filteredOrders.length,
      note: activeStatus === 'Order Placed' ? 'Placed today' : 'Orders placed',
      icon: '▤',
      color: '#F59E0B',
    },
    {
      label: 'Confirmed',
      value: orders.filter(order =>
        ['Order Placed', 'Processing', 'New'].includes(order.status || ''),
      ).length,
      note: 'Awaiting fulfilment',
      icon: '✓',
      color: '#10B981',
    },
    
    {
      label: 'Delivered',
      value: orders.filter(order => order.status === 'Delivered').length,
      note: 'Successfully delivered',
      icon: '✓',
      color: '#F59E0B',
    },
    {
      label: 'Cancelled',
      value: orders.filter(order => order.status === 'Cancelled').length,
      note: 'Cancelled orders',
      icon: '×',
      color: '#EF4444',
    },
  ];

  const openStatusUpdate = (order: Order, status: string) => {
    setUpdateModal({
      order,
      status,
      tracking: '',
      courier: '',
      reason: '',
    });
  };

  const performStatusUpdate = async (
    order: Order,
    updateData: Record<string, string>,
  ) => {
    setSavingStatus(true);
    try {
      await api.put(`/orders/${order.id}/status`, updateData);
      setUpdateModal(null);
      await fetchOrders();
    } catch (error) {
      console.error('Status Sync Error:', error);
      setLoadError('Could not update order status. Please try again.');
    } finally {
      setSavingStatus(false);
    }
  };

  const submitStatusUpdate = () => {
    if (!updateModal || savingStatus) return;
    const { order, status, tracking, courier, reason } = updateModal;
    if (status === (order.status || 'New')) return;
    const updateData: Record<string, string> = { status };
    if (status === 'Shipping') {
      if (!tracking.trim() || !courier.trim()) {
        Alert.alert(
          'Shipping details required',
          'Enter both a tracking number and courier name.',
        );
        return;
      }
      updateData.tracking_number = tracking.trim();
      updateData.courier_name = courier.trim();
      updateData.shipped_at = new Date().toISOString();
    } else if (status === 'Cancelled') {
      if (!reason.trim()) {
        Alert.alert('Reason required', 'Please enter a cancellation reason.');
        return;
      }
      updateData.cancellation_reason = reason.trim();
      updateData.cancelled_at = new Date().toISOString();
    }
    setLoadError(null);
    performStatusUpdate(order, updateData);
  };

  const openOrder = (order: Order) => {
    if (onOrderPress) {
      onOrderPress(order);
    } else {
      setSelectedOrder(order);
    }
  };

  const printOrder = async (order: Order) => {
    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #17191C; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #F97316; padding-bottom: 16px; }
            .title { font-size: 28px; font-weight: bold; color: #F97316; }
            .section { margin-top: 24px; }
            .grid { display: flex; justify-content: space-between; gap: 24px; }
            .box { width: 48%; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { background: #FFF7ED; color: #9A3412; font-size: 12px; }
            th, td { border: 1px solid #E2E8F0; padding: 10px; text-align: left; }
            .total { margin-top: 20px; text-align: right; font-size: 18px; font-weight: bold; }
            .muted { color: #64748B; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Q Furnitures</div>
              <div class="muted">Tax Invoice</div>
            </div>
            <div style="text-align:right">
              <strong>${formatOrderId(order)}</strong>
              <div class="muted">${formatDate(order.created_at)}</div>
            </div>
          </div>
          <div class="section grid">
            <div class="box">
              <strong>Customer</strong>
              <p>${order.customer_name || 'Guest Customer'}<br/>${order.customer_phone || 'Unavailable'}<br/>${order.customer_email || 'Unavailable'}</p>
            </div>
            <div class="box" style="text-align:right">
              <strong>Order Details</strong>
              <p>Status: ${order.status || 'New'}<br/>Payment: ${order.payment_method || 'Not specified'}</p>
            </div>
          </div>
          <div class="section">
            <strong>Order Items</strong>
            <table>
              <thead>
                <tr><th>#</th><th>Product</th><th>Quantity</th><th>Amount</th></tr>
              </thead>
              <tbody>
                ${(order.items || []).map((item, index) =>
                  `<tr><td>${index + 1}</td><td>${item.product_name || 'Product'}</td><td>${item.quantity || 1}</td><td>${formatCurrency(toNumber(item.quantity || 1) * toNumber(item.price))}</td></tr>`
                ).join('') || '<tr><td colspan="4">No item details available</td></tr>'}
              </tbody>
            </table>
          </div>
          <div class="total">Total: ${formatCurrency(order.total_amount)}</div>
          <p class="muted" style="margin-top:40px;text-align:center">Thank you for shopping with Q Furnitures</p>
        </body>
      </html>
    `;
    try {
      await RNPrint.print({ html });
    } catch (error) {
      console.error('Print/share invoice error:', error);
    }
  };

  const renderStatusButton = (order: Order) => {
    const currentStatus = order.status || 'New';
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Update status for ${formatOrderId(order)}. Current status ${currentStatus}`}
        onPress={() => openStatusUpdate(order, currentStatus)}
        className="mr-2 h-[44px] flex-1 flex-row items-center justify-center rounded-[13px] bg-[#FFF1E6] px-2">
        <Text className="mr-1 text-[10px] font-bold text-[#C2410C]">
          Update
        </Text>
        <ChevronDown size={14} color="#C2410C" />
      </Pressable>
    );
  };

  const renderOrderCard = (order: Order) => {
    const customer = order.customer_name || 'Guest Customer';
    const payment = order.payment_method || 'Not specified';
    const statusColor = statusColors[order.status || 'New'] || statusColors.New;
    const itemCount = Array.isArray(order.items) ? order.items.length : 0;
    const customerInitial = customer.trim().charAt(0).toUpperCase() || 'G';

    return (
      <View
        key={order.id}
        className="mb-4 overflow-hidden rounded-[22px] border border-[#E9E4DC] bg-white shadow-sm elevation-[3]">
        <View className="h-[4px]" style={{ backgroundColor: statusColor.color }} />
        <View className="p-4">
          <View className="mb-4 flex-row items-start justify-between">
            <Pressable
              accessibilityRole="button"
              onPress={() => openOrder(order)}
              className="flex-1 flex-row items-center">
              <View className="mr-3 h-[42px] w-[42px] items-center justify-center rounded-[13px] bg-[#FFF3E8]">
                <Text className="text-[19px] font-black text-[#C2410C]">#</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[9px] font-bold uppercase tracking-[1.4px] text-[#94A3B8]">
                  Order
                </Text>
                <Text className="mt-0.5 text-[14px] font-black text-[#17191C]">
                  {formatOrderId(order)}
                </Text>
                <Text className="mt-0.5 text-[10px] text-[#64748B]">
                  {formatDate(order.created_at)}
                </Text>
              </View>
            </Pressable>
            <View
              className="ml-2 flex-row items-center rounded-full px-3 py-2"
              style={{ backgroundColor: statusColor.background }}>
              <View
                className="mr-1.5 h-[6px] w-[6px] rounded-full"
                style={{ backgroundColor: statusColor.color }}
              />
              <Text
                className="text-[9px] font-bold"
                style={{ color: statusColor.color }}>
                {order.status || 'New'}
              </Text>
            </View>
          </View>

          <View className="mb-4 h-px bg-[#F1F0ED]" />

          <Pressable
            accessibilityRole="button"
            onPress={() => openOrder(order)}
            className="mb-4 flex-row items-center">
            <View className="mr-3 h-[46px] w-[46px] items-center justify-center rounded-full bg-[#FFF1D6]">
              <Text className="text-[16px] font-black text-[#B45309]">
                {customerInitial}
              </Text>
            </View>
            <View className="mr-2 flex-1">
              <Text
                numberOfLines={1}
                className="text-[13px] font-bold text-[#17191C]">
                {customer}
              </Text>
              <Text
                numberOfLines={1}
                className="mt-1 text-[10px] text-[#64748B]">
                {order.customer_phone ||
                  order.customer_email ||
                  'Contact unavailable'}
              </Text>
            </View>
            <View className="items-end rounded-[13px] bg-[#FFF7ED] px-3 py-2">
              <Text className="text-[8px] font-bold uppercase tracking-[1px] text-[#C2410C]">
                Total
              </Text>
              <Text className="mt-0.5 text-[14px] font-black text-[#9A3412]">
                {formatCurrency(order.total_amount)}
              </Text>
            </View>
          </Pressable>

          <View className="mb-4 flex-row">
            <View className="mr-2 flex-1 rounded-[13px] bg-[#F8FAFC] px-3 py-2.5">
              <Text className="text-[8px] font-bold uppercase tracking-[0.8px] text-[#94A3B8]">
                Order type
              </Text>
              <Text className="mt-1 text-[10px] font-bold text-[#334155]">
                {getOrderType(order)}
                {itemCount > 0 ? ` · ${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}
              </Text>
            </View>
            <View className="flex-1 rounded-[13px] bg-[#F8FAFC] px-3 py-2.5">
              <Text className="text-[8px] font-bold uppercase tracking-[0.8px] text-[#94A3B8]">
                Payment
              </Text>
              <Text numberOfLines={1} className="mt-1 text-[10px] font-bold text-[#334155]">
                {payment}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row items-center">
            <Pressable
              onPress={() => openOrder(order)}
              accessibilityRole="button"
              accessibilityLabel={`View order ${formatOrderId(order)}`}
              className="mr-2 h-[44px] flex-1 flex-row items-center justify-center rounded-[13px] bg-[#17191C]">
              <Eye size={17} color="#FFFFFF" strokeWidth={2} />
              <Text className="ml-2 text-[11px] font-bold text-white">
                View order
              </Text>
            </Pressable>
            {renderStatusButton(order)}
            <Pressable
              onPress={() => printOrder(order)}
              accessibilityRole="button"
              accessibilityLabel={`Print invoice ${formatOrderId(order)}`}
              className="h-[44px] w-[48px] items-center justify-center rounded-[13px] border border-[#E2E8F0] bg-white">
              <Printer size={18} color="#475569" strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={event => {
          const currentScrollY = event.nativeEvent.contentOffset.y;
          if (currentScrollY < 20 || currentScrollY < lastScrollY.current - 8) {
            onScrollVisibilityChange?.(true);
          } else if (currentScrollY > lastScrollY.current + 8) {
            onScrollVisibilityChange?.(false);
          }
          lastScrollY.current = currentScrollY;
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchOrders(true)}
            tintColor="#F97316"
            colors={['#F97316']}
          />
        }
        contentContainerClassName="px-4 pb-[255px]"
        style={{ paddingTop: insets.top + 84 }}>
        

        <View className="mb-4 flex-row flex-wrap justify-between">
          {summaryStats.map(stat => {
            const borderColors: Record<string, string> = {
              '#F59E0B': '#FDECC8',
              '#10B981': '#D5F5E9',
              '#3B82F6': '#DBEAFE',
              '#EF4444': '#FFE0E7',
            };
            const watermarkColors: Record<string, string> = {
              '#F59E0B': '#FFF4D8',
              '#10B981': '#DDF8ED',
              '#3B82F6': '#E8F1FF',
              '#EF4444': '#FFE9EE',
            };

            return (
              <View
                key={stat.label}
                className="relative mb-3 h-[118px] w-[49%] justify-center overflow-hidden rounded-[16px] border bg-white pl-3 pr-2 shadow-sm elevation-[3]"
                style={{ borderColor: borderColors[stat.color] || '#ECE8DF' }}>
                <View
                  className="absolute left-0 top-[16px] h-[86px] w-[4px] rounded-r-full"
                  style={{ backgroundColor: stat.color }}
                />
                <Text
                  className="absolute bottom-1 right-1 text-[48px] font-black leading-[48px]"
                  style={{ color: watermarkColors[stat.color] || '#F1F5F9' }}>
                  {stat.icon}
                </Text>
                <View className="flex-row items-center">
                  <View
                    className="h-[48px] w-[48px] items-center justify-center rounded-[12px] shadow-sm elevation-[3]"
                    style={{ backgroundColor: stat.color }}>
                    <Text className="text-[21px] font-black text-white">
                      {stat.icon}
                    </Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text numberOfLines={2} className="text-[13px] font-bold text-[#17191C]">
                      {stat.label}
                    </Text>
                    <Text className="text-[24px] font-black leading-[29px] text-[#17191C]">
                      {loading ? '—' : stat.value}
                    </Text>
                    <Text numberOfLines={2} className="text-[10px] text-[#64748B]">
                      {stat.note}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View className="mb-4 rounded-[18px] border border-[#ECE8DF] bg-white p-3">
          <View className="mb-3 h-[46px] flex-row items-center rounded-[13px] bg-[#F5F7F8] px-3">
            <Text className="mr-2 text-[19px] text-[#94A3B8]">⌕</Text>
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search ID, customer, phone..."
              placeholderTextColor="#94A3B8"
              className="flex-1 text-[13px] text-[#17191C]"
            />
            {searchTerm.length > 0 && (
              <Pressable onPress={() => setSearchTerm('')}>
                <Text className="px-2 text-[18px] text-[#64748B]">×</Text>
              </Pressable>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {orderStatuses.map(item => (
              <Pressable
                key={item}
                onPress={() => setActiveStatus(item)}
                className={[
                  'mr-2 h-[36px] justify-center rounded-full border px-3',
                  activeStatus === item
                    ? 'border-[#17191C] bg-[#17191C]'
                    : 'border-[#E2E8F0] bg-white',
                ].join(' ')}>
                <Text
                  className={[
                    'text-[10px] font-bold',
                    activeStatus === item ? 'text-white' : 'text-[#64748B]',
                  ].join(' ')}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-[11px] font-semibold text-[#94A3B8]">
              {filteredOrders.length} order{filteredOrders.length === 1 ? '' : 's'}
            </Text>
            <View className="flex-row rounded-[10px] bg-[#EDF1F3] p-1">
              <Pressable
                accessibilityLabel="Card view"
                onPress={() => setViewMode('cards')}
                className={[
                  'h-[34px] w-[40px] items-center justify-center rounded-[8px]',
                  viewMode === 'cards' ? 'bg-white' : '',
                ].join(' ')}>
                <Text className="text-[16px] text-[#17191C]">▦</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Compact list view"
                onPress={() => setViewMode('list')}
                className={[
                  'h-[34px] w-[40px] items-center justify-center rounded-[8px]',
                  viewMode === 'list' ? 'bg-white' : '',
                ].join(' ')}>
                <Text className="text-[17px] text-[#17191C]">☷</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {loadError && (
          <View className="mb-3 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] p-3">
            <Text className="text-[12px] font-semibold text-[#B91C1C]">
              {loadError}
            </Text>
            <Pressable onPress={() => fetchOrders()} className="mt-2">
              <Text className="text-[11px] font-black text-[#991B1B]">Try again</Text>
            </Pressable>
          </View>
        )}

        {loading ? (
          <View className="items-center rounded-[18px] border border-[#ECE8DF] bg-white py-12">
            <ActivityIndicator size="large" color="#17191C" />
            <Text className="mt-3 text-[12px] font-semibold text-[#94A3B8]">
              Loading orders...
            </Text>
          </View>
        ) : pageOrders.length === 0 ? (
          <View className="items-center rounded-[18px] border border-[#ECE8DF] bg-white py-12">
            <Text className="text-[38px] text-[#CBD5E1]">▤</Text>
            <Text className="mt-3 text-[14px] font-bold text-[#64748B]">
              {activeStatus === 'Order Placed'
                ? 'No new orders found.'
                : 'No orders found.'}
            </Text>
            <Text className="mt-1 text-[11px] text-[#94A3B8]">
              Try another status or search.
            </Text>
          </View>
        ) : viewMode === 'cards' ? (
          pageOrders.map(renderOrderCard)
        ) : (
          <View className="overflow-hidden rounded-[18px] border border-[#ECE8DF] bg-white">
            {pageOrders.map(order => {
              const statusColor =
                statusColors[order.status || 'New'] || statusColors.New;
              return (
                <Pressable
                  key={order.id}
                  onPress={() => openOrder(order)}
                  className="flex-row items-center border-b border-[#F1F5F9] px-3 py-4">
                  <View className="flex-1">
                    <Text className="text-[12px] font-black text-[#17191C]">
                      {formatOrderId(order)}
                    </Text>
                    <Text className="mt-1 text-[10px] text-[#64748B]">
                      {order.customer_name || 'Guest Customer'}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[12px] font-black text-[#17191C]">
                      {formatCurrency(order.total_amount)}
                    </Text>
                    <Text
                      className="mt-1 text-[9px] font-bold"
                      style={{ color: statusColor.color }}>
                      {order.status || 'New'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {!loading && filteredOrders.length > 0 && (
          <View className="mt-3 flex-row items-center justify-between rounded-[14px] bg-white px-3 py-3">
            <Text className="text-[10px] font-semibold text-[#64748B]">
              {Math.min((currentPage - 1) * 10 + 1, filteredOrders.length)}–
              {Math.min(currentPage * 10, filteredOrders.length)} of {filteredOrders.length}
            </Text>
            <View className="flex-row items-center">
              <Pressable
                disabled={currentPage === 1}
                onPress={() => setCurrentPage(page => Math.max(1, page - 1))}
                className="mr-2 h-[34px] w-[38px] items-center justify-center rounded-[9px] border border-[#E2E8F0]">
                <Text className="font-bold text-[#17191C]">‹</Text>
              </Pressable>
              <Text className="mr-2 text-[10px] font-bold text-[#64748B]">
                {currentPage}/{totalPages}
              </Text>
              <Pressable
                disabled={currentPage === totalPages}
                onPress={() =>
                  setCurrentPage(page => Math.min(totalPages, page + 1))
                }
                className="h-[34px] w-[38px] items-center justify-center rounded-[9px] border border-[#E2E8F0]">
                <Text className="font-bold text-[#17191C]">›</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        transparent
        animationType="slide"
        visible={updateModal !== null}
        onRequestClose={() => {
          if (!savingStatus) setUpdateModal(null);
        }}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="flex-1 justify-end">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close status update"
              disabled={savingStatus}
              onPress={() => setUpdateModal(null)}
              className="absolute inset-0 bg-[#17191C]/55"
            />
            <View
              className="max-h-[92%] rounded-t-[28px] bg-white px-5 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
              <View className="mb-4 h-[4px] w-[40px] self-center rounded-full bg-[#E2E8F0]" />
              <View className="mb-4 flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-[18px] font-black text-[#17191C]">
                    Update order status
                  </Text>
                  <Text className="mt-1 text-[11px] text-[#64748B]">
                    {updateModal ? formatOrderId(updateModal.order) : ''}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close status update"
                  disabled={savingStatus}
                  onPress={() => setUpdateModal(null)}
                  className="ml-3 h-[36px] w-[36px] items-center justify-center rounded-full bg-[#F1F5F9]">
                  <X size={18} color="#475569" />
                </Pressable>
              </View>

              {updateModal ? (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerClassName="pb-4">
                  <Text className="mb-2 text-[9px] font-bold uppercase tracking-[1px] text-[#94A3B8]">
                    Select a status
                  </Text>
                  <View className="mb-4 flex-row flex-wrap">
                    {getAvailableStatuses(
                      updateModal.order.status || 'New',
                    ).map(status => {
                      const colors = statusColors[status] || statusColors.New;
                      const selected = updateModal.status === status;
                      const isCurrentStatus =
                        (updateModal.order.status || 'New') === status;
                      const statusChipStyle = {
                        backgroundColor: selected
                          ? colors.background
                          : '#FFFFFF',
                        borderColor: selected ? colors.color : '#E2E8F0',
                      };
                      const statusLabelStyle = {
                        color: selected ? colors.color : '#64748B',
                      };
                      return (
                        <Pressable
                          key={status}
                          disabled={savingStatus || isCurrentStatus}
                          onPress={() =>
                            setUpdateModal(current =>
                              current
                                ? {
                                    ...current,
                                    status,
                                    tracking: '',
                                    courier: '',
                                    reason: '',
                                  }
                                : current,
                            )
                          }
                          className="mb-2 mr-2 rounded-full border px-3 py-2"
                          style={statusChipStyle}>
                          <Text
                            className="text-[10px] font-bold"
                            style={statusLabelStyle}>
                            {selected ? `✓ ${status}` : status}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {updateModal.status === 'Shipping' ? (
                    <>
                      <TextInput
                        value={updateModal.tracking}
                        onChangeText={tracking =>
                          setUpdateModal(current =>
                            current ? { ...current, tracking } : current,
                          )
                        }
                        placeholder="Tracking / AWB number"
                        placeholderTextColor="#94A3B8"
                        className="h-[50px] rounded-[13px] border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-[13px] text-[#17191C]"
                      />
                      <TextInput
                        value={updateModal.courier}
                        onChangeText={courier =>
                          setUpdateModal(current =>
                            current ? { ...current, courier } : current,
                          )
                        }
                        placeholder="Courier name"
                        placeholderTextColor="#94A3B8"
                        className="mt-3 h-[50px] rounded-[13px] border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-[13px] text-[#17191C]"
                      />
                    </>
                  ) : updateModal.status === 'Cancelled' ? (
                    <TextInput
                      value={updateModal.reason}
                      onChangeText={reason =>
                        setUpdateModal(current =>
                          current ? { ...current, reason } : current,
                        )
                      }
                      placeholder="Reason for cancellation"
                      placeholderTextColor="#94A3B8"
                      multiline
                      textAlignVertical="top"
                      className="min-h-[100px] rounded-[13px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-[13px] text-[#17191C]"
                    />
                  ) : (
                    <View className="rounded-[13px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                      <Text className="text-[12px] font-semibold text-[#475569]">
                        Confirm this order status change.
                      </Text>
                    </View>
                  )}
                </ScrollView>
              ) : null}

              <View className="flex-row border-t border-[#F1F5F9] pt-3">
                <Pressable
                  disabled={savingStatus}
                  onPress={() => setUpdateModal(null)}
                  className="mr-2 h-[48px] flex-1 items-center justify-center rounded-[14px] border border-[#E2E8F0]">
                  <Text className="text-[12px] font-bold text-[#64748B]">
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  disabled={
                    savingStatus ||
                    !updateModal ||
                    updateModal.status ===
                      (updateModal.order.status || 'New')
                  }
                  onPress={submitStatusUpdate}
                  className={[
                    'h-[48px] flex-1 items-center justify-center rounded-[14px]',
                    savingStatus ||
                    !updateModal ||
                    updateModal.status ===
                      (updateModal.order.status || 'New')
                      ? 'bg-[#D6D3D1]'
                      : 'bg-[#C2410C]',
                  ].join(' ')}>
                  {savingStatus ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-[12px] font-bold text-white">
                      Update status
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={selectedOrder !== null}
        onRequestClose={() => setSelectedOrder(null)}>
        <View className="flex-1 items-center justify-center bg-[#17191C]/70 px-5">
          <View className="w-full rounded-[24px] bg-white p-5">
            <View className="mb-4 flex-row items-start justify-between">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-[1px] text-[#94A3B8]">
                  Order details
                </Text>
                <Text className="mt-1 text-[19px] font-black text-[#17191C]">
                  {selectedOrder ? formatOrderId(selectedOrder) : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedOrder(null)}
                className="h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F1F5F9]">
                <Text className="text-[18px] text-[#64748B]">×</Text>
              </Pressable>
            </View>
            {[
              ['Customer', selectedOrder?.customer_name || 'Guest Customer'],
              ['Phone', selectedOrder?.customer_phone || 'Unavailable'],
              ['Amount', formatCurrency(selectedOrder?.total_amount)],
              ['Payment', selectedOrder?.payment_method || 'Not specified'],
              ['Type', selectedOrder ? getOrderType(selectedOrder) : 'Unknown'],
              ['Status', selectedOrder?.status || 'New'],
              ['Order Date', formatDate(selectedOrder?.created_at)],
            ].map(([label, value]) => (
              <View
                key={label}
                className="flex-row justify-between border-b border-[#F1F5F9] py-3">
                <Text className="text-[11px] font-semibold text-[#94A3B8]">
                  {label}
                </Text>
                <Text className="max-w-[65%] text-right text-[11px] font-bold text-[#17191C]">
                  {value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}