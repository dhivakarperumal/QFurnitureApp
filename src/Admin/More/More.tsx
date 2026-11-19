import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  Boxes,
  ChevronRight,
  LayoutGrid,
  MessageSquare,
  UserRound,
  UsersRound,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Categery from './Categery';
import Profile from './Profile';
import ReviewScreen from './Review';
import StockDetails from './StockDetails';
import Usermanagement from './Usermanagement';

type MoreProps = {
  onScrollVisibilityChange?: (visible: boolean) => void;
  onDetailsVisibilityChange?: (visible: boolean) => void;
};

export default function More({
  onScrollVisibilityChange,
  onDetailsVisibilityChange,
}: MoreProps) {
  const insets = useSafeAreaInsets();
  const [categoriesOpen, setCategoriesOpen] = React.useState(false);
  const [usersOpen, setUsersOpen] = React.useState(false);
  const [stockOpen, setStockOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [reviewsOpen, setReviewsOpen] = React.useState(false);

  const openCategories = () => {
    setCategoriesOpen(true);
    onDetailsVisibilityChange?.(true);
    onScrollVisibilityChange?.(true);
  };

  const closeCategories = () => {
    setCategoriesOpen(false);
    onDetailsVisibilityChange?.(false);
    onScrollVisibilityChange?.(true);
  };

  const openUsers = () => {
    setUsersOpen(true);
    onDetailsVisibilityChange?.(true);
    onScrollVisibilityChange?.(true);
  };

  const closeUsers = () => {
    setUsersOpen(false);
    onDetailsVisibilityChange?.(false);
    onScrollVisibilityChange?.(true);
  };

  const openStock = () => {
    setStockOpen(true);
    onDetailsVisibilityChange?.(true);
    onScrollVisibilityChange?.(true);
  };

  const closeStock = () => {
    setStockOpen(false);
    onDetailsVisibilityChange?.(false);
    onScrollVisibilityChange?.(true);
  };

  const openProfile = () => {
    setProfileOpen(true);
    onDetailsVisibilityChange?.(true);
    onScrollVisibilityChange?.(true);
  };

  const closeProfile = () => {
    setProfileOpen(false);
    onDetailsVisibilityChange?.(false);
    onScrollVisibilityChange?.(true);
  };

  const openReviews = () => {
    setReviewsOpen(true);
    onDetailsVisibilityChange?.(true);
    onScrollVisibilityChange?.(true);
  };

  const closeReviews = () => {
    setReviewsOpen(false);
    onDetailsVisibilityChange?.(false);
    onScrollVisibilityChange?.(true);
  };

  if (categoriesOpen) {
    return (
      <Categery
        onScrollVisibilityChange={onScrollVisibilityChange}
        onBackPress={closeCategories}
      />
    );
  }

  if (usersOpen) {
    return (
      <Usermanagement
        onScrollVisibilityChange={onScrollVisibilityChange}
        onBackPress={closeUsers}
      />
    );
  }

  if (stockOpen) {
    return (
      <StockDetails
        onScrollVisibilityChange={onScrollVisibilityChange}
        onBackPress={closeStock}
      />
    );
  }

  if (profileOpen) {
    return (
      <Profile
        onScrollVisibilityChange={onScrollVisibilityChange}
        onBackPress={closeProfile}
      />
    );
  }

  if (reviewsOpen) {
    return (
      <ReviewScreen
        onScrollVisibilityChange={onScrollVisibilityChange}
        onBackPress={closeReviews}
      />
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerClassName="px-4 pb-[255px]"
      style={{ paddingTop: insets.top + 84 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        onPress={openProfile}
        className="mb-3 flex-row items-center rounded-[18px] border border-[#FCE6D7] bg-white p-4 shadow-sm elevation-[2]"
      >
        <View className="h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[#FFF1D6]">
          <UserRound size={25} color="#F97316" strokeWidth={2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-black text-[#17191C]">Profile</Text>
          <Text className="mt-1 text-[11px] text-[#64748B]">
            View and update your account information
          </Text>
        </View>
        <ChevronRight size={21} color="#94A3B8" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open categories"
        onPress={openCategories}
        className="flex-row items-center rounded-[18px] border border-[#FCE6D7] bg-white p-4 shadow-sm elevation-[2]"
      >
        <View className="h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[#FFF1D6]">
          <LayoutGrid size={25} color="#F97316" strokeWidth={2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-black text-[#17191C]">
            Categories
          </Text>
          <Text className="mt-1 text-[11px] text-[#64748B]">
            View and manage furniture categories
          </Text>
        </View>
        <ChevronRight size={21} color="#94A3B8" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open user management"
        onPress={openUsers}
        className="mt-3 flex-row items-center rounded-[18px] border border-[#FCE6D7] bg-white p-4 shadow-sm elevation-[2]"
      >
        <View className="h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[#FFF1D6]">
          <UsersRound size={25} color="#F97316" strokeWidth={2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-black text-[#17191C]">
            User Management
          </Text>
          <Text className="mt-1 text-[11px] text-[#64748B]">
            View and manage registered accounts
          </Text>
        </View>
        <ChevronRight size={21} color="#94A3B8" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open stock details"
        onPress={openStock}
        className="mt-3 flex-row items-center rounded-[18px] border border-[#FCE6D7] bg-white p-4 shadow-sm elevation-[2]"
      >
        <View className="h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[#FFF1D6]">
          <Boxes size={25} color="#F97316" strokeWidth={2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-black text-[#17191C]">
            Stock Details
          </Text>
          <Text className="mt-1 text-[11px] text-[#64748B]">
            View inventory and update product stock
          </Text>
        </View>
        <ChevronRight size={21} color="#94A3B8" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open reviews"
        onPress={openReviews}
        className="mt-3 flex-row items-center rounded-[18px] border border-[#FCE6D7] bg-white p-4 shadow-sm elevation-[2]"
      >
        <View className="h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[#FFF1D6]">
          <MessageSquare size={25} color="#F97316" strokeWidth={2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-black text-[#17191C]">Reviews</Text>
          <Text className="mt-1 text-[11px] text-[#64748B]">
            Moderate customer reviews and replies
          </Text>
        </View>
        <ChevronRight size={21} color="#94A3B8" />
      </Pressable>
    </ScrollView>
  );
}
