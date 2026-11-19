import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { invalidateApiResponseCache } from '../../api';
import TopHeader from '../Navigation/TopHeader';

type CouponScope =
  | 'all'
  | 'first_order_only'
  | 'new_customers_only'
  | 'specific_products'
  | 'specific_categories';
type CouponStatus = 'active' | 'inactive';
type Coupon = {
  id: number | string;
  code: string;
  name: string;
  description?: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number | string;
  min_order_value?: number | string;
  start_date?: string;
  expiry_date?: string;
  usage_count?: number | string;
  usage_limit_global?: number | string | null;
  usage_limit_per_customer?: number | string;
  status: CouponStatus;
  coupon_scope?: CouponScope;
  applicable_product_ids?: number[] | string;
  applicable_category_ids?: number[] | string;
  applicable_subcategory_ids?: number[] | string;
};
type CouponForm = {
  code: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  min_order_value: string;
  start_date: string;
  expiry_date: string;
  usage_limit_global: string;
  usage_limit_per_customer: string;
  status: CouponStatus;
  coupon_scope: CouponScope;
  applicable_product_ids: number[];
  applicable_category_ids: number[];
  applicable_subcategory_ids: number[];
};
type Option = { value: number; label: string };
type ProductRecord = { id: number | string; name?: string };
type ProductResponse = {
  products?: ProductRecord[];
  pagination?: { totalPages?: number | string };
};
type CategoryRecord = { id: number | string; name?: string };
type Props = { onBackPress: () => void };
type SelectionField =
  | 'applicable_product_ids'
  | 'applicable_category_ids'
  | 'applicable_subcategory_ids';

const emptyCoupon: CouponForm = {
  code: '',
  name: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order_value: '0',
  start_date: '',
  expiry_date: '',
  usage_limit_global: '',
  usage_limit_per_customer: '1',
  status: 'active',
  coupon_scope: 'all',
  applicable_product_ids: [],
  applicable_category_ids: [],
  applicable_subcategory_ids: [],
};
const pageSize = 10;

const styles = StyleSheet.create({
  addCouponFab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

const normalizeIdArray = (value: unknown) => {
  let ids = value;
  if (typeof ids === 'string') {
    try {
      ids = JSON.parse(ids);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(ids)) return [];
  return ids
    .map(Number)
    .filter((id): id is number => Number.isSafeInteger(id) && id > 0);
};

const formatDateTimeInput = (value?: string) => {
  if (!value) return '';
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (match) return `${match[1]}T${match[2]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toLocalDateTimeInput = (date: Date) => {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const errorMessage = (error: unknown, fallback: string) => {
  if (typeof error !== 'object' || error === null) return fallback;
  if (
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message;
  }
  return 'message' in error && typeof error.message === 'string'
    ? error.message
    : fallback;
};

const labelForScope = (scope?: CouponScope) =>
  ({
    all: 'All products',
    first_order_only: 'First order only',
    new_customers_only: 'New customers only',
    specific_products: 'Specific products',
    specific_categories: 'Specific categories',
  })[scope || 'all'];

export default function Coupens({ onBackPress }: Props) {
  const insets = useSafeAreaInsets();
  const addCouponFabPosition = useMemo(
    () => ({ bottom: Math.max(insets.bottom, 12) + 16 }),
    [insets.bottom],
  );
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState<Coupon | null>(null);
  const [datePickerField, setDatePickerField] = useState<
    'start_date' | 'expiry_date' | null
  >(null);
  const [datePickerValue, setDatePickerValue] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'All' | CouponStatus
  >('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState<CouponForm>({ ...emptyCoupon });

  const fetchCoupons = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
      invalidateApiResponseCache();
    } else {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const { data } = await api.get<{ coupons?: Coupon[] }>('/coupons');
      if (!Array.isArray(data.coupons)) {
        throw new Error('The server returned an invalid coupon list.');
      }
      setCoupons(data.coupons);
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Coupens] Could not load coupons:', error);
      setLoadError(errorMessage(error, 'Could not load coupons.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsError(null);
    try {
      const [firstProducts, categoryResponse] = await Promise.all([
        api.get<ProductResponse | ProductRecord[]>('/products', {
          params: { page: 1, limit: 100 },
        }),
        api.get<CategoryRecord[] | { categories?: CategoryRecord[] }>('/categories'),
      ]);
      const productData = firstProducts.data;
      const allProducts = Array.isArray(productData)
        ? [...productData]
        : [...(productData.products || [])];
      const totalPages = Math.min(
        100,
        Math.max(
          1,
          Number(Array.isArray(productData) ? 1 : productData.pagination?.totalPages) ||
            1,
        ),
      );
      if (totalPages > 1) {
        const remainingPages = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            api.get<ProductResponse | ProductRecord[]>('/products', {
              params: { page: index + 2, limit: 100 },
            }),
          ),
        );
        remainingPages.forEach(({ data }) => {
          if (!Array.isArray(data) && Array.isArray(data.products)) {
            allProducts.push(...data.products);
          } else if (Array.isArray(data)) {
            allProducts.push(...data);
          }
        });
      }
      setProducts(
        allProducts
          .filter(
            product =>
              Number.isSafeInteger(Number(product.id)) && Number(product.id) > 0,
          )
          .map(product => ({
            value: Number(product.id),
            label: product.name || `Product ${product.id}`,
          })),
      );
      const categoryData = Array.isArray(categoryResponse.data)
        ? categoryResponse.data
        : categoryResponse.data.categories || [];
      setCategories(
        categoryData
          .filter(
            category =>
              Number.isSafeInteger(Number(category.id)) &&
              Number(category.id) > 0,
          )
          .map(category => ({
            value: Number(category.id),
            label: category.name || `Category ${category.id}`,
          })),
      );
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Coupens] Could not load coupon options:', error);
      setOptionsError(
        errorMessage(error, 'Could not load products and categories.'),
      );
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
    fetchOptions();
  }, [fetchCoupons, fetchOptions]);

  const filteredCoupons = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return coupons.filter(coupon => {
      const matchesSearch = !query ||
        [coupon.code, coupon.name].some(value =>
          String(value || '').toLowerCase().includes(query),
        );
      const matchesStatus =
        statusFilter === 'All' || coupon.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [coupons, searchTerm, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredCoupons.length / pageSize));
  const currentCoupons = filteredCoupons.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const activeCount = coupons.filter(coupon => coupon.status === 'active').length;
  const inactiveCount = coupons.length - activeCount;

  const openForm = (coupon?: Coupon) => {
    setCurrentCoupon(coupon || null);
    setForm(
      coupon
        ? {
            ...emptyCoupon,
            ...coupon,
            code: coupon.code || '',
            name: coupon.name || '',
            description: coupon.description || '',
            discount_value: String(coupon.discount_value ?? ''),
            min_order_value: String(coupon.min_order_value ?? '0'),
            usage_limit_global:
              coupon.usage_limit_global == null
                ? ''
                : String(coupon.usage_limit_global),
            usage_limit_per_customer: String(
              coupon.usage_limit_per_customer ?? '1',
            ),
            start_date: formatDateTimeInput(coupon.start_date),
            expiry_date: formatDateTimeInput(coupon.expiry_date),
            applicable_product_ids: normalizeIdArray(
              coupon.applicable_product_ids,
            ),
            applicable_category_ids: normalizeIdArray(
              coupon.applicable_category_ids,
            ),
            applicable_subcategory_ids: normalizeIdArray(
              coupon.applicable_subcategory_ids,
            ),
          }
        : {
            ...emptyCoupon,
            applicable_product_ids: [],
            applicable_category_ids: [],
            applicable_subcategory_ids: [],
          },
    );
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setCurrentCoupon(null);
  };

  const setFormField = <K extends keyof CouponForm>(
    field: K,
    value: CouponForm[K],
  ) => setForm(current => ({ ...current, [field]: value }));

  const openDatePicker = (field: 'start_date' | 'expiry_date') => {
    const savedValue = form[field] ? new Date(form[field]) : new Date();
    const initialValue = Number.isNaN(savedValue.getTime())
      ? new Date()
      : savedValue;
    if (Platform.OS === 'ios') {
      setDatePickerField(field);
      setDatePickerValue(initialValue);
      return;
    }

    DateTimePickerAndroid.open({
      value: initialValue,
      mode: 'date',
      onChange: (dateEvent, selectedDate) => {
        if (dateEvent.type !== 'set' || !selectedDate) return;
        const selectedDateTime = new Date(selectedDate);
        selectedDateTime.setHours(
          initialValue.getHours(),
          initialValue.getMinutes(),
          0,
          0,
        );
        DateTimePickerAndroid.open({
          value: selectedDateTime,
          mode: 'time',
          onChange: (timeEvent, selectedTime) => {
            if (timeEvent.type !== 'set' || !selectedTime) return;
            selectedDateTime.setHours(
              selectedTime.getHours(),
              selectedTime.getMinutes(),
              0,
              0,
            );
            setFormField(field, toLocalDateTimeInput(selectedDateTime));
          },
        });
      },
    });
  };

  const closeDatePicker = (save: boolean) => {
    if (save && datePickerField) {
      setFormField(
        datePickerField,
        toLocalDateTimeInput(datePickerValue),
      );
    }
    setDatePickerField(null);
  };

  const renderDatePickerField = (
    label: string,
    field: 'start_date' | 'expiry_date',
  ) => (
    <View className="mb-3">
      <Text className="mb-1 text-[11px] font-bold text-[#334155]">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Choose ${label.toLowerCase()}`}
        onPress={() => openDatePicker(field)}
        className="flex-row items-center rounded-[11px] border border-[#E2E8F0] px-3 py-3">
        <CalendarDays size={16} color="#F97316" />
        <Text
          className={[
            'ml-2 flex-1 text-[12px]',
            form[field] ? 'text-[#1E293B]' : 'text-[#94A3B8]',
          ].join(' ')}>
          {form[field]
            ? formatDate(form[field])
            : 'Select date and time'}
        </Text>
      </Pressable>
    </View>
  );

  const toggleSelection = (field: SelectionField, id: number) => {
    setForm(current => ({
      ...current,
      [field]: current[field].includes(id)
        ? current[field].filter(selectedId => selectedId !== id)
        : [...current[field], id],
    }));
  };

  const handleSubmit = async () => {
    const discount = Number(form.discount_value);
    const minimum = Number(form.min_order_value);
    const perCustomer = Number(form.usage_limit_per_customer);
    const globalLimit = form.usage_limit_global
      ? Number(form.usage_limit_global)
      : null;
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(form.code.trim())) {
      Alert.alert(
        'Invalid coupon code',
        'Use letters, numbers, underscores, or hyphens; start with a letter or number.',
      );
      return;
    }
    if (!form.name.trim()) {
      Alert.alert('Name required', 'Enter a name for this coupon.');
      return;
    }
    if (
      !Number.isFinite(discount) ||
      discount <= 0 ||
      (form.discount_type === 'percentage' && discount > 100)
    ) {
      Alert.alert(
        'Invalid discount',
        form.discount_type === 'percentage'
          ? 'Percentage discount must be greater than 0 and no more than 100.'
          : 'Discount value must be greater than 0.',
      );
      return;
    }
    if (!form.start_date || !form.expiry_date) {
      Alert.alert('Dates required', 'Enter both the start and expiry date/time.');
      return;
    }
    const startTime = new Date(form.start_date).getTime();
    const expiryTime = new Date(form.expiry_date).getTime();
    if (
      Number.isNaN(startTime) ||
      Number.isNaN(expiryTime) ||
      expiryTime <= startTime
    ) {
      Alert.alert(
        'Invalid dates',
        'Enter valid dates, and make the expiry later than the start.',
      );
      return;
    }
    if (
      !Number.isFinite(minimum) ||
      minimum < 0 ||
      !Number.isInteger(perCustomer) ||
      perCustomer < 1 ||
      (globalLimit !== null &&
        (!Number.isInteger(globalLimit) || globalLimit < 1))
    ) {
      Alert.alert(
        'Invalid usage limits',
        'Minimum order value must be 0 or higher. Usage limits must be positive whole numbers.',
      );
      return;
    }
    if (
      (form.coupon_scope === 'specific_products' &&
        form.applicable_product_ids.length === 0) ||
      (form.coupon_scope === 'specific_categories' &&
        form.applicable_category_ids.length === 0)
    ) {
      Alert.alert(
        'Selection required',
        'Select at least one product or category for this coupon.',
      );
      return;
    }

    setSaving(true);
    try {
      const response = currentCoupon
        ? await api.put<{ success?: boolean }>(
            `/coupons/${currentCoupon.id}`,
            form,
          )
        : await api.post<{ success?: boolean }>('/coupons', form);
      if (!response.data.success) {
        throw new Error('The coupon was not saved.');
      }
      setFormOpen(false);
      setCurrentCoupon(null);
      await fetchCoupons();
      Alert.alert(
        currentCoupon ? 'Coupon updated' : 'Coupon created',
        currentCoupon
          ? 'Coupon updated successfully.'
          : 'Coupon created successfully.',
      );
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Coupens] Could not save coupon:', error);
      Alert.alert(
        'Could not save coupon',
        errorMessage(error, 'Could not save this coupon.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (coupon: Coupon) => {
    Alert.alert(
      'Delete coupon?',
      `Delete coupon "${coupon.code}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(coupon.id);
            try {
              await api.delete(`/coupons/${coupon.id}`);
              const nextCoupons = coupons.filter(
                entry => entry.id !== coupon.id,
              );
              setCoupons(nextCoupons);
              const matchingCount = nextCoupons.filter(entry => {
                const query = searchTerm.trim().toLowerCase();
                const matchesSearch =
                  !query ||
                  [entry.code, entry.name].some(value =>
                    String(value || '').toLowerCase().includes(query),
                  );
                return (
                  matchesSearch &&
                  (statusFilter === 'All' || entry.status === statusFilter)
                );
              }).length;
              setCurrentPage(page =>
                Math.min(page, Math.max(1, Math.ceil(matchingCount / pageSize))),
              );
            } catch (error: unknown) {
              if (__DEV__) console.warn('[Coupens] Could not delete coupon:', error);
              Alert.alert(
                'Could not delete coupon',
                errorMessage(error, 'Could not delete this coupon.'),
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const renderOptions = (
    options: Option[],
    field: SelectionField,
    emptyMessage: string,
  ) => (
    <View className="mb-3 rounded-[14px] border border-[#FCE6D7] bg-[#FFF7ED] p-3">
      {optionsLoading ? (
        <View className="flex-row items-center">
          <ActivityIndicator size="small" color="#F97316" />
          <Text className="ml-2 text-[10px] text-[#64748B]">
            Loading options...
          </Text>
        </View>
      ) : optionsError ? (
        <View>
          <Text className="text-[10px] text-[#B91C1C]">{optionsError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={fetchOptions}
            className="mt-2 self-start">
            <Text className="text-[10px] font-bold text-[#991B1B]">
              Retry loading options
            </Text>
          </Pressable>
        </View>
      ) : options.length ? (
        <View className="max-h-[190px]">
          <ScrollView nestedScrollEnabled>
            {options.map(option => {
              const selected = form[field].includes(option.value);
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => toggleSelection(field, option.value)}
                  className="mb-1 flex-row items-center rounded-[9px] bg-white px-3 py-2.5">
                  <View
                    className={[
                      'mr-2 h-4 w-4 items-center justify-center rounded border',
                      selected
                        ? 'border-[#F97316] bg-[#F97316]'
                        : 'border-[#CBD5E1]',
                    ].join(' ')}>
                    {selected ? <Text className="text-[10px] font-bold text-white">✓</Text> : null}
                  </View>
                  <Text
                    numberOfLines={1}
                    className="flex-1 text-[10px] text-[#334155]">
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        <Text className="text-[10px] text-[#64748B]">{emptyMessage}</Text>
      )}
    </View>
  );

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <TopHeader
        pageTitle="Coupons"
        pageSubtitle="Create and manage discount coupons"
        onBackPress={onBackPress}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchCoupons(true)}
            tintColor="#F97316"
            colors={['#F97316']}
          />
        }
        contentContainerClassName="px-4 pb-[130px]"
        style={{ paddingTop: insets.top + 76 }}>
        <View className="mb-3 flex-row">
          {[
            { label: 'Total coupons', value: coupons.length, Icon: Tag, color: '#C2410C' },
            { label: 'Active', value: activeCount, Icon: BadgeCheck, color: '#15803D' },
            { label: 'Inactive', value: inactiveCount, Icon: CircleAlert, color: '#B45309' },
          ].map((stat, index) => (
            <View
              key={stat.label}
              className={[
                'flex-1 rounded-[14px] border border-[#FCE6D7] bg-white p-3',
                index ? 'ml-2' : '',
              ].join(' ')}>
              <stat.Icon size={18} color={stat.color} />
              <Text className="mt-2 text-[20px] font-black text-[#17191C]">
                {stat.value}
              </Text>
              <Text className="mt-1 text-[9px] text-[#64748B]">
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        <View className="mb-3 rounded-[14px] border border-[#ECE8E2] bg-white p-3">
          <View className="flex-row items-center rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] px-3">
            <Search size={16} color="#94A3B8" />
            <TextInput
              value={searchTerm}
              onChangeText={value => {
                setSearchTerm(value);
                setCurrentPage(1);
              }}
              placeholder="Search code or name..."
              accessibilityLabel="Search coupons"
              className="ml-2 flex-1 py-2.5 text-[12px] text-[#1E293B]"
            />
            {searchTerm ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear coupon search"
                onPress={() => {
                  setSearchTerm('');
                  setCurrentPage(1);
                }}>
                <X size={15} color="#94A3B8" />
              </Pressable>
            ) : null}
          </View>
          <View className="mt-2 flex-row">
            {(['All', 'active', 'inactive'] as const).map(filter => (
              <Pressable
                key={filter}
                accessibilityRole="button"
                accessibilityState={{ selected: statusFilter === filter }}
                onPress={() => {
                  setStatusFilter(filter);
                  setCurrentPage(1);
                }}
                className={[
                  'mr-2 rounded-full px-3 py-1.5',
                  statusFilter === filter ? 'bg-[#FFF1D6]' : 'bg-[#F1F5F9]',
                ].join(' ')}>
                <Text
                  className={[
                    'text-[10px] font-bold capitalize',
                    statusFilter === filter
                      ? 'text-[#C2410C]'
                      : 'text-[#64748B]',
                  ].join(' ')}>
                  {filter === 'All' ? 'All statuses' : filter}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {loading ? (
          <View className="items-center rounded-[14px] bg-white py-10">
            <ActivityIndicator color="#F97316" />
            <Text className="mt-2 text-[11px] text-[#64748B]">
              Loading coupons...
            </Text>
          </View>
        ) : loadError ? (
          <View className="rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] p-4">
            <Text className="text-[11px] text-[#B91C1C]">{loadError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => fetchCoupons()}
              className="mt-2 self-start">
              <Text className="text-[11px] font-bold text-[#991B1B]">Retry</Text>
            </Pressable>
          </View>
        ) : currentCoupons.length ? (
          currentCoupons.map((coupon, index) => (
            <View
              key={coupon.id}
              className="mb-3 rounded-[16px] border border-[#ECE8E2] bg-white p-3">
              <View className="flex-row items-start">
                <View className="h-11 w-11 items-center justify-center rounded-[12px] bg-[#FFF1D6]">
                  <Tag size={20} color="#C2410C" />
                </View>
                <View className="ml-3 flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-[12px] font-bold text-[#17191C]">
                    {coupon.name}
                  </Text>
                  <Text className="mt-1 text-[10px] font-bold uppercase text-[#64748B]">
                    {coupon.code}
                  </Text>
                </View>
                <Text
                  className={[
                    'rounded-full px-2.5 py-1 text-[9px] font-bold uppercase',
                    coupon.status === 'active'
                      ? 'bg-[#DCFCE7] text-[#15803D]'
                      : 'bg-[#F1F5F9] text-[#64748B]',
                  ].join(' ')}>
                  {coupon.status}
                </Text>
              </View>
              <View className="mt-3 flex-row items-center justify-between">
                <Text className="text-[15px] font-black text-[#C2410C]">
                  {coupon.discount_type === 'percentage'
                    ? `${coupon.discount_value}% OFF`
                    : `₹${coupon.discount_value} OFF`}
                </Text>
                <Text className="text-[9px] font-semibold capitalize text-[#64748B]">
                  {labelForScope(coupon.coupon_scope)}
                </Text>
              </View>
              {coupon.description ? (
                <Text
                  numberOfLines={2}
                  className="mt-2 text-[10px] text-[#64748B]">
                  {coupon.description}
                </Text>
              ) : null}
              <View className="mt-3 flex-row items-center justify-between border-t border-[#F1F5F9] pt-2">
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <CalendarDays size={12} color="#94A3B8" />
                    <Text className="ml-1 text-[9px] text-[#64748B]">
                      {formatDate(coupon.start_date)}
                    </Text>
                  </View>
                  <Text className="mt-1 text-[9px] text-[#64748B]">
                    Expires: {formatDate(coupon.expiry_date)}
                  </Text>
                  <Text className="mt-1 text-[9px] text-[#64748B]">
                    Used {coupon.usage_count || 0}
                    {coupon.usage_limit_global
                      ? ` / ${coupon.usage_limit_global}`
                      : ' times'}
                  </Text>
                </View>
                <Text className="mr-3 text-[9px] font-semibold text-[#64748B]">
                  #{(currentPage - 1) * pageSize + index + 1}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit coupon ${coupon.code}`}
                  onPress={() => openForm(coupon)}
                  className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-[#FFF1D6]">
                  <Pencil size={14} color="#C2410C" />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete coupon ${coupon.code}`}
                  disabled={deletingId === coupon.id}
                  onPress={() => handleDelete(coupon)}
                  className="h-8 w-8 items-center justify-center rounded-full bg-[#FEF2F2]">
                  {deletingId === coupon.id ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <Trash2 size={14} color="#DC2626" />
                  )}
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <View className="items-center rounded-[14px] bg-white px-5 py-10">
            <Tag size={23} color="#C2410C" />
            <Text className="mt-3 text-[12px] font-bold text-[#17191C]">
              No coupons found
            </Text>
            <Text className="mt-1 text-[10px] text-[#64748B]">
              Create a coupon or adjust your search and status filter.
            </Text>
          </View>
        )}

        {filteredCoupons.length > 0 ? (
          <View className="mb-4 flex-row items-center justify-between rounded-[12px] bg-white px-3 py-2">
            <Text className="flex-1 text-[9px] font-semibold text-[#64748B]">
              Showing {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, filteredCoupons.length)} of{' '}
              {filteredCoupons.length}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous coupon page"
              disabled={currentPage === 1}
              onPress={() => setCurrentPage(page => Math.max(1, page - 1))}
              className="mr-2 h-9 w-9 items-center justify-center rounded-[10px] border border-[#E2E8F0]">
              <ChevronLeft
                size={17}
                color={currentPage === 1 ? '#CBD5E1' : '#475569'}
              />
            </Pressable>
            <Text className="mr-2 text-[10px] font-bold text-[#334155]">
              {currentPage}/{totalPages}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next coupon page"
              disabled={currentPage === totalPages}
              onPress={() =>
                setCurrentPage(page => Math.min(totalPages, page + 1))
              }
              className="h-9 w-9 items-center justify-center rounded-[10px] border border-[#E2E8F0]">
              <ChevronRight
                size={17}
                color={currentPage === totalPages ? '#CBD5E1' : '#475569'}
              />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add new coupon"
        onPress={() => openForm()}
        style={[styles.addCouponFab, addCouponFabPosition]}>
        <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>

      <Modal
        visible={formOpen}
        transparent
        animationType="slide"
        onRequestClose={closeForm}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/50">
          <View className="max-h-[94%] rounded-t-[24px] bg-white">
            <View className="flex-row items-center justify-between border-b border-[#F1F5F9] px-5 py-4">
              <View>
                <Text className="text-[17px] font-black text-[#17191C]">
                  {currentCoupon ? 'Edit coupon' : 'Create new coupon'}
                </Text>
                <Text className="mt-1 text-[10px] text-[#64748B]">
                  Manage discount settings and limits
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close coupon form"
                disabled={saving}
                onPress={closeForm}
                className="h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9]">
                <X size={18} color="#475569" />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerClassName="px-5 pb-4 pt-3">
              <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                Coupon code *
              </Text>
              <TextInput
                value={form.code}
                onChangeText={value => setFormField('code', value.toUpperCase())}
                placeholder="e.g. SUMMER50"
                maxLength={64}
                autoCapitalize="characters"
                className="mb-3 rounded-[11px] border border-[#E2E8F0] px-3 py-2.5 text-[13px] text-[#1E293B]"
              />
              <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                Coupon name *
              </Text>
              <TextInput
                value={form.name}
                onChangeText={value => setFormField('name', value)}
                placeholder="e.g. Summer special sale"
                maxLength={160}
                className="mb-3 rounded-[11px] border border-[#E2E8F0] px-3 py-2.5 text-[13px] text-[#1E293B]"
              />
              <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                Description
              </Text>
              <TextInput
                value={form.description}
                onChangeText={value => setFormField('description', value)}
                placeholder="Brief description of the coupon..."
                maxLength={5000}
                multiline
                textAlignVertical="top"
                className="mb-3 min-h-[76px] rounded-[11px] border border-[#E2E8F0] px-3 py-2.5 text-[13px] text-[#1E293B]"
              />
              <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                Discount type and value *
              </Text>
              <View className="mb-3 flex-row">
                {(['percentage', 'fixed'] as const).map(type => (
                  <Pressable
                    key={type}
                    accessibilityRole="button"
                    accessibilityState={{ selected: form.discount_type === type }}
                    onPress={() => setFormField('discount_type', type)}
                    className={[
                      'mr-2 rounded-[9px] px-3 py-2',
                      form.discount_type === type
                        ? 'bg-[#FFF1D6]'
                        : 'bg-[#F1F5F9]',
                    ].join(' ')}>
                    <Text
                      className={[
                        'text-[10px] font-bold',
                        form.discount_type === type
                          ? 'text-[#C2410C]'
                          : 'text-[#64748B]',
                      ].join(' ')}>
                      {type === 'percentage' ? 'Percentage (%)' : 'Fixed amount'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={form.discount_value}
                onChangeText={value => setFormField('discount_value', value)}
                placeholder="Discount value"
                keyboardType="decimal-pad"
                className="mb-3 rounded-[11px] border border-[#E2E8F0] px-3 py-2.5 text-[13px] text-[#1E293B]"
              />

              {([
                {
                  label: 'Minimum order value',
                  field: 'min_order_value',
                  placeholder: '0',
                },
                {
                  label: 'Global usage limit',
                  field: 'usage_limit_global',
                  placeholder: 'Unlimited',
                },
                {
                  label: 'Usage limit per customer *',
                  field: 'usage_limit_per_customer',
                  placeholder: '1',
                },
              ] as const).map(({ label, field, placeholder }) => (
                <View key={field}>
                  <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                    {label}
                  </Text>
                  <TextInput
                    value={form[field]}
                    onChangeText={value => setFormField(field, value)}
                    placeholder={placeholder}
                    keyboardType="decimal-pad"
                    className="mb-3 rounded-[11px] border border-[#E2E8F0] px-3 py-2.5 text-[13px] text-[#1E293B]"
                  />
                </View>
              ))}
              {renderDatePickerField('Start date & time *', 'start_date')}
              {renderDatePickerField('Expiry date & time *', 'expiry_date')}

              <Text className="mb-2 text-[11px] font-bold text-[#334155]">
                Status
              </Text>
              <View className="mb-3 flex-row">
                {(['active', 'inactive'] as const).map(status => (
                  <Pressable
                    key={status}
                    accessibilityRole="button"
                    accessibilityState={{ selected: form.status === status }}
                    onPress={() => setFormField('status', status)}
                    className={[
                      'mr-2 rounded-full px-3 py-1.5',
                      form.status === status
                        ? 'bg-[#FFF1D6]'
                        : 'bg-[#F1F5F9]',
                    ].join(' ')}>
                    <Text
                      className={[
                        'text-[10px] font-bold capitalize',
                        form.status === status
                          ? 'text-[#C2410C]'
                          : 'text-[#64748B]',
                      ].join(' ')}>
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                Coupon applies to *
              </Text>
              <View className="mb-3 flex-row flex-wrap">
                {(
                  [
                    'all',
                    'first_order_only',
                    'new_customers_only',
                    'specific_products',
                    'specific_categories',
                  ] as const
                ).map(scope => (
                  <Pressable
                    key={scope}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: form.coupon_scope === scope,
                    }}
                    onPress={() => setFormField('coupon_scope', scope)}
                    className={[
                      'mb-2 mr-2 rounded-full px-3 py-1.5',
                      form.coupon_scope === scope
                        ? 'bg-[#FFF1D6]'
                        : 'bg-[#F1F5F9]',
                    ].join(' ')}>
                    <Text
                      className={[
                        'text-[9px] font-bold',
                        form.coupon_scope === scope
                          ? 'text-[#C2410C]'
                          : 'text-[#64748B]',
                      ].join(' ')}>
                      {labelForScope(scope)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {form.coupon_scope === 'specific_products'
                ? renderOptions(
                    products,
                    'applicable_product_ids',
                    'No products available.',
                  )
                : null}
              {form.coupon_scope === 'specific_categories'
                ? renderOptions(
                    categories,
                    'applicable_category_ids',
                    'No categories available.',
                  )
                : null}
            </ScrollView>
            <View
              className="flex-row justify-end border-t border-[#F1F5F9] px-5 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={closeForm}
                className="mr-2 rounded-[11px] px-4 py-3">
                <Text className="text-[12px] font-bold text-[#475569]">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={handleSubmit}
                className="flex-row items-center rounded-[11px] bg-[#F97316] px-4 py-3">
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <CalendarDays size={15} color="#FFFFFF" />
                )}
                <Text className="ml-2 text-[12px] font-bold text-white">
                  {saving
                    ? 'Saving...'
                    : currentCoupon
                      ? 'Save changes'
                      : 'Create coupon'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {Platform.OS === 'ios' ? (
        <Modal
          visible={datePickerField !== null}
          transparent
          animationType="fade"
          onRequestClose={() => closeDatePicker(false)}>
          <View className="flex-1 justify-end bg-black/50">
            <View className="rounded-t-[22px] bg-white pb-6">
              <View className="flex-row items-center justify-between border-b border-[#F1F5F9] px-5 py-4">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => closeDatePicker(false)}>
                  <Text className="text-[12px] font-semibold text-[#64748B]">
                    Cancel
                  </Text>
                </Pressable>
                <Text className="text-[13px] font-bold text-[#17191C]">
                  {datePickerField === 'start_date' ? 'Start date' : 'Expiry date'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => closeDatePicker(true)}>
                  <Text className="text-[12px] font-bold text-[#C2410C]">
                    Done
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={datePickerValue}
                mode="datetime"
                display="spinner"
                onChange={(_, date) => {
                  if (date) setDatePickerValue(date);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}