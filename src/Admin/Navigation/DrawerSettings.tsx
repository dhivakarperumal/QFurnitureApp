import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { ReceiptText, ShieldCheck, Store } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, {
  invalidateApiResponseCache,
} from '../../api';
import TopHeader from './TopHeader';

type GstSettings = {
  gst_enabled?: boolean;
  gst_rate?: number | string;
};

type StockSettings = {
  allow_negative_stock?: boolean;
};

type Props = {
  onBackPress: () => void;
};

const errorMessage = (error: unknown, fallback: string) =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : fallback;

export default function DrawerSettings({ onBackPress }: Props) {
  const insets = useSafeAreaInsets();
  const hasLoaded = useRef(false);
  const [gst, setGst] = useState<GstSettings | null>(null);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingStock, setSavingStock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
      invalidateApiResponseCache();
    } else if (!hasLoaded.current) {
      setLoading(true);
    }
    setError(null);
    try {
      const [gstResponse, stockResponse] = await Promise.all([
        api.get<GstSettings>('/settings/gst'),
        api.get<StockSettings>('/stock/settings'),
      ]);
      const rate = Number(gstResponse.data?.gst_rate);
      if (
        typeof gstResponse.data?.gst_enabled !== 'boolean' ||
        !Number.isFinite(rate) ||
        rate < 0 ||
        rate > 100
      ) {
        throw new Error('The GST settings response was invalid.');
      }
      setGst({
        gst_enabled: gstResponse.data.gst_enabled,
        gst_rate: rate,
      });
      setAllowNegativeStock(
        Boolean(stockResponse.data?.allow_negative_stock),
      );
      hasLoaded.current = true;
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'Could not load store settings.'));
      if (__DEV__) console.warn('[DrawerSettings] Could not load settings:', loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateNegativeStock = async (enabled: boolean) => {
    setSavingStock(true);
    try {
      const response = await api.put<StockSettings>('/stock/settings', {
        allow_negative_stock: enabled,
      });
      setAllowNegativeStock(
        Boolean(response.data?.allow_negative_stock),
      );
    } catch (saveError: unknown) {
      if (__DEV__) {
        console.warn(
          '[DrawerSettings] Could not update stock settings:',
          saveError,
        );
      }
      Alert.alert(
        'Update failed',
        errorMessage(saveError, 'Could not update stock settings.'),
      );
    } finally {
      setSavingStock(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <TopHeader
        pageTitle="Settings"
        pageSubtitle="Store and order preferences"
        onBackPress={onBackPress}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadSettings(true)}
            tintColor="#F97316"
            colors={['#F97316']}
          />
        }
        contentContainerClassName="px-4 pb-10"
        style={{ paddingTop: insets.top + 76 }}>
        {error ? (
          <View className="mb-3 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] p-3">
            <Text className="text-[11px] text-[#B91C1C]">{error}</Text>
          </View>
        ) : null}
        {loading ? (
          <View className="items-center rounded-[16px] bg-white py-10">
            <ActivityIndicator color="#F97316" />
            <Text className="mt-2 text-[11px] text-[#64748B]">
              Loading settings...
            </Text>
          </View>
        ) : (
          <>
            <View className="mb-3 flex-row items-center rounded-[16px] border border-[#ECE8E2] bg-white p-4">
              <View className="h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#FFF1D6]">
                <Store size={21} color="#C2410C" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[13px] font-black text-[#17191C]">
                  Q Furnitures
                </Text>
                <Text className="mt-1 text-[10px] text-[#64748B]">
                  Store administration
                </Text>
              </View>
            </View>

            <View className="mb-3 rounded-[16px] border border-[#ECE8E2] bg-white p-4">
              <View className="mb-3 flex-row items-center">
                <ReceiptText size={19} color="#C2410C" />
                <Text className="ml-2 text-[13px] font-black text-[#17191C]">
                  GST settings
                </Text>
              </View>
              <View className="flex-row items-center justify-between border-t border-[#F1F5F9] py-3">
                <Text className="text-[11px] text-[#64748B]">GST</Text>
                <Text
                  className={[
                    'text-[11px] font-bold',
                    gst?.gst_enabled ? 'text-[#15803D]' : 'text-[#64748B]',
                  ].join(' ')}>
                  {gst?.gst_enabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              <View className="flex-row items-center justify-between border-t border-[#F1F5F9] pt-3">
                <Text className="text-[11px] text-[#64748B]">GST rate</Text>
                <Text className="text-[11px] font-bold text-[#17191C]">
                  {gst?.gst_rate ?? 0}%
                </Text>
              </View>
            </View>

            <View className="rounded-[16px] border border-[#ECE8E2] bg-white p-4">
              <View className="flex-row items-center">
                <View className="h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF1D6]">
                  <ShieldCheck size={19} color="#C2410C" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[12px] font-bold text-[#17191C]">
                    Allow negative stock
                  </Text>
                  <Text className="mt-1 text-[10px] text-[#64748B]">
                    Allow orders when inventory is below zero.
                  </Text>
                </View>
                {savingStock ? (
                  <ActivityIndicator size="small" color="#F97316" />
                ) : (
                  <Switch
                    value={allowNegativeStock}
                    onValueChange={updateNegativeStock}
                    trackColor={{ false: '#CBD5E1', true: '#FDBA74' }}
                    thumbColor={allowNegativeStock ? '#C2410C' : '#F8FAFC'}
                  />
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
