import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  mrp?: number;
  stock: number;
  status: 'Active' | 'Low Stock' | 'Out of Stock';
};

type ProductsProps = {
  onActionPress?: (label: string) => void;
};

const initialProducts: Product[] = [
  { id: 1, name: 'Royal Lounge Chair', sku: 'QF0001', category: 'Chair', price: 18499, mrp: 22999, stock: 2, status: 'Low Stock' },
  { id: 2, name: 'Oak Dining Table', sku: 'QF0002', category: 'Table', price: 32999, mrp: 38999, stock: 4, status: 'Low Stock' },
  { id: 3, name: 'Modern Wardrobe', sku: 'QF0003', category: 'Wardrobe', price: 24600, stock: 18, status: 'Active' },
  { id: 4, name: 'Velvet Sofa Set', sku: 'QF0004', category: 'Sofa', price: 45999, mrp: 52999, stock: 12, status: 'Active' },
  { id: 5, name: 'Teak Bed Frame', sku: 'QF0005', category: 'Bed', price: 28450, stock: 0, status: 'Out of Stock' },
  { id: 6, name: 'Office Study Desk', sku: 'QF0006', category: 'Desk', price: 12990, stock: 23, status: 'Active' },
];

const formatRupees = (value: number) =>
  `₹${value.toLocaleString('en-IN')}`;

export default function Products({ onActionPress }: ProductsProps) {
  const insets = useSafeAreaInsets();
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<'All' | Product['status']>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [products, setProducts] = useState(initialProducts);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockValue, setStockValue] = useState('');

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return products.filter(product => {
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search) ||
        product.category.toLowerCase().includes(search);
      const matchesStatus = status === 'All' || product.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [products, searchTerm, status]);

  const stats = [
    { label: 'Total Products', value: products.length, sub: 'All furniture', icon: '▣', color: '#F59E0B' },
    { label: 'Active', value: products.filter(item => item.status === 'Active').length, sub: 'Active products', icon: '✓', color: '#10B981' },
    { label: 'Out of Stock', value: products.filter(item => item.status === 'Out of Stock').length, sub: 'Inactive products', icon: '!', color: '#F59E0B' },
    { label: 'Low Stock', value: products.filter(item => item.status === 'Low Stock').length, sub: 'Need restocking', icon: '⚠', color: '#EF4444' },
  ];

  const statusStyles: Record<Product['status'], { background: string; color: string }> = {
    Active: { background: '#DCFCE7', color: '#15803D' },
    'Low Stock': { background: '#FEF3C7', color: '#B45309' },
    'Out of Stock': { background: '#FFE4E6', color: '#BE123C' },
  };

  const openStockEditor = (product: Product) => {
    setStockProduct(product);
    setStockValue(String(product.stock));
  };

  const saveStock = () => {
    if (!stockProduct) return;
    const stock = Math.max(0, Number.parseInt(stockValue, 10) || 0);
    setProducts(items =>
      items.map(item =>
        item.id === stockProduct.id
          ? {
              ...item,
              stock,
              status: stock === 0 ? 'Out of Stock' : stock < 10 ? 'Low Stock' : 'Active',
            }
          : item,
      ),
    );
    setStockProduct(null);
  };

  const statuses: Array<'All' | Product['status']> = ['All', 'Active', 'Low Stock', 'Out of Stock'];

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-[255px]"
        style={{ paddingTop: insets.top + 84 }}>
        <View className="mb-4 flex-row items-end justify-between">
          <View>
            <Text className="text-[12px] font-bold uppercase tracking-[2px] text-[#F59E0B]">
              Catalog
            </Text>
            <Text className="mt-1 text-[26px] font-black text-[#17191C]">
              Products
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => onActionPress?.('Add New Product')}
            className="h-[46px] flex-row items-center rounded-[14px] bg-[#17191C] px-4 shadow-sm elevation-[4]">
            <Text className="mr-2 text-[20px] font-bold text-white">＋</Text>
            <Text className="text-[12px] font-bold text-white">Add Product</Text>
          </Pressable>
        </View>

        <View className="mb-4 flex-row flex-wrap justify-between">
          {stats.map(stat => (
            <View
              key={stat.label}
              className="mb-3 w-[48%] rounded-[18px] border border-[#ECE8DF] bg-white p-4 shadow-sm elevation-[2]">
              <View
                className="mb-3 h-[42px] w-[42px] items-center justify-center rounded-[14px]"
                style={{ backgroundColor: stat.color }}>
                <Text className="text-[18px] font-black text-white">{stat.icon}</Text>
              </View>
              <Text className="text-[12px] font-bold text-[#718080]">{stat.label}</Text>
              <Text className="mt-1 text-[24px] font-black text-[#17191C]">{stat.value}</Text>
              <Text className="mt-1 text-[10px] text-[#94A3B8]">{stat.sub}</Text>
            </View>
          ))}
        </View>

        <View className="mb-4 rounded-[18px] border border-[#ECE8DF] bg-white p-3">
          <View className="mb-3 h-[46px] flex-row items-center rounded-[14px] bg-[#F5F7F8] px-3">
            <Text className="mr-2 text-[18px] text-[#94A3B8]">⌕</Text>
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search products by name or SKU..."
              placeholderTextColor="#94A3B8"
              className="flex-1 text-[13px] text-[#17191C]"
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-2">
            {statuses.map(item => (
              <Pressable
                key={item}
                onPress={() => setStatus(item)}
                className={[
                  'mr-2 h-[38px] justify-center rounded-full border px-4',
                  status === item
                    ? 'border-[#17191C] bg-[#17191C]'
                    : 'border-[#E2E8F0] bg-white',
                ].join(' ')}>
                <Text
                  className={[
                    'text-[11px] font-bold',
                    status === item ? 'text-white' : 'text-[#64748B]',
                  ].join(' ')}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] font-semibold text-[#94A3B8]">
              {filteredProducts.length} products
            </Text>
            <View className="flex-row rounded-[12px] bg-[#EDF1F3] p-1">
              <Pressable
                accessibilityLabel="Grid view"
                onPress={() => setViewMode('grid')}
                className={[
                  'h-[38px] w-[42px] items-center justify-center rounded-[9px]',
                  viewMode === 'grid' ? 'bg-white' : '',
                ].join(' ')}>
                <Text className="text-[17px] text-[#17191C]">▦</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="List view"
                onPress={() => setViewMode('list')}
                className={[
                  'h-[38px] w-[42px] items-center justify-center rounded-[9px]',
                  viewMode === 'list' ? 'bg-white' : '',
                ].join(' ')}>
                <Text className="text-[20px] text-[#17191C]">☷</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {filteredProducts.length === 0 ? (
          <View className="items-center rounded-[18px] border border-[#ECE8DF] bg-white py-16">
            <Text className="text-[38px]">▣</Text>
            <Text className="mt-3 text-[14px] font-bold text-[#64748B]">
              No products found
            </Text>
            <Text className="mt-1 text-[11px] text-[#94A3B8]">
              Try adjusting your search or filters
            </Text>
          </View>
        ) : viewMode === 'grid' ? (
          <View className="flex-row flex-wrap justify-between">
            {filteredProducts.map(product => (
              <View
                key={product.id}
                className="mb-4 w-[48%] overflow-hidden rounded-[18px] border border-[#ECE8DF] bg-white shadow-sm elevation-[2]">
                <View className="h-[145px] items-center justify-center bg-[#FFF6E8]">
                  <Text className="text-[58px] text-[#DDA62A]">▣</Text>
                  <View
                    className="absolute left-3 top-3 rounded-full px-2.5 py-1"
                    style={{ backgroundColor: statusStyles[product.status].background }}>
                    <Text
                      className="text-[9px] font-bold"
                      style={{ color: statusStyles[product.status].color }}>
                      {product.status}
                    </Text>
                  </View>
                </View>
                <View className="p-3">
                  <Text className="text-[9px] font-bold uppercase tracking-[1px] text-[#F59E0B]">
                    {product.category}
                  </Text>
                  <Text numberOfLines={1} className="mt-1 text-[13px] font-black text-[#17191C]">
                    {product.name}
                  </Text>
                  <Text className="mt-1 text-[9px] text-[#94A3B8]">SKU: {product.sku}</Text>
                  <View className="mt-3 flex-row items-center justify-between border-t border-[#F1F5F9] pt-3">
                    <View>
                      <Text className="text-[14px] font-black text-[#17191C]">
                        {formatRupees(product.price)}
                      </Text>
                      {product.mrp ? (
                        <Text className="text-[9px] text-[#94A3B8] line-through">
                          {formatRupees(product.mrp)}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => openStockEditor(product)}
                      className="h-[34px] min-w-[34px] items-center justify-center rounded-full bg-[#FFF3D6] px-2">
                      <Text className="text-[11px] font-black text-[#B45309]">{product.stock}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View>
            {filteredProducts.map(product => (
              <Pressable
                key={product.id}
                onPress={() => onActionPress?.(product.name)}
                className="mb-3 flex-row items-center rounded-[16px] border border-[#ECE8DF] bg-white p-3 shadow-sm elevation-[1]">
                <View className="mr-3 h-[68px] w-[68px] items-center justify-center rounded-[13px] bg-[#FFF6E8]">
                  <Text className="text-[32px] text-[#DDA62A]">▣</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[9px] font-bold uppercase text-[#F59E0B]">
                    {product.category}
                  </Text>
                  <Text numberOfLines={1} className="mt-0.5 text-[13px] font-black text-[#17191C]">
                    {product.name}
                  </Text>
                  <Text className="mt-1 text-[10px] text-[#94A3B8]">SKU: {product.sku}</Text>
                  <View className="mt-2 flex-row items-center">
                    <Text className="mr-2 text-[12px] font-black text-[#17191C]">
                      {formatRupees(product.price)}
                    </Text>
                    <View
                      className="rounded-full px-2 py-0.5"
                      style={{ backgroundColor: statusStyles[product.status].background }}>
                      <Text
                        className="text-[8px] font-bold"
                        style={{ color: statusStyles[product.status].color }}>
                        {product.status}
                      </Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  accessibilityLabel={`Edit stock for ${product.name}`}
                  onPress={() => openStockEditor(product)}
                  className="ml-2 h-[40px] w-[40px] items-center justify-center rounded-full bg-[#FFF3D6]">
                  <Text className="text-[12px] font-black text-[#B45309]">{product.stock}</Text>
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={stockProduct !== null}
        onRequestClose={() => setStockProduct(null)}>
        <View className="flex-1 items-center justify-center bg-[#17191C]/70 px-5">
          <View className="w-full rounded-[24px] bg-white p-5">
            <Text className="text-[18px] font-black text-[#17191C]">
              Update Stock
            </Text>
            <Text className="mt-1 text-[12px] text-[#94A3B8]">
              {stockProduct?.name}
            </Text>
            <TextInput
              value={stockValue}
              onChangeText={setStockValue}
              keyboardType="number-pad"
              placeholder="0"
              className="my-5 h-[64px] rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] text-center text-[24px] font-black text-[#17191C]"
            />
            <View className="flex-row">
              <Pressable
                onPress={() => setStockProduct(null)}
                className="mr-2 h-[48px] flex-1 items-center justify-center rounded-[14px] border border-[#E2E8F0]">
                <Text className="text-[12px] font-bold text-[#64748B]">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveStock}
                className="h-[48px] flex-1 items-center justify-center rounded-[14px] bg-[#17191C]">
                <Text className="text-[12px] font-bold text-white">Update Stock</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}