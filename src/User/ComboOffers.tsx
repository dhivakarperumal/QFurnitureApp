import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import ProductCard from './ProductCard';
import { SkeletonList } from './Skeletons';
import api from '../api';
import type { StoreProduct } from './types';
import {
  fetchCachedApiData,
  getCachedApiData,
  hasCachedApiData,
} from '../apiCache';

const COMBOS_CACHE_KEY = 'user.combos';

type ComboOffer = StoreProduct & {
  offer_product?: boolean | number;
  offer_start_date?: string | null;
  offer_end_date?: string | null;
  combo_items?: unknown[] | null;
};

type CombosResponse = {
  combos?: ComboOffer[];
};

type ComboOffersProps = {
  refreshKey?: number;
  favorites: string[];
  onFavoritePress: (productId: string) => void;
  onAddToCart: (productId: string) => void;
  onProductPress: (productId: string) => void;
};

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Could not load combo offers. Please try again.';
}

export default function ComboOffers({
  refreshKey = 0,
  favorites,
  onFavoritePress,
  onAddToCart,
  onProductPress,
}: ComboOffersProps) {
  const [combos, setCombos] = useState<ComboOffer[]>(
    () => getCachedApiData<ComboOffer[]>(COMBOS_CACHE_KEY) ?? [],
  );
  const [loading, setLoading] = useState(
    () => !hasCachedApiData(COMBOS_CACHE_KEY),
  );
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const lastRetryCount = useRef(retryCount);

  useEffect(() => {
    let active = true;
    const forceRefresh = lastRetryCount.current !== retryCount;
    lastRetryCount.current = retryCount;

    const loadCombos = async () => {
      if (!hasCachedApiData(COMBOS_CACHE_KEY)) setLoading(true);
      if (hasCachedApiData(COMBOS_CACHE_KEY)) setError(null);
      try {
        const allCombos = await fetchCachedApiData(
          COMBOS_CACHE_KEY,
          async force => {
            const { data } = await api.get<CombosResponse>('/combos', {
              params: { page: 1, limit: 100, status: 'Active' },
              headers: force ? { 'Cache-Control': 'no-store' } : undefined,
            });
            if (!Array.isArray(data?.combos)) {
              throw new Error(
                'The combos response did not contain a combo list.',
              );
            }
            return data.combos;
          },
          forceRefresh,
        );

        const today = new Date().toISOString().slice(0, 10);
        const availableCombos = allCombos.filter(combo => {
          if (combo.offer_product === false || combo.offer_product === 0) {
            return false;
          }
          if (combo.offer_start_date && combo.offer_start_date > today) {
            return false;
          }
          if (combo.offer_end_date && combo.offer_end_date < today) {
            return false;
          }
          return true;
        });
        if (active) setCombos(availableCombos);
      } catch (requestError) {
        console.error('Could not load combo offers:', requestError);
        if (active) setError(getErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCombos();
    return () => {
      active = false;
    };
  }, [refreshKey, retryCount]);

  return (
    <View className="px-4 pb-8 pt-5">
      <Text className="text-[10px] font-bold uppercase tracking-[2px] text-[#A06E46]">
        More value, together
      </Text>
      <Text className="mt-2 text-[25px] font-black text-[#351D0E]">
        Furniture combos
      </Text>
      <Text className="mb-5 mt-1 text-[13px] text-[#8B735E]">
        Hand-picked bundles with clear pricing and savings.
      </Text>

      {loading ? (
        <SkeletonList count={4} compact />
      ) : error && !hasCachedApiData(COMBOS_CACHE_KEY) ? (
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
      ) : combos.length ? (
        <View className="flex-row flex-wrap justify-between">
          {combos.map(combo => {
            const productId = `combo-${combo.combo_id ?? combo.id}`;
            const product: StoreProduct = {
              ...combo,
              id: productId,
              item_type: 'combo',
              category: 'Furniture combo',
              images: combo.images ?? combo.image,
            };

            return (
              <ProductCard
                key={productId}
                product={product}
                favorite={favorites.includes(productId)}
                compact
                onFavoritePress={onFavoritePress}
                onAddToCart={onAddToCart}
                onProductPress={onProductPress}
              />
            );
          })}
        </View>
      ) : (
        <View className="items-center rounded-[20px] border border-dashed border-[#D9C4AA] bg-white px-5 py-12">
          <Text className="text-center text-[16px] font-bold text-[#351D0E]">
            No combo offers are available right now
          </Text>
          <Text className="mt-2 text-center text-[13px] text-[#8B735E]">
            Check back soon for special furniture bundles.
          </Text>
        </View>
      )}
    </View>
  );
}
