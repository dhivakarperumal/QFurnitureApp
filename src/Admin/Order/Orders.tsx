import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Eye, Printer } from 'lucide-react-native';
import RNPrint from 'react-native-print';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await api.get('/orders', {
        params: { status: activeStatus },
      });
      if (!Array.isArray(response.data)) {
        throw new Error('The orders response was not a list.');
      }
      setOrders(response.data);
    } catch (error) {
      console.error('Fetch Orders Error:', error);
      setLoadError('Could not load orders. Check your connection and try again.');
    } finally {
      setLoading(false);
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
      await fetchOrders();
    } catch (error) {
      console.error('Status Sync Error:', error);
      setLoadError('Could not update order status. Please try again.');
    } finally {
      setSavingStatus(false);
    }
  };

  const submitStatusUpdate = () => {
    if (!updateModal) return;
    const { order, status, tracking, courier, reason } = updateModal;
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
    setUpdateModal(null);
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

  const renderStatusSelector = (order: Order) => {
    const currentStatus = order.status || 'New';
    const flow: OrderStatus[] = [
      'Order Placed',
      'Packing',
      'Shipping',
      'Out for Delivery',
      'Delivered',
    ];
    const currentIndex = flow.indexOf(currentStatus);
    const options =
      currentIndex === -1
        ? [currentStatus, ...flow, 'Cancelled']
        : [
            ...flow.slice(currentIndex),
            ...(currentIndex < 2 ? ['Cancelled' as const] : []),
          ];
    return (
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[...new Set(options)].map(option => {
            const optionColors = statusColors[option] || statusColors.New;
            return (
              <Pressable
                key={option}
                disabled={savingStatus || option === currentStatus}
                onPress={() => openStatusUpdate(order, option)}
                className="mr-2 rounded-full px-3 py-2"
                style={{ backgroundColor: optionColors.background }}>
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: optionColors.color }}>
                  {option === currentStatus ? `• ${option}` : option}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text className="mt-2 text-[10px] text-[#94A3B8]">
          Current status: {currentStatus}
        </Text>
      </View>
    );
  };

  const renderOrderCard = (order: Order) => {
    const customer = order.customer_name || 'Guest Customer';
    const payment = order.payment_method || 'Not specified';
    const statusColor = statusColors[order.status || 'New'] || statusColors.New;

    return (
      <View
        key={order.id}
        className="mb-3 rounded-[18px] border border-[#E8E7E3] bg-white p-4 shadow-sm elevation-[2]">
        <Pressable
          onPress={() => openOrder(order)}
          className="mb-3 flex-row items-start justify-between border-b border-[#F1F5F9] pb-3">
          <View>
            <Text className="text-[10px] font-bold uppercase tracking-[1px] text-[#94A3B8]">
              Order ID
            </Text>
            <Text className="mt-1 text-[14px] font-black text-[#17191C]">
              {formatOrderId(order)}
            </Text>
          </View>
          <View
            className="rounded-full px-3 py-1.5"
            style={{ backgroundColor: statusColor.background }}>
            <Text
              className="text-[10px] font-bold"
              style={{ color: statusColor.color }}>
              {order.status || 'New'}
            </Text>
          </View>
        </Pressable>

        <Pressable onPress={() => openOrder(order)} className="mb-3 flex-row items-center">
          <View className="mr-3 h-[40px] w-[40px] items-center justify-center rounded-full bg-[#FFF1D6]">
            <Text className="text-[15px] font-black text-[#B45309]">
              {customer.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-[13px] font-bold text-[#17191C]">{customer}</Text>
            <Text className="mt-0.5 text-[10px] text-[#94A3B8]">
              {order.customer_phone || order.customer_email || 'Contact unavailable'}
            </Text>
          </View>
          <Text className="text-[15px] font-black text-[#17191C]">
            {formatCurrency(order.total_amount)}
          </Text>
        </Pressable>

        <View className="mb-3 flex-row justify-between rounded-[12px] bg-[#F8FAFC] px-3 py-2.5">
          <View>
            <Text className="text-[9px] font-bold uppercase text-[#94A3B8]">
              Type
            </Text>
            <Text className="mt-1 text-[11px] font-bold text-[#475569]">
              {getOrderType(order)}
            </Text>
          </View>
          <View>
            <Text className="text-[9px] font-bold uppercase text-[#94A3B8]">
              Payment
            </Text>
            <Text className="mt-1 text-[11px] font-bold text-[#475569]">
              {payment}
            </Text>
          </View>
          <View>
            <Text className="text-[9px] font-bold uppercase text-[#94A3B8]">
              Order Date
            </Text>
            <Text className="mt-1 text-[11px] font-bold text-[#475569]">
              {formatDate(order.created_at)}
            </Text>
          </View>
        </View>

        {renderStatusSelector(order)}
        <View className="mt-3 flex-row items-center justify-end">
          <Pressable
            onPress={() => openOrder(order)}
            accessibilityRole="button"
            accessibilityLabel={`View order ${formatOrderId(order)}`}
            className="mr-2 h-[42px] w-[42px] items-center justify-center rounded-[12px] border border-[#17191C]">
            <Eye size={20} color="#17191C" strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() => printOrder(order)}
            accessibilityRole="button"
            accessibilityLabel={`Print invoice ${formatOrderId(order)}`}
            className="h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#17191C]">
            <Printer size={20} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
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
        animationType="fade"
        visible={updateModal !== null}
        onRequestClose={() => setUpdateModal(null)}>
        <View className="flex-1 items-center justify-center bg-[#17191C]/70 px-5">
          <View className="w-full rounded-[24px] bg-white p-5">
            <Text className="text-[18px] font-black text-[#17191C]">
              {updateModal?.status === 'Shipping'
                ? 'Shipping details'
                : updateModal?.status === 'Cancelled'
                  ? 'Cancel order'
                  : 'Update order status'}
            </Text>
            <Text className="mt-1 text-[12px] text-[#94A3B8]">
              {updateModal ? formatOrderId(updateModal.order) : ''}
            </Text>
            {updateModal?.status === 'Shipping' ? (
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
                  className="mt-5 h-[50px] rounded-[13px] border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-[13px] text-[#17191C]"
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
            ) : updateModal?.status === 'Cancelled' ? (
              <TextInput
                value={updateModal?.reason || ''}
                onChangeText={reason =>
                  setUpdateModal(current =>
                    current ? { ...current, reason } : current,
                  )
                }
                placeholder="Reason for cancellation"
                placeholderTextColor="#94A3B8"
                multiline
                textAlignVertical="top"
                className="mt-5 min-h-[100px] rounded-[13px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-[13px] text-[#17191C]"
              />
            ) : (
              <View className="mt-5 rounded-[13px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <Text className="text-[12px] font-bold text-[#334155]">
                  Change this order to {updateModal?.status}.
                </Text>
              </View>
            )}
            <View className="mt-5 flex-row">
              <Pressable
                onPress={() => setUpdateModal(null)}
                className="mr-2 h-[48px] flex-1 items-center justify-center rounded-[14px] border border-[#E2E8F0]">
                <Text className="text-[12px] font-bold text-[#64748B]">Cancel</Text>
              </Pressable>
              <Pressable
                disabled={savingStatus}
                onPress={submitStatusUpdate}
                className="h-[48px] flex-1 items-center justify-center rounded-[14px] bg-[#17191C]">
                {savingStatus ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-[12px] font-bold text-white">
                    Update Status
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
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