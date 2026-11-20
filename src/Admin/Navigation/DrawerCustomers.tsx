import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Search, UsersRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { invalidateApiResponseCache } from '../../api';
import TopHeader from './TopHeader';

type Customer = {
  id: number | string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  role?: string;
  user_type?: string;
  created_at?: string;
};

type CustomersResponse =
  | Customer[]
  | {
      users?: Customer[];
      data?: Customer[];
      pagination?: { totalPages?: number | string };
    };

type Props = {
  onBackPress: () => void;
};

const getCustomers = (data: CustomersResponse) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.data)) return data.data;
  throw new Error('The customers response did not contain a customer list.');
};

export default function DrawerCustomers({ onBackPress }: Props) {
  const insets = useSafeAreaInsets();
  const hasLoaded = useRef(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
      invalidateApiResponseCache();
    } else if (!hasLoaded.current) {
      setLoading(true);
    }
    setError(null);
    try {
      const allCustomers: Customer[] = [];
      let totalPages = 1;
      for (let page = 1; page <= totalPages; page += 1) {
        const response = await api.get<CustomersResponse>('/users', {
          params: { page, limit: 100 },
        });
        allCustomers.push(...getCustomers(response.data));
        if (!Array.isArray(response.data)) {
          const parsedTotal = Number(response.data.pagination?.totalPages);
          if (Number.isFinite(parsedTotal) && parsedTotal > 0) {
            totalPages = Math.floor(parsedTotal);
          }
        }
      }
      setCustomers(allCustomers);
      hasLoaded.current = true;
    } catch (loadError: unknown) {
      const message =
        typeof loadError === 'object' &&
        loadError !== null &&
        'message' in loadError &&
        typeof loadError.message === 'string'
          ? loadError.message
          : 'Unable to load customers.';
      setError(message);
      if (__DEV__) console.warn('[DrawerCustomers] Could not load customers:', loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const customerAccounts = useMemo(
    () =>
      customers.filter(customer => {
        const role = (customer.role ?? customer.user_type ?? '').toLowerCase();
        return !role || ['customer', 'user', 'client'].includes(role);
      }),
    [customers],
  );
  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customerAccounts.filter(customer => {
      const matchesSearch = [
        customer.name ?? '',
        customer.username ?? '',
        customer.email ?? '',
        customer.phone ?? '',
      ].some(value => value.toLowerCase().includes(query));
      return matchesSearch;
    });
  }, [customerAccounts, search]);

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <TopHeader
        pageTitle="Customers"
        pageSubtitle="Customer accounts"
        onBackPress={onBackPress}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCustomers(true)}
            tintColor="#F97316"
            colors={['#F97316']}
          />
        }
        contentContainerClassName="px-4 pb-10"
        style={{ paddingTop: insets.top + 76 }}>
        <View className="mb-4 rounded-[18px] border border-[#FCE6D7] bg-white p-4">
          <Text className="text-[11px] text-[#64748B]">Registered customers</Text>
          <Text className="mt-1 text-[24px] font-black text-[#17191C]">
            {customerAccounts.length}
          </Text>
        </View>
        <View className="mb-3 h-[46px] flex-row items-center rounded-[13px] border border-[#E2E8F0] bg-white px-3">
          <Search size={17} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, email or phone"
            placeholderTextColor="#94A3B8"
            className="ml-2 flex-1 text-[12px] text-[#17191C]"
          />
        </View>
        {error ? (
          <View className="mb-3 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] p-3">
            <Text className="text-[11px] text-[#B91C1C]">{error}</Text>
            <Pressable onPress={() => loadCustomers()} className="mt-2">
              <Text className="text-[11px] font-bold text-[#991B1B]">Retry</Text>
            </Pressable>
          </View>
        ) : null}
        {loading ? (
          <View className="items-center rounded-[16px] bg-white py-10">
            <ActivityIndicator color="#F97316" />
            <Text className="mt-2 text-[11px] text-[#64748B]">
              Loading customers...
            </Text>
          </View>
        ) : visibleCustomers.length ? (
          visibleCustomers.map(customer => {
            const name =
              customer.name?.trim() || customer.username?.trim() || 'Customer';
            const initial = name.charAt(0).toUpperCase();
            return (
              <View
                key={customer.id}
                className="mb-2 flex-row items-center rounded-[15px] border border-[#ECE8E2] bg-white p-3">
                <View className="mr-3 h-[42px] w-[42px] items-center justify-center rounded-full bg-[#FFF1D6]">
                  <Text className="text-[15px] font-black text-[#C2410C]">
                    {initial}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[12px] font-bold text-[#17191C]">
                    {name}
                  </Text>
                  <Text className="mt-1 text-[10px] text-[#64748B]">
                    {customer.email || customer.phone || 'Contact unavailable'}
                  </Text>
                </View>
                <UsersRound size={17} color="#C2410C" />
              </View>
            );
          })
        ) : (
          <View className="items-center rounded-[16px] bg-white px-4 py-10">
            <Text className="text-[12px] font-semibold text-[#64748B]">
              No customers found.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
