import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Building2,
  Check,
  Home,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';
import { useUserAlert } from '../UserAlert';
import { INDIAN_STATES, INDIAN_UNION_TERRITORIES } from './indianStates';

type Address = {
  id: number | string;
  label: string;
  customer_name: string;
  customer_phone: string;
  street_address: string;
  city: string;
  district: string;
  state: string;
  country: string;
  zip_code: string;
  is_default: boolean | number;
};

type AddressDraft = {
  label: string;
  customer_name: string;
  customer_phone: string;
  street_address: string;
  city: string;
  district: string;
  state: string;
  country: string;
  zip_code: string;
  is_default: boolean;
};

const emptyDraft = (name = '', phone = ''): AddressDraft => ({
  label: 'Home',
  customer_name: name,
  customer_phone: phone,
  street_address: '',
  city: '',
  district: '',
  state: '',
  country: 'India',
  zip_code: '',
  is_default: false,
});

type FormInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  required?: boolean;
};

function FormInput({ label, value, onChangeText, placeholder, keyboardType, required }: FormInputProps) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-[11px] font-bold text-[#5B4839]">
        {label}{required ? ' *' : ''}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#C0A99A"
        keyboardType={keyboardType}
        className="h-[44px] rounded-[10px] border border-[#E7DCCF] bg-white px-3 text-[13px] text-[#351D0E]"
      />
    </View>
  );
}

type StatePickerProps = {
  value: string;
  onChange: (val: string) => void;
};

function StatePicker({ value, onChange }: StatePickerProps) {
  const all = [...INDIAN_STATES, ...INDIAN_UNION_TERRITORIES];
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <>
      <View className="mb-3">
        <Text className="mb-1 text-[11px] font-bold text-[#5B4839]">State *</Text>
        <Pressable
          onPress={() => setOpen(true)}
          className="h-[44px] flex-row items-center justify-between rounded-[10px] border border-[#E7DCCF] bg-white px-3"
        >
          <Text className={`text-[13px] ${value ? 'text-[#351D0E]' : 'text-[#C0A99A]'}`}>
            {value || 'Select state / territory'}
          </Text>
          <MapPin size={15} color="#C0A99A" />
        </Pressable>
      </View>
      <Modal visible={open} animationType="slide" transparent statusBarTranslucent>
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="rounded-t-[24px] bg-white overflow-hidden"
            style={{
              maxHeight: '70%',
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            <View className="flex-row items-center justify-between border-b border-[#F0E7DE] px-5 py-4">
              <Text className="text-[16px] font-black text-[#351D0E]">Select State</Text>
              <Pressable
                onPress={() => setOpen(false)}
                className="h-[32px] w-[32px] items-center justify-center rounded-full bg-[#F4EDE6]"
              >
                <X size={16} color="#351D0E" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
              {all.map(s => (
                <Pressable
                  key={s}
                  onPress={() => { onChange(s); setOpen(false); }}
                  className={`border-b border-[#F9F3ED] px-5 py-3.5 ${value === s ? 'bg-[#FFF5ED]' : ''}`}
                >
                  <Text className={`text-[14px] ${value === s ? 'font-bold text-[#F97316]' : 'text-[#351D0E]'}`}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

type AddressFormModalProps = {
  visible: boolean;
  draft: AddressDraft;
  editing: boolean;
  saving: boolean;
  error: string;
  onDraftChange: (draft: AddressDraft) => void;
  onSave: () => void;
  onClose: () => void;
};

function AddressFormModal({
  visible,
  draft,
  editing,
  saving,
  error,
  onDraftChange,
  onSave,
  onClose,
}: AddressFormModalProps) {
  const insets = useSafeAreaInsets();
  const set = (key: keyof AddressDraft) => (val: string | boolean) =>
    onDraftChange({ ...draft, [key]: val });

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View className="flex-1 justify-end bg-black/40">
        <View
          className="rounded-t-[24px] bg-white overflow-hidden"
          style={{ maxHeight: '90%' }}
        >
          {/* ── Header ── */}
          <View className="flex-row items-center justify-between border-b border-[#F0E7DE] bg-[#FFF8F3] px-5 py-4">
            <View className="flex-row items-center gap-3">
              <View className="h-[40px] w-[40px] items-center justify-center rounded-full bg-[#FFF0E1]">
                <MapPin size={18} color="#F97316" />
              </View>
              <View>
                <Text className="text-[16px] font-black text-[#351D0E]">
                  {editing ? 'Edit Address' : 'Add New Address'}
                </Text>
                <Text className="text-[11px] text-[#8B735E]">Enter delivery details</Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              disabled={saving}
              className="h-[32px] w-[32px] items-center justify-center rounded-full bg-[#F4EDE6]"
            >
              <X size={16} color="#351D0E" />
            </Pressable>
          </View>

          {/* ── Scrollable form body ── */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}
          >
            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormInput label="Label" value={draft.label} onChangeText={set('label')} placeholder="Home, Office..." required />
              </View>
              <View className="flex-1">
                <FormInput label="Full Name" value={draft.customer_name} onChangeText={set('customer_name')} placeholder="Recipient name" required />
              </View>
            </View>

            <FormInput label="Phone Number" value={draft.customer_phone} onChangeText={set('customer_phone')} placeholder="Mobile number" keyboardType="phone-pad" required />
            <FormInput label="Street Address" value={draft.street_address} onChangeText={set('street_address')} placeholder="Door no, street, area" required />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormInput label="City" value={draft.city} onChangeText={set('city')} required />
              </View>
              <View className="flex-1">
                <FormInput label="District" value={draft.district} onChangeText={set('district')} placeholder="Optional" />
              </View>
            </View>

            <StatePicker value={draft.state} onChange={val => set('state')(val)} />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormInput label="Country" value={draft.country} onChangeText={set('country')} required />
              </View>
              <View className="flex-1">
                <FormInput label="PIN Code" value={draft.zip_code} onChangeText={set('zip_code')} keyboardType="numeric" required />
              </View>
            </View>

            {/* Default checkbox */}
            <Pressable
              onPress={() => set('is_default')(!draft.is_default)}
              className="mb-2 flex-row items-center gap-3"
            >
              <View
                className={`h-[20px] w-[20px] items-center justify-center rounded-[5px] border-2 ${
                  draft.is_default
                    ? 'border-[#F97316] bg-[#F97316]'
                    : 'border-[#D5C5B6] bg-white'
                }`}
              >
                {draft.is_default && <Check size={12} color="white" />}
              </View>
              <Text className="text-[13px] font-semibold text-[#5B4839]">
                Set as default address
              </Text>
            </Pressable>

            {error ? (
              <View className="mt-2 rounded-[12px] bg-red-50 border border-red-200 px-4 py-3">
                <Text className="text-[13px] text-red-700">{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* ── Sticky footer with safe-area bottom inset ── */}
          <View
            className="flex-row gap-3 border-t border-[#F0E7DE] bg-white px-5 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <Pressable
              onPress={onClose}
              disabled={saving}
              className="flex-1 h-[50px] items-center justify-center rounded-[14px] border border-[#E7DCCF] bg-white active:bg-[#F9F3ED]"
            >
              <Text className="text-[14px] font-semibold text-[#5B4839]">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              disabled={saving}
              className="flex-1 h-[50px] flex-row items-center justify-center rounded-[14px] bg-[#F97316] active:opacity-80"
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Check size={16} color="white" />
              )}
              <Text className="ml-2 text-[14px] font-bold text-white">
                {saving ? 'Saving...' : 'Save Address'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type AddressesScreenProps = {
  onBack: () => void;
};

export default function AddressesScreen({ onBack }: AddressesScreenProps) {
  const showUserAlert = useUserAlert();
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<number | string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [draft, setDraft] = useState<AddressDraft>(emptyDraft());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // User info for pre-filling
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('user').then(s => {
      if (!s) return;
      const u: unknown = JSON.parse(s);
      if (typeof u === 'object' && u !== null) {
        const user = u as Record<string, unknown>;
        setUserName((user.name as string) || (user.username as string) || '');
        setUserPhone((user.phone as string) || '');
      }
    }).catch(() => {});
  }, []);

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/users/me/addresses');
      if (!Array.isArray(data)) throw new Error('Invalid response');
      setAddresses(data);
    } catch (err) {
      setError('Could not load your addresses. Please try again.');
      if (__DEV__) console.warn('[AddressesScreen] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const openNewForm = () => {
    setEditingId(null);
    setFormError('');
    setDraft(emptyDraft(userName, userPhone));
    // If no addresses yet, default to true
    setDraft(d => ({ ...d, is_default: addresses.length === 0 }));
    setFormOpen(true);
  };

  const openEditForm = (address: Address) => {
    setEditingId(address.id);
    setFormError('');
    setDraft({
      label: address.label || 'Home',
      customer_name: address.customer_name || '',
      customer_phone: address.customer_phone || '',
      street_address: address.street_address || '',
      city: address.city || '',
      district: address.district || '',
      state: address.state || '',
      country: address.country || 'India',
      zip_code: address.zip_code || '',
      is_default: Boolean(Number(address.is_default)),
    });
    setFormOpen(true);
  };

  const saveAddress = async () => {
    if (!draft.customer_name.trim() || !draft.street_address.trim() || !draft.city.trim() || !draft.state.trim() || !draft.zip_code.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editingId) {
        await api.put(`/users/me/addresses/${editingId}`, draft);
      } else {
        await api.post('/users/me/addresses', draft);
      }
      setFormOpen(false);
      setEditingId(null);
      await loadAddresses();
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Could not save address.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = (address: Address) => {
    showUserAlert(
      'Delete Address',
      `Delete the ${address.label || 'saved'} address?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionId(address.id);
            try {
              await api.delete(`/users/me/addresses/${address.id}`);
              await loadAddresses();
            } catch {
              showUserAlert('Error', 'Could not delete the address.');
            } finally {
              setActionId(null);
            }
          },
        },
      ],
    );
  };

  const makeDefault = async (id: number | string) => {
    setActionId(id);
    try {
      await api.put(`/users/me/addresses/${id}/default`);
      await loadAddresses();
    } catch {
      showUserAlert('Error', 'Could not update the default address.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <View className="flex-1 bg-[#FCFAF7]">
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[14px] text-red-700">{error}</Text>
          <Pressable onPress={loadAddresses} className="mt-4 rounded-full bg-[#F97316] px-5 py-3">
            <Text className="text-[13px] font-bold text-white">Try Again</Text>
          </Pressable>
        </View>
      ) : addresses.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-[#FFF0E1]">
            <MapPin size={32} color="#F97316" />
          </View>
          <Text className="mt-4 text-[16px] font-bold text-[#351D0E]">No saved addresses yet</Text>
          <Text className="mt-2 text-center text-[13px] text-[#8B735E]">
            Add an address to save your delivery details for future orders.
          </Text>
          <Pressable onPress={openNewForm} className="mt-5 flex-row items-center rounded-full bg-[#F97316] px-5 py-3">
            <Plus size={16} color="white" />
            <Text className="ml-2 text-[13px] font-bold text-white">Add Address</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: Math.max(insets.bottom, 100) }}
        >
          {/* Add New button at top of list */}
          <Pressable
            onPress={openNewForm}
            className="mb-4 flex-row items-center self-end rounded-full bg-[#F97316] px-4 py-2 active:opacity-80"
          >
            <Plus size={14} color="white" />
            <Text className="ml-1 text-[12px] font-bold text-white">Add New</Text>
          </Pressable>
          {addresses.map(address => {
            const isDefault = Boolean(Number(address.is_default));
            const isHome = address.label?.toLowerCase() === 'home';
            const isBusy = actionId === address.id;
            return (
              <View
                key={address.id}
                className="mb-3 rounded-[18px] border border-[#F0E7DE] bg-white p-4 shadow-sm"
              >
                {/* Header row */}
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-center gap-3 flex-1">
                    <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-[#FFF0E1]">
                      {isHome ? (
                        <Home size={18} color="#F97316" />
                      ) : (
                        <Building2 size={18} color="#F97316" />
                      )}
                    </View>
                    <View>
                      <Text className="text-[14px] font-bold text-[#351D0E]">
                        {address.label || 'Address'}
                      </Text>
                      {isDefault && (
                        <View className="mt-0.5 self-start rounded-full bg-emerald-50 px-2 py-0.5">
                          <Text className="text-[10px] font-bold text-emerald-700">Default</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Pressable
                      onPress={() => openEditForm(address)}
                      className="h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F4EDE6]"
                    >
                      <Pencil size={15} color="#8B735E" />
                    </Pressable>
                    <Pressable
                      onPress={() => deleteAddress(address)}
                      disabled={isBusy}
                      className="h-[34px] w-[34px] items-center justify-center rounded-full bg-red-50"
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color="#B91C1C" />
                      ) : (
                        <Trash2 size={15} color="#B91C1C" />
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* Address body */}
                <Text className="mt-3 text-[14px] font-semibold text-[#351D0E]">
                  {address.customer_name}
                </Text>
                <Text className="mt-1 text-[13px] leading-5 text-[#725D4B]">
                  {[
                    address.street_address,
                    address.city,
                    address.district,
                    address.state,
                    address.zip_code,
                    address.country,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
                <Text className="mt-1 text-[12px] text-[#8B735E]">{address.customer_phone}</Text>

                {!isDefault && (
                  <Pressable
                    onPress={() => makeDefault(address.id)}
                    disabled={isBusy}
                    className="mt-3 self-start"
                  >
                    <Text className="text-[12px] font-bold text-[#F97316]">Set as default</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <AddressFormModal
        visible={formOpen}
        draft={draft}
        editing={editingId !== null}
        saving={saving}
        error={formError}
        onDraftChange={setDraft}
        onSave={saveAddress}
        onClose={() => { setFormOpen(false); setFormError(''); }}
      />
    </View>
  );
}
