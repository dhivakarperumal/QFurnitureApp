import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { ImagePlus, Tag } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, {
  API_BASE_URL,
  invalidateApiResponseCache,
} from '../../api';
import TopHeader from './TopHeader';

type Offer = {
  id: number | string;
  name?: string;
  title?: string;
  description?: string;
  discount?: number | string;
  discount_value?: number | string;
  status?: string;
  active?: boolean | number | string;
  is_active?: boolean | number | string;
  starts_at?: string;
  ends_at?: string;
  start_date?: string;
  end_date?: string;
};

type Banner = {
  id: number | string;
  title?: string;
  name?: string;
  description?: string;
  image?: string;
  image_url?: string;
  banner_image?: string;
  status?: string;
  is_active?: boolean | number | string;
  active?: boolean | number | string;
};

type ListResponse<T> = T[] | { offers?: T[]; banners?: T[]; data?: T[] };

type Props = {
  onBackPress: () => void;
};

const getList = <T,>(data: ListResponse<T>, key: 'offers' | 'banners') => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data[key])) return data[key];
  if (Array.isArray(data.data)) return data.data;
  throw new Error(`The ${key} response did not contain a list.`);
};

const imageUri = (path?: string) => {
  if (!path) return undefined;
  if (/^(https?:|data:)/i.test(path)) return path;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  const cleanPath = path.replace(/\\/g, '/');
  return `${origin}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

const isActive = (value?: boolean | number | string, status?: string) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return ['1', 'true', 'active', 'enabled'].includes(value.toLowerCase());
  }
  return !status || ['active', 'published', 'enabled'].includes(status.toLowerCase());
};

const loadErrorMessage = (error: unknown, fallback: string) =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : fallback;

export default function DrawerOffersBanners({ onBackPress }: Props) {
  const insets = useSafeAreaInsets();
  const hasLoaded = useRef(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const loadContent = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
      invalidateApiResponseCache();
    } else if (!hasLoaded.current) {
      setLoading(true);
    }
    setOfferError(null);
    setBannerError(null);

    const [offerResult, bannerResult] = await Promise.allSettled([
      api.get<ListResponse<Offer>>('/offers'),
      api.get<ListResponse<Banner>>('/admin/banners'),
    ]);

    if (offerResult.status === 'fulfilled') {
      try {
        setOffers(getList(offerResult.value.data, 'offers'));
      } catch (error: unknown) {
        setOfferError(loadErrorMessage(error, 'Could not read offers.'));
      }
    } else {
      setOfferError(loadErrorMessage(offerResult.reason, 'Could not load offers.'));
    }
    if (bannerResult.status === 'fulfilled') {
      try {
        setBanners(getList(bannerResult.value.data, 'banners'));
      } catch (error: unknown) {
        setBannerError(loadErrorMessage(error, 'Could not read banners.'));
      }
    } else {
      setBannerError(loadErrorMessage(bannerResult.reason, 'Could not load banners.'));
    }
    if (offerResult.status === 'rejected' || bannerResult.status === 'rejected') {
      if (__DEV__) {
        console.warn('[DrawerOffersBanners] Could not load promotions:', {
          offers: offerResult.status === 'rejected' ? offerResult.reason : null,
          banners: bannerResult.status === 'rejected' ? bannerResult.reason : null,
        });
      }
    }
    hasLoaded.current = true;
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <TopHeader
        pageTitle="Offers & Banners"
        pageSubtitle="Manage promotions and storefront banners"
        onBackPress={onBackPress}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadContent(true)}
            tintColor="#F97316"
            colors={['#F97316']}
          />
        }
        contentContainerClassName="px-4 pb-10"
        style={{ paddingTop: insets.top + 76 }}>
        <View className="mb-4 flex-row">
          <View className="mr-2 flex-1 rounded-[16px] border border-[#FCE6D7] bg-white p-3">
            <Tag size={18} color="#C2410C" />
            <Text className="mt-3 text-[20px] font-black text-[#17191C]">
              {offers.length}
            </Text>
            <Text className="mt-1 text-[10px] text-[#64748B]">Offers</Text>
          </View>
          <View className="flex-1 rounded-[16px] border border-[#FCE6D7] bg-white p-3">
            <ImagePlus size={18} color="#C2410C" />
            <Text className="mt-3 text-[20px] font-black text-[#17191C]">
              {banners.length}
            </Text>
            <Text className="mt-1 text-[10px] text-[#64748B]">Banners</Text>
          </View>
        </View>

        {loading ? (
          <View className="items-center rounded-[16px] bg-white py-10">
            <ActivityIndicator color="#F97316" />
            <Text className="mt-2 text-[11px] text-[#64748B]">
              Loading offers and banners...
            </Text>
          </View>
        ) : (
          <>
            <Text className="mb-2 mt-1 text-[14px] font-black text-[#17191C]">
              Offers
            </Text>
            {offerError ? (
              <View className="mb-3 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] p-3">
                <Text className="text-[10px] text-[#B91C1C]">{offerError}</Text>
                <Pressable onPress={() => loadContent()} className="mt-2">
                  <Text className="text-[10px] font-bold text-[#991B1B]">Retry</Text>
                </Pressable>
              </View>
            ) : offers.length ? (
              offers.map(offer => {
                const active = isActive(
                  offer.is_active ?? offer.active,
                  offer.status,
                );
                return (
                  <View
                    key={offer.id}
                    className="mb-2 rounded-[15px] border border-[#ECE8E2] bg-white p-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="mr-2 flex-1 text-[12px] font-bold text-[#17191C]">
                        {offer.title || offer.name || 'Offer'}
                      </Text>
                      <Text
                        className={[
                          'rounded-full px-2.5 py-1 text-[9px] font-bold',
                          active
                            ? 'bg-[#DCFCE7] text-[#15803D]'
                            : 'bg-[#F1F5F9] text-[#64748B]',
                        ].join(' ')}>
                        {active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                    {offer.description ? (
                      <Text className="mt-2 text-[10px] text-[#64748B]">
                        {offer.description}
                      </Text>
                    ) : null}
                    {offer.discount != null || offer.discount_value != null ? (
                      <Text className="mt-2 text-[10px] font-bold text-[#C2410C]">
                        Discount: {offer.discount ?? offer.discount_value}
                      </Text>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <Text className="mb-4 rounded-[14px] bg-white p-4 text-[11px] text-[#64748B]">
                No offers available.
              </Text>
            )}

            <Text className="mb-2 mt-4 text-[14px] font-black text-[#17191C]">
              Banners
            </Text>
            {bannerError ? (
              <View className="mb-3 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] p-3">
                <Text className="text-[10px] text-[#B91C1C]">{bannerError}</Text>
                <Pressable onPress={() => loadContent()} className="mt-2">
                  <Text className="text-[10px] font-bold text-[#991B1B]">Retry</Text>
                </Pressable>
              </View>
            ) : banners.length ? (
              banners.map(banner => {
                const active = isActive(banner.is_active ?? banner.active, banner.status);
                const uri = imageUri(
                  banner.image_url || banner.banner_image || banner.image,
                );
                return (
                  <View
                    key={banner.id}
                    className="mb-3 overflow-hidden rounded-[16px] border border-[#ECE8E2] bg-white">
                    {uri ? (
                      <Image
                        source={{ uri }}
                        className="h-[145px] w-full bg-[#FFF1D6]"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="h-[100px] items-center justify-center bg-[#FFF1D6]">
                        <ImagePlus size={28} color="#C2410C" />
                      </View>
                    )}
                    <View className="flex-row items-center justify-between p-3">
                      <Text className="mr-2 flex-1 text-[12px] font-bold text-[#17191C]">
                        {banner.title || banner.name || 'Banner'}
                      </Text>
                      <Text
                        className={[
                          'rounded-full px-2.5 py-1 text-[9px] font-bold',
                          active
                            ? 'bg-[#DCFCE7] text-[#15803D]'
                            : 'bg-[#F1F5F9] text-[#64748B]',
                        ].join(' ')}>
                        {active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text className="rounded-[14px] bg-white p-4 text-[11px] text-[#64748B]">
                No banners available.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
