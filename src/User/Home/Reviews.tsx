import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Star } from 'lucide-react-native';
import api from '../../api';

type CustomerReview = {
  id: string;
  customerName: string;
  rating: number;
  text: string;
  productName?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function firstString(...values: unknown[]) {
  return values.find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  )?.trim();
}

function isPublished(review: Record<string, unknown>) {
  const status = firstString(review.status, review.review_status);
  if (status) return status.toLowerCase() === 'published';

  return review.is_published !== false && review.published !== false;
}

function parseReviews(data: unknown): CustomerReview[] {
  const response = asRecord(data);
  const items = Array.isArray(data) ? data : response?.reviews;
  if (!Array.isArray(items)) {
    throw new Error('The reviews response did not contain a review list.');
  }

  return items.filter(item => {
    const review = asRecord(item);
    return !review || isPublished(review);
  }).map((item, index) => {
    const review = asRecord(item);
    if (!review) {
      throw new Error(`The review at position ${index + 1} is invalid.`);
    }

    const customer = asRecord(review.customer);
    const user = asRecord(review.user);
    const product = asRecord(review.product);
    const customerName = firstString(
      review.customer_name,
      review.user_name,
      review.name,
      customer?.name,
      user?.name,
    );
    const text = firstString(review.review, review.review_text, review.comment);
    const rating = Number(review.rating);

    if (
      !customerName ||
      !text ||
      !Number.isFinite(rating) ||
      rating < 0 ||
      rating > 5
    ) {
      throw new Error(`The review at position ${index + 1} is incomplete.`);
    }

    return {
      id: String(review.id ?? index),
      customerName,
      rating,
      text,
      productName: firstString(
        review.product_name,
        review.product_title,
        product?.name,
      ),
    };
  });
}

function errorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Could not load customer reviews. Please try again.';
}

export default function Reviews() {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (reviews.length < 2) return;

    const intervalId = setInterval(() => {
      setActiveIndex(index => (index + 1) % reviews.length);
    }, 4500);

    return () => clearInterval(intervalId);
  }, [reviews.length]);

  useEffect(() => {
    let active = true;

    const loadReviews = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<unknown>('/reviews/published');
        const nextReviews = parseReviews(data);
        if (active) {
          setReviews(nextReviews);
          setActiveIndex(0);
        }
      } catch (requestError) {
        console.error('Could not load customer reviews:', requestError);
        if (active) setError(errorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadReviews();
    return () => {
      active = false;
    };
  }, [retryCount]);

  return (
    <View className="mt-8">
      <View className="mb-4 px-4">
        <Text className="text-[22px] font-black capitalize text-[#351D0E]">
          Loved by our customers
        </Text>
      </View>
      {loading ? (
        <View className="h-[150px] items-center justify-center">
          <ActivityIndicator color="#F97316" />
        </View>
      ) : error ? (
        <View className="mx-4 rounded-[16px] border border-[#F0E7DE] bg-white p-4">
          <Text accessibilityRole="alert" className="text-[13px] text-[#8B2D20]">
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRetryCount(count => count + 1)}
            className="mt-3 self-start rounded-full bg-[#FFF0E1] px-4 py-2">
            <Text className="text-[12px] font-bold text-[#351D0E]">Try again</Text>
          </Pressable>
        </View>
      ) : reviews.length ? (
        <View className="px-4">
          {(() => {
            const review = reviews[activeIndex];
            return (
              <View
                key={review.id}
                className="overflow-hidden rounded-[22px] border border-[#F0E7DE] bg-white p-5">
                <View className="mb-4 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-[#FFF0E1]">
                      <Star size={17} color="#F97316" fill="#F97316" />
                    </View>
                    <Text className="ml-3 text-[10px] font-black uppercase tracking-[1.4px] text-[#A06E46]">
                      Customer review
                    </Text>
                  </View>
                  <View className="flex-row items-center rounded-full bg-[#FFF0E1] px-3 py-2">
                    <Star size={13} color="#F97316" fill="#F97316" />
                    <Text className="ml-1 text-[12px] font-black text-[#634D3B]">
                      {review.rating.toFixed(1)}
                    </Text>
                  </View>
                </View>
                <Text
                  numberOfLines={5}
                  className="text-[15px] leading-6 text-[#49392D]">
                  “{review.text}”
                </Text>
                <View className="my-4 h-px bg-[#F0E7DE]" />
                <View className="flex-row items-end justify-between">
                  <View className="mr-3 flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-[13px] font-black text-[#351D0E]">
                      {review.customerName}
                    </Text>
                    {review.productName ? (
                      <Text
                        numberOfLines={1}
                        className="mt-1 text-[11px] text-[#8B735E]">
                        {review.productName}
                      </Text>
                    ) : null}
                  </View>
                  <View className="flex-row">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        size={12}
                        color={index < Math.round(review.rating) ? '#F97316' : '#E5D8CB'}
                        fill={index < Math.round(review.rating) ? '#F97316' : 'transparent'}
                      />
                    ))}
                  </View>
                </View>
              </View>
            );
          })()}
        </View>
      ) : (
        <Text className="px-4 py-3 text-[13px] text-[#8B735E]">
          No customer reviews yet.
        </Text>
      )}
    </View>
  );
}
