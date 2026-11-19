/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import DrawerSalesReports from './src/Admin/Navigation/DrawerSalesReports';
import BannerScreen from './src/Admin/More/Banner';
import DrawerSettings from './src/Admin/Navigation/DrawerSettings';
import KeepAliveScreen from './src/Admin/Navigation/KeepAliveScreen';
import { signOutGoogle } from './src/services/googleAuth';
import Login from './src/Auth/Login';
import Register from './src/Auth/Register';
import { clearTokenCache, setTokenCache } from './src/api';
import './global.css';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
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

    const restoreSession = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          setTokenCache(token);
          if (mounted) setAuthenticated(true);
        }
      } finally {
        if (mounted) setCheckingSession(false);
      }
    };

    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

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
    setAuthenticated(false);
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

  const closeDrawerScreen = () => {
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
  };

  if (checkingSession) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAF5EF]">
        <ActivityIndicator size="large" color="#FF7900" />
      </View>
    );
  }

  if (!authenticated) {
    return authScreen === 'login' ? (
      <Login
        onLogin={() => setAuthenticated(true)}
        onRegisterPress={() => setAuthScreen('register')}
      />
    ) : (
      <Register onLoginPress={() => setAuthScreen('login')} />
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
        />
      </KeepAliveScreen>
      <KeepAliveScreen active={drawerScreen === 'customers'}>
        <DrawerCustomers onBackPress={closeDrawerScreen} />
      </KeepAliveScreen>
      <KeepAliveScreen active={drawerScreen === 'reports'}>
        <DrawerSalesReports onBackPress={closeDrawerScreen} />
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
