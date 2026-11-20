import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewInstance,
} from 'react-native';
import { Armchair, ArrowRight } from 'lucide-react-native';
import type { StoreCategory } from '../types';
import { categoryImage } from '../utils';

type CategoryProps = {
  categories: StoreCategory[];
  onCategoryPress: (category: string) => void;
  onViewAllPress: () => void;
};

export default function Category({
  categories,
  onCategoryPress,
  onViewAllPress,
}: CategoryProps) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollPositionRef = useRef(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const categoryWidth = viewportWidth > 0 ? (viewportWidth - 24) / 3 : 112;
  const categoryStep = categoryWidth + 12;
  const snapOffsets = categories.map((_, index) => index * categoryStep);

  useEffect(() => {
    if (isUserScrolling || categories.length <= 3) {
      return;
    }

    const maxScroll = Math.max(0, contentWidth - viewportWidth);
    if (maxScroll <= 0) {
      return;
    }

    const interval = setInterval(() => {
      const nextPosition = scrollPositionRef.current + categoryStep;
      const targetPosition = nextPosition >= maxScroll ? 0 : nextPosition;

      scrollRef.current?.scrollTo({ x: targetPosition, animated: true });
      scrollPositionRef.current = targetPosition;
    }, 3000);

    return () => clearInterval(interval);
  }, [categories.length, categoryStep, contentWidth, isUserScrolling, viewportWidth]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollPositionRef.current = event.nativeEvent.contentOffset.x;
  };

  return (
    <View className="mt-7">
      <View className="mb-4 flex-row items-center justify-between px-4">
        <Text className="text-[22px] font-black text-[#351D0E]">
          Shop by <Text className="text-[#E87424]">Category</Text>
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onViewAllPress}
          className="flex-row items-center rounded-full bg-[#FFF0E1] px-3 py-2">
          <Text className="mr-1 text-[12px] font-semibold text-[#634D3B]">View all</Text>
          <ArrowRight size={14} color="#634D3B" />
        </Pressable>
      </View>
      <View className="mx-4">
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={event => setViewportWidth(event.nativeEvent.layout.width)}
          onContentSizeChange={width => setContentWidth(width)}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => setIsUserScrolling(true)}
          onScrollEndDrag={() => setIsUserScrolling(false)}
          onMomentumScrollEnd={() => setIsUserScrolling(false)}
          snapToInterval={categoryStep}
          snapToAlignment="start"
          snapToOffsets={snapOffsets}
          decelerationRate="fast"
          disableIntervalMomentum>
          {categories.map((category, index) => {
            const imageUri = categoryImage(category);
            return (
              <Pressable
                key={category.catId ?? category.id ?? category.name ?? index}
                accessibilityRole="button"
                onPress={() => onCategoryPress(category.name)}
                style={{ width: categoryWidth }}
                className={`items-center ${
                  index === categories.length - 1 ? 'mr-0' : 'mr-3'
                }`}>
                <View
                  className="h-[104px] overflow-hidden rounded-[18px] bg-[#F1E5D7]"
                  style={{ width: categoryWidth }}>
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      className="h-full w-full"
                      resizeMode="cover"
                      resizeMethod="resize"
                    />
                  ) : (
                    <View className="h-full items-center justify-center">
                      <Armchair size={38} color="#A78A70" strokeWidth={1.3} />
                    </View>
                  )}
                </View>
                <Text numberOfLines={2} className="mt-2 text-center text-[12px] font-semibold leading-4 text-[#351D0E]">
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
