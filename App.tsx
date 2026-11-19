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
import Home from './src/Admin/Home/Home';
import Products from './src/Admin/Products/Products';
import Billing from './src/Admin/Billing/Billing';
import CreateBill from './src/Admin/Billing/CreateBill';
import Orders from './src/Admin/Order/Orders';
import OrdersDetails from './src/Admin/Order/OrdersDetails';
import type { Order } from './src/Admin/Order/Orders';
import More from './src/Admin/More/More';
import Profile from './src/Admin/More/Profile';
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
  const [createBillOpen, setCreateBillOpen] = useState(false);
  const [billingRefreshKey, setBillingRefreshKey] = useState(0);
  const [productDetailsOpen, setProductDetailsOpen] = useState(false);
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [activeItem, setActiveItem] = useState<
    'Home' | 'Products' | 'Orders' | 'More'
  >('Home');
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
    setProfileOpen(false);
    setBillingOpen(false);
    setCreateBillOpen(false);
    setBillingRefreshKey(0);
    setSelectedOrder(null);
    setDetailsOrder(null);
    setAuthenticated(false);
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
    !profileOpen && !billingOpen && selectedOrder === null;

  return (
    <View className="flex-1 bg-white">
      {!profileOpen &&
      !createBillOpen &&
      !productDetailsOpen &&
      !moreDetailsOpen &&
      !selectedOrder ? (
        <TopHeader
          onMenuPress={() => console.log('Menu')}
          onNotificationPress={() => console.log('Notifications')}
          onProfilePress={() => setProfileOpen(true)}
          onLogoutPress={handleLogout}
          onDrawerItemPress={item => {
            setBillingOpen(false);
            setCreateBillOpen(false);
            setActiveItem(item);
          }}
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
        />
      </KeepAliveScreen>
      <Bottombar
        activeItem={activeItem}
        onItemPress={item => {
          setBillingOpen(false);
          setCreateBillOpen(false);
          setActiveItem(item);
        }}
        onAddPress={() => {
          setBillingOpen(true);
          setCreateBillOpen(true);
        }}
        badgeCount={5}
        visible={
          bottomBarVisible &&
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
