import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ChevronRight,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { API_BASE_URL } from '../../api';
import TopHeader from '../Navigation/TopHeader';

type Category = {
  id: number | string;
  catId?: string;
  name: string;
  description?: string;
  subcategory?: string[];
  images?: string[];
  status?: string;
};

type CategeryProps = {
  onScrollVisibilityChange?: (visible: boolean) => void;
  onDetailsVisibilityChange?: (visible: boolean) => void;
};

const resolveImageUri = (path?: string) => {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default function More({
  onScrollVisibilityChange,
  onDetailsVisibilityChange,
}: MoreProps) {
  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    catId: '',
    name: '',
    description: '',
    subcategories: '',
  });
  const [savingCategory, setSavingCategory] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await api.get<Category[]>('/categories');
      if (!Array.isArray(response.data)) {
        throw new Error('The categories response did not contain a category list.');
      }
      setCategories(response.data);
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Unable to load categories.';
      setLoadError(message);
      if (__DEV__) console.warn('[More] Could not load categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (categoriesOpen) loadCategories();
  }, [categoriesOpen, loadCategories]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter(category =>
      `${category.name} ${category.catId ?? ''} ${category.description ?? ''}`
        .toLowerCase()
        .includes(query),
    );
  }, [categories, search]);

  const openCategories = () => {
    setCategoriesOpen(true);
    onDetailsVisibilityChange?.(true);
    onScrollVisibilityChange?.(true);
  };

  const closeCategories = () => {
    setCategoriesOpen(false);
    setSearch('');
    lastScrollY.current = 0;
    onDetailsVisibilityChange?.(false);
    onScrollVisibilityChange?.(true);
  };

  const openCategoryForm = (category?: Category) => {
    setEditingCategory(category ?? null);
    setCategoryForm({
      catId:
        category?.catId ??
        `CAT${String(
          Math.max(
            0,
            ...categories.map(item =>
              Number(item.catId?.match(/\d+/)?.[0] ?? 0),
            ),
          ) + 1,
        ).padStart(3, '0')}`,
      name: category?.name ?? '',
      description: category?.description ?? '',
      subcategories: category?.subcategory?.join(', ') ?? '',
    });
  };

  const saveCategory = async () => {
    const name = categoryForm.name.trim();
    if (!name) {
      Alert.alert('Category name required', 'Enter a name for this category.');
      return;
    }

    const payload = {
      catId: categoryForm.catId,
      name,
      description: categoryForm.description.trim(),
      subcategory: categoryForm.subcategories
        .split(',')
        .map(value => value.trim())
        .filter(Boolean),
      images: editingCategory?.images ?? [],
    };

    setSavingCategory(true);
    try {
      if (editingCategory?.catId) {
        await api.put(`/categories/${editingCategory.catId}`, payload);
      } else {
        const response = await api.post<{ id: number | string }>('/categories', payload);
        payload.catId = categoryForm.catId;
        setCategories(current => [
          { ...payload, id: response.data.id },
          ...current,
        ]);
      }

      if (editingCategory?.catId) {
        setCategories(current =>
          current.map(category =>
            category.catId === editingCategory.catId
              ? { ...category, ...payload }
              : category,
          ),
        );
      }
      setEditingCategory(null);
      setCategoryForm({
        catId: '',
        name: '',
        description: '',
        subcategories: '',
      });
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : 'Unable to save this category.';
      Alert.alert('Save failed', message);
    } finally {
      setSavingCategory(false);
    }
  };

  const deleteCategory = (category: Category) => {
    Alert.alert(
      'Delete category?',
      `Delete ${category.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/categories/${category.catId}`);
              setCategories(current =>
                current.filter(item => item.catId !== category.catId),
              );
            } catch (error: unknown) {
              const message =
                typeof error === 'object' &&
                error !== null &&
                'message' in error &&
                typeof error.message === 'string'
                  ? error.message
                  : 'Unable to delete this category.';
              Alert.alert('Delete failed', message);
            }
          },
        },
      ],
    );
  };

  if (categoriesOpen) {
    return (
      <View className="flex-1 bg-[#F7F8FA]">
        <TopHeader
          pageTitle="Categories"
          pageSubtitle={`${categories.length} furniture categories`}
          onBackPress={closeCategories}
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
          style={{ paddingTop: insets.top + 72 }}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[17px] font-black text-[#17191C]">
              All Categories
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => openCategoryForm()}
              className="h-[40px] flex-row items-center rounded-[11px] bg-[#F97316] px-3">
              <Plus size={17} color="#FFFFFF" />
              <Text className="ml-1 text-[11px] font-bold text-white">
                Add Category
              </Text>
            </Pressable>
          </View>

          <View className="mb-4 flex-row items-center rounded-[14px] bg-white px-3">
            <Search size={18} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search categories"
              placeholderTextColor="#94A3B8"
              className="ml-2 h-[48px] flex-1 text-[13px] text-[#17191C]"
            />
          </View>

          {loading ? (
            <View className="items-center py-10">
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          ) : loadError ? (
            <View className="items-center rounded-[16px] bg-white px-5 py-8">
              <Text className="mb-4 text-center text-[13px] text-[#B91C1C]">
                {loadError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={loadCategories}
                className="rounded-[10px] bg-[#F97316] px-4 py-2.5">
                <Text className="text-[12px] font-bold text-white">Retry</Text>
              </Pressable>
            </View>
          ) : filteredCategories.length === 0 ? (
            <View className="items-center rounded-[16px] bg-white px-5 py-8">
              <Text className="text-[13px] text-[#64748B]">
                {categories.length ? 'No matching categories.' : 'No categories found.'}
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {filteredCategories.map(category => {
                const imageUri = resolveImageUri(category.images?.[0]);
                return (
                  <View
                    key={category.id}
                    className="mb-3 w-[48.5%] overflow-hidden rounded-[16px] border border-[#ECE8DF] bg-white shadow-sm elevation-[2]">
                    {imageUri ? (
                      <Image
                        source={{ uri: imageUri }}
                        accessibilityLabel={`${category.name} category`}
                        resizeMode="cover"
                        className="h-[112px] w-full bg-[#FFF7ED]"
                      />
                    ) : (
                      <View className="h-[112px] items-center justify-center bg-[#FFF7ED]">
                        <LayoutGrid size={34} color="#F97316" strokeWidth={1.8} />
                      </View>
                    )}
                    <View className="p-3">
                      <Text numberOfLines={2} className="text-[13px] font-black text-[#17191C]">
                        {category.name}
                      </Text>
                      {category.catId ? (
                        <Text className="mt-1 text-[9px] font-bold uppercase tracking-[0.8px] text-[#F97316]">
                          {category.catId}
                        </Text>
                      ) : null}
                      {category.description ? (
                        <Text numberOfLines={2} className="mt-2 text-[10px] leading-4 text-[#64748B]">
                          {category.description}
                        </Text>
                      ) : null}
                      {category.subcategory?.length ? (
                        <Text numberOfLines={2} className="mt-2 text-[9px] text-[#94A3B8]">
                          {category.subcategory.join(' · ')}
                        </Text>
                      ) : null}
                      <View className="mt-3 flex-row justify-end border-t border-[#F1F5F9] pt-2">
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${category.name}`}
                          onPress={() => openCategoryForm(category)}
                          className="mr-3 h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-[#FFF7ED]">
                          <Pencil size={15} color="#C2410C" />
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${category.name}`}
                          onPress={() => deleteCategory(category)}
                          className="h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-[#FEF2F2]">
                          <Trash2 size={15} color="#DC2626" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        <Modal
          visible={categoryForm.catId !== ''}
          transparent
          animationType="fade"
          onRequestClose={() => setCategoryForm(current => ({ ...current, catId: '' }))}>
          <View className="flex-1 justify-center bg-black/60 px-5">
            <View className="rounded-[20px] bg-white p-5">
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-[17px] font-black text-[#17191C]">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close category form"
                  onPress={() => {
                    setEditingCategory(null);
                    setCategoryForm({
                      catId: '',
                      name: '',
                      description: '',
                      subcategories: '',
                    });
                  }}
                  className="h-[34px] w-[34px] items-center justify-center rounded-full bg-[#F1F5F9]">
                  <X size={18} color="#64748B" />
                </Pressable>
              </View>
              <TextInput
                value={categoryForm.catId}
                editable={false}
                placeholder="Category ID"
                placeholderTextColor="#94A3B8"
                className="mb-3 h-[46px] rounded-[11px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[12px] text-[#64748B]"
              />
              <TextInput
                value={categoryForm.name}
                onChangeText={name => setCategoryForm(current => ({ ...current, name }))}
                placeholder="Category name"
                placeholderTextColor="#94A3B8"
                className="mb-3 h-[46px] rounded-[11px] border border-[#E2E8F0] px-3 text-[12px] text-[#17191C]"
              />
              <TextInput
                value={categoryForm.description}
                onChangeText={description =>
                  setCategoryForm(current => ({ ...current, description }))
                }
                placeholder="Description (optional)"
                placeholderTextColor="#94A3B8"
                multiline
                className="mb-3 min-h-[76px] rounded-[11px] border border-[#E2E8F0] px-3 py-3 text-[12px] text-[#17191C]"
              />
              <TextInput
                value={categoryForm.subcategories}
                onChangeText={subcategories =>
                  setCategoryForm(current => ({ ...current, subcategories }))
                }
                placeholder="Subcategories, separated by commas"
                placeholderTextColor="#94A3B8"
                multiline
                className="mb-4 min-h-[70px] rounded-[11px] border border-[#E2E8F0] px-3 py-3 text-[12px] text-[#17191C]"
              />
              <Pressable
                accessibilityRole="button"
                onPress={saveCategory}
                disabled={savingCategory}
                className="h-[46px] items-center justify-center rounded-[11px] bg-[#F97316]">
                {savingCategory ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-[12px] font-black text-white">
                    {editingCategory ? 'Save Changes' : 'Create Category'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerClassName="px-4 pb-[255px]"
      style={{ paddingTop: insets.top + 84 }}>
      <Text className="mb-4 text-[18px] font-black text-[#17191C]">More</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open categories"
        onPress={openCategories}
        className="flex-row items-center rounded-[18px] border border-[#FCE6D7] bg-white p-4 shadow-sm elevation-[2]">
        <View className="h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[#FFF1D6]">
          <LayoutGrid size={25} color="#F97316" strokeWidth={2} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-[15px] font-black text-[#17191C]">Categories</Text>
          <Text className="mt-1 text-[11px] text-[#64748B]">
            View furniture categories and subcategories
          </Text>
        </View>
        <ChevronRight size={21} color="#94A3B8" />
      </Pressable>
    </ScrollView>
  );
}
