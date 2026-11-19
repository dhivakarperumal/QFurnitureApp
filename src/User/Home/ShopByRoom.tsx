import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
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
import { ArrowRight } from 'lucide-react-native';
import api from '../../api';

type Room = {
  name: string;
  slug: string;
  image: ImageSourcePropType;
};

type RoomSummary = {
  slug?: string;
  productCount?: number | string;
};

const ALL_ROOMS: Room[] = [
  {
    name: 'Living Room',
    slug: 'living-room',
    image: require('../assets/shopbyroom-living.png'),
  },
  {
    name: 'Bedroom',
    slug: 'bedroom',
    image: require('../assets/shopbyroom-bedroom.png'),
  },
  {
    name: 'Dining Room',
    slug: 'dining-room',
    image: require('../assets/shopbyroom-dining.png'),
  },
  {
    name: 'Home Office',
    slug: 'home-office',
    image: require('../assets/shopbyroom-bedroom.png'),
  },
  {
    name: 'Kids Room',
    slug: 'kids-room',
    image: require('../assets/shopbyroom-dining.png'),
  },
  {
    name: 'Outdoor',
    slug: 'outdoor',
    image: require('../assets/shopbyroom-living.png'),
  },
];

type ShopByRoomProps = {
  onRoomPress: (roomSlug: string) => void;
};

export default function ShopByRoom({ onRoomPress }: ShopByRoomProps) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollPositionRef = useRef(0);
  const [rooms, setRooms] = useState(ALL_ROOMS);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const roomWidth = viewportWidth > 0 ? (viewportWidth - 24) / 3 : 112;
  const roomStep = roomWidth + 12;
  const carouselRooms =
    rooms.length > 3 ? [...rooms, ...rooms.slice(0, 2)] : rooms;

  useEffect(() => {
    if (rooms.length <= 3 || !viewportWidth || isUserScrolling) return;

    const intervalId = setInterval(() => {
      const nextPosition = scrollPositionRef.current + roomStep;
      const loopPosition = roomStep * rooms.length;
      const targetPosition = nextPosition >= loopPosition ? 0 : nextPosition;

      scrollRef.current?.scrollTo({ x: targetPosition, animated: true });
      scrollPositionRef.current = targetPosition;
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isUserScrolling, roomStep, rooms.length, viewportWidth]);

  useEffect(() => {
    let active = true;
    api.get<RoomSummary[]>('/products/rooms')
      .then(({ data }) => {
        if (!Array.isArray(data)) {
          throw new Error('The rooms response did not contain a room list.');
        }
        const roomsWithProducts = new Set(
          data
            .filter(room => Number(room.productCount) > 0)
            .map(room => room.slug),
        );
        if (active) {
          scrollPositionRef.current = 0;
          scrollRef.current?.scrollTo({ x: 0, animated: false });
          setRooms(ALL_ROOMS.filter(room => roomsWithProducts.has(room.slug)));
        }
      })
      .catch(error => {
        if (__DEV__) console.warn('[ShopByRoom] Could not load room availability:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!rooms.length) return null;

  return (
    <View className="mt-8 bg-white py-5">
      <View className="mb-4 flex-row items-center justify-between px-4">
        <Text className="text-[22px] font-black text-[#351D0E]">
          Shop by <Text className="text-[#E87424]">Room</Text>
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => onRoomPress('')}
          className="flex-row items-center">
          <Text className="mr-1 text-[12px] font-bold text-[#8B4B1F]">
            Explore all rooms
          </Text>
          <ArrowRight size={15} color="#8B4B1F" />
        </Pressable>
      </View>
      <View className="mx-4">
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={event => setViewportWidth(event.nativeEvent.layout.width)}
          onScroll={event => {
            scrollPositionRef.current = event.nativeEvent.contentOffset.x;
          }}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => setIsUserScrolling(true)}
          onScrollEndDrag={() => setIsUserScrolling(false)}
          onMomentumScrollEnd={(
            event: NativeSyntheticEvent<NativeScrollEvent>,
          ) => {
            scrollPositionRef.current = event.nativeEvent.contentOffset.x;
            setIsUserScrolling(false);
          }}
          snapToInterval={roomStep}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum>
          {carouselRooms.map((room, index) => (
            <Pressable
              key={`${room.slug}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`Shop ${room.name}`}
              onPress={() => onRoomPress(room.slug)}
              style={{ width: roomWidth }}
              className="relative mr-3 h-[90px] overflow-hidden rounded-[14px] bg-[#EEE4D8]">
              <Image source={room.image} className="h-full w-full" resizeMode="cover" />
              <View className="absolute inset-0 bg-black/30" />
              <View className="absolute bottom-2 left-2 right-2 flex-row items-center justify-between">
                <Text numberOfLines={1} className="mr-1 flex-1 text-[11px] font-bold text-white">
                  {room.name}
                </Text>
                <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-white">
                  <ArrowRight size={12} color="#9B4E17" />
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
