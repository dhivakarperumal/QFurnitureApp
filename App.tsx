/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { useState } from 'react';
import { StatusBar, Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Bottombar from './src/Admin/Navigation/Bottombar';
import TopHeader from './src/Admin/Navigation/TopHeader';
import Home from './src/Admin/Home/Home';
import Products from './src/Admin/Products/Products';
import Orders from './src/Admin/Order/Orders';
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
  const [activeItem, setActiveItem] = useState<
    'Home' | 'Products' | 'Orders' | 'More'
  >('Home');

  return (
    <View className="flex-1 bg-white">
      <TopHeader
        onMenuPress={() => console.log('Menu')}
        onSearchPress={() => console.log('Search')}
        onNotificationPress={() => console.log('Notifications')}
        onProfilePress={() => console.log('Profile')}
      />
      {activeItem === 'Home' ? (
        <Home onActionPress={action => console.log(action)} />
      ) : activeItem === 'Products' ? (
        <Products onActionPress={action => console.log(action)} />
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
        onAddPress={() => console.log('Add')}
      />
    </View>
  );
}

export default App;
