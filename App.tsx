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
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Bottombar from './src/Admin/Navigation/Bottombar';
import TopHeader from './src/Admin/Navigation/TopHeader';
import Home from './src/Admin/Home/Home';
import Products from './src/Admin/Products/Products';
import Orders from './src/Admin/Order/Orders';
import OrdersDetails from './src/Admin/Order/OrdersDetails';
import type { Order } from './src/Admin/Order/Orders';
import More from './src/Admin/More/More';
import Profile from './src/Admin/More/Profile';
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
  const [productDetailsOpen, setProductDetailsOpen] = useState(false);
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeItem, setActiveItem] = useState<
    'Home' | 'Products' | 'Orders' | 'More'
  >('Home');
  const [bottomBarVisible, setBottomBarVisible] = useState(true);

  useEffect(() => {
    setBottomBarVisible(true);
  }, [
    activeItem,
    profileOpen,
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

  return (
    <View className="flex-1 bg-white">
      {!profileOpen &&
      !productDetailsOpen &&
      !moreDetailsOpen &&
      !selectedOrder ? (
        <TopHeader
          onMenuPress={() => console.log('Menu')}
          onNotificationPress={() => console.log('Notifications')}
          onProfilePress={() => setProfileOpen(true)}
          onLogoutPress={handleLogout}
          onDrawerItemPress={item => setActiveItem(item)}
        />
      ) : null}
      {profileOpen ? (
        <Profile
          onBackPress={() => setProfileOpen(false)}
          onScrollVisibilityChange={setBottomBarVisible}
        />
      ) : activeItem === 'Home' ? (
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
      ) : activeItem === 'Products' ? (
        <Products
          onScrollVisibilityChange={setBottomBarVisible}
          onActionPress={action => console.log(action)}
          onDetailsVisibilityChange={setProductDetailsOpen}
        />
      ) : activeItem === 'Orders' ? (
        selectedOrder ? (
          <OrdersDetails
            order={selectedOrder}
            onBack={() => setSelectedOrder(null)}
          />
        ) : (
          <Orders
            onScrollVisibilityChange={setBottomBarVisible}
            onOrderPress={order => setSelectedOrder(order)}
          />
        )
      ) : activeItem === 'More' ? (
        <More
          onScrollVisibilityChange={setBottomBarVisible}
          onDetailsVisibilityChange={setMoreDetailsOpen}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <View className="rounded-[18px] bg-[#FFF7E6] px-6 py-5">
            <Text className="text-[14px] font-bold text-[#073E56]">
              {activeItem} section
            </Text>
          </View>
        </View>
      )}
      <Bottombar
        activeItem={activeItem}
        onItemPress={item => setActiveItem(item)}
        onAddPress={() => setActiveItem('Products')}
        badgeCount={5}
        visible={
          bottomBarVisible &&
          !profileOpen &&
          !productDetailsOpen &&
          !moreDetailsOpen &&
          !selectedOrder
        }
      />
    </View>
  );
}

export default App;
