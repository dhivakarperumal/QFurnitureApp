import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Printer,
  Search,
  X,
} from 'lucide-react-native';
import { fromByteArray } from 'base64-js';
import ExcelJS from 'exceljs';
import RNPrint from 'react-native-print';
import {
  CachesDirectoryPath,
  unlink,
  writeFile,
} from 'react-native-fs';
import {
  errorCodes,
  isErrorWithCode,
  saveDocuments,
} from '@react-native-documents/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { invalidateApiResponseCache } from '../../api';
import TopHeader from '../Navigation/TopHeader';

type Props = { onBackPress: () => void };
type ReportType =
  | 'sales'
  | 'purchases'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'customers'
  | 'suppliers'
  | 'payments'
  | 'gst'
  | 'expenses'
  | 'profit-loss'
  | 'sales-returns'
  | 'purchase-returns'
  | 'orders'
  | 'deliveries'
  | 'outstanding';
type Period =
  | 'today'
  | 'yesterday'
  | 'this-week'
  | 'this-month'
  | 'last-month'
  | 'this-year'
  | 'custom'
  | 'all';
type ReportRow = Record<string, unknown>;
type Summary = Record<string, number | string | null | undefined> & {
  range?: { from?: string; to?: string };
};
type FilterOption = { id: number | string; name: string };
type ReportOptions = {
  products?: FilterOption[];
  categories?: string[];
  customers?: string[];
  suppliers?: FilterOption[];
  paymentMethods?: string[];
};
type ActiveFilter =
  | 'product'
  | 'category'
  | 'customer'
  | 'supplier'
  | 'paymentMethod';

const REPORTS: Array<[ReportType, string]> = [
  ['sales', 'Sales'],
  ['purchases', 'Purchases'],
  ['products', 'Products'],
  ['categories', 'Categories'],
  ['inventory', 'Inventory'],
  ['customers', 'Customers'],
  ['suppliers', 'Suppliers'],
  ['payments', 'Payments'],
  ['gst', 'GST'],
  ['expenses', 'Expenses'],
  ['profit-loss', 'Profit & Loss'],
  ['sales-returns', 'Sales Returns'],
  ['purchase-returns', 'Purchase Returns'],
  ['orders', 'Orders'],
  ['deliveries', 'Deliveries'],
  ['outstanding', 'Outstanding'],
];
const PERIODS: Array<[Period, string]> = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['this-week', 'This week'],
  ['this-month', 'This month'],
  ['last-month', 'Last month'],
  ['this-year', 'This year'],
  ['custom', 'Custom'],
  ['all', 'All time'],
];
const SUMMARY_CARDS: Array<[string, string, boolean]> = [
  ['totalSales', 'Total sales', true],
  ['totalOrders', 'Total orders', false],
  ['totalPurchase', 'Total purchase', true],
  ['totalRevenue', 'Total revenue', true],
  ['grossProfit', 'Gross profit', true],
  ['netProfit', 'Net profit', true],
  ['totalExpenses', 'Expenses', true],
  ['pendingPayments', 'Pending payments', true],
  ['totalGst', 'Net GST', true],
  ['availableStock', 'Available stock', false],
];
const SUMMARY_COLOR_CLASSES = [
  'text-[#C2410C]',
  'text-[#2563EB]',
  'text-[#B45309]',
  'text-[#059669]',
  'text-[#7C3AED]',
  'text-[#E11D48]',
  'text-[#EA580C]',
  'text-[#0891B2]',
  'text-[#DB2777]',
  'text-[#475569]',
] as const;
const FILTER_REPORTS: Record<ActiveFilter, ReportType[]> = {
  product: [
    'sales', 'products', 'categories', 'inventory', 'purchases',
    'sales-returns', 'purchase-returns', 'orders', 'deliveries', 'outstanding',
  ],
  category: [
    'sales', 'products', 'categories', 'inventory', 'purchases',
    'sales-returns', 'purchase-returns', 'orders', 'deliveries', 'outstanding',
  ],
  customer: [
    'sales', 'customers', 'payments', 'sales-returns', 'orders',
    'deliveries', 'outstanding',
  ],
  supplier: ['purchases', 'suppliers', 'payments', 'purchase-returns', 'outstanding'],
  paymentMethod: ['sales', 'purchases', 'payments', 'expenses', 'orders'],
};
const FILTER_LABELS: Record<ActiveFilter, string> = {
  product: 'Product',
  category: 'Category',
  customer: 'Customer',
  supplier: 'Supplier',
  paymentMethod: 'Payment method',
};
const PAGE_SIZE = 10;

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const currency = (value: unknown) =>
  `₹${numberValue(value).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;

const displayLabel = (key: string) =>
  key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, letter => letter.toUpperCase());

const formatCell = (value: unknown, key: string) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (
    typeof value === 'number' &&
    /amount|total|revenue|profit|expense|gst|taxable|paid|due|outstanding|cost|discount|spend|purchase/i.test(
      key,
    )
  ) {
    return currency(value);
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[Details unavailable]';
    }
  }
  return String(value);
};

const getErrorMessage = (error: unknown, fallback: string) =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : fallback;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });

function ChoiceModal({
  visible,
  title,
  choices,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  choices: Array<{ label: string; value: string }>;
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end bg-black/50"
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close options">
        <Pressable
          className="max-h-[75%] rounded-t-[24px] bg-white px-4 pb-8 pt-5"
          onPress={event => event.stopPropagation()}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[16px] font-black text-[#17191C]">{title}</Text>
            <Pressable onPress={onClose} accessibilityLabel="Close">
              <X size={21} color="#64748B" />
            </Pressable>
          </View>
          <ScrollView>
            {choices.map(choice => (
              <Pressable
                key={`${choice.value}-${choice.label}`}
                onPress={() => {
                  onSelect(choice.value);
                  onClose();
                }}
                className={`mb-2 rounded-[12px] px-4 py-3 ${
                  selected === choice.value ? 'bg-orange-50' : 'bg-[#F8FAFC]'
                }`}>
                <Text
                  className={`text-[13px] ${
                    selected === choice.value
                      ? 'font-bold text-[#C2410C]'
                      : 'text-[#334155]'
                  }`}>
                  {choice.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function Report({ onBackPress }: Props) {
  const insets = useSafeAreaInsets();
  const requestId = useRef(0);
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [period, setPeriod] = useState<Period>('this-month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [options, setOptions] = useState<ReportOptions>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [optionsError, setOptionsError] = useState('');
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('');
  const [category, setCategory] = useState('');
  const [customer, setCustomer] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null);
  const [detailRow, setDetailRow] = useState<ReportRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);

  const requestParams = useMemo(() => {
    const params: Record<string, string> = { period };
    if (period === 'custom') {
      if (from) params.from = from;
      if (to) params.to = to;
    }
    return params;
  }, [period, from, to]);

  const loadReport = useCallback(async (refresh = false) => {
    const currentRequestId = ++requestId.current;
    if (refresh) {
      setRefreshing(true);
      invalidateApiResponseCache();
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const [reportResponse, summaryResponse] = await Promise.all([
        api.get<{ rows?: ReportRow[] }>(`/reports/${reportType}`, {
          params: requestParams,
        }),
        api.get<Summary>('/reports/summary', { params: requestParams }),
      ]);
      if (!Array.isArray(reportResponse.data?.rows)) {
        throw new Error('The report response did not contain a row list.');
      }
      if (currentRequestId !== requestId.current) return;
      setRows(reportResponse.data.rows);
      setSummary(summaryResponse.data || null);
      setPage(1);
    } catch (loadError: unknown) {
      if (currentRequestId === requestId.current) {
        setError(getErrorMessage(loadError, 'Unable to load reports.'));
      }
    } finally {
      if (currentRequestId === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [reportType, requestParams]);

  useEffect(() => {
    loadReport();
    return () => {
      requestId.current += 1;
    };
  }, [loadReport]);

  useEffect(() => {
    let active = true;
    api
      .get<ReportOptions>('/reports/options')
      .then(({ data }) => {
        if (active) {
          setOptions(data || {});
          setOptionsError('');
        }
      })
      .catch((optionsLoadError: unknown) => {
        if (active) {
          setOptionsError(
            getErrorMessage(
              optionsLoadError,
              'Report filter options could not be loaded.',
            ),
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return rows.filter(row => {
      if (
        normalizedSearch &&
        !Object.values(row).some(value =>
          String(value ?? '')
            .toLowerCase()
            .includes(normalizedSearch),
        )
      ) {
        return false;
      }
      if (productId) {
        const product = options.products?.find(
          option => String(option.id) === productId,
        );
        const ids = String(row.product_ids || '').split(',');
        const names = String(
          row.product ?? row.product_name ?? row.products ?? '',
        )
          .split(',')
          .map(value => value.trim());
        const hasProduct =
          row.product_id !== undefined ||
          row.product !== undefined ||
          row.product_name !== undefined ||
          row.product_ids !== undefined;
        if (
          hasProduct &&
          String(row.product_id ?? '') !== productId &&
          !ids.includes(productId) &&
          !names.includes(String(product?.name ?? ''))
        ) {
          return false;
        }
      }
      if (category) {
        const categories = String(row.category ?? row.categories ?? '')
          .split(',')
          .map(value => value.trim().toLowerCase());
        if (
          (row.category !== undefined || row.categories !== undefined) &&
          !categories.includes(category.toLowerCase())
        ) {
          return false;
        }
      }
      if (
        customer &&
        (row.customer !== undefined ||
          row.customer_name !== undefined ||
          row.party !== undefined)
      ) {
        const rowCustomer = String(
          row.customer ?? row.customer_name ?? row.party,
        ).toLowerCase();
        if (rowCustomer !== customer.toLowerCase()) return false;
      }
      if (supplierId) {
        const supplier = options.suppliers?.find(
          option => String(option.id) === supplierId,
        );
        const hasSupplier =
          row.supplier_id !== undefined ||
          row.supplier !== undefined ||
          row.source === 'Purchase';
        if (
          hasSupplier &&
          String(row.supplier_id ?? '') !== supplierId &&
          String(
            row.supplier ??
              (row.source === 'Purchase' ? row.party : '') ??
              '',
          ) !== String(supplier?.name ?? '')
        ) {
          return false;
        }
        if (!hasSupplier && ['payments', 'outstanding'].includes(reportType)) {
          return false;
        }
      }
      if (
        paymentMethod &&
        row.payment_method !== undefined &&
        String(row.payment_method).toLowerCase() !==
          paymentMethod.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [
    rows,
    search,
    productId,
    category,
    customer,
    supplierId,
    paymentMethod,
    options,
    reportType,
  ]);

  const activeReport =
    REPORTS.find(([id]) => id === reportType)?.[1] || 'Report';
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filterValues: Record<ActiveFilter, string> = {
    product: productId,
    category,
    customer,
    supplier: supplierId,
    paymentMethod,
  };
  const setFilterValues: Record<ActiveFilter, (value: string) => void> = {
    product: setProductId,
    category: setCategory,
    customer: setCustomer,
    supplier: setSupplierId,
    paymentMethod: setPaymentMethod,
  };
  const filterChoices = useMemo(() => {
    if (!activeFilter) return [];
    if (activeFilter === 'product') {
      return [
        { label: 'All products', value: '' },
        ...(options.products || []).map(option => ({
          label: option.name || `Product ${option.id}`,
          value: String(option.id),
        })),
      ];
    }
    if (activeFilter === 'supplier') {
      return [
        { label: 'All suppliers', value: '' },
        ...(options.suppliers || []).map(option => ({
          label: option.name || `Supplier ${option.id}`,
          value: String(option.id),
        })),
      ];
    }
    const values =
      activeFilter === 'category'
        ? options.categories || []
        : activeFilter === 'customer'
          ? options.customers || []
          : options.paymentMethods || [];
    return [
      { label: `All ${FILTER_LABELS[activeFilter].toLowerCase()}s`, value: '' },
      ...values.map(value => ({ label: value, value })),
    ];
  }, [activeFilter, options]);
  const filterFields = (Object.keys(FILTER_REPORTS) as ActiveFilter[]).filter(
    filter => FILTER_REPORTS[filter].includes(reportType),
  );

  const printReport = async () => {
    if (!filteredRows.length) {
      Alert.alert('No report data', 'There are no filtered rows to print.');
      return;
    }
    const columns = Object.keys(filteredRows[0]);
    const headers = columns
      .map(column => `<th>${escapeHtml(displayLabel(column))}</th>`)
      .join('');
    const body = filteredRows
      .map(
        row =>
          `<tr>${columns
            .map(
              column =>
                `<td>${escapeHtml(formatCell(row[column], column))}</td>`,
            )
            .join('')}</tr>`,
      )
      .join('');
    const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
      body{font:12px Arial,sans-serif;color:#292524;padding:20px}h1{font-size:20px;margin:0 0 6px}
      p{color:#78716c;margin:0 0 18px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #d6d3d1;padding:7px;text-align:left;vertical-align:top}
      th{background:#f5f5f4}tr{break-inside:avoid}
      </style></head><body><h1>${escapeHtml(activeReport)}</h1>
      <p>${escapeHtml(summary?.range?.from || '')} – ${escapeHtml(summary?.range?.to || '')} · ${filteredRows.length} rows</p>
      <table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>
      </body></html>`;
    try {
      await RNPrint.print({ html });
    } catch (printError: unknown) {
      Alert.alert(
        'Print unavailable',
        getErrorMessage(printError, 'Unable to print this report.'),
      );
    }
  };

  const exportExcel = async () => {
    if (!filteredRows.length) {
      Alert.alert('No report data', 'There are no filtered rows to export.');
      return;
    }

    setExporting(true);
    let tempPath = '';
    try {
      const columns = [...new Set(filteredRows.flatMap(row => Object.keys(row)))];
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(activeReport.slice(0, 31));
      worksheet.columns = columns.map(column => ({
        header: displayLabel(column),
        key: column,
        width: Math.min(Math.max(displayLabel(column).length + 4, 14), 32),
      }));
      filteredRows.forEach(row => {
        const exported: Record<string, string | number | boolean> = {};
        columns.forEach(column => {
          const value = row[column];
          if (value === null || value === undefined) {
            exported[column] = '';
          } else if (
            typeof value === 'string' ||
            typeof value === 'boolean' ||
            (typeof value === 'number' && Number.isFinite(value))
          ) {
            exported[column] = value;
          } else if (typeof value === 'object') {
            exported[column] = JSON.stringify(value) ?? '';
          } else {
            exported[column] = String(value);
          }
        });
        worksheet.addRow(exported);
      });
      worksheet.getRow(1).font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF292524' },
      };
      const buffer = await workbook.xlsx.writeBuffer();
      const date = new Date();
      const dateStamp = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('');
      const fileName = `${reportType}-report-${dateStamp}.xlsx`;
      tempPath = `${CachesDirectoryPath}/${fileName}`;
      await writeFile(
        tempPath,
        fromByteArray(new Uint8Array(buffer)),
        'base64',
      );
      const savedFiles = await saveDocuments({
        sourceUris: [encodeURI(`file://${tempPath}`)],
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileName,
        copy: true,
      });
      const savedFile = savedFiles[0];
      if (savedFile.error) {
        throw new Error(savedFile.error);
      }
      Alert.alert(
        'Excel report ready',
        `${savedFile.name || fileName} was saved successfully.`,
      );
    } catch (exportError: unknown) {
      if (
        isErrorWithCode(exportError) &&
        exportError.code === errorCodes.OPERATION_CANCELED
      ) {
        return;
      }
      Alert.alert(
        'Excel export failed',
        getErrorMessage(exportError, 'Unable to save the Excel report.'),
      );
    } finally {
      if (tempPath) {
        try {
          await unlink(tempPath);
        } catch (cleanupError: unknown) {
          if (__DEV__) {
            console.warn(
              '[Reports] Could not remove temporary export file:',
              cleanupError,
            );
          }
        }
      }
      setExporting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <TopHeader
        pageTitle="Reports"
        pageSubtitle="Business performance and records"
        onBackPress={onBackPress}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadReport(true)}
            tintColor="#F97316"
            colors={['#F97316']}
          />
        }
        contentContainerClassName="px-4 pb-10"
        style={{ paddingTop: insets.top + 76 }}>
        <View className="mb-4">
          <Text className="mb-2 text-[12px] font-black text-[#17191C]">
            Choose report
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {REPORTS.map(([id, label]) => (
              <Pressable
                key={id}
                onPress={() => {
                  setReportType(id);
                  setPage(1);
                }}
                className={`mr-2 rounded-full px-4 py-2.5 ${
                  id === reportType ? 'bg-[#C2410C]' : 'bg-white'
                }`}>
                <Text
                  className={`text-[11px] font-bold ${
                    id === reportType ? 'text-white' : 'text-[#475569]'
                  }`}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View className="mb-4 rounded-[18px] border border-[#FCE6D7] bg-white p-4">
          <View className="mb-2 flex-row items-center">
            <CalendarDays size={16} color="#C2410C" />
            <Text className="ml-2 text-[12px] font-black text-[#17191C]">
              Report period
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {PERIODS.map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => {
                  setPeriod(value);
                  setPage(1);
                }}
                className={`mr-2 rounded-full px-3 py-2 ${
                  period === value ? 'bg-orange-100' : 'bg-[#F8FAFC]'
                }`}>
                <Text
                  className={`text-[10px] font-semibold ${
                    period === value ? 'text-[#9A3412]' : 'text-[#64748B]'
                  }`}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {period === 'custom' ? (
            <View className="mt-3 flex-row">
              <View className="mr-2 flex-1">
                <Text className="mb-1 text-[10px] font-bold text-[#64748B]">
                  From (YYYY-MM-DD)
                </Text>
                <TextInput
                  value={from}
                  onChangeText={value => {
                    setFrom(value);
                    setPage(1);
                  }}
                  placeholder="2026-01-01"
                  autoCapitalize="none"
                  className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-[12px] text-[#334155]"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-[10px] font-bold text-[#64748B]">
                  To (YYYY-MM-DD)
                </Text>
                <TextInput
                  value={to}
                  onChangeText={value => {
                    setTo(value);
                    setPage(1);
                  }}
                  placeholder="2026-01-31"
                  autoCapitalize="none"
                  className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-[12px] text-[#334155]"
                />
              </View>
            </View>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
          contentContainerClassName="pr-1">
          {SUMMARY_CARDS.map(([key, label, isMoney], index) => {
            const value = summary?.[key];
            const incomplete = value === null;
            return (
              <View
                key={key}
                className="mr-2 min-h-[96px] w-[142px] justify-center rounded-[16px] border border-[#ECE8E2] bg-white p-3">
                <Text
                  numberOfLines={1}
                  className="text-[10px] font-bold text-[#64748B]">
                  {label}
                </Text>
                <Text
                  numberOfLines={1}
                  className={`mt-2 text-[16px] font-black ${
                    index === 5 && numberValue(value) < 0
                      ? 'text-[#E11D48]'
                      : SUMMARY_COLOR_CLASSES[index]
                  }`}>
                  {summary === null
                    ? '—'
                    : incomplete
                      ? 'Incomplete'
                      : isMoney
                        ? currency(value)
                        : numberValue(value).toLocaleString('en-IN')}
                </Text>
                {incomplete ? (
                  <Text className="mt-1 text-[9px] text-[#94A3B8]">
                    FIFO cost data needed
                  </Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>

        <View className="mb-4 rounded-[16px] border border-[#ECE8E2] bg-white p-4">
          <Text className="mb-3 text-[12px] font-black text-[#17191C]">
            Report filters
          </Text>
          <View className="flex-row flex-wrap">
            {filterFields.map(filter => (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className="mb-2 mr-2 flex-row items-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
                <Text className="mr-1 text-[10px] font-semibold text-[#475569]">
                  {FILTER_LABELS[filter]}
                </Text>
                <ChevronDown size={13} color="#64748B" />
              </Pressable>
            ))}
          </View>
          {optionsError ? (
            <Text className="text-[10px] text-[#B91C1C]">{optionsError}</Text>
          ) : null}
        </View>

        <View className="mb-3 rounded-[16px] border border-[#ECE8E2] bg-white p-4">
          <View className="mb-3 flex-row items-start justify-between">
            <View className="mr-2 flex-1">
              <Text className="text-[16px] font-black text-[#17191C]">
                {activeReport} report
              </Text>
              <Text className="mt-1 text-[10px] text-[#64748B]">
                {summary?.range?.from || '—'} to {summary?.range?.to || '—'} ·{' '}
                {filteredRows.length.toLocaleString('en-IN')} matching rows
              </Text>
            </View>
            <View className="flex-row">
              <Pressable
                onPress={exportExcel}
                disabled={exporting}
                accessibilityRole="button"
                accessibilityLabel="Download Excel report"
                className={`mr-2 flex-row items-center rounded-[10px] bg-emerald-50 px-3 py-2 ${
                  exporting ? 'opacity-50' : ''
                }`}>
                {exporting ? (
                  <ActivityIndicator size="small" color="#047857" />
                ) : (
                  <Download size={15} color="#047857" />
                )}
                <Text className="ml-1.5 text-[10px] font-bold text-[#047857]">
                  {exporting ? 'Saving' : 'Excel'}
                </Text>
              </Pressable>
              <Pressable
                onPress={printReport}
                accessibilityRole="button"
                accessibilityLabel="Print or save report as PDF"
                className="flex-row items-center rounded-[10px] bg-orange-50 px-3 py-2">
                <Printer size={15} color="#9A3412" />
                <Text className="ml-1.5 text-[10px] font-bold text-[#9A3412]">
                  Print
                </Text>
              </Pressable>
            </View>
          </View>
          <View className="flex-row items-center rounded-[11px] border border-[#E2E8F0] bg-[#F8FAFC] px-3">
            <Search size={16} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={value => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search report..."
              className="ml-2 flex-1 py-2.5 text-[12px] text-[#334155]"
              returnKeyType="search"
              accessibilityLabel="Search report rows"
            />
            {search ? (
              <Pressable
                onPress={() => setSearch('')}
                accessibilityLabel="Clear search">
                <X size={16} color="#64748B" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {error ? (
          <View className="mb-3 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] p-4">
            <Text className="text-[12px] text-[#B91C1C]">{error}</Text>
            <Pressable onPress={() => loadReport()} className="mt-3">
              <Text className="text-[12px] font-bold text-[#991B1B]">Retry</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View className="items-center rounded-[16px] bg-white py-12">
            <ActivityIndicator color="#F97316" />
            <Text className="mt-2 text-[11px] text-[#64748B]">
              Loading report data...
            </Text>
          </View>
        ) : filteredRows.length === 0 ? (
          <View className="items-center rounded-[16px] bg-white px-5 py-12">
            <Search size={28} color="#FDBA74" />
            <Text className="mt-3 text-[13px] font-bold text-[#334155]">
              No report data found
            </Text>
            <Text className="mt-1 text-center text-[10px] text-[#94A3B8]">
              Try a different period or clear one or more filters.
            </Text>
          </View>
        ) : (
          <>
            {pageRows.map((row, index) => {
              const columns = Object.keys(row);
              const title = String(
                row.reference ||
                  row.product ||
                  row.customer ||
                  row.supplier ||
                  `${activeReport} #${(page - 1) * PAGE_SIZE + index + 1}`,
              );
              return (
                <View
                  key={`${String(row.row_id ?? row.id ?? row.reference ?? 'row')}-${index}`}
                  className="mb-3 rounded-[16px] border border-[#ECE8E2] bg-white p-4">
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text
                      numberOfLines={1}
                      className="mr-3 flex-1 text-[13px] font-black text-[#1E293B]">
                      {title}
                    </Text>
                    <Pressable
                      onPress={() => setDetailRow(row)}
                      accessibilityRole="button"
                      accessibilityLabel={`View details for ${title}`}
                      className="h-9 w-9 items-center justify-center rounded-[10px] bg-orange-50">
                      <Eye size={16} color="#9A3412" />
                    </Pressable>
                  </View>
                  <View className="flex-row flex-wrap">
                    {columns.slice(0, 4).map(column => (
                      <View key={column} className="mb-2 w-1/2 pr-2">
                        <Text
                          numberOfLines={1}
                          className="text-[9px] text-[#94A3B8]">
                          {displayLabel(column)}
                        </Text>
                        <Text
                          numberOfLines={2}
                          className="mt-0.5 text-[11px] font-semibold text-[#334155]">
                          {formatCell(row[column], column)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
            <View className="mb-2 flex-row items-center justify-between rounded-[14px] bg-white px-3 py-3">
              <Text className="text-[10px] text-[#64748B]">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filteredRows.length)} of{' '}
                {filteredRows.length}
              </Text>
              <View className="flex-row items-center">
                <Pressable
                  disabled={page <= 1}
                  onPress={() => setPage(current => current - 1)}
                  accessibilityLabel="Previous page"
                  className={`mr-2 rounded-[8px] border border-[#E2E8F0] p-2 ${
                    page <= 1 ? 'opacity-40' : ''
                  }`}>
                  <ChevronLeft size={16} color="#475569" />
                </Pressable>
                <Text className="text-[10px] font-bold text-[#64748B]">
                  {page} / {totalPages}
                </Text>
                <Pressable
                  disabled={page >= totalPages}
                  onPress={() => setPage(current => current + 1)}
                  accessibilityLabel="Next page"
                  className={`ml-2 rounded-[8px] border border-[#E2E8F0] p-2 ${
                    page >= totalPages ? 'opacity-40' : ''
                  }`}>
                  <ChevronRight size={16} color="#475569" />
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {activeFilter ? (
        <ChoiceModal
          visible
          title={FILTER_LABELS[activeFilter]}
          choices={filterChoices}
          selected={filterValues[activeFilter]}
          onSelect={setFilterValues[activeFilter]}
          onClose={() => setActiveFilter(null)}
        />
      ) : null}
      <Modal
        visible={detailRow !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailRow(null)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[80%] rounded-t-[24px] bg-white px-4 pb-8 pt-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[16px] font-black text-[#17191C]">
                Record details
              </Text>
              <Pressable
                onPress={() => setDetailRow(null)}
                accessibilityLabel="Close record details">
                <X size={21} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView>
              {Object.entries(detailRow || {}).map(([key, value]) => (
                <View
                  key={key}
                  className="mb-2 rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <Text className="text-[10px] font-semibold text-[#64748B]">
                    {displayLabel(key)}
                  </Text>
                  <Text className="mt-1 text-[12px] font-bold text-[#1E293B]">
                    {formatCell(value, key)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}