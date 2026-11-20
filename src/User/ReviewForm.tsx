import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ImagePlus,
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
import { mediaUrl } from './utils';

type ReviewItemType = 'product' | 'combo';

type ReviewFormProps = {
  itemId: string | number;
  itemType: ReviewItemType;
};

function getErrorMessage(error: unknown, fallback: string) {
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

function imageFileName(asset: Asset) {
  if (asset.fileName) return asset.fileName;
  return `review-${Date.now()}.${asset.type?.split('/')[1] || 'jpg'}`;
}

export default function ReviewForm({ itemId, itemType }: ReviewFormProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewImage, setReviewImage] = useState<string | null>(null);

  useEffect(() => {
    setOpen(false);
    setRating(5);
    setComment('');
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
      } catch (error) {
        if (__DEV__) {
          console.warn('[ReviewForm] Could not read the saved user:', error);
        }
      }

      if (active && savedName) setUserName(savedName);
      if (active && savedEmail) setUserEmail(savedEmail);

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
              setUserName(current => current.trim() || profileName);
            }
            if (profileEmail) {
              setUserEmail(current => current || profileEmail);
            }
          }
        } catch (error) {
          if (__DEV__) {
            console.warn('[ReviewForm] Could not fetch reviewer profile:', error);
          }
        }
      }
    };

    loadReviewer();
    return () => {
      active = false;
    };
  }, []);

  const uploadImage = async () => {
    let pickerResult: ImagePickerResponse;
    try {
      pickerResult = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.9,
      });
    } catch (error) {
      if (__DEV__) console.warn('[ReviewForm] Photo selection failed:', error);
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
      formData.append(
        'image',
        {
          uri: asset.uri,
          name: imageFileName(asset),
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
    } catch (error) {
      if (__DEV__) console.warn('[ReviewForm] Image upload failed:', error);
      Alert.alert(
        'Upload failed',
        getErrorMessage(error, 'Could not upload this review image.'),
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const submitReview = async () => {
    const name = userName.trim();
    const review = comment.trim();
    const numericId = Number(itemId);
    if (!name || !review) {
      Alert.alert('Review details required', 'Enter your name and review.');
      return;
    }
    if (!Number.isSafeInteger(numericId) || numericId <= 0) {
      Alert.alert('Item unavailable', 'Could not identify this item.');
      return;
    }
    if (submitting || uploadingImage) return;

    setSubmitting(true);
    try {
      await api.post('/reviews', {
        ...(itemType === 'combo'
          ? { combo_id: numericId }
          : { product_id: numericId }),
        user_name: name,
        user_email: userEmail || null,
        rating,
        comment: review,
        review_image: reviewImage,
      });
      setComment('');
      setReviewImage(null);
      setOpen(false);
      Alert.alert(
        'Review submitted',
        'Thank you for sharing your feedback.',
      );
    } catch (error) {
      if (__DEV__) console.warn('[ReviewForm] Could not submit review:', error);
      Alert.alert(
        'Review failed',
        getErrorMessage(error, 'Could not submit your review. Please try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const reviewImageUri = reviewImage ? mediaUrl(reviewImage) : undefined;
  const disabled = submitting || uploadingImage;

  return (
    <View className="mt-5 rounded-[16px] bg-white p-4">
      <View className="flex-row items-center justify-between">
        <View className="mr-3 flex-1">
          <Text className="text-[15px] font-black text-[#351D0E]">Reviews</Text>
          <Text className="mt-1 text-[12px] text-[#8B735E]">
            Share your experience with this {itemType}.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open, disabled }}
          disabled={disabled}
          onPress={() => setOpen(current => !current)}
          className="rounded-full bg-[#FFF0E1] px-4 py-2 disabled:opacity-60">
          <Text className="text-[12px] font-bold text-[#B94719]">
            {open ? 'Close' : 'Write review'}
          </Text>
        </Pressable>
      </View>

      {open ? (
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
                accessibilityState={{ selected: rating === value }}
                disabled={disabled}
                onPress={() => setRating(value)}
                className="mr-2 p-1">
                <Star
                  size={25}
                  color={value <= rating ? '#F97316' : '#CBD5E1'}
                  fill={value <= rating ? '#F97316' : 'transparent'}
                />
              </Pressable>
            ))}
          </View>
          <Text className="mb-1.5 text-[12px] font-bold text-[#5B4839]">
            Your name
          </Text>
          <TextInput
            value={userName}
            onChangeText={setUserName}
            placeholder="Enter your name"
            placeholderTextColor="#A08A78"
            autoCapitalize="words"
            editable={!disabled}
            className="mb-3 rounded-[11px] border border-[#E7DCCF] px-3 py-3 text-[13px] text-[#351D0E]"
          />
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Write your review"
            placeholderTextColor="#A08A78"
            multiline
            textAlignVertical="top"
            maxLength={5000}
            editable={!disabled}
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
                disabled={disabled}
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
              disabled={disabled}
              onPress={uploadImage}
              className="min-h-[84px] items-center justify-center rounded-[12px] border border-dashed border-[#D6C8B8] bg-[#FCFAF7] disabled:opacity-60">
              {uploadingImage ? (
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
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={submitReview}
            className="mt-4 h-[46px] flex-row items-center justify-center rounded-full bg-[#F97316] disabled:opacity-60">
            {submitting ? (
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
  );
}
