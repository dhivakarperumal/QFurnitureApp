import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { BarChart3, IndianRupee, ShoppingBag, TrendingUp } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { invalidateApiResponseCache } from '../../api';
import TopHeader from './TopHeader';

type ReportItem = {
  product_name?: string;
  name?: string;
  quantity?: number | string;
  qty?: number | string;
  price?: number | string;
};

type ReportOrder = {
  id: number | string;
  order_id?: string;
  status?: string;
  total_amount?: number | string;
  created_at?: string;
  items?: ReportItem[];
};

type Props = {
  onBackPress: () => void;
};

const numberValue = (value: number | string | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const currency = (value: number) =>
  `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function DrawerSalesReports({ onBackPress }: Props) {
  const insets = useSafeAreaInsets();
  const hasLoaded = useRef(false);
  const [orders, setOrders] = useState<ReportOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
      invalidateApiResponseCache();
    } else if (!hasLoaded.current) {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await api.get<ReportOrder[]>('/orders', {
        params: { status: 'All' },
      });
      if (!Array.isArray(response.data)) {
        throw new Error('The orders response did not contain an order list.');
      }
      setOrders(response.data);
      hasLoaded.current = true;
    } catch (loadError: unknown) {
      const message =
        typeof loadError === 'object' &&
        loadError !== null &&
        'message' in loadError &&
        typeof loadError.message === 'string'
          ? loadError.message
          : 'Unable to load sales reports.';
      setError(message);
      if (__DEV__) console.warn('[DrawerSalesReports] Could not load reports:', loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const report = useMemo(() => {
    const now = new Date();
    const validOrders = orders.filter(
      order => (order.status || '').toLowerCase() !== 'cancelled',
    );
    const thisMonthOrders = validOrders.filter(order => {
      if (!order.created_at) return false;
      const created = new Date(order.created_at);
      return (
        !Number.isNaN(created.getTime()) &&
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      );
    });
    const revenue = validOrders.reduce(
      (sum, order) => sum + numberValue(order.total_amount),
      0,
    );
    const monthlyRevenue = thisMonthOrders.reduce(
      (sum, order) => sum + numberValue(order.total_amount),
      0,
    );
    const productTotals = new Map<string, number>();
    for (const order of validOrders) {
      for (const item of order.items ?? []) {
        const name = item.product_name || item.name || 'Product';
        const quantity = numberValue(item.quantity ?? item.qty ?? 1);
        productTotals.set(name, (productTotals.get(name) ?? 0) + quantity);
      }
    }
    const bestSellers = [...productTotals.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5);
    return {
      revenue,
      monthlyRevenue,
      monthOrders: thisMonthOrders.length,
      orderCount: validOrders.length,
      averageOrder: validOrders.length ? revenue / validOrders.length : 0,
      bestSellers,
      peakQuantity: bestSellers[0]?.[1] ?? 1,
    };
  }, [orders]);

  const currentMonth = new Date().toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <TopHeader
        pageTitle="Sales & Reports"
        pageSubtitle="Revenue and order performance"
        onBackPress={onBackPress}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadOrders(true)}
            tintColor="#F97316"
            colors={['#F97316']}
          />
        }
        contentContainerClassName="px-4 pb-10"
        style={{ paddingTop: insets.top + 76 }}>
        <View className="mb-4 rounded-[18px] bg-[#C2410C] p-4">
          <Text className="text-[10px] font-bold uppercase tracking-[1px] text-white/75">
            Sales overview
          </Text>
          <Text className="mt-2 text-[26px] font-black text-white">
            {currency(report.monthlyRevenue)}
          </Text>
          <Text className="mt-1 text-[11px] text-white/85">
            Revenue in {currentMonth}
          </Text>
        </View>

        {error ? (
          <View className="mb-3 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] p-3">
            <Text className="text-[11px] text-[#B91C1C]">{error}</Text>
            <Pressable onPress={() => loadOrders()} className="mt-2">
              <Text className="text-[11px] font-bold text-[#991B1B]">Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View className="items-center rounded-[16px] bg-white py-10">
            <ActivityIndicator color="#F97316" />
            <Text className="mt-2 text-[11px] text-[#64748B]">
              Loading sales reports...
            </Text>
          </View>
        ) : (
          <>
            <View className="mb-3 flex-row">
              {[
                {
                  label: 'Total sales',
                  value: currency(report.revenue),
                  icon: IndianRupee,
                  color: '#C2410C',
                },
                {
                  label: 'Orders',
                  value: String(report.orderCount),
                  icon: ShoppingBag,
                  color: '#2563EB',
                },
              ].map(metric => {
                const MetricIcon = metric.icon;
                return (
                  <View
                    key={metric.label}
                    className="mr-2 flex-1 rounded-[16px] border border-[#ECE8E2] bg-white p-3">
                    <MetricIcon size={18} color={metric.color} />
                    <Text className="mt-3 text-[15px] font-black text-[#17191C]">
                      {metric.value}
                    </Text>
                    <Text className="mt-1 text-[9px] text-[#64748B]">
                      {metric.label}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View className="mb-4 flex-row">
              {[
                {
                  label: `${currentMonth} orders`,
                  value: String(report.monthOrders),
                  icon: BarChart3,
                  color: '#7C3AED',
                },
                {
                  label: 'Average order',
                  value: currency(report.averageOrder),
                  icon: TrendingUp,
                  color: '#059669',
                },
              ].map(metric => {
                const MetricIcon = metric.icon;
                return (
                  <View
                    key={metric.label}
                    className="mr-2 flex-1 rounded-[16px] border border-[#ECE8E2] bg-white p-3">
                    <MetricIcon size={18} color={metric.color} />
                    <Text className="mt-3 text-[15px] font-black text-[#17191C]">
                      {metric.value}
                    </Text>
                    <Text className="mt-1 text-[9px] text-[#64748B]">
                      {metric.label}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View className="rounded-[16px] border border-[#ECE8E2] bg-white p-4">
              <Text className="mb-4 text-[13px] font-black text-[#17191C]">
                Best-selling products
              </Text>
              {report.bestSellers.length ? (
                report.bestSellers.map(([name, quantity]) => (
                  <View key={name} className="mb-3">
                    <View className="mb-1.5 flex-row justify-between">
                      <Text numberOfLines={1} className="mr-3 flex-1 text-[10px] font-semibold text-[#475569]">
                        {name}
                      </Text>
                      <Text className="text-[10px] font-bold text-[#17191C]">
                        {quantity} sold
                      </Text>
                    </View>
                    <View className="h-[7px] overflow-hidden rounded-full bg-[#F1F5F9]">
                      <View
                        className="h-full rounded-full bg-[#F97316]"
                        style={{
                          width: `${Math.max(6, (quantity / report.peakQuantity) * 100)}%`,
                        }}
                      />
                    </View>
                  </View>
                ))
              ) : (
                <Text className="text-[11px] text-[#64748B]">
                  No product sales are available yet.
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
