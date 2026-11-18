import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';

type HomeProps = {
  onActionPress?: (label: string) => void;
};

type DashboardProduct = {
  id?: number | string;
  name?: string;
  status?: string;
  inventory_status?: string;
  available_stock?: number | string | null;
  total_stock?: number | string | null;
  stock?: number | string | null;
  minimum_stock?: number | string | null;
};

type ProductsResponse = {
  products: DashboardProduct[];
  pagination?: {
    totalPages?: number | string;
  };
  stats?: {
    total?: number;
  };
};

type DashboardOrder = {
  id: number | string;
  order_id?: string;
  customer_name?: string;
  customer_email?: string;
  total_amount?: number | string;
  status?: string;
  created_at?: string;
};

const quickActions = [
  { label: 'Add Product', icon: '＋', color: '#F59E0B' },
  { label: 'New Order', icon: '▤', color: '#3B82F6' },
  { label: 'Categories', icon: '▦', color: '#10B981' },
  { label: 'Customers', icon: '♙', color: '#8B5CF6' },
  { label: 'Stock', icon: '⚠', color: '#F59E0B' },
];

const statusOverview = [
  { label: 'Placed', statuses: ['order placed', 'new'], color: '#FBBF24' },
  { label: 'Confirmed', statuses: ['processing'], color: '#3B82F6' },
  { label: 'Packed', statuses: ['packing'], color: '#A855F7' },
  { label: 'Shipped', statuses: ['shipping', 'shipped', 'out for delivery'], color: '#F97316' },
  { label: 'Delivered', statuses: ['delivered'], color: '#10B981' },
];

const toNumber = (value: number | string | null | undefined, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCurrency = (value: number) =>
  `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const formatOrderId = (order: DashboardOrder) =>
  order.order_id || `ORD${String(order.id).padStart(4, '0')}`;

export default function Home({ onActionPress }: HomeProps) {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<DashboardProduct[]>([]);
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [totalProductCount, setTotalProductCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const productParams = {
        limit: 10,
        search: '',
        status: 'All',
        exclude_combo_products: true,
        page: 1,
      };
      const [productsResponse, ordersResponse] = await Promise.all([
        api.get<ProductsResponse>('/products', { params: productParams }),
        api.get<DashboardOrder[]>('/orders', { params: { status: 'All' } }),
      ]);

      if (!Array.isArray(productsResponse.data?.products)) {
        throw new Error('The products response did not contain a product list.');
      }
      if (!Array.isArray(ordersResponse.data)) {
        throw new Error('The orders response did not contain an order list.');
      }

      const allProducts = [...productsResponse.data.products];
      const totalPages = Math.max(
        1,
        toNumber(productsResponse.data.pagination?.totalPages, 1),
      );
      for (let page = 2; page <= totalPages; page += 1) {
        const pageResponse = await api.get<ProductsResponse>('/products', {
          params: { ...productParams, page },
        });
        if (!Array.isArray(pageResponse.data?.products)) {
          throw new Error(`The products response for page ${page} was invalid.`);
        }
        allProducts.push(...pageResponse.data.products);
      }

      setProducts(allProducts);
      setTotalProductCount(
        toNumber(productsResponse.data.stats?.total, allProducts.length),
      );
      setOrders(ordersResponse.data);
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Unable to load dashboard data. Please try again.';
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const dashboardStats = useMemo(() => {
    const revenue = orders.reduce(
      (total, order) => total + toNumber(order.total_amount),
      0,
    );
    const pending = orders.filter(
      order => !['delivered', 'cancelled'].includes((order.status ?? '').toLowerCase()),
    ).length;

    return [
      { label: 'Total Products', value: totalProductCount, icon: '▣', color: '#F59E0B' },
      { label: 'Orders', value: orders.length, icon: '▤', color: '#10B981' },
      { label: 'Revenue', value: formatCurrency(revenue), icon: '₹', color: '#F97316' },
      { label: 'Pending', value: pending, icon: '◷', color: '#EF4444' },
    ];
  }, [orders, totalProductCount]);

  const lowStockProducts = useMemo(
    () =>
      products.filter(product => {
        const stock = toNumber(
          product.available_stock ?? product.total_stock ?? product.stock,
        );
        const minimumStock = toNumber(product.minimum_stock, 10);
        const status = `${product.status ?? ''} ${product.inventory_status ?? ''}`.toLowerCase();
        return (
          status.includes('out of stock') ||
          status.includes('low stock') ||
          stock <= minimumStock
        );
      }),
    [products],
  );

  const orderStatusSummary = useMemo(
    () =>
      statusOverview.map(item => ({
        ...item,
        count: orders.filter(order =>
          item.statuses.includes((order.status ?? '').toLowerCase()),
        ).length,
      })),
    [orders],
  );
  const maxOrderStatusCount = Math.max(
    1,
    ...orderStatusSummary.map(item => item.count),
  );

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (first, second) =>
            new Date(second.created_at ?? 0).getTime() -
            new Date(first.created_at ?? 0).getTime(),
        )
        .slice(0, 3),
    [orders],
  );

  const salesByDay = useMemo(() => {
    const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const total = orders
        .filter(order => {
          const createdAt = order.created_at ? new Date(order.created_at) : null;
          return (
            createdAt !== null &&
            !Number.isNaN(createdAt.getTime()) &&
            createdAt.toDateString() === date.toDateString()
          );
        })
        .reduce((sum, order) => sum + toNumber(order.total_amount), 0);
      return {
        key: date.toISOString(),
        label: date.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 1),
        total,
      };
    });
    const maxTotal = Math.max(1, ...lastSevenDays.map(day => day.total));

    return lastSevenDays.map(day => ({
      ...day,
      height: day.total === 0 ? 8 : (day.total / maxTotal) * 94,
    }));
  }, [orders]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerClassName="px-2 pb-[255px]"
      style={{ paddingTop: insets.top + 84 }}>
      <ImageBackground
        source={require('../../Assert/images/welcome.png')}
        resizeMode="cover"
        className="mb-4 min-h-[148px] justify-center overflow-hidden rounded-[22px] px-5 py-5">
        <Text className="text-[12px] font-bold uppercase tracking-[2px] text-[#FFD45A]">
          Admin dashboard
        </Text>
        <Text className="mt-1 text-[24px] font-black text-white">
          {greeting}!
        </Text>
        <Text className="mt-1 text-[13px] text-white/75">
          Here’s what’s happening with your store today.
        </Text>
      </ImageBackground>

      {loadError ? (
        <View className="mb-4 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] p-4">
          <Text className="mb-2 text-[13px] font-semibold text-[#B91C1C]">
            {loadError}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={loadDashboard}
            className="self-start rounded-[8px] bg-[#DC2626] px-3 py-2">
            <Text className="text-[12px] font-bold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <View className="mb-4 flex-row flex-wrap justify-between">
        {dashboardStats.map(stat => (
          <View
            key={stat.label}
            className="mb-3 w-[48%] rounded-[18px] border border-[#ECE8DF] bg-white p-4 shadow-sm elevation-[3]">
            <View
              className="mb-3 h-[42px] w-[42px] items-center justify-center rounded-[14px]"
              style={{ backgroundColor: stat.color }}>
              <Text className="text-[21px] font-black text-white">{stat.icon}</Text>
            </View>
            <Text className="text-[12px] font-bold text-[#718080]">
              {stat.label}
            </Text>
            <Text className="mt-1 text-[24px] font-black text-[#17191C]">
              {loading ? '—' : stat.value}
            </Text>
          </View>
        ))}
      </View>

      {lowStockProducts.length > 0 ? (
        <View className="mb-4 rounded-[18px] border border-[#F4D89A] bg-[#F8F9FA] px-4 py-3">
          <Pressable
            accessibilityRole="button"
            onPress={() => onActionPress?.('Low Stock')}
            className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="mr-3 text-[18px] text-[#D97706]">⚠</Text>
              <Text className="text-[13px] font-bold text-[#92400E]">
                {lowStockProducts.length} {lowStockProducts.length === 1 ? 'product needs' : 'products need'} restocking
              </Text>
            </View>
            <Text className="text-[13px] font-black text-[#B45309]">Review →</Text>
          </Pressable>
        </View>
      ) : null}

      <View className="mb-4 rounded-[18px] border border-[#ECE8DF] bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[17px] font-black text-[#17191C]">
            Sales Overview
          </Text>
          <View className="rounded-full bg-[#F8F9FA] px-3 py-1.5">
            <Text className="text-[11px] font-bold text-[#A16207]">
              This Week
            </Text>
          </View>
        </View>
        <View className="h-[150px] flex-row items-end justify-between px-1">
          {salesByDay.map(day => (
            <View key={day.key} className="items-center">
              <View
                className="w-[26px] rounded-t-[8px] bg-[#F59E0B]"
                style={{ height: day.height }}
              />
              <Text className="mt-2 text-[10px] font-bold text-[#94A3B8]">
                {day.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className="mb-4 rounded-[18px] border border-[#ECE8DF] bg-white p-4">
        <Text className="mb-4 text-[17px] font-black text-[#17191C]">
          Orders Overview
        </Text>
        {orderStatusSummary.map(item => (
          <View key={item.label} className="mb-3">
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-[12px] font-semibold text-[#64748B]">
                {item.label}
              </Text>
              <Text className="text-[12px] font-black text-[#17191C]">
                {item.count}
              </Text>
            </View>
            <View className="h-[7px] overflow-hidden rounded-full bg-[#EDF2F4]">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${item.count === 0 ? 0 : Math.max(6, (item.count / maxOrderStatusCount) * 100)}%`,
                  backgroundColor: item.color,
                }}
              />
            </View>
          </View>
        ))}
      </View>

      <View className="mb-4 rounded-[18px] border border-[#ECE8DF] bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[17px] font-black text-[#17191C]">
            Quick Actions
          </Text>
          <Text className="text-[11px] font-bold text-[#A16207]">
            5 shortcuts
          </Text>
        </View>
        <View className="flex-row flex-wrap justify-between">
          {quickActions.map(action => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              onPress={() => onActionPress?.(action.label)}
              className="mb-3 h-[88px] w-[31%] items-center justify-center rounded-[16px] border border-[#ECE8DF] bg-[#FFFCF7]"
              style={({ pressed }) => (pressed ? { opacity: 0.65 } : null)}>
              <View
                className="mb-2 h-[38px] w-[38px] items-center justify-center rounded-[12px]"
                style={{ backgroundColor: action.color }}>
                <Text className="text-[18px] font-black text-white">
                  {action.icon}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                className="px-1 text-[10px] font-bold text-[#17191C]">
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="mb-4 rounded-[18px] border border-[#ECE8DF] bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[17px] font-black text-[#17191C]">
            Low Stock Alert
          </Text>
          <Pressable onPress={() => onActionPress?.('View Stock')}>
            <Text className="text-[12px] font-bold text-[#7C3AED]">
              View All
            </Text>
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator color="#F97316" />
        ) : lowStockProducts.length > 0 ? (
          lowStockProducts.slice(0, 3).map(item => (
            <View
              key={item.id ?? item.name}
              className="mb-3 flex-row items-center rounded-[12px] bg-[#FFFBF5] p-3">
              <View className="mr-3 h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#FFE8C2]">
                <Text className="text-[18px]">▣</Text>
              </View>
              <View className="flex-1">
                <Text numberOfLines={1} className="text-[13px] font-bold text-[#17191C]">
                  {item.name || 'Unnamed product'}
                </Text>
                <Text className="mt-1 text-[11px] text-[#94A3B8]">
                  Stock:{' '}
                  <Text className="font-black text-[#EF4444]">
                    {toNumber(item.available_stock ?? item.total_stock ?? item.stock)}
                  </Text>
                </Text>
              </View>
              <View className="rounded-full bg-[#FEE2E2] px-2 py-1">
                <Text className="text-[9px] font-bold text-[#EF4444]">
                  Low Stock
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text className="text-[12px] text-[#64748B]">
            No low-stock products found.
          </Text>
        )}
      </View>

      <View className="rounded-[18px] border border-[#ECE8DF] bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[17px] font-black text-[#17191C]">
            Recent Orders
          </Text>
          <Pressable onPress={() => onActionPress?.('View Orders')}>
            <Text className="text-[12px] font-bold text-[#F59E0B]">
              View All →
            </Text>
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator color="#F97316" />
        ) : recentOrders.length > 0 ? (
          recentOrders.map(order => {
            const customer = order.customer_name || order.customer_email || 'Customer';
            const status = order.status || 'Unknown';
            const createdAt = order.created_at ? new Date(order.created_at) : null;
            const date =
              createdAt && !Number.isNaN(createdAt.getTime())
                ? createdAt.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })
                : 'Date unavailable';
            const statusColor =
              statusOverview.find(item =>
                item.statuses.includes(status.toLowerCase()),
              )?.color ?? '#64748B';

            return (
              <Pressable
                key={order.id}
                onPress={() => onActionPress?.(formatOrderId(order))}
                className="mb-3 flex-row items-center border-b border-[#F1F5F9] pb-3">
                <View className="mr-3 h-[38px] w-[38px] items-center justify-center rounded-full bg-[#FFF1D6]">
                  <Text className="text-[13px] font-black text-[#B45309]">
                    {customer.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-black text-[#17191C]">
                    {formatOrderId(order)}
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-[#94A3B8]">
                    {customer} • {date}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[12px] font-black text-[#17191C]">
                    {formatCurrency(toNumber(order.total_amount))}
                  </Text>
                  <Text
                    className="mt-1 text-[10px] font-bold"
                    style={{ color: statusColor }}>
                    {status}
                  </Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          <Text className="text-[12px] text-[#64748B]">
            No orders found.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}