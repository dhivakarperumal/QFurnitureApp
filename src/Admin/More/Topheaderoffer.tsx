import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  BadgeCheck,
  CircleAlert,
  Eye,
  Gift,
  Heart,
  Percent,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Tag,
  Trash2,
  X,
  Zap,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { invalidateApiResponseCache } from '../../api';
import TopHeader from '../Navigation/TopHeader';

type Offer = {
  id: number | string;
  title?: string;
  offer_percentage?: number | string;
  description?: string | null;
  icon?: string;
  status?: string;
  show_in_header?: boolean | number | string;
};

type IconName =
  | 'Tag'
  | 'Sparkles'
  | 'ShoppingBag'
  | 'Gift'
  | 'Zap'
  | 'Percent'
  | 'Heart'
  | 'Star'
  | 'ShoppingCart';
type OfferForm = {
  title: string;
  offer_percentage: string;
  description: string;
  icon: IconName;
  status: 'active' | 'inactive';
  show_in_header: boolean;
};
type Props = { onBackPress: () => void };

const offerIcons = {
  Tag,
  Sparkles,
  ShoppingBag,
  Gift,
  Zap,
  Percent,
  Heart,
  Star,
  ShoppingCart,
};
const iconNames = Object.keys(offerIcons) as IconName[];
const emptyForm: OfferForm = {
  title: '',
  offer_percentage: '',
  description: '',
  icon: 'Tag',
  status: 'active',
  show_in_header: false,
};

const styles = StyleSheet.create({
  addOfferFab: {
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

const headerVisible = (value?: Offer['show_in_header']) =>
  value === true || value === 1 || value === '1' || value === 'true';

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

export default function Topheaderoffer({ onBackPress }: Props) {
  const insets = useSafeAreaInsets();
  const addOfferFabPosition = useMemo(
    () => ({ bottom: Math.max(insets.bottom, 12) + 16 }),
    [insets.bottom],
  );
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [activeOffer, setActiveOffer] = useState<Offer | null>(null);
  const [viewingOffer, setViewingOffer] = useState<Offer | null>(null);
  const [form, setForm] = useState<OfferForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [updatingHeaderIds, setUpdatingHeaderIds] = useState<Set<number | string>>(
    () => new Set(),
  );

  const fetchOffers = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
      invalidateApiResponseCache();
    } else {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const { data } = await api.get<{ offers?: Offer[] }>('/offers/admin');
      if (!Array.isArray(data.offers)) {
        throw new Error('The server returned an invalid offers list.');
      }
      setOffers(data.offers);
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Topheaderoffer] Could not load offers:', error);
      setLoadError(errorMessage(error, 'Could not load offers.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return offers.filter(offer => {
      const matchesSearch =
        !query ||
        String(offer.title || '').toLowerCase().includes(query) ||
        String(offer.id).toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === 'all' || (offer.status || 'active') === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [offers, search, statusFilter]);
  const activeCount = offers.filter(offer => offer.status === 'active').length;
  const inactiveCount = offers.length - activeCount;
  const headerOfferCount = offers.filter(
    offer => offer.status === 'active' && headerVisible(offer.show_in_header),
  ).length;

  const openCreateForm = () => {
    setActiveOffer(null);
    setForm({ ...emptyForm });
    setFormOpen(true);
  };

  const openEditForm = (offer: Offer) => {
    setActiveOffer(offer);
    setForm({
      title: offer.title || '',
      offer_percentage: String(offer.offer_percentage ?? ''),
      description: offer.description || '',
      icon: iconNames.includes(offer.icon as IconName)
        ? (offer.icon as IconName)
        : 'Tag',
      status: offer.status === 'inactive' ? 'inactive' : 'active',
      show_in_header: headerVisible(offer.show_in_header),
    });
    setFormOpen(true);
  };

  const setFormField = <K extends keyof OfferForm>(
    field: K,
    value: OfferForm[K],
  ) => setForm(current => ({ ...current, [field]: value }));

  const saveOffer = async () => {
    const percentage = Number(form.offer_percentage);
    if (!form.title.trim()) {
      Alert.alert('Title required', 'Enter a title for this offer.');
      return;
    }
    if (
      !form.offer_percentage.trim() ||
      !Number.isFinite(percentage) ||
      percentage < 0 ||
      percentage > 100
    ) {
      Alert.alert('Invalid percentage', 'Offer percentage must be between 0 and 100.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        offer_percentage: percentage,
      };
      if (activeOffer) {
        await api.put(`/offers/${activeOffer.id}`, payload);
      } else {
        await api.post('/offers', payload);
      }
      setFormOpen(false);
      await fetchOffers();
      Alert.alert(
        activeOffer ? 'Offer updated' : 'Offer created',
        activeOffer ? 'The offer has been updated.' : 'The offer has been created.',
      );
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Topheaderoffer] Could not save offer:', error);
      Alert.alert('Could not save offer', errorMessage(error, 'Could not save this offer.'));
    } finally {
      setSaving(false);
    }
  };

  const updateHeaderVisibility = async (offer: Offer, showInHeader: boolean) => {
    const previousValue = headerVisible(offer.show_in_header);
    setUpdatingHeaderIds(current => new Set(current).add(offer.id));
    setOffers(current =>
      current.map(item =>
        item.id === offer.id ? { ...item, show_in_header: showInHeader } : item,
      ),
    );
    try {
      await api.patch(`/offers/${offer.id}/header`, {
        show_in_header: showInHeader,
      });
    } catch (error: unknown) {
      setOffers(current =>
        current.map(item =>
          item.id === offer.id
            ? { ...item, show_in_header: previousValue }
            : item,
        ),
      );
      if (__DEV__) console.warn('[Topheaderoffer] Could not update header offer:', error);
      Alert.alert(
        'Could not update header visibility',
        errorMessage(error, `Could not update "${offer.title || 'offer'}".`),
      );
    } finally {
      setUpdatingHeaderIds(current => {
        const next = new Set(current);
        next.delete(offer.id);
        return next;
      });
    }
  };

  const deleteOffer = (offer: Offer) => {
    Alert.alert(
      'Delete offer?',
      `Delete "${offer.title || 'this offer'}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(offer.id);
            try {
              await api.delete(`/offers/${offer.id}`);
              setOffers(current => current.filter(item => item.id !== offer.id));
            } catch (error: unknown) {
              if (__DEV__) console.warn('[Topheaderoffer] Could not delete offer:', error);
              Alert.alert(
                'Could not delete offer',
                errorMessage(error, 'Could not delete this offer.'),
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const editViewedOffer = () => {
    if (viewingOffer) openEditForm(viewingOffer);
    setViewingOffer(null);
  };

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <TopHeader
        pageTitle="Offers"
        pageSubtitle="Manage discounts and website header offers"
        onBackPress={onBackPress}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchOffers(true)}
            tintColor="#F97316"
            colors={['#F97316']}
          />
        }
        contentContainerClassName="px-4 pb-[130px]"
        style={{ paddingTop: insets.top + 76 }}>
        <View className="mb-3 flex-row">
          {[
            { label: 'Total', value: offers.length, Icon: Tag, color: '#C2410C' },
            { label: 'Active', value: activeCount, Icon: BadgeCheck, color: '#15803D' },
            { label: 'Inactive', value: inactiveCount, Icon: CircleAlert, color: '#B45309' },
            { label: 'Header', value: headerOfferCount, Icon: ShoppingBag, color: '#BE185D' },
          ].map((stat, index) => (
            <View
              key={stat.label}
              className={[
                'flex-1 rounded-[14px] border border-[#FCE6D7] bg-white p-2.5',
                index ? 'ml-2' : '',
              ].join(' ')}>
              <stat.Icon size={17} color={stat.color} />
              <Text className="mt-2 text-[18px] font-black text-[#17191C]">
                {stat.value}
              </Text>
              <Text className="mt-0.5 text-[9px] text-[#64748B]">
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        <View className="mb-3 rounded-[14px] border border-[#ECE8E2] bg-white p-3">
          <View className="flex-row items-center rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] px-3">
            <Search size={16} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search title or offer ID..."
              accessibilityLabel="Search offers"
              className="ml-2 flex-1 py-2.5 text-[12px] text-[#1E293B]"
            />
            {search ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear offer search"
                onPress={() => setSearch('')}>
                <X size={15} color="#94A3B8" />
              </Pressable>
            ) : null}
          </View>
          <View className="mt-2 flex-row">
            {(['all', 'active', 'inactive'] as const).map(filter => (
              <Pressable
                key={filter}
                accessibilityRole="button"
                accessibilityState={{ selected: statusFilter === filter }}
                onPress={() => setStatusFilter(filter)}
                className={[
                  'mr-2 rounded-full px-3 py-1.5',
                  statusFilter === filter ? 'bg-[#FFF1D6]' : 'bg-[#F1F5F9]',
                ].join(' ')}>
                <Text
                  className={[
                    'text-[10px] font-bold capitalize',
                    statusFilter === filter ? 'text-[#C2410C]' : 'text-[#64748B]',
                  ].join(' ')}>
                  {filter === 'all' ? 'All statuses' : filter}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="mb-2 flex-row items-center">
          <Text className="text-[14px] font-black text-[#17191C]">Offer list</Text>
        </View>

        {loading ? (
          <View className="items-center rounded-[14px] bg-white py-10">
            <ActivityIndicator color="#F97316" />
            <Text className="mt-2 text-[11px] text-[#64748B]">Loading offers...</Text>
          </View>
        ) : loadError ? (
          <View className="rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] p-4">
            <Text className="text-[11px] text-[#B91C1C]">{loadError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => fetchOffers()}
              className="mt-2 self-start">
              <Text className="text-[11px] font-bold text-[#991B1B]">Retry</Text>
            </Pressable>
          </View>
        ) : filteredOffers.length ? (
          filteredOffers.map(offer => {
            const iconName = iconNames.includes(offer.icon as IconName)
              ? (offer.icon as IconName)
              : 'Tag';
            const OfferIcon = offerIcons[iconName];
            const active = offer.status === 'active';
            const showInHeader = headerVisible(offer.show_in_header);
            return (
              <View
                key={offer.id}
                className="mb-3 rounded-[16px] border border-[#ECE8E2] bg-white p-3">
                <View className="flex-row items-start">
                  <View className="h-11 w-11 items-center justify-center rounded-[12px] bg-[#FFF1D6]">
                    <OfferIcon size={20} color="#C2410C" />
                  </View>
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-start justify-between">
                      <View className="mr-2 flex-1">
                        <Text
                          numberOfLines={1}
                          className="text-[12px] font-bold text-[#17191C]">
                          {offer.title || 'Untitled offer'}
                        </Text>
                        <Text className="mt-1 text-[9px] text-[#94A3B8]">
                          Offer ID #{offer.id}
                        </Text>
                      </View>
                      <Text
                        className={[
                          'rounded-full px-2.5 py-1 text-[9px] font-bold uppercase',
                          active ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#F1F5F9] text-[#64748B]',
                        ].join(' ')}>
                        {active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text className="mt-3 self-start rounded-[8px] bg-[#FEF3C7] px-3 py-1.5 text-[13px] font-black text-[#92400E]">
                  {Number(offer.offer_percentage) || 0}% OFF
                </Text>
                <Text className="mt-2 text-[10px] text-[#64748B]">
                  {offer.description || 'No description provided.'}
                </Text>
                <View className="mt-3 flex-row items-center justify-between border-t border-[#F1F5F9] pt-2">
                  <View className="flex-1 flex-row items-center">
                    <Switch
                      value={showInHeader}
                      disabled={updatingHeaderIds.has(offer.id)}
                      onValueChange={value => updateHeaderVisibility(offer, value)}
                      trackColor={{ false: '#CBD5E1', true: '#FDBA74' }}
                      thumbColor={showInHeader ? '#F97316' : '#F8FAFC'}
                      accessibilityLabel={`Show ${offer.title || 'offer'} in website header`}
                    />
                    <Text className="ml-1 flex-1 text-[9px] font-semibold text-[#64748B]">
                      Show in header
                    </Text>
                    {updatingHeaderIds.has(offer.id) ? (
                      <ActivityIndicator size="small" color="#F97316" />
                    ) : null}
                  </View>
                  <View className="ml-2 flex-row">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View offer ${offer.title || ''}`}
                      onPress={() => setViewingOffer(offer)}
                      className="mr-1 h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9]">
                      <Eye size={14} color="#475569" />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit offer ${offer.title || ''}`}
                      onPress={() => openEditForm(offer)}
                      className="mr-1 h-8 w-8 items-center justify-center rounded-full bg-[#FFF1D6]">
                      <Pencil size={14} color="#C2410C" />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete offer ${offer.title || ''}`}
                      disabled={deletingId === offer.id}
                      onPress={() => deleteOffer(offer)}
                      className="h-8 w-8 items-center justify-center rounded-full bg-[#FEF2F2]">
                      {deletingId === offer.id ? (
                        <ActivityIndicator size="small" color="#DC2626" />
                      ) : (
                        <Trash2 size={14} color="#DC2626" />
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View className="items-center rounded-[14px] bg-white px-5 py-10">
            <View className="h-12 w-12 items-center justify-center rounded-[14px] bg-[#FFF1D6]">
              <Tag size={22} color="#C2410C" />
            </View>
            <Text className="mt-3 text-center text-[12px] font-bold text-[#17191C]">
              {offers.length ? 'No matching offers' : 'No offers yet'}
            </Text>
            <Text className="mt-1 text-center text-[10px] text-[#64748B]">
              {offers.length
                ? 'Try another search or status filter.'
                : 'Create an offer to highlight a promotion.'}
            </Text>
          </View>
        )}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add offer"
        onPress={openCreateForm}
        style={[styles.addOfferFab, addOfferFabPosition]}>
        <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>

      <Modal
        visible={formOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!saving) setFormOpen(false);
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/50">
          <View className="max-h-[92%] rounded-t-[24px] bg-white">
            <View className="flex-row items-center justify-between border-b border-[#F1F5F9] px-5 py-4">
              <View>
                <Text className="text-[17px] font-black text-[#17191C]">
                  {activeOffer ? 'Edit offer' : 'Create new offer'}
                </Text>
                <Text className="mt-1 text-[10px] text-[#64748B]">
                  Manage offer details and visibility
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close offer form"
                disabled={saving}
                onPress={() => setFormOpen(false)}
                className="h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9]">
                <X size={18} color="#475569" />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerClassName="px-5 pb-4 pt-3">
              {activeOffer ? (
                <View className="mb-3 rounded-[10px] bg-[#F8FAFC] p-3">
                  <Text className="text-[10px] font-semibold text-[#64748B]">Offer ID</Text>
                  <Text className="mt-1 text-[12px] font-bold text-[#334155]">
                    #{activeOffer.id}
                  </Text>
                </View>
              ) : null}
              <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                Offer title *
              </Text>
              <TextInput
                value={form.title}
                onChangeText={value => setFormField('title', value)}
                placeholder="e.g. Mega Shopping Festival"
                maxLength={160}
                className="mb-3 rounded-[11px] border border-[#E2E8F0] px-3 py-2.5 text-[13px] text-[#1E293B]"
              />
              <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                Discount percentage *
              </Text>
              <View className="mb-3 flex-row items-center rounded-[11px] border border-[#E2E8F0] px-3">
                <TextInput
                  value={form.offer_percentage}
                  onChangeText={value => setFormField('offer_percentage', value)}
                  placeholder="10"
                  keyboardType="decimal-pad"
                  className="flex-1 py-2.5 text-[13px] text-[#1E293B]"
                />
                <Percent size={16} color="#94A3B8" />
              </View>
              <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                Offer icon
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-3">
                {iconNames.map(name => {
                  const Icon = offerIcons[name];
                  const selected = form.icon === name;
                  return (
                    <Pressable
                      key={name}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${name} offer icon`}
                      accessibilityState={{ selected }}
                      onPress={() => setFormField('icon', name)}
                      className={[
                        'mr-2 h-10 w-10 items-center justify-center rounded-[10px] border',
                        selected ? 'border-[#FDBA74] bg-[#FFF1D6]' : 'border-[#E2E8F0] bg-white',
                      ].join(' ')}>
                      <Icon size={17} color={selected ? '#C2410C' : '#64748B'} />
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                Description
              </Text>
              <TextInput
                value={form.description}
                onChangeText={value => setFormField('description', value)}
                placeholder="Explain what makes this offer special..."
                maxLength={5000}
                multiline
                textAlignVertical="top"
                className="mb-1 min-h-[90px] rounded-[11px] border border-[#E2E8F0] px-3 py-2.5 text-[13px] text-[#1E293B]"
              />
              <Text className="mb-3 text-right text-[9px] text-[#94A3B8]">
                {form.description.length}/5000
              </Text>
              <Text className="mb-2 text-[11px] font-bold text-[#334155]">
                Offer status
              </Text>
              <View className="mb-3 flex-row rounded-[10px] border border-[#E2E8F0] p-1">
                {(['active', 'inactive'] as const).map(status => (
                  <Pressable
                    key={status}
                    accessibilityRole="button"
                    accessibilityState={{ selected: form.status === status }}
                    onPress={() => setFormField('status', status)}
                    className={[
                      'flex-1 items-center rounded-[8px] py-2.5',
                      form.status === status ? 'bg-[#FFF1D6]' : '',
                    ].join(' ')}>
                    <Text
                      className={[
                        'text-[10px] font-bold capitalize',
                        form.status === status ? 'text-[#C2410C]' : 'text-[#64748B]',
                      ].join(' ')}>
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View className="mb-2 flex-row items-center justify-between rounded-[11px] border border-[#FCE6D7] bg-[#FFF7ED] px-3 py-2">
                <Text className="flex-1 text-[11px] font-bold text-[#334155]">
                  Show on website header
                </Text>
                <Switch
                  value={form.show_in_header}
                  onValueChange={value => setFormField('show_in_header', value)}
                  trackColor={{ false: '#CBD5E1', true: '#FDBA74' }}
                  thumbColor={form.show_in_header ? '#F97316' : '#F8FAFC'}
                />
              </View>
            </ScrollView>
            <View
              className="flex-row justify-end border-t border-[#F1F5F9] px-5 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => setFormOpen(false)}
                className="mr-2 rounded-[11px] px-4 py-3">
                <Text className="text-[12px] font-bold text-[#475569]">Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={saveOffer}
                className="flex-row items-center rounded-[11px] bg-[#F97316] px-4 py-3">
                {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
                <Text className="ml-2 text-[12px] font-bold text-white">
                  {saving
                    ? 'Saving...'
                    : activeOffer
                      ? 'Save changes'
                      : 'Create offer'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={viewingOffer !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingOffer(null)}>
        <View className="flex-1 justify-center bg-black/50 px-5">
          <View className="rounded-[20px] bg-white p-5">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 flex-row items-center">
                <View className="h-12 w-12 items-center justify-center rounded-[13px] bg-[#FFF1D6]">
                  {(() => {
                    const iconName = viewingOffer && iconNames.includes(viewingOffer.icon as IconName)
                      ? (viewingOffer.icon as IconName)
                      : 'Tag';
                    const Icon = offerIcons[iconName];
                    return <Icon size={21} color="#C2410C" />;
                  })()}
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-black text-[#17191C]">
                    {viewingOffer?.title}
                  </Text>
                  <Text className="mt-1 text-[10px] text-[#64748B]">
                    Offer ID #{viewingOffer?.id}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close offer details"
                onPress={() => setViewingOffer(null)}
                className="h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9]">
                <X size={16} color="#475569" />
              </Pressable>
            </View>
            <Text className="mt-5 text-[24px] font-black text-[#92400E]">
              {Number(viewingOffer?.offer_percentage) || 0}% OFF
            </Text>
            <View className="mt-4 flex-row">
              <View className="mr-2 flex-1 rounded-[11px] border border-[#E2E8F0] p-3">
                <Text className="text-[9px] font-semibold uppercase text-[#94A3B8]">
                  Status
                </Text>
                <Text className="mt-1 text-[11px] font-bold capitalize text-[#334155]">
                  {viewingOffer?.status || 'active'}
                </Text>
              </View>
              <View className="flex-1 rounded-[11px] border border-[#E2E8F0] p-3">
                <Text className="text-[9px] font-semibold uppercase text-[#94A3B8]">
                  Website header
                </Text>
                <Text className="mt-1 text-[11px] font-bold text-[#334155]">
                  {viewingOffer && headerVisible(viewingOffer.show_in_header)
                    ? 'Shown when active'
                    : 'Hidden'}
                </Text>
              </View>
            </View>
            <Text className="mb-1 mt-4 text-[9px] font-semibold uppercase text-[#94A3B8]">
              Description
            </Text>
            <Text className="text-[12px] leading-5 text-[#475569]">
              {viewingOffer?.description || 'No description provided.'}
            </Text>
            <View className="mt-5 flex-row justify-end">
              <Pressable
                accessibilityRole="button"
                onPress={editViewedOffer}
                className="flex-row items-center rounded-[11px] bg-[#F97316] px-4 py-2.5">
                <Pencil size={14} color="#FFFFFF" />
                <Text className="ml-2 text-[11px] font-bold text-white">
                  Edit offer
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}