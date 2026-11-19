import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  Boxes,
  ChevronRight,
  LayoutGrid,
  Megaphone,
  MessageSquare,
  Tag,
  UserRound,
  UsersRound,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Categery from './Categery';
import Profile from './Profile';
import ReviewScreen from './Review';
import StockDetails from './StockDetails';
import Usermanagement from './Usermanagement';
import KeepAliveScreen from '../Navigation/KeepAliveScreen';
import BannerScreen from './Banner';
import Topheaderoffer from './Topheaderoffer';

type MoreProps = {
  onScrollVisibilityChange?: (visible: boolean) => void;
  onDetailsVisibilityChange?: (visible: boolean) => void;
  initialScreen?: 'menu' | 'categories' | 'users' | 'stock' | 'offers';
  screenRequestId?: number;
};

export default function More({
  onScrollVisibilityChange,
  onDetailsVisibilityChange,
  initialScreen,
  screenRequestId = 0,
}: MoreProps) {
  const insets = useSafeAreaInsets();
  const [categoriesOpen, setCategoriesOpen] = React.useState(false);
  const [usersOpen, setUsersOpen] = React.useState(false);
  const [stockOpen, setStockOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [reviewsOpen, setReviewsOpen] = React.useState(false);
  const [offersOpen, setOffersOpen] = React.useState(false);
  const [offerManagementOpen, setOfferManagementOpen] = React.useState(false);

  React.useEffect(() => {
    if (!initialScreen || screenRequestId === 0) return;
    setCategoriesOpen(initialScreen === 'categories');
    setUsersOpen(initialScreen === 'users');
    setStockOpen(initialScreen === 'stock');
    setProfileOpen(false);
    setReviewsOpen(false);
    setOffersOpen(initialScreen === 'offers');
    onDetailsVisibilityChange?.(initialScreen !== 'menu');
    onScrollVisibilityChange?.(true);
  }, [
    initialScreen,
    screenRequestId,
    onDetailsVisibilityChange,
    onScrollVisibilityChange,
  ]);

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

  const openOffers = () => {
    setOffersOpen(true);
    onDetailsVisibilityChange?.(true);
    onScrollVisibilityChange?.(true);
  };

  const closeOffers = () => {
    setOffersOpen(false);
    onDetailsVisibilityChange?.(false);
    onScrollVisibilityChange?.(true);
  };

  const openOfferManagement = () => {
    setOfferManagementOpen(true);
    onDetailsVisibilityChange?.(true);
    onScrollVisibilityChange?.(true);
  };

  const closeOfferManagement = () => {
    setOfferManagementOpen(false);
    onDetailsVisibilityChange?.(false);
    onScrollVisibilityChange?.(true);
  };

  const detailOpen =
    categoriesOpen ||
    usersOpen ||
    stockOpen ||
    profileOpen ||
    reviewsOpen ||
    offersOpen ||
    offerManagementOpen;
  return (
    <View className="flex-1">
      <KeepAliveScreen active={!detailOpen}>
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open offers and banners"
        onPress={openOffers}
        className="mt-3 flex-row items-center rounded-[18px] border border-[#FCE6D7] bg-white p-4 shadow-sm elevation-[2]"
      >
        <View className="h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[#FFF1D6]">
          <Megaphone size={25} color="#F97316" strokeWidth={2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-black text-[#17191C]">
            Offers & Banners
          </Text>
          <Text className="mt-1 text-[11px] text-[#64748B]">
            Manage promotional offers and banners
          </Text>
        </View>
        <ChevronRight size={21} color="#94A3B8" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open offers management"
        onPress={openOfferManagement}
        className="mt-3 flex-row items-center rounded-[18px] border border-[#FCE6D7] bg-white p-4 shadow-sm elevation-[2]"
      >
        <View className="h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[#FFF1D6]">
          <Tag size={25} color="#F97316" strokeWidth={2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-black text-[#17191C]">
            Offers
          </Text>
          <Text className="mt-1 text-[11px] text-[#64748B]">
            Manage discounts and website header offers
          </Text>
        </View>
        <ChevronRight size={21} color="#94A3B8" />
      </Pressable>
        </ScrollView>
      </KeepAliveScreen>
      <KeepAliveScreen active={categoriesOpen}>
        <Categery
          onScrollVisibilityChange={onScrollVisibilityChange}
          onBackPress={closeCategories}
        />
      </KeepAliveScreen>
      <KeepAliveScreen active={usersOpen}>
        <Usermanagement
          onScrollVisibilityChange={onScrollVisibilityChange}
          onBackPress={closeUsers}
        />
      </KeepAliveScreen>
      <KeepAliveScreen active={stockOpen}>
        <StockDetails
          onScrollVisibilityChange={onScrollVisibilityChange}
          onBackPress={closeStock}
        />
      </KeepAliveScreen>
      <KeepAliveScreen active={profileOpen}>
        <Profile
          onScrollVisibilityChange={onScrollVisibilityChange}
          onBackPress={closeProfile}
        />
      </KeepAliveScreen>
      <KeepAliveScreen active={reviewsOpen}>
        <ReviewScreen
          onScrollVisibilityChange={onScrollVisibilityChange}
          onBackPress={closeReviews}
        />
      </KeepAliveScreen>
      <KeepAliveScreen active={offersOpen}>
        <BannerScreen onBackPress={closeOffers} />
      </KeepAliveScreen>
      <KeepAliveScreen active={offerManagementOpen}>
        <Topheaderoffer onBackPress={closeOfferManagement} />
      </KeepAliveScreen>
    </View>
  );
}
