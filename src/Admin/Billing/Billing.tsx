import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Eye,
  FileText,
  Filter,
  LayoutGrid,
  List,
  Printer,
  Search,
  ShoppingBag,
  X,
  Plus,
} from 'lucide-react-native';
import RNPrint from 'react-native-print';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';
import type { Order } from '../Order/Orders';

type BillingApiOrder = Order & {
  order_type?: string;
};

type BillingInvoice = {
  order: BillingApiOrder;
  id: string;
  orderId: number | string;
  createdAt?: string;
  date: string;
  customer: string;
  amount: number;
  status: string;
  method: string;
};

type BillingProps = {
  onOrderPress: (order: Order) => void;
  onCreateBill: () => void;
  onScrollVisibilityChange?: (visible: boolean) => void;
};

const itemsPerPage = 8;
const statusFilters = [
  'All',
  'Order Placed',
  'Packing',
  'Shipping',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

const statusColors: Record<string, { background: string; foreground: string }> =
  {
    Delivered: { background: '#DCFCE7', foreground: '#15803D' },
    Cancelled: { background: '#FFE4E6', foreground: '#BE123C' },
    Packing: { background: '#FEF3C7', foreground: '#B45309' },
    Shipping: { background: '#FEF3C7', foreground: '#B45309' },
    'Out for Delivery': { background: '#CFFAFE', foreground: '#0E7490' },
    'Order Placed': { background: '#DBEAFE', foreground: '#1D4ED8' },
  };

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`;

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
};

const isToday = (value?: string) => {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

const getErrorMessage = (
  error: unknown,
  fallback = 'Could not load billing orders. Please try again.',
) => {
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }
  if (
    'response' in error &&
    typeof error.response === 'object' &&
    error.response
  ) {
    const response = error.response as { data?: { message?: unknown } };
    if (typeof response.data?.message === 'string') {
      return response.data.message;
    }
  }
  if ('message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });

export default function Billing({
  onOrderPress,
  onCreateBill,
  onScrollVisibilityChange,
}: BillingProps) {
  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [printingOrderId, setPrintingOrderId] = useState<
    number | string | null
  >(null);

  const fetchShopOrders = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await api.get<BillingApiOrder[]>('/orders');
      if (!Array.isArray(response.data)) {
        throw new Error('The orders response was invalid.');
      }
      const shopOrders = response.data
        .filter(
          order => String(order.order_type || '').toLowerCase() === 'shop',
        )
        .map(order => ({
          order,
          orderId: order.id,
          id: order.order_id || `ORD${String(order.id).padStart(4, '0')}`,
          createdAt: order.created_at,
          date: formatDate(order.created_at),
          customer: order.customer_name || 'Guest Customer',
          amount: toNumber(order.total_amount),
          status: order.status || 'Order Placed',
          method: order.payment_method || 'Showroom',
        }));
      setInvoices(shopOrders);
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Billing] Could not load shop orders:', error);
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShopOrders();
  }, [fetchShopOrders]);

  const filteredInvoices = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return invoices.filter(invoice => {
      const matchesSearch =
        !search ||
        `${invoice.id} ${invoice.customer}`.toLowerCase().includes(search);
      const matchesStatus =
        statusFilter === 'All' ||
        invoice.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const todayInvoices = invoices.filter(invoice => isToday(invoice.createdAt));
  const totalAmountToday = todayInvoices.reduce(
    (sum, invoice) => sum + invoice.amount,
    0,
  );
  const totalAmount = invoices.reduce(
    (sum, invoice) => sum + invoice.amount,
    0,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const printInvoice = async (invoice: BillingInvoice) => {
    setPrintingOrderId(invoice.orderId);
    try {
      await RNPrint.print({
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; padding: 28px; color: #1f2937;">
              <h1 style="color: #9a3412;">Q Furniture</h1>
              <h2>Shop Order Invoice</h2>
              <hr />
              <p><strong>Order ID:</strong> ${escapeHtml(invoice.id)}</p>
              <p><strong>Customer:</strong> ${escapeHtml(invoice.customer)}</p>
              <p><strong>Order Date:</strong> ${escapeHtml(invoice.date)}</p>
              <p><strong>Payment:</strong> ${escapeHtml(invoice.method)}</p>
              <p><strong>Status:</strong> ${escapeHtml(invoice.status)}</p>
              <h2 style="margin-top: 32px;">Total: ${escapeHtml(
                formatCurrency(invoice.amount),
              )}</h2>
            </body>
          </html>
        `,
      });
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Billing] Could not print invoice:', error);
      Alert.alert(
        'Print unavailable',
        getErrorMessage(error, 'Could not print this invoice.'),
      );
    } finally {
      setPrintingOrderId(null);
    }
  };

  const openOrder = (invoice: BillingInvoice) => {
    onOrderPress(invoice.order);
  };

  const renderActions = (invoice: BillingInvoice) => (
    <View className="flex-row items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View order ${invoice.id}`}
        onPress={() => openOrder(invoice)}
        className="mr-2 h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-[#FFF7ED]"
      >
        <Eye size={17} color="#9A3412" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Print order ${invoice.id}`}
        disabled={printingOrderId === invoice.orderId}
        onPress={() => printInvoice(invoice)}
        className="h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-[#F8FAFC] disabled:opacity-50"
      >
        {printingOrderId === invoice.orderId ? (
          <ActivityIndicator size="small" color="#9A3412" />
        ) : (
          <Printer size={17} color="#9A3412" />
        )}
      </Pressable>
    </View>
  );

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
        contentContainerClassName="px-4 pb-[40px]"
        style={{ paddingTop: insets.top + 84 }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3"
        >
          {[
            {
              label: 'Total amount',
              value: formatCurrency(totalAmount),
              detail: 'Shop orders only',
              color: '#C2410C',
              borderColor: '#FED7AA',
              watermarkColor: '#FDE8D8',
              icon: CreditCard,
            },
            {
              label: 'Today amount',
              value: formatCurrency(totalAmountToday),
              detail: 'Shop orders only',
              color: '#047857',
              borderColor: '#A7F3D0',
              watermarkColor: '#D1FAE5',
              icon: DollarSign,
            },
            {
              label: 'Orders today',
              value: String(todayInvoices.length),
              detail: 'Shop orders only',
              color: '#B45309',
              borderColor: '#FDE68A',
              watermarkColor: '#FEF3C7',
              icon: ShoppingBag,
            },
          ].map(stat => {
            const StatIcon = stat.icon;
            return (
              <View
                key={stat.label}
                className="relative mr-3 h-[118px] w-[190px] justify-center overflow-hidden rounded-[16px] border bg-white pl-3 pr-2 shadow-sm elevation-[3]"
                style={{ borderColor: stat.borderColor }}
              >
                <View
                  className="absolute left-0 top-[16px] h-[86px] w-[4px] rounded-r-full"
                  style={{ backgroundColor: stat.color }}
                />
                <View className="absolute bottom-1 right-1">
                  <StatIcon size={48} color={stat.watermarkColor} />
                </View>
                <View className="flex-row items-center">
                  <View
                    className="h-[48px] w-[48px] items-center justify-center rounded-[12px] shadow-sm elevation-[3]"
                    style={{ backgroundColor: stat.color }}
                  >
                    <StatIcon size={23} color="#FFFFFF" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text
                      numberOfLines={2}
                      className="text-[13px] font-bold text-[#17191C]"
                    >
                      {stat.label}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="text-[20px] font-black leading-[25px] text-[#17191C]"
                    >
                      {loading ? '—' : stat.value}
                    </Text>
                    <Text
                      numberOfLines={2}
                      className="text-[10px] text-[#64748B]"
                    >
                      {stat.detail}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View className="mb-3 rounded-[16px] border border-[#E2E8F0] bg-white p-3">
          <View className="mb-3 h-[44px] flex-row items-center rounded-[11px] bg-[#F8FAFC] px-3">
            <Search size={17} color="#94A3B8" />
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Order ID or customer..."
              placeholderTextColor="#94A3B8"
              className="ml-2 flex-1 text-[11px] text-[#17191C]"
            />
            {searchTerm ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => setSearchTerm('')}
                className="p-1"
              >
                <X size={15} color="#94A3B8" />
              </Pressable>
            ) : null}
          </View>
          <View className="mb-3 flex-row items-center">
            <Filter size={14} color="#94A3B8" />
            <Text className="ml-1.5 mr-2 text-[9px] font-bold text-[#64748B]">
              Status
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-1"
            >
              {statusFilters.map(filter => (
                <Pressable
                  key={filter}
                  onPress={() => setStatusFilter(filter)}
                  className={`mr-2 rounded-full border px-3 py-2 ${
                    statusFilter === filter
                      ? 'border-[#9A3412] bg-[#9A3412]'
                      : 'border-[#E2E8F0] bg-white'
                  }`}
                >
                  <Text
                    className={`text-[8px] font-bold ${
                      statusFilter === filter ? 'text-white' : 'text-[#64748B]'
                    }`}
                  >
                    {filter}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-[10px] font-semibold text-[#94A3B8]">
              {loading
                ? 'Loading billing orders...'
                : `${filteredInvoices.length} shop orders`}
            </Text>
            <View className="flex-row rounded-[10px] bg-[#F1F5F9] p-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cards view"
                accessibilityState={{ selected: viewMode === 'cards' }}
                onPress={() => setViewMode('cards')}
                className={`h-[34px] flex-row items-center justify-center rounded-[8px] px-2 ${
                  viewMode === 'cards' ? 'bg-white' : ''
                }`}
              >
                <LayoutGrid
                  size={16}
                  color={viewMode === 'cards' ? '#9A3412' : '#64748B'}
                />
                <Text
                  className={`ml-1 text-[8px] font-bold ${
                    viewMode === 'cards' ? 'text-[#9A3412]' : 'text-[#64748B]'
                  }`}
                >
                  Cards
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Table view"
                accessibilityState={{ selected: viewMode === 'table' }}
                onPress={() => setViewMode('table')}
                className={`h-[34px] flex-row items-center justify-center rounded-[8px] px-2 ${
                  viewMode === 'table' ? 'bg-white' : ''
                }`}
              >
                <List
                  size={17}
                  color={viewMode === 'table' ? '#9A3412' : '#64748B'}
                />
                <Text
                  className={`ml-1 text-[8px] font-bold ${
                    viewMode === 'table' ? 'text-[#9A3412]' : 'text-[#64748B]'
                  }`}
                >
                  Table
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {loading ? (
          <View className="items-center rounded-[16px] bg-white py-12">
            <ActivityIndicator size="large" color="#F97316" />
            <Text className="mt-3 text-[11px] text-[#64748B]">
              Loading billing orders...
            </Text>
          </View>
        ) : loadError ? (
          <View className="items-center rounded-[16px] bg-white px-5 py-10">
            <Text className="text-center text-[11px] text-[#BE123C]">
              {loadError}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={fetchShopOrders}
              className="mt-4 rounded-[10px] bg-[#9A3412] px-4 py-2.5"
            >
              <Text className="text-[10px] font-bold text-white">
                Try again
              </Text>
            </Pressable>
          </View>
        ) : filteredInvoices.length === 0 ? (
          <View className="items-center rounded-[16px] bg-white px-5 py-12">
            <FileText size={30} color="#CBD5E1" />
            <Text className="mt-3 text-[12px] font-bold text-[#64748B]">
              No shop orders found
            </Text>
            <Text className="mt-1 text-center text-[10px] text-[#94A3B8]">
              Try changing your search or status filter.
            </Text>
          </View>
        ) : viewMode === 'cards' ? (
          paginatedInvoices.map(invoice => {
            const colors = statusColors[invoice.status] ?? {
              background: '#F1F5F9',
              foreground: '#475569',
            };
            return (
              <View
                key={invoice.orderId}
                className="mb-3 rounded-[16px] border border-[#E2E8F0] bg-white p-4 shadow-sm"
              >
                <View className="mb-4 flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-[8px] font-bold uppercase tracking-[1px] text-[#94A3B8]">
                      Shop order
                    </Text>
                    <Text className="mt-1 text-[14px] font-black text-[#9A3412]">
                      {invoice.id}
                    </Text>
                  </View>
                  <View
                    className="rounded-full px-2.5 py-1.5"
                    style={{ backgroundColor: colors.background }}
                  >
                    <Text
                      className="text-[8px] font-black"
                      style={{ color: colors.foreground }}
                    >
                      {invoice.status}
                    </Text>
                  </View>
                </View>
                <View className="flex-row flex-wrap">
                  <InvoiceDetail label="Customer" value={invoice.customer} />
                  <InvoiceDetail label="Payment" value={invoice.method} />
                  <InvoiceDetail label="Order date" value={invoice.date} />
                  <InvoiceDetail
                    label="Amount"
                    value={formatCurrency(invoice.amount)}
                    emphasis
                  />
                </View>
                <View className="mt-3 flex-row justify-end border-t border-[#F1F5F9] pt-3">
                  {renderActions(invoice)}
                </View>
              </View>
            );
          })
        ) : (
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator
            className="mb-3"
          >
            <View className="w-[605px] overflow-hidden rounded-[12px] border border-[#E2E8F0] bg-white">
              <View className="flex-row bg-[#F8FAFC] px-3 py-3">
                <Text className="w-[96px] text-[8px] font-bold text-[#64748B]">
                  Order ID
                </Text>
                <Text className="w-[115px] text-[8px] font-bold text-[#64748B]">
                  Customer
                </Text>
                <Text className="w-[90px] text-[8px] font-bold text-[#64748B]">
                  Date
                </Text>
                <Text className="w-[95px] text-[8px] font-bold text-[#64748B]">
                  Amount
                </Text>
                <Text className="w-[95px] text-[8px] font-bold text-[#64748B]">
                  Status
                </Text>
                <Text className="w-[90px] text-[8px] font-bold text-[#64748B]">
                  Actions
                </Text>
              </View>
              {paginatedInvoices.map(invoice => {
                const colors = statusColors[invoice.status] ?? {
                  background: '#F1F5F9',
                  foreground: '#475569',
                };
                return (
                  <View
                    key={invoice.orderId}
                    className="flex-row items-center border-t border-[#F1F5F9] px-3 py-2.5"
                  >
                    <Text
                      numberOfLines={1}
                      className="w-[96px] text-[8px] font-bold text-[#9A3412]"
                    >
                      {invoice.id}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="w-[115px] pr-2 text-[8px] text-[#334155]"
                    >
                      {invoice.customer}
                    </Text>
                    <Text className="w-[90px] text-[8px] text-[#64748B]">
                      {invoice.date}
                    </Text>
                    <Text className="w-[95px] text-[8px] font-bold text-[#17191C]">
                      {formatCurrency(invoice.amount)}
                    </Text>
                    <View className="w-[95px]">
                      <Text
                        numberOfLines={1}
                        className="self-start rounded-full px-2 py-1 text-[7px] font-bold"
                        style={{
                          color: colors.foreground,
                          backgroundColor: colors.background,
                        }}
                      >
                        {invoice.status}
                      </Text>
                    </View>
                    <View className="w-[90px]">{renderActions(invoice)}</View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {totalPages > 1 ? (
          <View className="mt-1 flex-row items-center justify-between rounded-[13px] bg-white px-3 py-2">
            <Text className="text-[9px] font-semibold text-[#64748B]">
              Showing {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of{' '}
              {filteredInvoices.length}
            </Text>
            <View className="flex-row items-center">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous page"
                disabled={currentPage === 1}
                onPress={() => setCurrentPage(page => Math.max(page - 1, 1))}
                className="mr-2 h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-[#E2E8F0] disabled:opacity-40"
              >
                <ChevronLeft size={17} color="#64748B" />
              </Pressable>
              <Text className="mr-2 text-[9px] font-bold text-[#475569]">
                {currentPage}/{totalPages}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next page"
                disabled={currentPage >= totalPages}
                onPress={() =>
                  setCurrentPage(page => Math.min(page + 1, totalPages))
                }
                className="h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-[#E2E8F0] disabled:opacity-40"
              >
                <ChevronRight size={17} color="#64748B" />
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function InvoiceDetail({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View className="mb-3 w-1/2 pr-2">
      <Text className="text-[8px] font-bold uppercase tracking-[0.7px] text-[#94A3B8]">
        {label}
      </Text>
      <Text
        numberOfLines={1}
        className={`mt-1 ${
          emphasis
            ? 'text-[13px] font-black text-[#17191C]'
            : 'text-[10px] font-bold text-[#475569]'
        }`}
      >
        {value}
      </Text>
    </View>
  );
}
