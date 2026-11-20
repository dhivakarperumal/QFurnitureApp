import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ImagePlus,
  Link as LinkIcon,
  Monitor,
  Pencil,
  Plus,
  Smartphone,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react-native';
import {
  launchImageLibrary,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, {
  API_BASE_URL,
  invalidateApiResponseCache,
} from '../../api';
import TopHeader from '../Navigation/TopHeader';

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
  subtitle?: string;
  name?: string;
  description?: string;
  offer?: string;
  desktop_image?: string;
  mobile_image?: string;
  destination_link?: string;
  destination_links?: Array<{ label: string; url: string }>;
  target_section?: 'hero' | 'offers';
  is_published?: boolean | number | string;
  updated_at?: string;
  created_at?: string;
  status?: string;
  is_active?: boolean | number | string;
  active?: boolean | number | string;
};

type ListResponse<T> = T[] | { offers?: T[]; banners?: T[]; data?: T[] };
type BannerImage = string | { uri: string; name: string; type: string } | null;
type DestinationLink = { label: string; url: string };
type BannerForm = {
  title: string;
  subtitle: string;
  description: string;
  offer: string;
  destination_links: DestinationLink[];
  target_section: 'hero' | 'offers';
  is_published: boolean;
  desktop_image: BannerImage;
  mobile_image: BannerImage;
};

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
  if (/^(https?:|data:|file:|content:)/i.test(path)) return path;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  const cleanPath = path.replace(/\\/g, '/');
  return `${origin}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
};

const initialForm: BannerForm = {
  title: '',
  subtitle: '',
  description: '',
  offer: '',
  destination_links: [],
  target_section: 'hero',
  is_published: true,
  desktop_image: null,
  mobile_image: null,
};

const styles = StyleSheet.create({
  addBannerFab: {
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

const isPublished = (value?: boolean | number | string) =>
  value === true || value === 1 || value === '1' || value === 'true';

const getBannerLinks = (banner: Banner): DestinationLink[] => {
  if (Array.isArray(banner.destination_links)) return banner.destination_links;
  return banner.destination_link
    ? [{ label: 'Shop now', url: banner.destination_link }]
    : [];
};

const isActive = (value?: boolean | number | string, status?: string) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return ['1', 'true', 'active', 'enabled'].includes(value.toLowerCase());
  }
  return !status || ['active', 'published', 'enabled'].includes(status.toLowerCase());
};

const loadErrorMessage = (error: unknown, fallback: string) => {
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

export default function BannerScreen({ onBackPress }: Props) {
  const insets = useSafeAreaInsets();
  const addBannerFabPosition = React.useMemo(
    () => ({ bottom: Math.max(insets.bottom, 12) + 16 }),
    [insets.bottom],
  );
  const hasLoaded = useRef(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [activeBanner, setActiveBanner] = useState<Banner | null>(null);
  const [bannerForm, setBannerForm] = useState<BannerForm>(initialForm);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);
  const [deletingBannerId, setDeletingBannerId] = useState<number | string | null>(
    null,
  );

  const loadContent = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
      invalidateApiResponseCache();
    } else if (!hasLoaded.current) {
      setLoading(true);
    }
    setOfferError(null);
    setBannerError(null);

    const [offerResult, bannerResult] = await Promise.all([
      api.get<ListResponse<Offer>>('/offers').then(
        value => ({ status: 'fulfilled' as const, value }),
        reason => ({ status: 'rejected' as const, reason }),
      ),
      api.get<ListResponse<Banner>>('/admin/banners').then(
        value => ({ status: 'fulfilled' as const, value }),
        reason => ({ status: 'rejected' as const, reason }),
      ),
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
        console.warn('[Banner] Could not load promotions:', {
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

  const openCreateBanner = () => {
    setActiveBanner(null);
    setBannerForm({ ...initialForm, destination_links: [] });
    setBannerModalOpen(true);
  };

  const openEditBanner = (banner: Banner) => {
    setActiveBanner(banner);
    setBannerForm({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      description: banner.description || '',
      offer: banner.offer || '',
      destination_links: getBannerLinks(banner),
      target_section: banner.target_section === 'offers' ? 'offers' : 'hero',
      is_published: isPublished(banner.is_published ?? banner.is_active ?? banner.active),
      desktop_image: banner.desktop_image || null,
      mobile_image: banner.mobile_image || null,
    });
    setBannerModalOpen(true);
  };

  const setBannerField = <K extends keyof BannerForm>(
    field: K,
    value: BannerForm[K],
  ) => {
    setBannerForm(current => ({ ...current, [field]: value }));
  };

  const pickBannerImage = async (field: 'desktop_image' | 'mobile_image') => {
    let result: ImagePickerResponse;
    try {
      result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.9,
      });
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Banner] Image selection failed:', error);
      Alert.alert('Image unavailable', loadErrorMessage(error, 'Could not open the photo library.'));
      return;
    }
    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert(
        'Image unavailable',
        result.errorMessage || 'Could not open the photo library.',
      );
      return;
    }

    const asset = result.assets?.[0];
    if (!asset?.uri) {
      Alert.alert('Image unavailable', 'No image was selected.');
      return;
    }
    if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) {
      Alert.alert('Image too large', 'Each banner image must be 8 MB or smaller.');
      return;
    }
    const mimeType = asset.type || 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)) {
      Alert.alert('Unsupported image', 'Choose a JPG, PNG, WEBP, or GIF image.');
      return;
    }

    setBannerField(field, {
      uri: asset.uri,
      name: asset.fileName || `banner-${Date.now()}.${mimeType.split('/')[1]}`,
      type: mimeType,
    });
  };

  const uploadBannerImage = async (image: BannerImage) => {
    if (!image) return '';
    if (typeof image === 'string') return image;

    const formData = new FormData();
    formData.append('image', {
      uri: image.uri,
      name: image.name,
      type: image.type,
    } as unknown as Blob);
    const response = await api.post<{ url?: string }>(
      '/uploads/banners',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    if (typeof response.data.url !== 'string' || !response.data.url) {
      throw new Error('The image upload did not return a file path.');
    }
    return response.data.url;
  };

  const saveBanner = async () => {
    if (!bannerForm.title.trim()) {
      Alert.alert('Headline required', 'Add a headline for this promotion.');
      return;
    }
    if (!bannerForm.desktop_image) {
      Alert.alert('Desktop image required', 'Add a desktop banner image.');
      return;
    }
    if (
      bannerForm.destination_links.some(
        link => !link.label.trim() || !link.url.trim(),
      )
    ) {
      Alert.alert(
        'Destination incomplete',
        'Add a label and destination URL for each link.',
      );
      return;
    }

    setSavingBanner(true);
    try {
      const [desktopImage, mobileImage] = await Promise.all([
        uploadBannerImage(bannerForm.desktop_image),
        uploadBannerImage(bannerForm.mobile_image),
      ]);
      const payload = {
        title: bannerForm.title.trim(),
        subtitle: bannerForm.subtitle.trim(),
        description: bannerForm.description.trim(),
        offer: bannerForm.offer,
        destination_links: bannerForm.destination_links.map(link => ({
          label: link.label.trim(),
          url: link.url.trim(),
        })),
        destination_link: bannerForm.destination_links[0]?.url.trim() || '',
        target_section: bannerForm.target_section,
        is_published: String(bannerForm.is_published),
        desktop_image: desktopImage,
        mobile_image: mobileImage,
      };
      const response = activeBanner
        ? await api.put<{ banner?: Banner }>(
            `/admin/banners/${activeBanner.id}`,
            payload,
          )
        : await api.post<{ banner?: Banner }>('/admin/banners', payload);
      if (!response.data.banner) {
        throw new Error('The server did not return the saved banner.');
      }

      const savedBanner = response.data.banner;
      setBanners(current =>
        activeBanner
          ? current.map(banner =>
              banner.id === savedBanner.id ? savedBanner : banner,
            )
          : [savedBanner, ...current],
      );
      setBannerModalOpen(false);
      Alert.alert(
        activeBanner ? 'Banner updated' : 'Banner created',
        activeBanner
          ? 'Your promotion banner has been updated.'
          : 'Your promotion banner has been created.',
      );
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Banner] Could not save banner:', error);
      Alert.alert(
        'Could not save banner',
        loadErrorMessage(error, 'Could not save this promotion.'),
      );
    } finally {
      setSavingBanner(false);
    }
  };

  const deleteBanner = (banner: Banner) => {
    Alert.alert(
      'Delete banner?',
      `Delete "${banner.title || banner.name || 'this banner'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingBannerId(banner.id);
            try {
              await api.delete(`/admin/banners/${banner.id}`);
              setBanners(current =>
                current.filter(item => item.id !== banner.id),
              );
            } catch (error: unknown) {
              if (__DEV__) {
                console.warn('[Banner] Could not delete banner:', error);
              }
              Alert.alert(
                'Could not delete banner',
                loadErrorMessage(error, 'Could not delete this promotion.'),
              );
            } finally {
              setDeletingBannerId(null);
            }
          },
        },
      ],
    );
  };

  const updateDestinationLink = (
    index: number,
    field: keyof DestinationLink,
    value: string,
  ) => {
    setBannerForm(current => ({
      ...current,
      destination_links: current.destination_links.map((link, linkIndex) =>
        index === linkIndex ? { ...link, [field]: value } : link,
      ),
    }));
  };

  const renderImagePicker = (
    label: string,
    field: 'desktop_image' | 'mobile_image',
    required: boolean,
  ) => {
    const image = bannerForm[field];
    const uri = typeof image === 'string' ? imageUri(image) : image?.uri;
    return (
      <View className="mb-3 flex-1">
        <Text className="mb-1.5 text-[11px] font-bold text-[#334155]">
          {label}{required ? ' *' : ' (optional)'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => pickBannerImage(field)}
          className="h-[112px] items-center justify-center overflow-hidden rounded-[12px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC]">
          {uri ? (
            <Image source={{ uri }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <>
              {field === 'desktop_image' ? (
                <Monitor size={22} color="#F97316" />
              ) : (
                <Smartphone size={22} color="#F97316" />
              )}
              <Text className="mt-2 text-[10px] font-bold text-[#475569]">
                Choose image
              </Text>
              <Text className="mt-1 text-[9px] text-[#64748B]">
                PNG, JPG, WEBP or GIF · up to 8 MB
              </Text>
            </>
          )}
        </Pressable>
        {uri ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setBannerField(field, null)}
            className="mt-1.5 self-start">
            <Text className="text-[10px] font-bold text-[#DC2626]">
              Remove image
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

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
        contentContainerClassName="px-4 pb-[130px]"
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

            <View className="mb-2 mt-4 flex-row items-center">
              <Text className="text-[14px] font-black text-[#17191C]">
                Banners
              </Text>
            </View>
            {bannerError ? (
              <View className="mb-3 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] p-3">
                <Text className="text-[10px] text-[#B91C1C]">{bannerError}</Text>
                <Pressable onPress={() => loadContent()} className="mt-2">
                  <Text className="text-[10px] font-bold text-[#991B1B]">Retry</Text>
                </Pressable>
              </View>
            ) : banners.length ? (
              banners.map(banner => {
                const active = isPublished(
                  banner.is_published ?? banner.is_active ?? banner.active,
                );
                const uri = imageUri(banner.desktop_image);
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
                    <View className="px-3 pb-3">
                      {banner.subtitle ? (
                        <Text className="mb-2 text-[10px] text-[#64748B]">
                          {banner.subtitle}
                        </Text>
                      ) : null}
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[9px] font-semibold uppercase text-[#94A3B8]">
                          {banner.target_section || 'hero'} section
                        </Text>
                        <View className="flex-row">
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${banner.title || 'banner'}`}
                            onPress={() => openEditBanner(banner)}
                            className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-[#FFF1D6]">
                            <Pencil size={14} color="#C2410C" />
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Delete ${banner.title || 'banner'}`}
                            disabled={deletingBannerId === banner.id}
                            onPress={() => deleteBanner(banner)}
                            className="h-8 w-8 items-center justify-center rounded-full bg-[#FEF2F2]">
                            {deletingBannerId === banner.id ? (
                              <ActivityIndicator size="small" color="#DC2626" />
                            ) : (
                              <Trash2 size={14} color="#DC2626" />
                            )}
                          </Pressable>
                        </View>
                      </View>
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add new banner"
        onPress={openCreateBanner}
        style={[styles.addBannerFab, addBannerFabPosition]}>
        <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
      </Pressable>
      <Modal
        visible={bannerModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!savingBanner) setBannerModalOpen(false);
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/50">
          <View className="max-h-[92%] rounded-t-[24px] bg-white">
            <View className="flex-row items-center justify-between border-b border-[#F1F5F9] px-5 py-4">
              <View className="flex-1">
                <Text className="text-[17px] font-black text-[#17191C]">
                  {activeBanner ? 'Edit promotion banner' : 'Add promotion banner'}
                </Text>
                {activeBanner ? (
                  <Text className="mt-1 text-[10px] text-[#64748B]">
                    Banner ID: {activeBanner.id}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
                disabled={savingBanner}
                onPress={() => setBannerModalOpen(false)}
                className="h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9]">
                <X size={18} color="#475569" />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerClassName="px-5 pb-4 pt-3">
              <View className="mb-1 flex-row">
                {renderImagePicker('Desktop image', 'desktop_image', true)}
                <View className="w-3" />
                {renderImagePicker('Mobile image', 'mobile_image', false)}
              </View>

              <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                Headline *
              </Text>
              <TextInput
                value={bannerForm.title}
                onChangeText={value => setBannerField('title', value)}
                placeholder="Catchy main title"
                maxLength={160}
                className="mb-3 rounded-[11px] border border-[#E2E8F0] px-3 py-2.5 text-[13px] text-[#1E293B]"
              />
              <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                Subtitle
              </Text>
              <TextInput
                value={bannerForm.subtitle}
                onChangeText={value => setBannerField('subtitle', value)}
                placeholder="Supporting tagline"
                maxLength={240}
                className="mb-3 rounded-[11px] border border-[#E2E8F0] px-3 py-2.5 text-[13px] text-[#1E293B]"
              />
              <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                Description
              </Text>
              <TextInput
                value={bannerForm.description}
                onChangeText={value => setBannerField('description', value)}
                placeholder="Describe the offer or collection"
                maxLength={5000}
                multiline
                textAlignVertical="top"
                className="mb-3 min-h-[84px] rounded-[11px] border border-[#E2E8F0] px-3 py-2.5 text-[13px] text-[#1E293B]"
              />
              {bannerForm.target_section === 'offers' ? (
                <>
                  <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                    Offer (optional)
                  </Text>
                  <TextInput
                    value={bannerForm.offer}
                    onChangeText={value => setBannerField('offer', value)}
                    placeholder="e.g. 10% OFF"
                    maxLength={80}
                    className="mb-3 rounded-[11px] border border-[#E2E8F0] px-3 py-2.5 text-[13px] text-[#1E293B]"
                  />
                </>
              ) : null}

              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-[11px] font-bold text-[#334155]">
                  Action destinations
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={bannerForm.destination_links.length >= 10}
                  onPress={() =>
                    setBannerForm(current => ({
                      ...current,
                      destination_links: [
                        ...current.destination_links,
                        { label: '', url: '' },
                      ],
                    }))
                  }
                  className="flex-row items-center">
                  <Plus size={14} color="#C2410C" />
                  <Text className="ml-1 text-[10px] font-bold text-[#C2410C]">
                    Add link
                  </Text>
                </Pressable>
              </View>
              {bannerForm.destination_links.map((link, index) => (
                <View
                  key={`destination-${index}`}
                  className="mb-2 rounded-[12px] border border-[#F1F5F9] bg-[#F8FAFC] p-2.5">
                  <TextInput
                    value={link.label}
                    onChangeText={value =>
                      updateDestinationLink(index, 'label', value)
                    }
                    placeholder="Button label, e.g. Shop now"
                    maxLength={60}
                    className="mb-2 rounded-[9px] border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] text-[#1E293B]"
                  />
                  <View className="flex-row items-center">
                    <LinkIcon size={15} color="#94A3B8" />
                    <TextInput
                      value={link.url}
                      onChangeText={value =>
                        updateDestinationLink(index, 'url', value)
                      }
                      placeholder="e.g. /shop or https://..."
                      maxLength={2048}
                      autoCapitalize="none"
                      keyboardType="url"
                      className="ml-2 flex-1 rounded-[9px] border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] text-[#1E293B]"
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove destination ${index + 1}`}
                      onPress={() =>
                        setBannerForm(current => ({
                          ...current,
                          destination_links: current.destination_links.filter(
                            (_, linkIndex) => linkIndex !== index,
                          ),
                        }))
                      }
                      className="ml-2 h-8 w-8 items-center justify-center rounded-full">
                      <X size={16} color="#DC2626" />
                    </Pressable>
                  </View>
                </View>
              ))}
              {!bannerForm.destination_links.length ? (
                <Text className="mb-3 rounded-[10px] border border-dashed border-[#E2E8F0] p-3 text-[10px] text-[#94A3B8]">
                  No destination buttons added.
                </Text>
              ) : null}

              <Text className="mb-2 mt-1 text-[11px] font-bold text-[#334155]">
                Target section
              </Text>
              <View className="mb-3 flex-row rounded-[10px] border border-[#E2E8F0] p-1">
                {(['hero', 'offers'] as const).map(section => (
                  <Pressable
                    key={section}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: bannerForm.target_section === section,
                    }}
                    onPress={() => setBannerField('target_section', section)}
                    className={[
                      'flex-1 items-center rounded-[8px] py-2.5',
                      bannerForm.target_section === section
                        ? 'bg-[#FFF1D6]'
                        : '',
                    ].join(' ')}>
                    <Text
                      className={[
                        'text-[10px] font-bold uppercase',
                        bannerForm.target_section === section
                          ? 'text-[#C2410C]'
                          : 'text-[#64748B]',
                      ].join(' ')}>
                      {section === 'hero' ? 'Hero section' : 'Offers'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View className="mb-3 flex-row items-center justify-between rounded-[11px] border border-[#E2E8F0] px-3 py-2">
                <View>
                  <Text className="text-[11px] font-bold text-[#334155]">
                    Visibility
                  </Text>
                  <Text className="mt-0.5 text-[10px] text-[#64748B]">
                    {bannerForm.is_published
                      ? 'Published on website'
                      : 'Saved as draft'}
                  </Text>
                </View>
                <Switch
                  value={bannerForm.is_published}
                  onValueChange={value =>
                    setBannerField('is_published', value)
                  }
                  trackColor={{ false: '#CBD5E1', true: '#FDBA74' }}
                  thumbColor={bannerForm.is_published ? '#F97316' : '#F8FAFC'}
                />
              </View>
            </ScrollView>
            <View
              className="flex-row justify-end border-t border-[#F1F5F9] px-5 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
              <Pressable
                accessibilityRole="button"
                disabled={savingBanner}
                onPress={() => setBannerModalOpen(false)}
                className="mr-2 rounded-[11px] px-4 py-3">
                <Text className="text-[12px] font-bold text-[#475569]">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={savingBanner}
                onPress={saveBanner}
                className="flex-row items-center rounded-[11px] bg-[#F97316] px-4 py-3">
                {savingBanner ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <UploadCloud size={15} color="#FFFFFF" />
                )}
                <Text className="ml-2 text-[12px] font-bold text-white">
                  {savingBanner
                    ? 'Saving...'
                    : activeBanner
                      ? 'Save changes'
                      : 'Create promotion'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
