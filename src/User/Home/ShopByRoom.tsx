import React, { useEffect, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  Text,
  View,
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
  const [rooms, setRooms] = useState(ALL_ROOMS);

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-4">
        {rooms.map(room => (
          <Pressable
            key={room.slug}
            accessibilityRole="button"
            accessibilityLabel={`Shop ${room.name}`}
            onPress={() => onRoomPress(room.slug)}
            className="relative mr-3 h-[90px] w-[145px] overflow-hidden rounded-[14px] bg-[#EEE4D8]">
            <Image source={room.image} className="h-full w-full" resizeMode="cover" />
            <View className="absolute inset-0 bg-black/30" />
            <View className="absolute bottom-2 left-3 right-2 flex-row items-center justify-between">
              <Text numberOfLines={1} className="mr-1 flex-1 text-[12px] font-bold text-white">
                {room.name}
              </Text>
              <View className="h-[24px] w-[24px] items-center justify-center rounded-full bg-white">
                <ArrowRight size={13} color="#9B4E17" />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
