import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewInstance,
} from 'react-native';

type AutoSwiperOptions = {
  itemCount: number;
  visibleCount: number;
  itemStep: number;
  contentWidth: number;
  viewportWidth: number;
  intervalMs?: number;
};

export function useAutoSwiper({
  itemCount,
  visibleCount,
  itemStep,
  contentWidth,
  viewportWidth,
  intervalMs = 3000,
}: AutoSwiperOptions) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const snapIndexRef = useRef(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const maxSnapIndex =
    itemStep > 0
      ? Math.max(0, Math.round((contentWidth - viewportWidth) / itemStep))
      : 0;

  useEffect(() => {
    if (
      isUserScrolling ||
      itemCount <= visibleCount ||
      viewportWidth <= 0 ||
      maxSnapIndex <= 0
    ) {
      return;
    }

    const interval = setInterval(() => {
      const nextIndex =
        snapIndexRef.current >= maxSnapIndex ? 0 : snapIndexRef.current + 1;
      scrollRef.current?.scrollTo({
        x: nextIndex * itemStep,
        animated: true,
      });
      snapIndexRef.current = nextIndex;
    }, intervalMs);

    return () => clearInterval(interval);
  }, [
    intervalMs,
    isUserScrolling,
    itemCount,
    itemStep,
    maxSnapIndex,
    viewportWidth,
    visibleCount,
  ]);

  const handleScrollBeginDrag = useCallback(() => {
    setIsUserScrolling(true);
  }, []);

  const handleScrollSettled = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      snapIndexRef.current = Math.min(
        maxSnapIndex,
        Math.max(
          0,
          Math.round(event.nativeEvent.contentOffset.x / itemStep),
        ),
      );
      setIsUserScrolling(false);
    },
    [itemStep, maxSnapIndex],
  );

  return {
    scrollRef,
    handleScrollBeginDrag,
    handleScrollSettled,
  };
}
