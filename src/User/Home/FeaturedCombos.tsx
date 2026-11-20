import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import api from '../../api';
import ProductCard from '../ProductCard';
import { SkeletonList } from '../Skeletons';
import type { StoreProduct } from '../types';
import { useAutoSwiper } from './useAutoSwiper';
import {
  fetchCachedApiData,
  getCachedApiData,
  hasCachedApiData,
} from '../../apiCache';

const COMBOS_CACHE_KEY = 'user.combos';

const styles = StyleSheet.create({
  carouselContent: {
    paddingHorizontal: 16,
  },
});

type FeaturedCombo = StoreProduct & {
  featured?: boolean | number;
};

type CombosResponse = {
  combos?: FeaturedCombo[];
};

function errorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Could not load featured combos. Please try again.';
}

type FeaturedCombosProps = {
  refreshKey?: number;
  favorites: string[];
  onFavoritePress: (productId: string) => void;
  onAddToCart: (productId: string) => void;
  onProductPress: (productId: string) => void;
};

export default function FeaturedCombos({
  refreshKey = 0,
  favorites,
  onFavoritePress,
  onAddToCart,
  onProductPress,
}: FeaturedCombosProps) {
  const { width } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [combos, setCombos] = useState<FeaturedCombo[]>(
    () => getCachedApiData<FeaturedCombo[]>(COMBOS_CACHE_KEY) ?? [],
  );
  const [loading, setLoading] = useState(
    () => !hasCachedApiData(COMBOS_CACHE_KEY),
  );
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const lastRefreshKey = useRef(refreshKey);
  const lastRetryCount = useRef(retryCount);
  const cardWidth = ((viewportWidth || width) - 36) / 2;
  const cardStep = cardWidth + 12;
  const snapOffsets = combos.map((_, index) => index * cardStep);
  const { scrollRef, handleScrollBeginDrag, handleScrollSettled } =
    useAutoSwiper({
      itemCount: combos.length,
      visibleCount: 2,
      itemStep: cardStep,
      contentWidth,
      viewportWidth,
      intervalMs: 5000,
    });

  useEffect(() => {
    let active = true;
    const forceRefresh =
      lastRefreshKey.current !== refreshKey ||
      lastRetryCount.current !== retryCount;
    lastRefreshKey.current = refreshKey;
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

        const featuredCombos = allCombos.filter(
          combo => combo.featured === true || combo.featured === 1,
        );
        if (active) setCombos(featuredCombos.slice(0, 5));
      } catch (requestError) {
        console.error('Could not load featured combos:', requestError);
        if (active) setError(errorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCombos();
    return () => {
      active = false;
    };
  }, [refreshKey, retryCount]);

  if (!loading && !error && !combos.length) return null;

  return (
    <View className="mt-8">
      <View className="mb-4 px-4">
        <Text className="text-[10px] font-bold uppercase tracking-[2px] text-[#A06E46]">
          Designed to go together
        </Text>
        <Text className="mt-1 text-[22px] font-black text-[#351D0E]">
          Featured combos
        </Text>
        <Text className="mt-1 text-[12px] text-[#8B735E]">
          Complete your space with curated bundles.
        </Text>
      </View>
      {loading ? (
        <SkeletonList count={5} horizontal cardWidth={cardWidth} />
      ) : error && !hasCachedApiData(COMBOS_CACHE_KEY) ? (
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
      ) : (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={event => setViewportWidth(event.nativeEvent.layout.width)}
          onContentSizeChange={setContentWidth}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollSettled}
          onMomentumScrollEnd={handleScrollSettled}
          snapToInterval={cardStep}
          snapToAlignment="start"
          snapToOffsets={snapOffsets}
          decelerationRate="fast"
          disableIntervalMomentum
          contentContainerStyle={styles.carouselContent}>
          {combos.map(combo => {
            const productId = `combo-${combo.id}`;
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
                cardWidth={cardWidth}
                onFavoritePress={onFavoritePress}
                onAddToCart={onAddToCart}
                onProductPress={onProductPress}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
