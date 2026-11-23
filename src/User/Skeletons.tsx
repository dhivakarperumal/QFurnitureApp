import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

type SkeletonProps = {
  animation?: Animated.Value;
};

function useShimmer(animation?: Animated.Value) {
  const localAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animation) return;

    const loop = Animated.loop(
      Animated.timing(localAnimation, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [animation, localAnimation]);

  return animation ?? localAnimation;
}

function ShimmerBand({
  animation,
  width,
}: {
  animation: Animated.Value;
  width: number;
}) {
  const translateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.shimmerBand,
        {
          transform: [{ translateX }],
        },
      ]}
    />
  );
}

export function SkeletonImage({
  animation,
  height = 170,
  width,
  borderRadius = 0,
}: SkeletonProps & {
  height?: number;
  width?: number | `${number}%`;
  borderRadius?: number;
}) {
  const shimmer = useShimmer(animation);
  const [measuredWidth, setMeasuredWidth] = useState(
    typeof width === 'number' ? width : 0,
  );

  return (
    <View
      onLayout={event => {
        if (!width || typeof width === 'string') {
          setMeasuredWidth(event.nativeEvent.layout.width);
        }
      }}
      style={[
        styles.image,
        { height, width, borderRadius },
      ]}>
      <ShimmerBand animation={shimmer} width={measuredWidth} />
    </View>
  );
}

export function SkeletonText({
  animation,
  width = '100%',
  height = 12,
  borderRadius = 6,
  style,
}: SkeletonProps & {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: object;
}) {
  const shimmer = useShimmer(animation);
  const [measuredWidth, setMeasuredWidth] = useState(
    typeof width === 'number' ? width : 0,
  );

  return (
    <View
      onLayout={event => {
        if (typeof width === 'string') {
          setMeasuredWidth(event.nativeEvent.layout.width);
        }
      }}
      style={[
        styles.text,
        { width, height, borderRadius },
        style,
      ]}>
      <ShimmerBand animation={shimmer} width={measuredWidth} />
    </View>
  );
}

export function SkeletonCard({
  animation,
  compact = false,
  width,
  horizontal = false,
}: SkeletonProps & {
  compact?: boolean;
  width?: number;
  horizontal?: boolean;
}) {
  const shimmer = useShimmer(animation);

  return (
    <View
      style={[
        styles.card,
        horizontal ? styles.horizontalCard : styles.verticalCard,
        compact ? styles.compactCard : styles.regularCard,
        {
          width: width ?? (compact ? '48%' : 258),
        },
      ]}>
      <SkeletonImage
        animation={shimmer}
        height={compact ? 104 : 170}
      />
      <View style={compact ? styles.compactContent : styles.regularContent}>
        <SkeletonText
          animation={shimmer}
          width="42%"
          height={compact ? 9 : 10}
          borderRadius={4}
        />
        <SkeletonText
          animation={shimmer}
          width="78%"
          height={compact ? 12 : 14}
          style={compact ? styles.compactTitle : styles.regularTitle}
        />
        {!compact ? (
          <SkeletonText
            animation={shimmer}
            width="28%"
            height={10}
            style={styles.rating}
          />
        ) : null}
        <View style={styles.cardFooter}>
          <SkeletonText
            animation={shimmer}
            width={compact ? '43%' : '48%'}
            height={compact ? 14 : 16}
          />
          <View
            style={[
              compact ? styles.compactAction : styles.regularAction,
            ]}>
            <ShimmerBand animation={shimmer} width={compact ? 36 : 42} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function SkeletonList({
  count = 5,
  horizontal = false,
  compact = false,
  cardWidth,
}: {
  count?: number;
  horizontal?: boolean;
  compact?: boolean;
  cardWidth?: number;
}) {
  const { width } = useWindowDimensions();
  const animation = useRef(new Animated.Value(0)).current;
  const itemWidth =
    cardWidth ?? (compact ? (width - 40) / 2 : horizontal ? (width - 36) / 2 : 258);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(animation, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [animation]);

  const cards = Array.from({ length: count }, (_, index) => (
    <SkeletonCard
      key={index}
      animation={animation}
      compact={compact}
      horizontal={horizontal}
      width={itemWidth}
    />
  ));

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {cards}
      </ScrollView>
    );
  }

  return (
    <View
      style={styles.grid}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {cards}
    </View>
  );
}

function HomeSkeletonHeading({ animation }: SkeletonProps) {
  return (
    <View style={styles.homeSectionHeading}>
      <View>
        <SkeletonText animation={animation} width={142} height={16} />
        <SkeletonText
          animation={animation}
          width={96}
          height={9}
          style={styles.homeSectionSubtitle}
        />
      </View>
      <SkeletonText animation={animation} width={48} height={11} />
    </View>
  );
}

export function HomePageSkeleton() {
  const { width } = useWindowDimensions();
  const animation = useRef(new Animated.Value(0)).current;
  const categorySize = Math.min(110, (width - 64) / 3);
  const cardWidth = (width - 56) / 2;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(animation, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [animation]);

  return (
    <View
      style={styles.homeSkeleton}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={styles.homeHero}>
        <SkeletonImage animation={animation} height={194} borderRadius={20} />
      </View>

      <View style={styles.homeSection}>
        <HomeSkeletonHeading animation={animation} />
        <View style={styles.homeCategoryRow}>
          {[0, 1, 2].map(item => (
            <View key={item} style={styles.homeCategory}>
              <SkeletonImage
                animation={animation}
                width={categorySize}
                height={categorySize}
                borderRadius={18}
              />
              <SkeletonText
                animation={animation}
                width={categorySize}
                height={9}
                style={styles.homeCategoryLabel}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.homeSection}>
        <HomeSkeletonHeading animation={animation} />
        <SkeletonList count={4} horizontal cardWidth={cardWidth} />
      </View>

      <View style={styles.homeSection}>
        <HomeSkeletonHeading animation={animation} />
        <View style={styles.homeRoomRow}>
          {[0, 1].map(item => (
            <View key={item} style={styles.homeRoom}>
              <SkeletonImage animation={animation} height={122} borderRadius={18} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.homeSection}>
        <HomeSkeletonHeading animation={animation} />
        <SkeletonList count={4} horizontal cardWidth={cardWidth} />
      </View>

      <View style={styles.homeOffer}>
        <SkeletonImage animation={animation} height={148} borderRadius={20} />
      </View>

      <View style={styles.homeSection}>
        <HomeSkeletonHeading animation={animation} />
        <SkeletonList count={4} horizontal cardWidth={cardWidth} />
      </View>

      <View style={styles.homeCustomFurniture}>
        <SkeletonImage animation={animation} height={138} borderRadius={18} />
        <SkeletonText
          animation={animation}
          width="58%"
          height={15}
          style={styles.homeCustomTitle}
        />
        <SkeletonText animation={animation} width="86%" height={10} />
        <SkeletonText
          animation={animation}
          width={116}
          height={34}
          borderRadius={17}
          style={styles.homeCustomButton}
        />
      </View>

      <View style={styles.homeSection}>
        <HomeSkeletonHeading animation={animation} />
        <View style={styles.homeReview}>
          <SkeletonText animation={animation} width={84} height={10} />
          <SkeletonText
            animation={animation}
            width="100%"
            height={10}
            style={styles.homeReviewLine}
          />
          <SkeletonText animation={animation} width="78%" height={10} />
          <SkeletonText
            animation={animation}
            width={110}
            height={10}
            style={styles.homeReviewAuthor}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#F0E7DE',
    overflow: 'hidden',
  },
  text: {
    backgroundColor: '#F0E7DE',
    overflow: 'hidden',
  },
  shimmerBand: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0E7DE',
    backgroundColor: '#FFFFFF',
  },
  horizontalCard: {
    marginRight: 12,
  },
  verticalCard: {
    marginRight: 0,
  },
  compactCard: {
    borderRadius: 18,
    marginBottom: 8,
  },
  regularCard: {
    borderRadius: 20,
    marginBottom: 12,
  },
  compactContent: {
    padding: 8,
  },
  regularContent: {
    padding: 12,
  },
  compactTitle: {
    marginTop: 8,
    marginBottom: 12,
  },
  regularTitle: {
    marginTop: 8,
    marginBottom: 16,
  },
  rating: {
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactAction: {
    overflow: 'hidden',
    backgroundColor: '#F0E7DE',
    height: 36,
    width: 36,
    borderRadius: 12,
  },
  regularAction: {
    overflow: 'hidden',
    backgroundColor: '#F0E7DE',
    height: 42,
    width: 42,
    borderRadius: 12,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  homeSkeleton: {
    paddingBottom: 160,
  },
  homeHero: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  homeSection: {
    marginTop: 24,
  },
  homeSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  homeSectionSubtitle: {
    marginTop: 7,
  },
  homeCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
  },
  homeCategory: {
    alignItems: 'center',
  },
  homeCategoryLabel: {
    marginTop: 8,
  },
  homeRoomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
  },
  homeRoom: {
    width: '48%',
  },
  homeOffer: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  homeCustomFurniture: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  homeCustomTitle: {
    marginTop: 14,
    marginBottom: 10,
  },
  homeCustomButton: {
    marginTop: 14,
  },
  homeReview: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  homeReviewLine: {
    marginTop: 14,
  },
  homeReviewAuthor: {
    marginTop: 18,
  },
});
