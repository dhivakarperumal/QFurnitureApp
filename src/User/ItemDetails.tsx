import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Armchair,
  Heart,
  ImagePlus,
  ShoppingCart,
  Star,
  X,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  launchImageLibrary,
  type Asset,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import api from '../api';
import type { StoreProduct } from './types';
import {
  formatPrice,
  mediaUrl,
  parseImages,
  productCategory,
  productDiscountPercent,
  productPrice,
} from './utils';

type DetailItem = StoreProduct & {
  description?: string | null;
  long_description?: string | null;
  specifications?: Record<string, unknown> | null;
  combo_items?: Array<{ quantity?: number | string }> | null;
};

export type ItemDetailsProps = {
  itemId: string;
  itemType: 'product' | 'combo';
  favorite: boolean;
  onFavoritePress: (productId: string) => void;
  onAddToCart: (productId: string) => void;
  onBuyNow?: (productId: string) => void;
};

function getErrorMessage(
  error: unknown,
  fallback = 'Could not load item details. Please try again.',
) {
  if (typeof error === 'object' && error !== null) {
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
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
  }
  return fallback;
}

function getGallery(item: DetailItem) {
  const paths = [
    ...parseImages(item.images),
    ...parseImages(item.image),
    ...(item.variants ?? []).flatMap(variant => parseImages(variant.image)),
  ];
  return [...new Set(paths)]
    .map(path => mediaUrl(path))
    .filter((path): path is string => Boolean(path));
}

function reviewImageFileName(asset: Asset) {
  if (asset.fileName) return asset.fileName;
  return `review-${Date.now()}.${asset.type?.split('/')[1] || 'jpg'}`;
}

export default function ItemDetails({
  itemId,
  itemType,
  favorite,
  onFavoritePress,
  onAddToCart,
  onBuyNow,
}: ItemDetailsProps) {
  const [item, setItem] = useState<DetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [reviewEmail, setReviewEmail] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImage, setReviewImage] = useState<string | null>(null);
  const [uploadingReviewImage, setUploadingReviewImage] = useState(false);
  const actionId = itemType === 'combo' ? `combo-${itemId}` : itemId;

  useEffect(() => {
    setReviewOpen(false);
    setReviewRating(5);
    setReviewComment('');
    setReviewImage(null);
  }, [itemId, itemType]);

  useEffect(() => {
    let active = true;
    const loadReviewer = async () => {
      let savedName = '';
      let savedEmail = '';
      try {
        const serializedUser = await AsyncStorage.getItem('user');
        if (serializedUser) {
          const user: unknown = JSON.parse(serializedUser);
          if (typeof user === 'object' && user !== null) {
            savedName =
              ('name' in user && typeof user.name === 'string'
                ? user.name.trim()
                : '') ||
              ('username' in user && typeof user.username === 'string'
                ? user.username.trim()
                : '');
            savedEmail =
              'email' in user && typeof user.email === 'string'
                ? user.email.trim()
                : '';
          }
        }
      } catch (storageError) {
        if (__DEV__) {
          console.warn(
            '[ProductDetails] Could not load reviewer profile:',
            storageError,
          );
        }
      }
      if (active && savedName) setReviewName(savedName);
      if (active && savedEmail) setReviewEmail(savedEmail);

      if (!savedName || !savedEmail) {
        try {
          const { data } = await api.get<{
            name?: string;
            username?: string;
            email?: string;
            user?: { name?: string; username?: string; email?: string };
          }>('/users/me');
          const profile = data.user ?? data;
          const profileName =
            profile.name?.trim() || profile.username?.trim() || '';
          const profileEmail = profile.email?.trim() || '';
          if (active) {
            if (profileName) {
              setReviewName(current => current.trim() || profileName);
            }
            if (profileEmail) {
              setReviewEmail(current => current || profileEmail);
            }
          }
        } catch (profileError) {
          if (__DEV__) {
            console.warn(
              '[ProductDetails] Could not fetch reviewer profile:',
              profileError,
            );
          }
        }
      }
    };
    loadReviewer();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadItem = async () => {
      setLoading(true);
      setError(null);
      try {
        const resource = itemType === 'combo' ? 'combos' : 'products';
        const { data } = await api.get<DetailItem>(`/${resource}/${itemId}`);
        if (!data || typeof data !== 'object') {
          throw new Error('The item details response was invalid.');
        }
        if (active) {
          setItem(data);
          setActiveImageIndex(0);
        }
      } catch (requestError) {
        console.error(`Could not load ${itemType} details:`, requestError);
        if (active) setError(getErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadItem();
    return () => {
      active = false;
    };
  }, [itemId, itemType, retryCount]);

  const gallery = item ? getGallery(item) : [];
  const price = item ? productPrice(item) : 0;
  const mrp = Number(item?.mrp) || 0;
  const discount = item ? Math.round(productDiscountPercent(item)) : 0;
  const rating = Number(item?.rating) || 0;
  const stock = Number(item?.available_stock ?? item?.total_stock ?? item?.stock);
  const specifications = item?.specifications;
  const specificationEntries =
    specifications && typeof specifications === 'object' && !Array.isArray(specifications)
      ? Object.entries(specifications).filter(
          ([, value]) =>
            (typeof value === 'string' || typeof value === 'number') &&
            String(value).trim().length > 0,
        )
      : [];
  const description =
    item?.description?.trim() || item?.long_description?.trim() || '';
  const reviewImageUri = reviewImage ? mediaUrl(reviewImage) : undefined;

  const uploadReviewImage = async () => {
    let pickerResult: ImagePickerResponse;
    try {
      pickerResult = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.9,
      });
    } catch (pickerError) {
      if (__DEV__) {
        console.warn('[ProductDetails] Photo selection failed:', pickerError);
      }
      Alert.alert(
        'Photo unavailable',
        getErrorMessage(pickerError, 'Could not open the photo library.'),
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

    setUploadingReviewImage(true);
    try {
      const formData = new FormData();
      formData.append(
        'image',
        {
          uri: asset.uri,
          name: reviewImageFileName(asset),
          type: mimeType,
        } as unknown as Blob,
      );
      const response = await api.post<{ url?: string }>(
        '/reviews/upload',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      if (!response.data.url) {
        throw new Error('The server did not return an image URL.');
      }
      setReviewImage(response.data.url);
    } catch (uploadError) {
      if (__DEV__) {
        console.warn('[ProductDetails] Review image upload failed:', uploadError);
      }
      Alert.alert(
        'Upload failed',
        getErrorMessage(uploadError, 'Could not upload this review image.'),
      );
    } finally {
      setUploadingReviewImage(false);
    }
  };

  const submitReview = async () => {
    const userName = reviewName.trim();
    const comment = reviewComment.trim();
    const productId = Number(item?.product_id ?? item?.id ?? itemId);
    if (!userName || !comment) {
      Alert.alert('Review details required', 'Enter your name and review.');
      return;
    }
    if (!Number.isSafeInteger(productId) || productId <= 0) {
      Alert.alert('Product unavailable', 'Could not identify this product.');
      return;
    }
    if (reviewSubmitting) return;

    setReviewSubmitting(true);
    try {
      await api.post('/reviews', {
        product_id: productId,
        user_name: userName,
        user_email: reviewEmail || null,
        rating: reviewRating,
        comment,
        review_image: reviewImage,
      });
      setReviewComment('');
      setReviewImage(null);
      setReviewOpen(false);
      Alert.alert(
        'Review submitted',
        'Thank you for sharing your feedback.',
      );
    } catch (requestError) {
      console.error('[ProductDetails] Could not submit review:', requestError);
      Alert.alert(
        'Review failed',
        getErrorMessage(requestError, 'Could not submit your review. Please try again.'),
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <View className="px-4 pb-8 pt-3">

      {loading ? (
        <View className="h-[300px] items-center justify-center rounded-[20px] bg-white">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : error ? (
        <View className="items-center rounded-[20px] border border-[#F0E7DE] bg-white px-5 py-8">
          <Text accessibilityRole="alert" className="text-center text-[14px] text-[#8B2D20]">
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRetryCount(count => count + 1)}
            className="mt-4 rounded-full bg-[#FFF0E1] px-5 py-3">
            <Text className="text-[13px] font-bold text-[#351D0E]">Try again</Text>
          </Pressable>
        </View>
      ) : item ? (
        <>
          <View className="h-[300px] overflow-hidden rounded-[20px] bg-white">
            {gallery[activeImageIndex] ? (
              <Image
                source={{ uri: gallery[activeImageIndex] }}
                className="h-full w-full"
                resizeMode="contain"
              />
            ) : (
              <View className="h-full items-center justify-center">
                <Armchair size={64} color="#A78A70" strokeWidth={1.2} />
              </View>
            )}
          </View>
          {gallery.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerClassName="flex-row">
              {gallery.map((image, index) => (
                <Pressable
                  key={image}
                  accessibilityRole="button"
                  accessibilityLabel={`Show product image ${index + 1}`}
                  accessibilityState={{ selected: activeImageIndex === index }}
                  onPress={() => setActiveImageIndex(index)}
                  className={`mr-2 h-[64px] w-[64px] overflow-hidden rounded-[10px] border ${
                    activeImageIndex === index
                      ? 'border-[#F97316]'
                      : 'border-[#F0E7DE]'
                  }`}>
                  <Image source={{ uri: image }} className="h-full w-full" resizeMode="cover" />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <Text className="mt-5 text-[10px] font-bold uppercase tracking-[1.6px] text-[#A06E46]">
            {itemType === 'combo' ? 'Furniture combo' : productCategory(item) || 'Furniture'}
          </Text>
          <Text className="mt-1 text-[24px] font-black leading-8 text-[#351D0E]">
            {item.name}
          </Text>
          {rating > 0 ? (
            <View className="mt-2 flex-row items-center">
              <Star size={15} color="#F97316" fill="#F97316" />
              <Text className="ml-1 text-[13px] font-bold text-[#634D3B]">
                {rating.toFixed(1)}
              </Text>
            </View>
          ) : null}

          <View className="mt-4 flex-row items-center">
            <Text className="text-[24px] font-black text-[#351D0E]">
              {formatPrice(price)}
            </Text>
            {mrp > price ? (
              <>
                <Text className="ml-2 text-[14px] text-[#9A8B7D] line-through">
                  {formatPrice(mrp)}
                </Text>
                {discount > 0 ? (
                  <Text className="ml-2 rounded-full bg-[#E8F4EC] px-2 py-1 text-[11px] font-bold text-[#187A45]">
                    {discount}% OFF
                  </Text>
                ) : null}
              </>
            ) : null}
          </View>
          {Number.isFinite(stock) ? (
            <Text className={`mt-2 text-[12px] font-semibold ${
              stock > 0 ? 'text-[#187A45]' : 'text-[#8B2D20]'
            }`}>
              {stock > 0 ? `${stock} available` : 'Currently unavailable'}
            </Text>
          ) : null}

          {description ? (
            <View className="mt-5 rounded-[16px] bg-white p-4">
              <Text className="text-[15px] font-black text-[#351D0E]">Description</Text>
              <Text className="mt-2 text-[13px] leading-5 text-[#634D3B]">
                {description}
              </Text>
            </View>
          ) : null}

          {itemType === 'combo' ? (
            <View className="mt-4 rounded-[16px] bg-white p-4">
              <Text className="text-[15px] font-black text-[#351D0E]">Combo contents</Text>
              <Text className="mt-2 text-[13px] text-[#634D3B]">
                Includes {item.combo_items?.length ?? 0}{' '}
                {(item.combo_items?.length ?? 0) === 1 ? 'product' : 'products'}
              </Text>
            </View>
          ) : null}

          {specificationEntries.length ? (
            <View className="mt-4 rounded-[16px] bg-white p-4">
              <Text className="mb-2 text-[15px] font-black text-[#351D0E]">
                Specifications
              </Text>
              {specificationEntries.map(([label, value]) => (
                <View
                  key={label}
                  className="flex-row justify-between border-t border-[#F0E7DE] py-3">
                  <Text className="mr-3 flex-1 text-[12px] capitalize text-[#8B735E]">
                    {label.replace(/_/g, ' ')}
                  </Text>
                  <Text className="flex-1 text-right text-[12px] font-semibold text-[#351D0E]">
                    {String(value)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {itemType === 'product' ? (
            <View className="mt-5 rounded-[16px] bg-white p-4">
              <View className="flex-row items-center justify-between">
                <View className="mr-3 flex-1">
                  <Text className="text-[15px] font-black text-[#351D0E]">
                    Reviews
                  </Text>
                  <Text className="mt-1 text-[12px] text-[#8B735E]">
                    Share your experience with this product.
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={reviewSubmitting || uploadingReviewImage}
                  accessibilityState={{
                    expanded: reviewOpen,
                    disabled: reviewSubmitting || uploadingReviewImage,
                  }}
                  onPress={() => setReviewOpen(open => !open)}
                  className="rounded-full bg-[#FFF0E1] px-4 py-2">
                  <Text className="text-[12px] font-bold text-[#B94719]">
                    {reviewOpen ? 'Close' : 'Write review'}
                  </Text>
                </Pressable>
              </View>
              {reviewOpen ? (
                <View className="mt-4 border-t border-[#F0E7DE] pt-4">
                  <Text className="mb-2 text-[12px] font-bold text-[#5B4839]">
                    Your rating
                  </Text>
                  <View className="mb-4 flex-row">
                    {[1, 2, 3, 4, 5].map(value => (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`}
                        accessibilityState={{ selected: reviewRating === value }}
                        onPress={() => setReviewRating(value)}
                        className="mr-2 p-1">
                        <Star
                          size={25}
                          color={value <= reviewRating ? '#F97316' : '#CBD5E1'}
                          fill={value <= reviewRating ? '#F97316' : 'transparent'}
                        />
                      </Pressable>
                    ))}
                  </View>
                  <Text className="mb-1.5 text-[12px] font-bold text-[#5B4839]">
                    Your name
                  </Text>
                  <TextInput
                    value={reviewName}
                    onChangeText={setReviewName}
                    placeholder="Enter your name"
                    placeholderTextColor="#A08A78"
                    autoCapitalize="words"
                    className="mb-3 rounded-[11px] border border-[#E7DCCF] px-3 py-3 text-[13px] text-[#351D0E]"
                  />
                  <TextInput
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    placeholder="Write your review"
                    placeholderTextColor="#A08A78"
                    multiline
                    textAlignVertical="top"
                    maxLength={5000}
                    className="min-h-[100px] rounded-[11px] border border-[#E7DCCF] px-3 py-3 text-[13px] text-[#351D0E]"
                  />
                  <Text className="mb-2 mt-4 text-[12px] font-bold text-[#5B4839]">
                    Photo (optional)
                  </Text>
                  {reviewImageUri ? (
                    <View className="mb-1">
                      <Image
                        source={{ uri: reviewImageUri }}
                        accessibilityLabel="Review image preview"
                        resizeMode="cover"
                        className="h-[150px] w-full rounded-[12px] bg-[#F8FAFC]"
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Remove review photo"
                        disabled={reviewSubmitting || uploadingReviewImage}
                        onPress={() => setReviewImage(null)}
                        className="mt-2 flex-row items-center self-start py-2">
                        <X size={15} color="#B91C1C" />
                        <Text className="ml-1 text-[12px] font-bold text-[#B91C1C]">
                          Remove photo
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Upload a review photo"
                      disabled={reviewSubmitting || uploadingReviewImage}
                      onPress={uploadReviewImage}
                      className="min-h-[84px] items-center justify-center rounded-[12px] border border-dashed border-[#D6C8B8] bg-[#FCFAF7] disabled:opacity-60">
                      {uploadingReviewImage ? (
                        <ActivityIndicator color="#F97316" />
                      ) : (
                        <>
                          <ImagePlus size={21} color="#B94719" />
                          <Text className="mt-2 text-[12px] font-bold text-[#8B735E]">
                            Choose a photo (up to 5 MB)
                          </Text>
                        </>
                      )}
                    </Pressable>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    disabled={reviewSubmitting || uploadingReviewImage}
                    onPress={submitReview}
                    className="mt-4 h-[46px] flex-row items-center justify-center rounded-full bg-[#F97316] disabled:opacity-60">
                    {reviewSubmitting || uploadingReviewImage ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-[13px] font-black text-white">
                        Submit review
                      </Text>
                    )}
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}

          {itemType === 'combo' ? (
            <View className="mt-5 flex-row">
              <Pressable
                accessibilityRole="button"
                disabled={Number.isFinite(stock) && stock <= 0}
                onPress={() => onAddToCart(actionId)}
                className={`mr-3 h-[50px] flex-1 flex-row items-center justify-center rounded-full ${
                  Number.isFinite(stock) && stock <= 0
                    ? 'bg-[#CDBBA8]'
                    : 'bg-[#F97316]'
                }`}>
                <ShoppingCart size={18} color="#FFFFFF" />
                <Text className="ml-2 text-[14px] font-black text-white">
                  {Number.isFinite(stock) && stock <= 0
                    ? 'Out of stock'
                    : 'Add to cart'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={Number.isFinite(stock) && stock <= 0}
                onPress={() => (onBuyNow ?? onAddToCart)(actionId)}
                className={`h-[50px] flex-1 items-center justify-center rounded-full ${
                  Number.isFinite(stock) && stock <= 0
                    ? 'bg-[#CDBBA8]'
                    : 'bg-[#351D0E]'
                }`}>
                <Text className="text-[14px] font-black text-white">
                  {Number.isFinite(stock) && stock <= 0 ? 'Unavailable' : 'Buy now'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-5 flex-row">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
                onPress={() => onFavoritePress(actionId)}
                className="mr-3 h-[50px] w-[54px] items-center justify-center rounded-full border border-[#F0E7DE] bg-white">
                <Heart
                  size={21}
                  color={favorite ? '#F97316' : '#634D3B'}
                  fill={favorite ? '#F97316' : 'transparent'}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={Number.isFinite(stock) && stock <= 0}
                onPress={() => onAddToCart(actionId)}
                className={`h-[50px] flex-1 items-center justify-center rounded-full ${
                  Number.isFinite(stock) && stock <= 0
                    ? 'bg-[#CDBBA8]'
                    : 'bg-[#F97316]'
                }`}>
                <Text className="text-[14px] font-black text-white">
                  {Number.isFinite(stock) && stock <= 0 ? 'Out of stock' : 'Add to cart'}
                </Text>
              </Pressable>
            </View>
          )}
        </>
      ) : null}
    </View>
  );
}
