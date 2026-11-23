/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  StatusBar,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Bottombar from './src/Admin/Navigation/Bottombar';
import TopHeader from './src/Admin/Navigation/TopHeader';
import type { DrawerDestination } from './src/Admin/Navigation/TopHeader';
import Home from './src/Admin/Home/Home';
import Products from './src/Admin/Products/Products';
import Billing from './src/Admin/Billing/Billing';
import CreateBill from './src/Admin/Billing/CreateBill';
import Orders from './src/Admin/Order/Orders';
import OrdersDetails from './src/Admin/Order/OrdersDetails';
import type { Order } from './src/Admin/Order/Orders';
import More from './src/Admin/More/More';
import Profile from './src/Admin/More/Profile';
import DrawerCustomers from './src/Admin/Navigation/DrawerCustomers';
import ReportScreen from './src/Admin/More/Report';
import BannerScreen from './src/Admin/More/Banner';
import DrawerSettings from './src/Admin/Navigation/DrawerSettings';
import KeepAliveScreen from './src/Admin/Navigation/KeepAliveScreen';
import { signOutGoogle } from './src/services/googleAuth';
import Login from './src/Auth/Login';
import Register from './src/Auth/Register';
import { normalizeRole, type AppRole } from './src/Auth/roles';
import Welcome from './src/Assert/Welcome/Welcome';
import Storefront from './src/User/Storefront';
import { UserAlertProvider } from './src/User/UserAlert';
import {
  AdminAlertProvider,
  useAdminAlert,
} from './src/Admin/Navigation/AdminAlert';
import { clearTokenCache, setTokenCache } from './src/api';
import './global.css';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AdminAlertProvider>
        <UserAlertProvider>
          <AppContent />
        </UserAlertProvider>
      </AdminAlertProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const showAdminAlert = useAdminAlert();

  const [authenticated, setAuthenticated] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [userRole, setUserRole] = useState<AppRole>('user');
  const [checkingSession, setCheckingSession] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');
  const [profileOpen, setProfileOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [drawerScreen, setDrawerScreen] = useState<
    'customers' | 'reports' | 'offers' | 'settings' | null
  >(null);
  const [moreInitialScreen, setMoreInitialScreen] = useState<
    'menu' | 'categories' | 'users' | 'stock' | 'offers'
  >('menu');
  const [moreScreenRequestId, setMoreScreenRequestId] = useState(0);
  const [createBillOpen, setCreateBillOpen] = useState(false);
  const [billingRefreshKey, setBillingRefreshKey] = useState(0);
  const [productDetailsOpen, setProductDetailsOpen] = useState(false);
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [activeItem, setActiveItem] = useState<
    'Home' | 'Products' | 'Orders' | 'More'
  >('Home');
  const [activeDrawerItem, setActiveDrawerItem] =
    useState<DrawerDestination | null>('Dashboard');
  const [bottomBarVisible, setBottomBarVisible] = useState(true);

  // Refs so parent can trigger back-navigation inside child tab components
  const productsBackRef = useRef<(() => boolean) | null>(null);
  const moreBackRef = useRef<(() => boolean) | null>(null);

  useEffect(() => {
    setBottomBarVisible(true);
  }, [
    activeItem,
    profileOpen,
    billingOpen,
    createBillOpen,
    productDetailsOpen,
    moreDetailsOpen,
    selectedOrder,
  ]);

  useEffect(() => {
    let mounted = true;
    let welcomeSeen = false;
    let sessionRestored = false;

    const restoreSession = async () => {
      try {
        welcomeSeen =
          (await AsyncStorage.getItem('hasSeenWelcome')) === 'true';
        if (mounted && !welcomeSeen) setShowWelcome(true);
      } catch (error) {
        if (__DEV__) console.warn('[App] Could not read welcome status:', error);
        if (mounted) setShowWelcome(true);
      }

      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const serializedUser = await AsyncStorage.getItem('user');
          const user = serializedUser ? JSON.parse(serializedUser) : null;
          setTokenCache(token);
          if (mounted) {
            setUserRole(normalizeRole(user?.role));
            setAuthenticated(true);
            sessionRestored = true;
          }
        }
      } catch (error) {
        if (__DEV__) console.warn('[App] Could not restore the saved session:', error);
      } finally {
        if (mounted) {
          if (welcomeSeen && !sessionRestored) setGuestMode(true);
          setCheckingSession(false);
        }
      }
    };

    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  const completeWelcome = async () => {
    try {
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
      setGuestMode(true);
      setShowWelcome(false);
    } catch (error) {
      if (__DEV__) console.warn('[App] Could not save welcome status:', error);
      Alert.alert(
        'Could not save welcome status',
        'You can continue now, but this welcome screen may appear again next time.',
        [
          {
            text: 'Continue',
            onPress: () => {
              setGuestMode(true);
              setShowWelcome(false);
            },
          },
        ],
        { cancelable: false },
      );
    }
  };

  const handleLogout = async () => {
    try {
      await signOutGoogle();
    } catch (error) {
      if (__DEV__) console.warn('[App] Google sign-out failed:', error);
    }
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('user');
    clearTokenCache();
    setActiveItem('Home');
    setActiveDrawerItem('Dashboard');
    setProfileOpen(false);
    setBillingOpen(false);
    setDrawerScreen(null);
    setCreateBillOpen(false);
    setBillingRefreshKey(0);
    setSelectedOrder(null);
    setDetailsOrder(null);
    setUserRole('user');
    setAuthenticated(false);
    setGuestMode(false);
  };

  const handleDrawerItemPress = (item: DrawerDestination) => {
    setProfileOpen(false);
    setBillingOpen(false);
    setCreateBillOpen(false);
    setSelectedOrder(null);
    setMoreDetailsOpen(false);
    setActiveDrawerItem(item);

    switch (item) {
      case 'Dashboard':
        setDrawerScreen(null);
        setActiveItem('Home');
        setMoreInitialScreen('menu');
        setMoreScreenRequestId(requestId => requestId + 1);
        break;
      case 'Products':
        setDrawerScreen(null);
        setActiveItem('Products');
        setMoreInitialScreen('menu');
        setMoreScreenRequestId(requestId => requestId + 1);
        break;
      case 'Orders':
        setDrawerScreen(null);
        setActiveItem('Orders');
        setMoreInitialScreen('menu');
        setMoreScreenRequestId(requestId => requestId + 1);
        break;
      case 'Categories':
        setDrawerScreen(null);
        setActiveItem('More');
        setMoreInitialScreen('categories');
        setMoreScreenRequestId(requestId => requestId + 1);
        break;
      case 'Inventory / Stock':
        setDrawerScreen(null);
        setActiveItem('More');
        setMoreInitialScreen('stock');
        setMoreScreenRequestId(requestId => requestId + 1);
        break;
      case 'Users & Roles':
        setDrawerScreen(null);
        setActiveItem('More');
        setMoreInitialScreen('users');
        setMoreScreenRequestId(requestId => requestId + 1);
        break;
      case 'Customers':
        setDrawerScreen('customers');
        break;
      case 'Sales & Reports':
        setDrawerScreen('reports');
        break;
      case 'Offers & Banners':
        setDrawerScreen('offers');
        break;
      case 'Settings':
        setDrawerScreen('settings');
        break;
    }
  };

  const closeDrawerScreen = useCallback(() => {
    setDrawerScreen(null);
    if (activeItem === 'More') {
      setMoreInitialScreen('menu');
      setMoreScreenRequestId(requestId => requestId + 1);
    }
    setActiveDrawerItem(
      activeItem === 'Home'
        ? 'Dashboard'
        : activeItem === 'Products'
          ? 'Products'
          : activeItem === 'Orders'
            ? 'Orders'
            : null,
    );
  }, [activeItem]);

  // ── Android hardware back button (Admin) ──────────────────────────────────
  useEffect(() => {
    if (!authenticated || showWelcome) return;

    const onBackPress = () => {
      // Step 1: Close order details → back to Orders list
      if (selectedOrder !== null) {
        setSelectedOrder(null);
        return true;
      }

      // Step 2: Close CreateBill → back to Billing list
      if (createBillOpen) {
        setCreateBillOpen(false);
        return true;
      }

      // Step 3: Close Billing screen → back to current tab
      if (billingOpen) {
        setBillingOpen(false);
        return true;
      }

      // Step 4: Close any top-level drawer screen → back to current tab
      if (drawerScreen !== null) {
        closeDrawerScreen();
        return true;
      }

      // Step 5: Close top-level profile screen → back to current tab
      if (profileOpen) {
        setProfileOpen(false);
        return true;
      }

      // Step 6: Products tab — let the Products component close its own detail
      if (activeItem === 'Products' && productDetailsOpen) {
        const consumed = productsBackRef.current?.();
        if (consumed) return true;
      }

      // Step 7: More tab — let the More component close its own open sub-screen
      if (activeItem === 'More' && moreDetailsOpen) {
        const consumed = moreBackRef.current?.();
        if (consumed) return true;
      }

      // Step 8: Non-Home tab → navigate to Home tab
      if (activeItem !== 'Home') {
        setActiveItem('Home');
        setActiveDrawerItem('Dashboard');
        setMoreInitialScreen('menu');
        setMoreScreenRequestId(id => id + 1);
        return true;
      }

      // Step 9: Already on Home → show custom exit confirmation popup
      showAdminAlert(
        'Exit App',
        'Are you sure you want to exit?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Exit',
            style: 'destructive',
            onPress: () => BackHandler.exitApp(),
          },
        ],
      );
      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );
    return () => subscription.remove();
  }, [
    authenticated,
    selectedOrder,
    createBillOpen,
    billingOpen,
    drawerScreen,
    profileOpen,
    activeItem,
    closeDrawerScreen,
    productDetailsOpen,
    moreDetailsOpen,
    showAdminAlert,
    showWelcome,
  ]);

  if (showWelcome) {
    return <Welcome onComplete={completeWelcome} />;
  }

  if (checkingSession) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAF5EF]">
        <ActivityIndicator size="large" color="#FF7900" />
      </View>
    );
  }

  if (!authenticated && !guestMode) {
    return authScreen === 'login' ? (
      <Login
        onLogin={role => {
          setUserRole(role);
          setGuestMode(false);
          setAuthenticated(true);
        }}
        onRegisterPress={() => setAuthScreen('register')}
        onContinueAsGuest={() => setGuestMode(true)}
      />
    ) : (
      <Register onLoginPress={() => setAuthScreen('login')} />
    );
  }

  if (userRole === 'user') {
    return (
      <Storefront
        isGuest={!authenticated}
        onLoginPress={() => {
          setGuestMode(false);
          setAuthScreen('login');
        }}
        onLogoutPress={handleLogout}
      />
    );
  }

  const tabsVisible =
    !profileOpen && !billingOpen && selectedOrder === null && drawerScreen === null;

  return (
    <View className="flex-1 bg-white">
      {!profileOpen &&
      !createBillOpen &&
      !productDetailsOpen &&
      !moreDetailsOpen &&
      !selectedOrder &&
      drawerScreen === null ? (
        <TopHeader
          activeDrawerItem={activeDrawerItem}
          onMenuPress={() => console.log('Menu')}
          onNotificationPress={() => console.log('Notifications')}
          onProfilePress={() => setProfileOpen(true)}
          onLogoutPress={handleLogout}
          onDrawerItemPress={handleDrawerItemPress}
        />
      ) : null}
      <KeepAliveScreen active={profileOpen}>
        <Profile
          onBackPress={() => setProfileOpen(false)}
          onScrollVisibilityChange={setBottomBarVisible}
        />
      </KeepAliveScreen>
      <KeepAliveScreen active={!profileOpen && billingOpen && !createBillOpen}>
        <Billing
          onCreateBill={() => setCreateBillOpen(true)}
          refreshKey={billingRefreshKey}
          onScrollVisibilityChange={setBottomBarVisible}
          onOrderPress={order => {
            setBillingOpen(false);
            setCreateBillOpen(false);
            setActiveItem('Orders');
            setDetailsOrder(order);
            setSelectedOrder(order);
          }}
        />
      </KeepAliveScreen>
      <KeepAliveScreen active={!profileOpen && billingOpen && createBillOpen}>
        <CreateBill
          onBackPress={() => setCreateBillOpen(false)}
          onOrderCreated={() => {
            setBillingRefreshKey(key => key + 1);
            setCreateBillOpen(false);
          }}
        />
      </KeepAliveScreen>
      <KeepAliveScreen active={tabsVisible && activeItem === 'Home'}>
        <Home
          onScrollVisibilityChange={setBottomBarVisible}
          onActionPress={action => {
            if (
              action === 'Add Product' ||
              action === 'Categories' ||
              action === 'Stock'
            ) {
              setActiveItem('Products');
            } else if (action === 'New Order') {
              setActiveItem('Orders');
            }
          }}
        />
      </KeepAliveScreen>
      <KeepAliveScreen active={tabsVisible && activeItem === 'Products'}>
        <Products
          onScrollVisibilityChange={setBottomBarVisible}
          onActionPress={action => console.log(action)}
          onDetailsVisibilityChange={setProductDetailsOpen}
          onHardwareBackRef={productsBackRef}
        />
      </KeepAliveScreen>
      <KeepAliveScreen active={tabsVisible && activeItem === 'Orders'}>
        <Orders
          onScrollVisibilityChange={setBottomBarVisible}
          onOrderPress={order => {
            setDetailsOrder(order);
            setSelectedOrder(order);
          }}
        />
      </KeepAliveScreen>
      <KeepAliveScreen active={selectedOrder !== null}>
        {detailsOrder ? (
          <OrdersDetails
            order={detailsOrder}
            onBack={() => setSelectedOrder(null)}
          />
        ) : null}
      </KeepAliveScreen>
      <KeepAliveScreen active={tabsVisible && activeItem === 'More'}>
        <More
          onScrollVisibilityChange={setBottomBarVisible}
          onDetailsVisibilityChange={setMoreDetailsOpen}
          initialScreen={moreInitialScreen}
          screenRequestId={moreScreenRequestId}
          onHardwareBackRef={moreBackRef}
        />
      </KeepAliveScreen>
      <KeepAliveScreen active={drawerScreen === 'customers'}>
        <DrawerCustomers onBackPress={closeDrawerScreen} />
      </KeepAliveScreen>
      <KeepAliveScreen active={drawerScreen === 'reports'}>
        <ReportScreen onBackPress={closeDrawerScreen} />
      </KeepAliveScreen>
      <KeepAliveScreen active={drawerScreen === 'offers'}>
        <BannerScreen onBackPress={closeDrawerScreen} />
      </KeepAliveScreen>
      <KeepAliveScreen active={drawerScreen === 'settings'}>
        <DrawerSettings onBackPress={closeDrawerScreen} />
      </KeepAliveScreen>
      <Bottombar
        activeItem={activeItem}
        onItemPress={item => {
          setBillingOpen(false);
          setCreateBillOpen(false);
          setDrawerScreen(null);
          setActiveItem(item);
          setActiveDrawerItem(
            item === 'Home'
              ? 'Dashboard'
              : item === 'Products'
                ? 'Products'
                : item === 'Orders'
                  ? 'Orders'
                  : null,
          );
          if (item === 'More') {
            setMoreInitialScreen('menu');
            setMoreScreenRequestId(requestId => requestId + 1);
          }
        }}
        onAddPress={() => {
          setBillingOpen(true);
          setCreateBillOpen(true);
        }}
        badgeCount={5}
        visible={
          bottomBarVisible &&
          drawerScreen === null &&
          !profileOpen &&
          !createBillOpen &&
          !productDetailsOpen &&
          !moreDetailsOpen &&
          !selectedOrder
        }
      />
    </View>
  );
}

export default App;
