import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  MessageSquare,
  Package,
  Reply,
  Search,
  Send,
  Star,
  Trash2,
  X,
} from 'lucide-react-native';
import {
  launchImageLibrary,
  type Asset,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../api';
import TopHeader from '../Navigation/TopHeader';

type ReviewStatus = 'Pending' | 'Published' | 'Flagged';

type ReviewRecord = {
  id: number | string;
  product_id?: number | string | null;
  combo_id?: number | string | null;
  product_name?: string | null;
  combo_name?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  rating?: number | string;
  comment?: string | null;
  review_image?: string | null;
  admin_reply?: string | null;
  status?: ReviewStatus;
  created_at?: string;
};

type ReviewStats = {
  total_reviews?: number | string;
  average_rating?: number | string;
  pending_count?: number | string;
};

type ReviewProduct = {
  id: number | string;
  name: string;
  product_code?: string;
};

type ReviewForm = {
  product_id: string;
  user_name: string;
  user_email: string;
  rating: number;
  comment: string;
  review_image: string | null;
};

type ReviewsProps = {
  onBackPress: () => void;
  onScrollVisibilityChange?: (visible: boolean) => void;
};

type ReviewsResponse = {
  reviews?: ReviewRecord[];
  stats?: ReviewStats | null;
};

const initialForm: ReviewForm = {
  product_id: '',
  user_name: '',
  user_email: '',
  rating: 5,
  comment: '',
  review_image: null,
};

const modalStyles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    flexShrink: 1,
  },
  scroll: {
    flexShrink: 1,
    minHeight: 0,
  },
});

const toNumber = (value: number | string | undefined, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveReviewImage = (image?: string | null) => {
  if (!image) return undefined;
  if (/^(https?:|data:|blob:)/i.test(image)) return image;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${image.startsWith('/') ? '' : '/'}${image}`;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error !== 'object' || error === null) return fallback;
  if (
    'response' in error &&
    typeof error.response === 'object' &&
    error.response
  ) {
    const response = error.response as { data?: { message?: unknown } };
    if (typeof response.data?.message === 'string')
      return response.data.message;
  }
  if ('message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
};

const formatDate = (value?: string) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
};

const statusColor: Record<
  ReviewStatus,
  { background: string; foreground: string }
> = {
  Published: { background: '#ECFDF5', foreground: '#047857' },
  Pending: { background: '#FFFBEB', foreground: '#B45309' },
  Flagged: { background: '#FEF2F2', foreground: '#B91C1C' },
};

const imageFileName = (asset: Asset) => {
  if (asset.fileName) return asset.fileName;
  return `review-${Date.now()}.${asset.type?.split('/')[1] || 'jpg'}`;
};

export default function Review({
  onBackPress,
  onScrollVisibilityChange,
}: ReviewsProps) {
  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);
  const requestId = useRef(0);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | ReviewStatus>('All');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyReviewId, setBusyReviewId] = useState<number | string | null>(
    null,
  );
  const [activeReplyId, setActiveReplyId] = useState<number | string | null>(
    null,
  );
  const [replyText, setReplyText] = useState('');
  const [addVisible, setAddVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [products, setProducts] = useState<ReviewProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productPickerVisible, setProductPickerVisible] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [newReview, setNewReview] = useState<ReviewForm>(initialForm);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    const params: Record<string, string | number> = {};
    if (statusFilter !== 'All') params.status = statusFilter;
    if (ratingFilter) params.rating = ratingFilter;
    if (search) params.search = search;

    const loadReviews = async () => {
      try {
        const response = await api.get<ReviewsResponse>('/reviews/admin/all', {
          params,
        });
        if (id !== requestId.current) return;
        if (!Array.isArray(response.data.reviews)) {
          throw new Error('The review response did not contain a review list.');
        }
        setReviews(response.data.reviews);
        setStats(response.data.stats ?? null);
      } catch (error: unknown) {
        if (id !== requestId.current) return;
        setReviews([]);
        setLoadError(getErrorMessage(error, 'Could not load reviews.'));
        if (__DEV__) console.warn('[Review] Could not load reviews:', error);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    };
    loadReviews();
    return () => {
      if (id === requestId.current) requestId.current += 1;
    };
  }, [statusFilter, ratingFilter, search, refreshKey]);

  useEffect(() => {
    if (!addVisible) return;
    let active = true;
    setProductsLoading(true);
    setProductsError(null);
    api
      .get<{ products?: ReviewProduct[] }>('/products', {
        params: { page: 1, limit: 100, status: 'All' },
      })
      .then(response => {
        if (!active) return;
        if (!Array.isArray(response.data.products)) {
          throw new Error(
            'The product response did not contain a product list.',
          );
        }
        setProducts(response.data.products);
      })
      .catch(error => {
        if (!active) return;
        setProductsError(getErrorMessage(error, 'Could not load products.'));
        if (__DEV__) console.warn('[Review] Could not load products:', error);
      })
      .finally(() => {
        if (active) setProductsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [addVisible]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return products.filter(product =>
      `${product.name} ${product.product_code || ''}`
        .toLowerCase()
        .includes(query),
    );
  }, [products, productSearch]);

  const updateStatus = async (review: ReviewRecord, status: ReviewStatus) => {
    setBusyReviewId(review.id);
    try {
      await api.put(`/reviews/admin/${review.id}/status`, { status });
      setRefreshKey(value => value + 1);
      Alert.alert('Review updated', `Review marked ${status.toLowerCase()}.`);
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Review] Could not update status:', error);
      Alert.alert(
        'Update failed',
        getErrorMessage(error, 'Could not update this review.'),
      );
    } finally {
      setBusyReviewId(null);
    }
  };

  const deleteReview = (review: ReviewRecord) => {
    Alert.alert('Delete review?', 'This review will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyReviewId(review.id);
          try {
            await api.delete(`/reviews/admin/${review.id}`);
            setRefreshKey(value => value + 1);
          } catch (error: unknown) {
            if (__DEV__)
              console.warn('[Review] Could not delete review:', error);
            Alert.alert(
              'Delete failed',
              getErrorMessage(error, 'Could not delete this review.'),
            );
          } finally {
            setBusyReviewId(null);
          }
        },
      },
    ]);
  };

  const openReply = (review: ReviewRecord) => {
    setActiveReplyId(current => (current === review.id ? null : review.id));
    setReplyText(review.admin_reply || '');
  };

  const sendReply = async (review: ReviewRecord) => {
    const reply = replyText.trim();
    if (!reply) {
      Alert.alert('Reply required', 'Enter a reply before sending.');
      return;
    }
    if (reply.length > 5000) {
      Alert.alert('Reply too long', 'Keep the reply under 5,000 characters.');
      return;
    }
    setBusyReviewId(review.id);
    try {
      await api.put(`/reviews/admin/${review.id}/reply`, {
        admin_reply: reply,
      });
      setActiveReplyId(null);
      setReplyText('');
      setRefreshKey(value => value + 1);
      Alert.alert('Reply sent', 'Your response was added to the review.');
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Review] Could not send reply:', error);
      Alert.alert(
        'Reply failed',
        getErrorMessage(error, 'Could not send this reply.'),
      );
    } finally {
      setBusyReviewId(null);
    }
  };

  const uploadReviewImage = async () => {
    let pickerResult: ImagePickerResponse;
    try {
      pickerResult = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.9,
      });
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Review] Photo selection failed:', error);
      Alert.alert(
        'Photo unavailable',
        getErrorMessage(error, 'Could not open the photo library.'),
      );
      return;
    }
    if (pickerResult.didCancel) return;
    if (pickerResult.errorCode) {
      Alert.alert(
        'Photo unavailable',
        pickerResult.errorMessage || 'Could not open the photo library.',
      );
      return;
    }
    const asset = pickerResult.assets?.[0];
    if (!asset?.uri) {
      Alert.alert('Photo unavailable', 'No photo was selected.');
      return;
    }
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert('Photo too large', 'Choose an image smaller than 5 MB.');
      return;
    }
    const mimeType = asset.type || 'image/jpeg';
    if (
      !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)
    ) {
      Alert.alert(
        'Unsupported photo',
        'Choose a JPG, PNG, GIF, or WEBP image.',
      );
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: imageFileName(asset),
        type: mimeType,
      } as unknown as Blob);
      const response = await api.post<{ url?: string }>(
        '/reviews/upload',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      if (!response.data.url) {
        throw new Error('The server did not return an image URL.');
      }
      setNewReview(current => ({
        ...current,
        review_image: response.data.url!,
      }));
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Review] Image upload failed:', error);
      Alert.alert(
        'Upload failed',
        getErrorMessage(error, 'Could not upload this review image.'),
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const closeAddModal = () => {
    if (submitting || uploadingImage) return;
    setAddVisible(false);
    setProductPickerVisible(false);
    setNewReview(initialForm);
    setProductSearch('');
  };

  const submitReview = async () => {
    const userName = newReview.user_name.trim();
    const comment = newReview.comment.trim();
    const userEmail = newReview.user_email.trim();
    if (!newReview.product_id || !userName || !comment) {
      Alert.alert(
        'Required information',
        'Select a product and enter the customer name and review.',
      );
      return;
    }
    if (userEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      Alert.alert('Invalid email', 'Enter a valid customer email address.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/reviews', {
        ...newReview,
        product_id: Number(newReview.product_id),
        user_name: userName,
        user_email: userEmail || null,
        comment,
      });
      closeAddModal();
      setRefreshKey(value => value + 1);
      Alert.alert('Review added', 'The review was created successfully.');
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Review] Could not create review:', error);
      Alert.alert(
        'Create failed',
        getErrorMessage(error, 'Could not create this review.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const productName = (review: ReviewRecord) =>
    review.combo_id
      ? review.combo_name || 'Combo unavailable'
      : review.product_name || 'Product unavailable';
  const filters: Array<'All' | ReviewStatus> = [
    'All',
    'Pending',
    'Published',
    'Flagged',
  ];

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <TopHeader
        pageTitle="Reviews"
        pageSubtitle="Customer feedback and moderation"
        onBackPress={onBackPress}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-[255px]"
        style={{ paddingTop: insets.top + 72 }}
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
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3"
        >
          {[
            {
              label: 'Total reviews',
              value: toNumber(stats?.total_reviews),
              icon: MessageSquare,
              color: '#F97316',
            },
            {
              label: 'Average rating',
              value: toNumber(stats?.average_rating).toFixed(1),
              icon: Star,
              color: '#F59E0B',
            },
            {
              label: 'Pending',
              value: toNumber(stats?.pending_count),
              icon: AlertCircle,
              color: '#10B981',
            },
          ].map(stat => {
            const StatIcon = stat.icon;
            return (
              <View
                key={stat.label}
                className="relative mr-3 h-[110px] w-[180px] justify-center overflow-hidden rounded-[15px] border border-[#FCE6D7] bg-white pl-3 pr-2 shadow-sm elevation-[2]"
              >
                <View
                  className="absolute left-0 top-[14px] h-[82px] w-[4px] rounded-r-full"
                  style={{ backgroundColor: stat.color }}
                />
                <View className="flex-row items-center">
                  <View
                    className="h-[42px] w-[42px] items-center justify-center rounded-[12px]"
                    style={{ backgroundColor: stat.color }}
                  >
                    <StatIcon size={20} color="#FFFFFF" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-[10px] font-bold text-[#17191C]"
                    >
                      {stat.label}
                    </Text>
                    <Text className="text-[23px] font-black text-[#17191C]">
                      {loading ? '—' : stat.value}
                    </Text>
                    <Text className="text-[9px] text-[#64748B]">
                      Customer feedback
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View className="mb-3 rounded-[15px] border border-[#E2E8F0] bg-white p-3">
          <View className="mb-3 h-[44px] flex-row items-center rounded-[11px] bg-[#F8FAFC] px-3">
            <Search size={17} color="#94A3B8" />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Search reviews, products or users..."
              placeholderTextColor="#94A3B8"
              className="ml-2 flex-1 text-[10px] text-[#17191C]"
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-2"
          >
            {filters.map(filter => (
              <Pressable
                key={filter}
                onPress={() => setStatusFilter(filter)}
                className={`mr-2 rounded-full border px-3 py-2 ${
                  statusFilter === filter
                    ? 'border-[#F97316] bg-[#FFF7ED]'
                    : 'border-[#E2E8F0] bg-white'
                }`}
              >
                <Text
                  className={`text-[9px] font-bold ${
                    statusFilter === filter
                      ? 'text-[#C2410C]'
                      : 'text-[#64748B]'
                  }`}
                >
                  {filter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[null, 5, 4, 3, 2, 1].map(rating => (
              <Pressable
                key={rating ?? 'all'}
                onPress={() => setRatingFilter(rating)}
                className={`mr-2 flex-row items-center rounded-full border px-3 py-2 ${
                  ratingFilter === rating
                    ? 'border-[#F59E0B] bg-[#FFFBEB]'
                    : 'border-[#E2E8F0] bg-white'
                }`}
              >
                <Text
                  className={`text-[9px] font-bold ${
                    ratingFilter === rating
                      ? 'text-[#B45309]'
                      : 'text-[#64748B]'
                  }`}
                >
                  {rating
                    ? `${rating} star${rating > 1 ? 's' : ''}`
                    : 'All ratings'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setAddVisible(true)}
          className="mb-3 h-[44px] flex-row items-center justify-center rounded-[11px] bg-[#C2410C]"
        >
          <MessageSquare size={16} color="#FFFFFF" />
          <Text className="ml-2 text-[11px] font-bold text-white">
            Add manual review
          </Text>
        </Pressable>

        {loading ? (
          <View className="items-center rounded-[15px] bg-white py-10">
            <ActivityIndicator size="large" color="#F97316" />
            <Text className="mt-3 text-[11px] text-[#64748B]">
              Loading reviews...
            </Text>
          </View>
        ) : loadError ? (
          <View className="items-center rounded-[15px] bg-white px-5 py-8">
            <Text className="mb-4 text-center text-[11px] text-[#B91C1C]">
              {loadError}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRefreshKey(value => value + 1)}
              className="rounded-[10px] bg-[#C2410C] px-4 py-2.5"
            >
              <Text className="text-[10px] font-bold text-white">Retry</Text>
            </Pressable>
          </View>
        ) : reviews.length === 0 ? (
          <View className="items-center rounded-[15px] bg-white px-5 py-10">
            <MessageSquare size={30} color="#CBD5E1" />
            <Text className="mt-3 text-[12px] font-black text-[#334155]">
              No reviews found
            </Text>
            <Text className="mt-1 text-center text-[10px] text-[#64748B]">
              Try different filters or search terms.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setStatusFilter('All');
                setRatingFilter(null);
                setSearchInput('');
              }}
              className="mt-4 rounded-[10px] bg-[#FFF7ED] px-4 py-2.5"
            >
              <Text className="text-[10px] font-bold text-[#C2410C]">
                Clear filters
              </Text>
            </Pressable>
          </View>
        ) : (
          reviews.map(review => {
            const reviewStatus = review.status || 'Pending';
            const colors = statusColor[reviewStatus];
            const rating = Math.min(5, Math.max(0, toNumber(review.rating)));
            const imageUri = resolveReviewImage(review.review_image);
            const replyOpen = activeReplyId === review.id;
            const busy = busyReviewId === review.id;
            return (
              <View
                key={review.id}
                className="mb-3 overflow-hidden rounded-[16px] border border-[#E2E8F0] bg-white shadow-sm"
              >
                <View className="p-4">
                  <View className="flex-row items-start">
                    <View className="mr-3 h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#FFF1D6]">
                      <Text className="text-[15px] font-black text-[#C2410C]">
                        {(review.user_name || '?')
                          .trim()
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-[12px] font-black text-[#17191C]"
                      >
                        {review.user_name || 'Anonymous reviewer'}
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="mt-1 text-[9px] text-[#94A3B8]"
                      >
                        {review.user_email || formatDate(review.created_at)}
                      </Text>
                    </View>
                    <View
                      className="rounded-full px-2.5 py-1"
                      style={{ backgroundColor: colors.background }}
                    >
                      <Text
                        className="text-[8px] font-bold"
                        style={{ color: colors.foreground }}
                      >
                        {reviewStatus}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-3 flex-row items-center">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        size={14}
                        color={index < rating ? '#F59E0B' : '#E2E8F0'}
                        fill={index < rating ? '#F59E0B' : 'transparent'}
                      />
                    ))}
                    <Text className="ml-2 text-[9px] font-bold text-[#64748B]">
                      {rating}/5 · {formatDate(review.created_at)}
                    </Text>
                  </View>
                  <Text className="mt-3 text-[11px] leading-[18px] text-[#475569]">
                    “{review.comment || 'No comment'}”
                  </Text>
                  <View className="mt-3 flex-row items-center rounded-[10px] bg-[#FFF7ED] px-3 py-2">
                    <Package size={14} color="#C2410C" />
                    <Text
                      numberOfLines={1}
                      className="ml-2 flex-1 text-[9px] font-bold text-[#7C2D12]"
                    >
                      {review.combo_id ? 'Combo: ' : 'Product: '}
                      {productName(review)}
                    </Text>
                  </View>
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      accessibilityLabel="Review attachment"
                      className="mt-3 h-[150px] w-full rounded-[12px] bg-[#F8FAFC]"
                      resizeMode="cover"
                    />
                  ) : null}
                  {review.admin_reply && !replyOpen ? (
                    <View className="mt-3 rounded-[11px] border border-[#FED7AA] bg-[#FFF7ED] p-3">
                      <Text className="text-[8px] font-black uppercase text-[#C2410C]">
                        Official reply
                      </Text>
                      <Text className="mt-1 text-[10px] leading-[15px] text-[#64748B]">
                        {review.admin_reply}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {replyOpen ? (
                  <View className="border-t border-[#F1F5F9] bg-[#FAFAFA] p-3">
                    <TextInput
                      value={replyText}
                      onChangeText={setReplyText}
                      placeholder="Type your official response..."
                      placeholderTextColor="#94A3B8"
                      multiline
                      maxLength={5000}
                      textAlignVertical="top"
                      className="min-h-[90px] rounded-[10px] border border-[#E2E8F0] bg-white p-3 text-[10px] text-[#17191C]"
                    />
                    <View className="mt-2 flex-row justify-end">
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setActiveReplyId(null)}
                        className="mr-2 rounded-[9px] px-3 py-2"
                      >
                        <Text className="text-[9px] font-bold text-[#64748B]">
                          Cancel
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={busy || !replyText.trim()}
                        onPress={() => sendReply(review)}
                        className="flex-row items-center rounded-[9px] bg-[#C2410C] px-3 py-2 disabled:opacity-50"
                      >
                        {busy ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Send size={12} color="#FFFFFF" />
                        )}
                        <Text className="ml-1.5 text-[9px] font-bold text-white">
                          Send reply
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View className="flex-row items-center justify-between border-t border-[#F1F5F9] bg-[#FAFAFA] px-3 py-3">
                    <View className="flex-row items-center">
                      {reviewStatus !== 'Published' ? (
                        <ActionButton
                          label="Approve"
                          icon={<CheckCircle2 size={14} color="#047857" />}
                          onPress={() => updateStatus(review, 'Published')}
                          disabled={busy}
                        />
                      ) : null}
                      {reviewStatus !== 'Flagged' ? (
                        <ActionButton
                          label="Flag"
                          icon={<AlertCircle size={14} color="#B45309" />}
                          onPress={() => updateStatus(review, 'Flagged')}
                          disabled={busy}
                        />
                      ) : null}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Reply to review"
                        onPress={() => openReply(review)}
                        className="ml-1 h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-[#FFF7ED]"
                      >
                        <Reply size={15} color="#C2410C" />
                      </Pressable>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Delete review"
                      disabled={busy}
                      onPress={() => deleteReview(review)}
                      className="h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-[#FEF2F2] disabled:opacity-50"
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color="#DC2626" />
                      ) : (
                        <Trash2 size={15} color="#DC2626" />
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={addVisible}
        transparent
        animationType="slide"
        onRequestClose={closeAddModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={modalStyles.keyboardAvoiding}
        >
          <View className="flex-1 justify-end bg-black/60">
            <View
              className="rounded-t-[22px] bg-white"
              style={modalStyles.sheet}
            >
              <View className="flex-row items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
                <View>
                  <Text className="text-[15px] font-black text-[#17191C]">
                    {productPickerVisible
                      ? 'Select product'
                      : 'Add manual review'}
                  </Text>
                  <Text className="mt-1 text-[9px] text-[#64748B]">
                    {productPickerVisible
                      ? 'Choose the product for this review'
                      : 'Record customer feedback'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close add review"
                  disabled={submitting || uploadingImage}
                  onPress={closeAddModal}
                  className="h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F1F5F9]"
                >
                  <X size={17} color="#64748B" />
                </Pressable>
              </View>

              {productPickerVisible ? (
                <View className="flex-1">
                  <View className="flex-row items-center border-b border-[#F1F5F9] px-4 py-3">
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setProductPickerVisible(false)}
                      className="mr-2 h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F8FAFC]"
                    >
                      <ChevronLeft size={17} color="#475569" />
                    </Pressable>
                    <View className="h-[40px] flex-1 flex-row items-center rounded-[10px] bg-[#F8FAFC] px-3">
                      <Search size={15} color="#94A3B8" />
                      <TextInput
                        value={productSearch}
                        onChangeText={setProductSearch}
                        placeholder="Search products..."
                        placeholderTextColor="#94A3B8"
                        className="ml-2 flex-1 text-[10px] text-[#17191C]"
                      />
                    </View>
                  </View>
                  {productsLoading ? (
                    <View className="flex-1 items-center justify-center">
                      <ActivityIndicator size="large" color="#F97316" />
                    </View>
                  ) : productsError ? (
                    <View className="items-center px-5 py-8">
                      <Text className="text-center text-[10px] text-[#B91C1C]">
                        {productsError}
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      contentContainerClassName="px-4 py-2"
                    >
                      {filteredProducts.map(product => (
                        <Pressable
                          key={product.id}
                          accessibilityRole="button"
                          onPress={() => {
                            setNewReview(current => ({
                              ...current,
                              product_id: String(product.id),
                            }));
                            setProductPickerVisible(false);
                            setProductSearch('');
                          }}
                          className="flex-row items-center border-b border-[#F1F5F9] py-3"
                        >
                          <View className="mr-3 h-[36px] w-[36px] items-center justify-center rounded-[10px] bg-[#FFF1D6]">
                            <Package size={17} color="#C2410C" />
                          </View>
                          <View className="flex-1">
                            <Text
                              numberOfLines={1}
                              className="text-[11px] font-bold text-[#334155]"
                            >
                              {product.name}
                            </Text>
                            <Text className="mt-1 text-[8px] text-[#94A3B8]">
                              {product.product_code || `Product #${product.id}`}
                            </Text>
                          </View>
                          <ChevronRight size={17} color="#94A3B8" />
                        </Pressable>
                      ))}
                      {!filteredProducts.length ? (
                        <Text className="py-8 text-center text-[10px] text-[#64748B]">
                          No products found.
                        </Text>
                      ) : null}
                    </ScrollView>
                  )}
                </View>
              ) : (
                <>
                  <ScrollView
                    keyboardShouldPersistTaps="always"
                    keyboardDismissMode={
                      Platform.OS === 'ios' ? 'interactive' : 'on-drag'
                    }
                    nestedScrollEnabled
                    style={modalStyles.scroll}
                    contentContainerClassName="px-5 py-4"
                  >
                    <Text className="mb-1.5 text-[10px] font-bold text-[#64748B]">
                      Target product *
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setProductPickerVisible(true);
                        setProductsError(null);
                      }}
                      className="mb-4 h-[46px] flex-row items-center justify-between rounded-[11px] border border-[#E2E8F0] px-3"
                    >
                      <Text
                        numberOfLines={1}
                        className={`flex-1 text-[10px] ${
                          newReview.product_id
                            ? 'font-bold text-[#334155]'
                            : 'text-[#94A3B8]'
                        }`}
                      >
                        {products.find(
                          product =>
                            String(product.id) === newReview.product_id,
                        )?.name || 'Select a product'}
                      </Text>
                      <ChevronRight size={16} color="#94A3B8" />
                    </Pressable>
                    <ReviewInput
                      label="Customer name *"
                      value={newReview.user_name}
                      onChangeText={user_name =>
                        setNewReview(current => ({ ...current, user_name }))
                      }
                      placeholder="Customer name"
                      autoCapitalize="words"
                    />
                    <ReviewInput
                      label="Customer email"
                      value={newReview.user_email}
                      onChangeText={user_email =>
                        setNewReview(current => ({ ...current, user_email }))
                      }
                      placeholder="email@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <Text className="mb-2 text-[10px] font-bold text-[#64748B]">
                      Customer rating
                    </Text>
                    <View className="mb-4 flex-row items-center rounded-[11px] border border-[#E2E8F0] px-3 py-3">
                      {[1, 2, 3, 4, 5].map(rating => (
                        <Pressable
                          key={rating}
                          accessibilityRole="button"
                          accessibilityLabel={`${rating} star${
                            rating === 1 ? '' : 's'
                          }`}
                          accessibilityState={{
                            selected: rating === newReview.rating,
                          }}
                          onPress={() =>
                            setNewReview(current => ({ ...current, rating }))
                          }
                          className="mr-2"
                        >
                          <Star
                            size={22}
                            color={
                              rating <= newReview.rating ? '#F59E0B' : '#CBD5E1'
                            }
                            fill={
                              rating <= newReview.rating
                                ? '#F59E0B'
                                : 'transparent'
                            }
                          />
                        </Pressable>
                      ))}
                      <Text className="ml-1 text-[9px] font-bold text-[#64748B]">
                        {newReview.rating} stars
                      </Text>
                    </View>
                    <Text className="mb-1.5 text-[10px] font-bold text-[#64748B]">
                      Review comment *
                    </Text>
                    <TextInput
                      value={newReview.comment}
                      onChangeText={comment =>
                        setNewReview(current => ({ ...current, comment }))
                      }
                      placeholder="Write the customer's feedback..."
                      placeholderTextColor="#94A3B8"
                      multiline
                      maxLength={5000}
                      textAlignVertical="top"
                      className="mb-4 min-h-[110px] rounded-[11px] border border-[#E2E8F0] px-3 py-3 text-[10px] text-[#17191C]"
                    />
                    <Text className="mb-1.5 text-[10px] font-bold text-[#64748B]">
                      Review image (optional)
                    </Text>
                    {newReview.review_image ? (
                      <View className="mb-3">
                        <Image
                          source={{
                            uri: resolveReviewImage(newReview.review_image),
                          }}
                          accessibilityLabel="Review image preview"
                          className="h-[150px] w-full rounded-[12px] bg-[#F8FAFC]"
                          resizeMode="cover"
                        />
                        <Pressable
                          accessibilityRole="button"
                          onPress={() =>
                            setNewReview(current => ({
                              ...current,
                              review_image: null,
                            }))
                          }
                          className="mt-2 self-start"
                        >
                          <Text className="text-[9px] font-bold text-[#B91C1C]">
                            Remove image
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        disabled={uploadingImage}
                        onPress={uploadReviewImage}
                        className="mb-2 min-h-[90px] items-center justify-center rounded-[12px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC]"
                      >
                        {uploadingImage ? (
                          <ActivityIndicator color="#F97316" />
                        ) : (
                          <>
                            <ImagePlus size={20} color="#C2410C" />
                            <Text className="mt-2 text-[9px] font-bold text-[#64748B]">
                              Choose a photo (up to 5 MB)
                            </Text>
                          </>
                        )}
                      </Pressable>
                    )}
                  </ScrollView>
                  <View
                    className="flex-row justify-end border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 pt-4"
                    style={{ paddingBottom: Math.max(insets.bottom, 12) }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      disabled={submitting || uploadingImage}
                      onPress={closeAddModal}
                      className="mr-2 rounded-[10px] px-4 py-3"
                    >
                      <Text className="text-[10px] font-bold text-[#64748B]">
                        Cancel
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={submitting || uploadingImage}
                      onPress={submitReview}
                      className="min-w-[130px] flex-row items-center justify-center rounded-[10px] bg-[#C2410C] px-4 py-3 disabled:opacity-60"
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text className="text-[10px] font-bold text-white">
                          Create review
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

type ActionButtonProps = {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
};

function ActionButton({ label, icon, onPress, disabled }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className="mr-1 h-[34px] flex-row items-center rounded-[9px] bg-[#F8FAFC] px-2 disabled:opacity-50"
    >
      {icon}
      <Text className="ml-1 text-[8px] font-bold text-[#475569]">{label}</Text>
    </Pressable>
  );
}

type ReviewInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words';
};

function ReviewInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: ReviewInputProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-[10px] font-bold text-[#64748B]">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        className="h-[46px] rounded-[11px] border border-[#E2E8F0] bg-white px-3 text-[10px] text-[#17191C]"
      />
    </View>
  );
}
