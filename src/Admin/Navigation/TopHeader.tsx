import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
  Home,
  LayoutGrid,
  Layers,
  LogOut,
  Menu,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tag,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import api from '../../api';

type HeaderOrder = {
  id: number | string;
  order_id?: string;
  customer_name?: string;
  total_amount?: number | string;
  status?: string;
  created_at?: string;
};

type TopHeaderProps = {
  shopName?: string;
  pageTitle?: string;
  pageSubtitle?: string;
  onBackPress?: () => void;
  notificationCount?: number;
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  onLogoutPress?: () => void;
  activeDrawerItem?: DrawerDestination | null;
  onDrawerItemPress?: (item: DrawerDestination) => void;
};

export type DrawerDestination =
  | 'Dashboard'
  | 'Products'
  | 'Categories'
  | 'Orders'
  | 'Customers'
  | 'Inventory / Stock'
  | 'Sales & Reports'
  | 'Offers & Banners'
  | 'Users & Roles'
  | 'Settings';

const drawerItems: Array<{
  label: DrawerDestination;
  icon: typeof Home;
  expandable?: boolean;
}> = [
  { label: 'Dashboard', icon: Home },
  { label: 'Products', icon: Package, expandable: true },
  { label: 'Categories', icon: LayoutGrid },
  { label: 'Orders', icon: ShoppingBag },
  { label: 'Customers', icon: UsersRound },
  { label: 'Inventory / Stock', icon: Layers },
  { label: 'Sales & Reports', icon: BarChart3, expandable: true },
  { label: 'Offers & Banners', icon: Tag },
  { label: 'Users & Roles', icon: ShieldCheck },
  { label: 'Settings', icon: Settings },
];

const isToday = (value?: string) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) &&
    date.toDateString() === new Date().toDateString();
};

const formatOrderId = (order: HeaderOrder) =>
  order.order_id || `ORD${String(order.id).padStart(4, '0')}`;

const formatCurrency = (value?: number | string) => {
  const amount = Number(value);
  return `₹${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-IN')}`;
};

const formatOrderTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

export default function TopHeader({
  shopName = 'Q Furniture',
  pageTitle,
  pageSubtitle,
  onBackPress,
  notificationCount = 0,
  onMenuPress,
  onNotificationPress,
  onProfilePress,
  onLogoutPress,
  onDrawerItemPress,
  activeDrawerItem,
}: TopHeaderProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [expandedDrawerItem, setExpandedDrawerItem] = useState<string | null>(
    null,
  );
  const [profileVisible, setProfileVisible] = useState(false);
  const [userInitial, setUserInitial] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [todayOrders, setTodayOrders] = useState<HeaderOrder[]>([]);
  const [todayOrdersLoading, setTodayOrdersLoading] = useState(false);
  const [todayOrdersError, setTodayOrdersError] = useState<string | null>(null);
  const [todayOrdersLoaded, setTodayOrdersLoaded] = useState(false);

  const loadTodayOrders = useCallback(async () => {
    setTodayOrdersLoading(true);
    setTodayOrdersError(null);
    try {
      const response = await api.get<HeaderOrder[]>('/orders', {
        params: { status: 'All' },
      });
      if (!Array.isArray(response.data)) {
        throw new Error('The orders response did not contain an order list.');
      }
      setTodayOrders(
        response.data
          .filter(order => isToday(order.created_at))
          .sort(
            (first, second) =>
              new Date(second.created_at ?? 0).getTime() -
              new Date(first.created_at ?? 0).getTime(),
          ),
      );
      setTodayOrdersLoaded(true);
    } catch (error: unknown) {
      setTodayOrdersError(
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Unable to load today’s orders.',
      );
      setTodayOrdersLoaded(false);
    } finally {
      setTodayOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadUserInitial = async () => {
      let serializedUser: string | null;
      try {
        serializedUser = await AsyncStorage.getItem('user');
      } catch (error) {
        if (__DEV__) {
          console.warn('[TopHeader] Could not read the saved user:', error);
        }
        return;
      }

      if (!serializedUser) return;

      let user: unknown;
      try {
        user = JSON.parse(serializedUser);
      } catch (error) {
        if (__DEV__) {
          console.warn('[TopHeader] The saved user data is invalid:', error);
        }
        return;
      }

      if (typeof user !== 'object' || user === null) return;
      const name =
        'name' in user && typeof user.name === 'string' ? user.name.trim() : '';
      const email =
        'email' in user && typeof user.email === 'string'
          ? user.email.trim()
          : '';
      const initial = Array.from(name)[0]?.toLocaleUpperCase();
      if (mounted) {
        setUserName(name);
        setUserEmail(email);
        if (initial) setUserInitial(initial);
      }
    };

    loadUserInitial();
    return () => {
      mounted = false;
    };
  }, []);

  const openDrawer = () => {
    setProfileVisible(false);
    setNotificationsVisible(false);
    setDrawerVisible(true);
    if (!todayOrdersLoaded) loadTodayOrders();
    onMenuPress?.();
  };

  const toggleProfile = () => {
    setDrawerVisible(false);
    setNotificationsVisible(false);
    setProfileVisible(value => !value);
    onProfilePress?.();
  };

  const toggleNotifications = () => {
    const shouldOpen = !notificationsVisible;
    setNotificationsVisible(shouldOpen);
    setProfileVisible(false);
    if (shouldOpen) loadTodayOrders();
    onNotificationPress?.();
  };

  const displayedNotificationCount = todayOrdersLoaded
    ? todayOrders.length
    : notificationCount;

  return (
    <ImageBackground
      source={require('../../Assert/images/topheader.png')}
      resizeMode="stretch"
      blurRadius={3}
      style={[styles.header, { paddingTop: insets.top }]}
      className="absolute left-0 right-0 top-0 z-10">
      <View
        pointerEvents="none"
        className="absolute inset-0 bg-black/20"
      />
      <View className={`${pageTitle ? 'h-[56px]' : 'h-[64px]'} flex-row items-center px-2`}>
        {pageTitle ? (
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
            onPress={onBackPress}
            className="h-[44px] w-[44px] items-center justify-center rounded-full border border-white/40 bg-white shadow-sm elevation-[4]">
            <ArrowLeft size={24} color="#F97316" strokeWidth={2.5} />
          </Pressable>
        ) : (
          <Pressable
            accessibilityLabel="Open menu"
            accessibilityRole="button"
            onPress={openDrawer}
            className="h-[42px] w-[42px] items-center justify-center">
            <Menu size={28} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>
        )}

        {pageTitle ? (
          <View className="flex-1 justify-center pl-3">
            <Text numberOfLines={1} className="text-[16px] font-bold text-white">
              {pageTitle}
            </Text>
            {pageSubtitle ? (
              <Text numberOfLines={1} className="text-[10px] text-white/85">
                {pageSubtitle}
              </Text>
            ) : null}
          </View>
        ) : (
          <View className="flex-1 flex-row items-center">
            <Image
              source={require('../../Assert/images/appicon.png')}
              className="h-[48px] w-[48px] rounded-full"
              resizeMode="cover"
            />
            <View className="ml-[8px] flex-1">
              <Text numberOfLines={1} className="text-[14px] font-bold text-white">
                {shopName}
              </Text>
              <Text numberOfLines={1} className="text-[10px] text-white/85">
                Hi Welcome, Admin (Admin)
              </Text>
            </View>
          </View>
        )}

        {!pageTitle ? (
          <View className="relative mr-[6px]">
            <Pressable
              accessibilityLabel="Notifications"
              accessibilityRole="button"
              accessibilityState={{ expanded: notificationsVisible }}
              onPress={toggleNotifications}
              className="h-[38px] w-[38px] items-center justify-center">
              <Bell size={26} color="#FFFFFF" strokeWidth={2} />
              {displayedNotificationCount > 0 && (
                <View className="absolute right-[-2px] top-[-2px] h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#DC2626] px-1">
                  <Text className="text-[10px] font-bold text-white">
                    {displayedNotificationCount > 99
                      ? '99+'
                      : displayedNotificationCount}
                  </Text>
                </View>
              )}
            </Pressable>

            {notificationsVisible && (
              <View className="absolute right-0 top-[45px] z-[30] w-[280px] overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white shadow-lg elevation-[12]">
                <View className="flex-row items-center justify-between border-b border-[#E5E7EB] px-3 py-3">
                  <Text className="text-[14px] font-bold text-[#17191C]">
                    Today’s Orders
                  </Text>
                  <View className="rounded-full bg-[#FFF1D6] px-2 py-1">
                    <Text className="text-[11px] font-bold text-[#B45309]">
                      {todayOrders.length}
                    </Text>
                  </View>
                </View>

                {todayOrdersLoading ? (
                  <View className="items-center py-6">
                    <ActivityIndicator color="#F97316" />
                  </View>
                ) : todayOrdersError ? (
                  <View className="p-3">
                    <Text className="mb-2 text-[12px] text-[#B91C1C]">
                      {todayOrdersError}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={loadTodayOrders}
                      className="self-start rounded-[8px] bg-[#F97316] px-3 py-2">
                      <Text className="text-[11px] font-bold text-white">Retry</Text>
                    </Pressable>
                  </View>
                ) : todayOrders.length > 0 ? (
                  <ScrollView className="max-h-[280px]">
                    {todayOrders.map(order => (
                      <View
                        key={order.id}
                        className="flex-row items-center justify-between border-b border-[#F1F5F9] px-3 py-3">
                        <View className="mr-2 flex-1">
                          <Text className="text-[12px] font-bold text-[#17191C]">
                            {formatOrderId(order)}
                          </Text>
                          <Text
                            numberOfLines={1}
                            className="mt-1 text-[11px] text-[#64748B]">
                            {order.customer_name || 'Customer'}
                            {formatOrderTime(order.created_at)
                              ? ` · ${formatOrderTime(order.created_at)}`
                              : ''}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-[12px] font-bold text-[#17191C]">
                            {formatCurrency(order.total_amount)}
                          </Text>
                          <Text className="mt-1 text-[10px] text-[#64748B]">
                            {order.status || 'New'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text className="px-3 py-6 text-center text-[12px] text-[#64748B]">
                    No orders today.
                  </Text>
                )}
              </View>
            )}
          </View>
        ) : null}

        {!pageTitle ? (
          <View className="relative">
            <Pressable
              accessibilityLabel="Open profile menu"
              accessibilityRole="button"
              onPress={toggleProfile}
              className="h-[42px] w-[42px] items-center justify-center rounded-full bg-white/20">
              {userInitial ? (
                <Text className="text-[18px] font-black text-white">
                  {userInitial}
                </Text>
              ) : (
              <UserRound size={22} color="#FFFFFF" strokeWidth={2.2} />
              )}
            </Pressable>

            {profileVisible && (
              <View className="absolute right-0 top-[50px] w-[210px] rounded-[12px] border border-[#E5E7EB] bg-white p-[8px] shadow-lg elevation-[12]">
              <View className="mb-[6px] border-b border-[#E5E7EB] px-[8px] pb-[8px]">
                <Text numberOfLines={1} className="text-[14px] font-bold text-[#17191C]">
                  {userName || 'Account'}
                </Text>
                <Text numberOfLines={1} className="mt-[2px] text-[12px] text-[#6B7280]">
                  {userEmail || 'Email unavailable'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setProfileVisible(false);
                  onProfilePress?.();
                }}
                className="h-[42px] flex-row items-center rounded-[8px] px-[10px]">
                <UserRound size={18} color="#17191C" strokeWidth={2} />
                <View className="ml-[8px]" />
                <Text className="text-[14px] font-bold text-[#17191C]">Profile</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setProfileVisible(false);
                  onLogoutPress?.();
                }}
                className="h-[42px] flex-row items-center rounded-[8px] px-[10px]">
                <LogOut size={18} color="#DC2626" strokeWidth={2} />
                <View className="ml-[8px]" />
                <Text className="text-[14px] font-bold text-[#DC2626]">Logout</Text>
              </Pressable>
              </View>
            )}
          </View>
        ) : null}
      </View>

      <Modal
        visible={drawerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDrawerVisible(false)}>
        <View className="flex-1 flex-row bg-black/55">
          <View
            style={{
              width: Math.min(windowWidth * 0.78, 340),
              paddingBottom: insets.bottom,
            }}
            className="overflow-hidden rounded-r-[22px] bg-white">
            <View
              className="bg-[#E95305] px-4 pb-4"
              style={{ paddingTop: insets.top + 12 }}>
              <View className="mb-4 flex-row items-center">
                <View className="h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-[12px] bg-white">
                  <Image
                    source={require('../../Assert/images/appicon.png')}
                    className="h-[38px] w-[38px]"
                    resizeMode="contain"
                  />
                </View>
                <View className="ml-2 flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-[19px] font-black text-white">
                    {shopName.replace(/\s+Furniture$/i, 'Furnitures Living')}
                  </Text>
                  <Text numberOfLines={1} className="mt-0.5 text-[10px] text-white/85">
                    Store Admin Dashboard
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close menu"
                  accessibilityRole="button"
                  onPress={() => setDrawerVisible(false)}
                  className="ml-1 h-[36px] w-[36px] items-center justify-center rounded-full bg-white/20">
                  <X size={20} color="#FFFFFF" strokeWidth={2.2} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              className="flex-1"
              contentContainerClassName="px-2 py-3"
              showsVerticalScrollIndicator={false}>
              {drawerItems.map(item => {
                const ItemIcon = item.icon;
                const isActive = activeDrawerItem === item.label;
                const isExpanded = expandedDrawerItem === item.label;
                const children =
                  item.label === 'Products'
                    ? (['Products', 'Categories', 'Inventory / Stock'] as const)
                    : item.label === 'Sales & Reports'
                      ? (['Sales & Reports', 'Orders'] as const)
                      : [];
                return (
                  <View key={item.label}>
                    <View
                      className={[
                        'mb-1 h-[46px] flex-row items-center rounded-[12px]',
                        isActive ? 'bg-[#FFF0E3]' : '',
                      ].join(' ')}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: isActive }}
                        onPress={() => {
                          setDrawerVisible(false);
                          onDrawerItemPress?.(item.label);
                        }}
                        className="h-full flex-1 flex-row items-center pl-3">
                        <ItemIcon
                          size={22}
                          color={isActive ? '#E95305' : '#17191C'}
                          strokeWidth={2}
                        />
                        <Text
                          className={[
                            'ml-3 flex-1 text-[14px]',
                            isActive
                              ? 'font-bold text-[#C2410C]'
                              : 'font-medium text-[#17191C]',
                          ].join(' ')}>
                          {item.label}
                        </Text>
                        {item.label === 'Orders' &&
                        displayedNotificationCount > 0 ? (
                          <View className="mr-3 min-w-[34px] items-center rounded-full bg-[#F97316] px-2 py-1">
                            <Text className="text-[10px] font-bold text-white">
                              {displayedNotificationCount > 99
                                ? '99+'
                                : displayedNotificationCount}
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>
                      {item.expandable ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} ${item.label}`}
                          onPress={() =>
                            setExpandedDrawerItem(isExpanded ? null : item.label)
                          }
                          className="h-full w-[40px] items-center justify-center">
                          {isExpanded ? (
                            <ChevronDown size={18} color="#475569" />
                          ) : (
                            <ChevronRight size={18} color="#475569" />
                          )}
                        </Pressable>
                      ) : null}
                    </View>
                    {isExpanded
                      ? children
                          .filter(child => child !== item.label)
                          .map(child => (
                            <Pressable
                              key={child}
                              accessibilityRole="button"
                              onPress={() => {
                                setDrawerVisible(false);
                                onDrawerItemPress?.(child);
                              }}
                              className="mb-1 ml-9 h-[38px] justify-center rounded-[10px] px-3">
                              <Text className="text-[12px] font-medium text-[#475569]">
                                {child}
                              </Text>
                            </Pressable>
                          ))
                      : null}
                  </View>
                );
              })}
            </ScrollView>

            <View className="border-t border-[#E5E7EB] px-2 py-3">
              {userEmail ? (
                <Text
                  numberOfLines={1}
                  className="mb-2 px-3 text-[10px] text-[#64748B]">
                  {userEmail}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setDrawerVisible(false);
                  onLogoutPress?.();
                }}
                className="h-[48px] flex-row items-center rounded-[12px] px-3">
                <LogOut size={22} color="#DC2626" strokeWidth={2} />
                <Text className="ml-3 text-[14px] font-semibold text-[#DC2626]">
                  Logout
                </Text>
              </Pressable>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close navigation drawer"
            onPress={() => setDrawerVisible(false)}
            className="flex-1"
          />
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 100,
    backgroundColor: colors.primary,
    width: '100%',
  },
});
