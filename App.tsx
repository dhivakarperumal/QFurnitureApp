/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Bottombar from './src/Admin/Navigation/Bottombar';
import TopHeader from './src/Admin/Navigation/TopHeader';
import Home from './src/Admin/Home/Home';
import Products from './src/Admin/Products/Products';
import Orders from './src/Admin/Order/Orders';
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
  const [productDetailsOpen, setProductDetailsOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<
    'Home' | 'Products' | 'Orders' | 'More'
  >('Home');

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
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('user');
    clearTokenCache();
    setActiveItem('Home');
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
      {!productDetailsOpen ? (
        <TopHeader
          onMenuPress={() => console.log('Menu')}
          onNotificationPress={() => console.log('Notifications')}
          onProfilePress={() => console.log('Profile')}
          onLogoutPress={handleLogout}
          onDrawerItemPress={item => setActiveItem(item)}
        />
      ) : null}
      {activeItem === 'Home' ? (
        <Home
          onActionPress={action => {
            if (action === 'Add Product' || action === 'Categories' || action === 'Stock') {
              setActiveItem('Products');
            } else if (action === 'New Order') {
              setActiveItem('Orders');
            }
          }}
        />
      ) : activeItem === 'Products' ? (
        <Products
          onActionPress={action => console.log(action)}
          onDetailsVisibilityChange={setProductDetailsOpen}
        />
      ) : activeItem === 'Orders' ? (
        <Orders />
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
      />
    </View>
  );
}

export default App;
