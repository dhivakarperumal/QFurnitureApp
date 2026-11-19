import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldCheck,
  UserRound,
  UserX,
  Users,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../api';
import TopHeader from '../Navigation/TopHeader';

type UserRecord = {
  id: number | string;
  user_id?: string;
  username?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  role?: string;
  status?: string;
  profile_image?: string | null;
  created_at?: string;
};

type UserManagementProps = {
  onBackPress: () => void;
  onScrollVisibilityChange?: (visible: boolean) => void;
};

const pageSize = 10;

const resolveImageUri = (path?: string | null) => {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
};

const formatDate = (value?: string) => {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unavailable'
    : date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
};

const isToday = (value?: string) => {
  if (!value) return false;
  const date = new Date(value);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toDateString() === new Date().toDateString()
  );
};

const getUserName = (user: UserRecord) =>
  user.name?.trim() || user.username?.trim() || 'Unnamed user';

const getUserStatus = (user: UserRecord) =>
  user.status?.toLowerCase() === 'inactive' ? 'Inactive' : 'Active';

export default function Usermanagement({
  onBackPress,
  onScrollVisibilityChange,
}: UserManagementProps) {
  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState<'All' | 'New'>('All');
  const [selectedRole, setSelectedRole] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingUser, setViewingUser] = useState<UserRecord | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await api.get<UserRecord[]>('/auth/users');
      if (!Array.isArray(response.data)) {
        throw new Error('The users response did not contain a user list.');
      }
      setUsers(response.data);
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Unable to load users.';
      setLoadError(message);
      if (__DEV__)
        console.warn('[Usermanagement] Could not load users:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedTab, selectedRole]);

  const activeUsers = users.filter(
    user => getUserStatus(user) === 'Active',
  ).length;
  const inactiveUsers = users.length - activeUsers;
  const administrators = users.filter(
    user => user.role?.toLowerCase() === 'admin',
  ).length;
  const newUsers = users.filter(user => isToday(user.created_at)).length;

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter(user => {
      const matchesSearch = [
        getUserName(user),
        user.email ?? '',
        user.phone ?? '',
      ].some(value => value.toLowerCase().includes(query));
      const matchesDate = selectedTab === 'All' || isToday(user.created_at);
      const matchesRole =
        selectedRole === 'all' || user.role?.toLowerCase() === selectedRole;
      return matchesSearch && matchesDate && matchesRole;
    });
  }, [users, search, selectedTab, selectedRole]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pageUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const roles = [
    { value: 'all', label: 'All roles' },
    { value: 'customer', label: 'Customer' },
    { value: 'user', label: 'User' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'dealer', label: 'Dealer' },
  ];

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <TopHeader
        pageTitle="User Management"
        pageSubtitle={`${users.length} registered accounts`}
        onBackPress={onBackPress}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={event => {
          const currentScrollY = event.nativeEvent.contentOffset.y;
          if (currentScrollY < 20 || currentScrollY < lastScrollY.current - 8) {
            onScrollVisibilityChange?.(true);
          } else if (currentScrollY > lastScrollY.current + 8) {
            onScrollVisibilityChange?.(false);
          }
          lastScrollY.current = currentScrollY;
        }}
        contentContainerClassName="px-4 pb-[255px]"
        style={{ paddingTop: insets.top + 72 }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3"
        >
          {[
            {
              label: 'Total accounts',
              value: users.length,
              note: 'All registered users',
              color: '#F97316',
              icon: Users,
            },
            {
              label: 'Active',
              value: activeUsers,
              note: 'Accounts in good standing',
              color: '#10B981',
              icon: UserRound,
            },
            {
              label: 'Inactive',
              value: inactiveUsers,
              note: 'Accounts needing review',
              color: '#F59E0B',
              icon: UserX,
            },
            {
              label: 'Administrators',
              value: administrators,
              note: `${
                users.length
                  ? Math.round((administrators / users.length) * 100)
                  : 0
              }% of accounts`,
              color: '#C2410C',
              icon: ShieldCheck,
            },
          ].map(stat => {
            const StatIcon = stat.icon;
            return (
              <View
                key={stat.label}
                className="relative mr-3 h-[118px] w-[190px] justify-center overflow-hidden rounded-[16px] border border-[#FCE6D7] bg-white pl-3 pr-2 shadow-sm elevation-[2]"
              >
                <View
                  className="absolute left-0 top-[16px] h-[86px] w-[4px] rounded-r-full"
                  style={{ backgroundColor: stat.color }}
                />
                <View className="flex-row items-center">
                  <View
                    className="h-[44px] w-[44px] items-center justify-center rounded-[12px]"
                    style={{ backgroundColor: stat.color }}
                  >
                    <StatIcon size={21} color="#FFFFFF" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-[11px] font-bold text-[#17191C]"
                    >
                      {stat.label}
                    </Text>
                    <Text className="text-[23px] font-black text-[#17191C]">
                      {loading ? '—' : stat.value}
                    </Text>
                    <Text
                      numberOfLines={2}
                      className="text-[9px] text-[#64748B]"
                    >
                      {stat.note}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View className="mb-3 rounded-[16px] border border-[#E2E8F0] bg-white p-3">
          <View className="mb-3 h-[46px] flex-row items-center rounded-[12px] bg-[#F8FAFC] px-3">
            <Search size={18} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search name, email or phone"
              placeholderTextColor="#94A3B8"
              className="ml-2 flex-1 text-[12px] text-[#17191C]"
            />
          </View>
          <View className="mb-3 flex-row rounded-[11px] bg-[#F1F5F9] p-1">
            {[
              { label: 'All', value: 'All' as const, count: users.length },
              { label: 'New today', value: 'New' as const, count: newUsers },
            ].map(tab => (
              <Pressable
                key={tab.value}
                onPress={() => setSelectedTab(tab.value)}
                className={`mr-1 flex-1 flex-row items-center justify-center rounded-[8px] py-2 ${
                  selectedTab === tab.value ? 'bg-white shadow-sm' : ''
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    selectedTab === tab.value
                      ? 'text-[#C2410C]'
                      : 'text-[#64748B]'
                  }`}
                >
                  {tab.label} ({tab.count})
                </Text>
              </Pressable>
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {roles.map(role => (
              <Pressable
                key={role.value}
                onPress={() => setSelectedRole(role.value)}
                className={`mr-2 rounded-full border px-3 py-2 ${
                  selectedRole === role.value
                    ? 'border-[#F97316] bg-[#FFF7ED]'
                    : 'border-[#E2E8F0] bg-white'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    selectedRole === role.value
                      ? 'text-[#C2410C]'
                      : 'text-[#64748B]'
                  }`}
                >
                  {role.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View className="items-center rounded-[16px] bg-white py-10">
            <ActivityIndicator size="large" color="#F97316" />
            <Text className="mt-3 text-[12px] text-[#64748B]">
              Loading accounts...
            </Text>
          </View>
        ) : loadError ? (
          <View className="items-center rounded-[16px] bg-white px-5 py-8">
            <Text className="mb-4 text-center text-[12px] text-[#B91C1C]">
              {loadError}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={loadUsers}
              className="rounded-[10px] bg-[#F97316] px-4 py-2.5"
            >
              <Text className="text-[11px] font-bold text-white">Retry</Text>
            </Pressable>
          </View>
        ) : pageUsers.length === 0 ? (
          <View className="items-center rounded-[16px] bg-white py-10">
            <Users size={30} color="#CBD5E1" />
            <Text className="mt-3 text-[12px] font-semibold text-[#64748B]">
              No users match these filters.
            </Text>
          </View>
        ) : (
          pageUsers.map((user, index) => {
            const name = getUserName(user);
            const avatar = resolveImageUri(user.profile_image);
            const role = user.role?.toLowerCase() || 'user';
            const status = getUserStatus(user);
            return (
              <Pressable
                key={user.id}
                accessibilityRole="button"
                accessibilityLabel={`View ${name}`}
                onPress={() => setViewingUser(user)}
                className="mb-3 rounded-[16px] border border-[#E2E8F0] bg-white p-4 shadow-sm"
              >
                <View className="flex-row items-center">
                  <View className="mr-3 h-[48px] w-[48px] items-center justify-center overflow-hidden rounded-full bg-[#FFF1D6]">
                    {avatar ? (
                      <Image
                        source={{ uri: avatar }}
                        accessibilityLabel={`${name} profile photo`}
                        className="h-full w-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Text className="text-[17px] font-black text-[#C2410C]">
                        {name.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-[13px] font-black text-[#17191C]"
                    >
                      {name}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="mt-1 text-[10px] text-[#64748B]"
                    >
                      {user.email || 'Email unavailable'}
                    </Text>
                    <Text
                      numberOfLines={1}
                      className="mt-1 text-[10px] text-[#94A3B8]"
                    >
                      {user.phone || 'No phone provided'}
                    </Text>
                  </View>
                  <ChevronRight size={19} color="#94A3B8" />
                </View>
                <View className="mt-3 flex-row items-center justify-between border-t border-[#F1F5F9] pt-3">
                  <View className="flex-row items-center">
                    <View className="mr-2 rounded-full bg-[#FFF7ED] px-2.5 py-1">
                      <Text className="text-[9px] font-bold capitalize text-[#C2410C]">
                        {role}
                      </Text>
                    </View>
                    <View
                      className={`rounded-full px-2.5 py-1 ${
                        status === 'Active' ? 'bg-[#ECFDF5]' : 'bg-[#F1F5F9]'
                      }`}
                    >
                      <Text
                        className={`text-[9px] font-bold ${
                          status === 'Active'
                            ? 'text-[#047857]'
                            : 'text-[#64748B]'
                        }`}
                      >
                        {status}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[9px] text-[#94A3B8]">
                    Joined {formatDate(user.created_at)}
                  </Text>
                </View>
                <Text className="absolute right-4 top-4 text-[9px] font-bold text-[#94A3B8]">
                  #{(currentPage - 1) * pageSize + index + 1}
                </Text>
              </Pressable>
            );
          })
        )}

        {!loading && !loadError && filteredUsers.length > 0 ? (
          <View className="mt-1 flex-row items-center justify-between rounded-[14px] bg-white px-3 py-3">
            <Text className="text-[10px] text-[#64748B]">
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, filteredUsers.length)} of{' '}
              {filteredUsers.length}
            </Text>
            <View className="flex-row items-center">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous page"
                disabled={currentPage === 1}
                onPress={() => setCurrentPage(page => Math.max(1, page - 1))}
                className="mr-2 h-[34px] w-[36px] items-center justify-center rounded-[9px] border border-[#E2E8F0] disabled:opacity-40"
              >
                <ChevronLeft size={17} color="#475569" />
              </Pressable>
              <Text className="mr-2 text-[10px] font-bold text-[#64748B]">
                {currentPage}/{totalPages}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next page"
                disabled={currentPage === totalPages}
                onPress={() =>
                  setCurrentPage(page => Math.min(totalPages, page + 1))
                }
                className="h-[34px] w-[36px] items-center justify-center rounded-[9px] border border-[#E2E8F0] disabled:opacity-40"
              >
                <ChevronRight size={17} color="#475569" />
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={viewingUser !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingUser(null)}
      >
        <View className="flex-1 justify-center bg-black/60 px-5">
          <View className="rounded-[20px] bg-white p-5">
            <View className="mb-4 flex-row items-center">
              <View className="mr-3 h-[48px] w-[48px] items-center justify-center overflow-hidden rounded-full bg-[#FFF1D6]">
                {viewingUser && resolveImageUri(viewingUser.profile_image) ? (
                  <Image
                    source={{ uri: resolveImageUri(viewingUser.profile_image) }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-[17px] font-black text-[#C2410C]">
                    {viewingUser
                      ? getUserName(viewingUser).charAt(0).toUpperCase()
                      : ''}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-[16px] font-black text-[#17191C]">
                  {viewingUser ? getUserName(viewingUser) : ''}
                </Text>
                <Text className="mt-1 text-[10px] text-[#64748B]">
                  Account details
                </Text>
              </View>
            </View>
            {[
              ['Email', viewingUser?.email || 'Unavailable'],
              ['Phone', viewingUser?.phone || 'No phone provided'],
              ['Role', viewingUser?.role || 'User'],
              ['Status', viewingUser ? getUserStatus(viewingUser) : 'Active'],
              ['Joined', formatDate(viewingUser?.created_at)],
            ].map(([label, value]) => (
              <View
                key={label}
                className="flex-row justify-between border-t border-[#F1F5F9] py-3"
              >
                <Text className="text-[11px] text-[#94A3B8]">{label}</Text>
                <Text className="ml-3 max-w-[65%] text-right text-[11px] font-bold text-[#334155]">
                  {value}
                </Text>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => setViewingUser(null)}
              className="mt-3 h-[44px] items-center justify-center rounded-[11px] bg-[#F97316]"
            >
              <Text className="text-[12px] font-bold text-white">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
