import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Check,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Minus,
  Plus,
  Printer,
  Search,
  Share2,
  Trash2,
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
  pick,
  saveDocuments,
  types as documentTypes,
  type DocumentPickerResponse,
} from '@react-native-documents/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';
import TopHeader from '../Navigation/TopHeader';

type Dealer = {
  id: number | string;
  name: string;
  company_name?: string;
  dealer_code?: string;
  mobile?: string;
  state?: string;
  gstin?: string;
  billing_address?: string;
  shipping_address?: string;
  status?: string;
};

type Product = {
  id: number | string;
  name: string;
  product_code?: string;
  category?: string;
  status?: string;
  selling_price?: number | string;
  offer_price?: number | string;
  available_stock?: number | string;
  total_stock?: number | string;
  deduction_rule?: string;
  data?: Record<string, unknown>;
  product_data?: Record<string, unknown>;
  gst_percentage?: number | string;
  gst_rate?: number | string;
};

type InvoiceLine = {
  product_id: number | string;
  product: Product;
  price: number;
  gst_rate: number;
  quantity: number;
  discount_type: 'none' | 'percentage' | 'fixed';
  discount_value: number;
};

type PageResponse<T> = {
  dealers?: T[];
  products?: T[];
  pagination?: { totalPages?: number | string };
};

type InvoiceForm = {
  invoice_date: string;
  due_date: string;
  seller_state: string;
  place_of_supply: string;
  sales_person: string;
  payment_terms: string;
  additional_discount: string;
  delivery_charges: string;
  installation_charges: string;
  amount_received: string;
  payment_method: string;
  transaction_id: string;
  reference_number: string;
  notes: string;
};

type InvoiceProps = {
  onBackPress?: () => void;
  onScrollVisibilityChange?: (visible: boolean) => void;
  initialDealerId?: number | string;
};

type ImportPreviewRow = {
  row_number: number;
  sku?: string;
  product_name?: string;
  quantity?: number | string;
  unit_price?: number | string | null;
  gst_rate?: number | string | null;
  valid: boolean;
  errors?: string[];
};

type ImportPreview = {
  import_token: string;
  valid_count: number;
  invalid_count: number;
  row_count: number;
  rows: ImportPreviewRow[];
};

type ExportRow = Record<string, string | number | null | undefined>;
type ExportScope = 'current' | 'selected' | 'all' | 'dealer' | 'date';
type ExportFormat = 'excel' | 'csv' | 'pdf';
type PickerKind = 'dealer' | 'product' | 'exportDealer';

const invoiceProductColumns = [
  { header: 'Product Name', key: 'product_name', width: 30 },
  { header: 'SKU', key: 'sku', width: 20 },
  { header: 'Category', key: 'category', width: 20 },
  { header: 'Quantity', key: 'quantity', width: 12 },
  { header: 'Unit Price', key: 'unit_price', width: 16 },
  { header: 'GST (%)', key: 'gst', width: 12 },
  { header: 'Discount', key: 'discount', width: 14 },
  { header: 'Total Amount', key: 'total', width: 18 },
];

const today = new Date().toISOString().slice(0, 10);
const paymentMethods = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other'];
const exportScopes: Array<[ExportScope, string]> = [
  ['current', 'Current'],
  ['selected', 'Selected'],
  ['all', 'All invoices'],
  ['dealer', 'Dealer'],
  ['date', 'Dates'],
];

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCurrency = (value: number) =>
  `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const errorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return fallback;
};

const productData = (product: Product) =>
  product.data ?? product.product_data ?? product;

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });

const getExportRow = (item: InvoiceLine): ExportRow => {
  const gst = item.gst_rate;
  const discount = getItemDiscount(item);
  const taxable = Math.max(0, item.price * item.quantity - discount);
  return {
    product_name: item.product.name,
    sku: item.product.product_code || '',
    category: item.product.category || '',
    quantity: item.quantity,
    unit_price: item.price,
    gst,
    discount,
    total: taxable * (1 + gst / 100),
  };
};

const getExportError = (error: unknown, fallback: string) => {
  if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
    return null;
  }
  return errorMessage(error, fallback);
};

const getItemDiscount = (item: InvoiceLine) => {
  const gross = item.price * item.quantity;
  if (item.discount_type === 'percentage') {
    return gross * Math.min(100, Math.max(0, item.discount_value)) / 100;
  }
  if (item.discount_type === 'fixed') {
    return Math.min(gross, Math.max(0, item.discount_value) * item.quantity);
  }
  return 0;
};

async function fetchAllPages<T>(
  path: string,
  key: 'dealers' | 'products',
  params: Record<string, string | number>,
) {
  const rows: T[] = [];
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page += 1) {
    const response = await api.get<PageResponse<T>>(path, {
      params: { ...params, limit: 100, page },
    });
    const pageRows = response.data[key];
    if (!Array.isArray(pageRows)) {
      throw new Error(`The ${key} response did not contain a list.`);
    }
    rows.push(...pageRows);
    if (page === 1) {
      totalPages = Math.max(1, toNumber(response.data.pagination?.totalPages, 1));
    }
  }
  return rows;
}

export default function Invoice({
  onBackPress,
  onScrollVisibilityChange,
  initialDealerId,
}: InvoiceProps) {
  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [items, setItems] = useState<InvoiceLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [importFile, setImportFile] = useState<DocumentPickerResponse | null>(
    null,
  );
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [previewingImport, setPreviewingImport] = useState(false);
  const [confirmingImport, setConfirmingImport] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [exportScope, setExportScope] = useState<ExportScope>('current');
  const [exportDealerId, setExportDealerId] = useState('');
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [form, setForm] = useState<InvoiceForm>({
    invoice_date: today,
    due_date: '',
    seller_state: '',
    place_of_supply: '',
    sales_person: '',
    payment_terms: 'Due on receipt',
    additional_discount: '0',
    delivery_charges: '0',
    installation_charges: '0',
    amount_received: '0',
    payment_method: 'Cash',
    transaction_id: '',
    reference_number: '',
    notes: '',
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [loadedDealers, loadedProducts] = await Promise.all([
          fetchAllPages<Dealer>('/dealers', 'dealers', { status: 'Active' }),
          fetchAllPages<Product>('/products', 'products', { status: 'Active' }),
        ]);
        if (!active) return;
        setDealers(loadedDealers);
        setProducts(loadedProducts.filter(row => row.status === 'Active'));
        try {
          const stockResponse = await api.get<{ allow_negative_stock?: boolean }>(
            '/stock/settings',
          );
          if (active) {
            setAllowNegativeStock(Boolean(stockResponse.data.allow_negative_stock));
          }
        } catch (error: unknown) {
          if (active) {
            setLoadError(
              errorMessage(error, 'Could not load stock settings; stock limits are enforced.'),
            );
          }
          if (__DEV__) console.warn('[Invoice] Could not load stock settings:', error);
        }
      } catch (error: unknown) {
        if (!active) return;
        setLoadError(errorMessage(error, 'Could not load active dealers and products.'));
        if (__DEV__) console.warn('[Invoice] Could not load invoice data:', error);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (initialDealerId == null) return;
    const selected = dealers.find(
      row => String(row.id) === String(initialDealerId),
    );
    if (!selected) return;
    setDealer(selected);
    setForm(current => ({
      ...current,
      place_of_supply: selected.state || current.place_of_supply,
    }));
  }, [dealers, initialDealerId]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemDiscount = items.reduce((sum, item) => sum + getItemDiscount(item), 0);
    const maxDiscount = Math.max(0, subtotal - itemDiscount);
    const additionalDiscount = Math.min(
      maxDiscount,
      Math.max(0, toNumber(form.additional_discount)),
    );
    const taxable = Math.max(0, maxDiscount - additionalDiscount);
    const taxBeforeAdditionalDiscount = items.reduce((sum, item) => {
      const rate = Math.min(100, Math.max(0, item.gst_rate));
      return sum + Math.max(0, item.price * item.quantity - getItemDiscount(item)) * rate / 100;
    }, 0);
    const scale = maxDiscount > 0 ? taxable / maxDiscount : 1;
    const tax = taxBeforeAdditionalDiscount * scale;
    const charges =
      Math.max(0, toNumber(form.delivery_charges)) +
      Math.max(0, toNumber(form.installation_charges));
    const grandTotal = Math.round(taxable + tax + charges);
    const sameState =
      form.seller_state.trim().toLowerCase() ===
      form.place_of_supply.trim().toLowerCase();
    return {
      subtotal,
      itemDiscount,
      additionalDiscount,
      taxable,
      cgst: sameState ? tax / 2 : 0,
      sgst: sameState ? tax / 2 : 0,
      igst: sameState ? 0 : tax,
      grandTotal,
      roundOff: grandTotal - taxable - tax - charges,
      balance: Math.max(0, grandTotal - Math.max(0, toNumber(form.amount_received))),
    };
  }, [form, items]);

  const insufficientItems = items.filter(item => {
    const rule = String(
      item.product.deduction_rule ??
        productData(item.product).deduction_rule ??
        'available',
    );
    return (
      rule !== 'none' &&
      !allowNegativeStock &&
      item.quantity >
        toNumber(item.product.available_stock ?? item.product.total_stock)
    );
  });

  const updateForm = <K extends keyof InvoiceForm>(key: K, value: InvoiceForm[K]) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const openPicker = (kind: PickerKind) => {
    setPickerSearch('');
    setPicker(kind);
  };

  const chooseDealer = (selected: Dealer) => {
    setDealer(selected);
    setForm(current => ({
      ...current,
      place_of_supply: selected.state || current.place_of_supply,
    }));
    setPicker(null);
  };

  const addProduct = (product: Product) => {
    if (items.some(item => String(item.product_id) === String(product.id))) {
      Alert.alert('Already added', 'This product is already on the invoice.');
      return;
    }
    const data = productData(product);
    setItems(current => [
      ...current,
      {
        product_id: product.id,
        product,
        price: toNumber(product.offer_price ?? product.selling_price),
        gst_rate: toNumber(data.gst_percentage ?? data.gst_rate, 18),
        quantity: 1,
        discount_type: 'none',
        discount_value: 0,
      },
    ]);
    setPicker(null);
  };

  const updateItem = (index: number, changes: Partial<InvoiceLine>) => {
    setItems(current =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, ...changes };
        next.quantity = Math.max(1, Math.floor(toNumber(next.quantity, 1)));
        next.discount_value = Math.max(
          0,
          next.discount_type === 'percentage'
            ? Math.min(100, toNumber(next.discount_value))
            : toNumber(next.discount_value),
        );
        return next;
      }),
    );
  };

  const saveExportFile = async (
    bytes: Uint8Array,
    fileName: string,
    mimeType: string,
  ) => {
    const tempPath = `${CachesDirectoryPath}/${fileName}`;
    try {
      await writeFile(tempPath, fromByteArray(bytes), 'base64');
      const savedFiles = await saveDocuments({
        sourceUris: [encodeURI(`file://${tempPath}`)],
        mimeType,
        fileName,
        copy: true,
      });
      if (savedFiles[0].error) {
        throw new Error(savedFiles[0].error);
      }
      Alert.alert('File ready', `${savedFiles[0].name || fileName} was saved.`);
    } finally {
      try {
        await unlink(tempPath);
      } catch (error: unknown) {
        if (__DEV__) console.warn('[Invoice] Could not remove temporary file:', error);
      }
    }
  };

  const downloadImportTemplate = async () => {
    let tempPath = '';
    try {
      const response = await api.get<ArrayBuffer>(
        '/invoice-products/import/template',
        { responseType: 'arraybuffer' },
      );
      tempPath = `${CachesDirectoryPath}/invoice-products-template.xlsx`;
      await writeFile(
        tempPath,
        fromByteArray(new Uint8Array(response.data)),
        'base64',
      );
      const savedFiles = await saveDocuments({
        sourceUris: [encodeURI(`file://${tempPath}`)],
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileName: 'invoice-products-template.xlsx',
        copy: true,
      });
      if (savedFiles[0].error) throw new Error(savedFiles[0].error);
      Alert.alert(
        'Template ready',
        `${savedFiles[0].name || 'The template'} was saved.`,
      );
    } catch (error: unknown) {
      const message = getExportError(error, 'Could not download the import template.');
      if (message) Alert.alert('Template download failed', message);
    } finally {
      if (tempPath) {
        try {
          await unlink(tempPath);
        } catch (error: unknown) {
          if (__DEV__) console.warn('[Invoice] Could not remove template file:', error);
        }
      }
    }
  };

  const chooseImportFile = async () => {
    try {
      const [file] = await pick({
        type: [...documentTypes.csv, documentTypes.xlsx],
      });
      const extension = file.name?.split('.').pop()?.toLowerCase();
      if (!file.name || !['csv', 'xlsx'].includes(extension || '')) {
        Alert.alert('Unsupported file', 'Choose an .xlsx or .csv file.');
        return;
      }
      setImportFile(file);
      setImportPreview(null);
    } catch (error: unknown) {
      const message = getExportError(error, 'Could not open the document picker.');
      if (message) Alert.alert('File unavailable', message);
    }
  };

  const previewProductsImport = async () => {
    if (!importFile) {
      Alert.alert('File required', 'Choose an Excel or CSV file first.');
      return;
    }
    setPreviewingImport(true);
    try {
      const data = new FormData();
      data.append(
        'file',
        {
          uri: importFile.uri,
          name: importFile.name || 'invoice-products.csv',
          type:
            importFile.type ||
            (importFile.name?.toLowerCase().endsWith('.xlsx')
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : 'text/csv'),
        } as unknown as Blob,
      );
      const response = await api.post<ImportPreview>(
        '/invoice-products/import/preview',
        data,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setImportPreview(response.data);
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Invoice] Import preview failed:', error);
      Alert.alert(
        'Import preview failed',
        errorMessage(error, 'Could not preview this file.'),
      );
    } finally {
      setPreviewingImport(false);
    }
  };

  const confirmProductsImport = async () => {
    if (!importPreview?.import_token) return;
    setConfirmingImport(true);
    try {
      const response = await api.post<{
        items?: Array<{
          product_id: number | string;
          quantity: number | string;
          unit_price: number | string;
          gst_rate: number | string;
          discount_amount?: number | string;
        }>;
      }>('/invoice-products/import/confirm', {
        import_token: importPreview.import_token,
      });
      const existing = new Set(items.map(item => Number(item.product_id)));
      const additions: InvoiceLine[] = [];
      (response.data.items || []).forEach(row => {
        const productId = Number(row.product_id);
        if (existing.has(productId)) return;
        const product = products.find(
          candidate => Number(candidate.id) === productId,
        );
        const quantity = toNumber(row.quantity);
        if (!product || quantity < 1) return;
        const discount = Math.max(0, toNumber(row.discount_amount));
        additions.push({
          product_id: product.id,
          product,
          price: toNumber(row.unit_price),
          gst_rate: toNumber(row.gst_rate),
          quantity,
          discount_type: discount > 0 ? 'fixed' : 'none',
          discount_value: discount > 0 ? discount / quantity : 0,
        });
        existing.add(productId);
      });
      if (!additions.length) {
        setImportPreview(null);
        Alert.alert(
          'No products added',
          'No new matched products could be added to this invoice.',
        );
        return;
      }
      setItems(current => [...current, ...additions]);
      setImportPreview(null);
      setImportFile(null);
      Alert.alert(
        'Products added',
        `${additions.length} product${additions.length === 1 ? '' : 's'} added to the invoice.`,
      );
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Invoice] Import confirmation failed:', error);
      Alert.alert(
        'Import failed',
        errorMessage(error, 'Could not confirm this import.'),
      );
    } finally {
      setConfirmingImport(false);
    }
  };

  const exportInvoiceProducts = async (format: ExportFormat) => {
    setExporting(format);
    try {
      let rows: ExportRow[];
      if (exportScope === 'current' || exportScope === 'selected') {
        const selectedItems =
          exportScope === 'selected'
            ? items.filter(item =>
                selectedItemIds.includes(String(item.product_id)),
              )
            : items;
        if (!selectedItems.length) {
          throw new Error(
            exportScope === 'selected'
              ? 'Select at least one invoice product.'
              : 'Add products before exporting.',
          );
        }
        rows = selectedItems.map(getExportRow);
      } else {
        const params: Record<string, string> = { scope: exportScope };
        if (exportScope === 'dealer') {
          if (!exportDealerId) throw new Error('Select a dealer for this export.');
          params.dealer_id = exportDealerId;
        }
        if (exportScope === 'date') {
          if (!isValidDate(exportFrom) || !isValidDate(exportTo)) {
            throw new Error('Choose both dates for this export.');
          }
          if (exportFrom > exportTo) {
            throw new Error('The start date must be on or before the end date.');
          }
          params.from = exportFrom;
          params.to = exportTo;
        }
        if (format === 'pdf') {
          const response = await api.get<{ rows?: Array<Record<string, unknown>> }>(
            '/invoice-products/export/data',
            { params },
          );
          if (!Array.isArray(response.data.rows)) {
            throw new Error('The export response did not contain invoice rows.');
          }
          rows = response.data.rows.map(row => ({
            ...row,
            gst: toNumber(row.gst_rate),
            discount: toNumber(row.discount_amount),
            total: toNumber(row.line_total),
          }));
        } else {
          const response = await api.get<ArrayBuffer>(
            `/invoice-products/export/${format}`,
            { params, responseType: 'arraybuffer' },
          );
          const dateStamp = today.replace(/-/g, '');
          const extension = format === 'excel' ? 'xlsx' : 'csv';
          await saveExportFile(
            new Uint8Array(response.data),
            `invoice-products-${exportScope}-${dateStamp}.${extension}`,
            format === 'excel'
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : 'text/csv',
          );
          return;
        }
      }

      if (format === 'pdf') {
        const headers = invoiceProductColumns
          .map(column => `<th>${escapeHtml(column.header)}</th>`)
          .join('');
        const body = rows
          .map(
            row =>
              `<tr>${invoiceProductColumns
                .map(column => `<td>${escapeHtml(row[column.key])}</td>`)
                .join('')}</tr>`,
          )
          .join('');
        const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
          body{font:12px Arial,sans-serif;color:#222;padding:20px}h1{font-size:20px}
          table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:7px;text-align:left}
          th{background:#eee}tr{break-inside:avoid}
          </style></head><body><h1>Invoice Products</h1>
          <table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>
          </body></html>`;
        await RNPrint.print({ html });
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Invoice Products');
      worksheet.columns = invoiceProductColumns;
      const exportRows =
        format === 'csv'
          ? rows.map(row =>
              Object.fromEntries(
                Object.entries(row).map(([key, value]) => [
                  key,
                  typeof value === 'string' && /^[=+\-@]/.test(value)
                    ? `'${value}`
                    : value,
                ]),
              ),
            )
          : rows;
      worksheet.addRows(exportRows);
      const buffer =
        format === 'csv'
          ? await workbook.csv.writeBuffer()
          : await workbook.xlsx.writeBuffer();
      const dateStamp = today.replace(/-/g, '');
      const extension = format === 'excel' ? 'xlsx' : 'csv';
      await saveExportFile(
        new Uint8Array(buffer),
        `invoice-products-${exportScope}-${dateStamp}.${extension}`,
        format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv',
      );
    } catch (error: unknown) {
      const message = getExportError(error, 'Could not export invoice products.');
      if (message) Alert.alert('Export failed', message);
    } finally {
      setExporting(null);
    }
  };

  const submit = async (isDraft: boolean) => {
    if (!isValidDate(form.invoice_date)) {
      Alert.alert('Invoice date required', 'Enter a valid invoice date (YYYY-MM-DD).');
      return;
    }
    if (form.due_date && !isValidDate(form.due_date)) {
      Alert.alert('Invalid due date', 'Enter the due date as YYYY-MM-DD.');
      return;
    }
    if (form.due_date && form.due_date < form.invoice_date) {
      Alert.alert('Invalid due date', 'The due date cannot be before the invoice date.');
      return;
    }
    if (!dealer) {
      Alert.alert('Dealer required', 'Select an active dealer.');
      return;
    }
    if (!items.length) {
      Alert.alert('Products required', 'Add at least one product to the invoice.');
      return;
    }
    if (!form.seller_state.trim() || !form.place_of_supply.trim()) {
      Alert.alert('State required', 'Enter the seller state and place of supply.');
      return;
    }
    if (!isDraft && insufficientItems.length) {
      Alert.alert(
        'Insufficient stock',
        `Not enough stock for ${insufficientItems.map(item => item.product.name).join(', ')}.`,
      );
      return;
    }
    const amountReceived = Math.max(0, toNumber(form.amount_received));
    if (!isDraft && amountReceived > totals.grandTotal) {
      Alert.alert('Payment too high', 'Payment cannot exceed the invoice total.');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post<{
        invoice?: { invoice_number?: string };
      }>('/invoices', {
        ...form,
        is_draft: isDraft,
        amount_received: isDraft ? 0 : amountReceived,
        additional_discount: Math.max(0, toNumber(form.additional_discount)),
        delivery_charges: Math.max(0, toNumber(form.delivery_charges)),
        installation_charges: Math.max(0, toNumber(form.installation_charges)),
        dealer_id: Number(dealer.id),
        customer_name: dealer.company_name || dealer.name,
        mobile: dealer.mobile,
        gstin: dealer.gstin || '',
        billing_address: dealer.billing_address || '',
        shipping_address: dealer.shipping_address || '',
        items: items.map(
          ({ product_id, quantity, price, gst_rate, discount_type, discount_value }) => ({
            product_id,
            quantity,
            unit_price: price,
            gst_rate,
            discount_type,
            discount_value,
          }),
        ),
      });
      Alert.alert(
        isDraft ? 'Draft saved' : 'Invoice created',
        isDraft
          ? 'Invoice draft saved successfully.'
          : `Invoice ${response.data.invoice?.invoice_number ?? ''} created successfully.`,
        [{ text: 'OK', onPress: onBackPress }],
      );
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Invoice] Could not save invoice:', error);
      Alert.alert(
        'Save failed',
        errorMessage(error, 'Invoice could not be created.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const query = pickerSearch.trim().toLowerCase();
  const isDealerPicker = picker === 'dealer' || picker === 'exportDealer';
  const pickerRows =
    isDealerPicker
      ? dealers.filter(row =>
          `${row.name} ${row.company_name ?? ''} ${row.mobile ?? ''} ${row.dealer_code ?? ''}`
            .toLowerCase()
            .includes(query),
        )
      : products.filter(row =>
          `${row.name} ${row.product_code ?? ''}`.toLowerCase().includes(query),
        );

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <TopHeader
        pageTitle="Create GST Invoice"
        pageSubtitle="Dealer invoice"
        onBackPress={onBackPress}
      />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F97316" />
          <Text className="mt-3 text-sm text-[#64748B]">Loading invoice data...</Text>
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={event => {
            const currentY = event.nativeEvent.contentOffset.y;
            if (currentY < 20 || currentY < lastScrollY.current - 8) {
              onScrollVisibilityChange?.(true);
            } else if (currentY > lastScrollY.current + 8) {
              onScrollVisibilityChange?.(false);
            }
            lastScrollY.current = currentY;
          }}
          contentContainerClassName="px-4 pb-[255px]"
          style={{ paddingTop: insets.top + 72 }}>
          {loadError ? (
            <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <Text className="text-sm font-semibold text-red-700">{loadError}</Text>
            </View>
          ) : null}

          <Section title="Customer and invoice details">
            <Text className="mb-1 text-xs font-bold text-[#64748B]">Dealer *</Text>
            <Pressable
              onPress={() => openPicker('dealer')}
              className="mb-3 min-h-12 flex-row items-center justify-between rounded-xl border border-[#E2E8F0] bg-white px-3">
              <Text className={dealer ? 'text-sm text-[#17191C]' : 'text-sm text-[#94A3B8]'}>
                {dealer ? dealer.company_name || dealer.name : 'Select an active dealer'}
              </Text>
              <ChevronDown size={18} color="#64748B" />
            </Pressable>
            <View className="flex-row gap-3">
              <Field label="Invoice date *" value={form.invoice_date} onChangeText={value => updateForm('invoice_date', value)} placeholder="YYYY-MM-DD" />
              <Field label="Due date" value={form.due_date} onChangeText={value => updateForm('due_date', value)} placeholder="YYYY-MM-DD" />
            </View>
            <Field label="Sales person" value={form.sales_person} onChangeText={value => updateForm('sales_person', value)} />
            <View className="flex-row gap-3">
              <Field label="Seller state *" value={form.seller_state} onChangeText={value => updateForm('seller_state', value)} placeholder="e.g. Tamil Nadu" />
              <Field label="Place of supply *" value={form.place_of_supply} onChangeText={value => updateForm('place_of_supply', value)} placeholder="State" />
            </View>
            <Field label="Payment terms" value={form.payment_terms} onChangeText={value => updateForm('payment_terms', value)} />
          </Section>

          <Section title="Products and quantities">
            <Pressable
              onPress={() => openPicker('product')}
              className="mb-3 flex-row items-center justify-center rounded-xl bg-[#FFF1D6] px-4 py-3">
              <Plus size={18} color="#C2410C" />
              <Text className="ml-2 text-sm font-bold text-[#C2410C]">Add a product</Text>
            </Pressable>
            {items.length === 0 ? (
              <Text className="py-4 text-center text-sm text-[#94A3B8]">
                Add products to start this invoice.
              </Text>
            ) : (
              items.map((item, index) => {
                const lineTotal = Math.max(
                  0,
                  item.price * item.quantity - getItemDiscount(item),
                );
                const stock = toNumber(
                  item.product.available_stock ?? item.product.total_stock,
                );
                const isSelected = selectedItemIds.includes(
                  String(item.product_id),
                );
                return (
                  <View key={String(item.product_id)} className="mb-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
                    <View className="flex-row items-start justify-between">
                      <View className="mr-3 flex-1">
                        <Text className="text-sm font-bold text-[#17191C]">{item.product.name}</Text>
                        <Text className="mt-1 text-xs text-[#64748B]">
                          {item.product.product_code || 'No SKU'} · {formatCurrency(item.price)} each · Stock {stock}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${isSelected ? 'Deselect' : 'Select'} ${item.product.name} for export`}
                        onPress={() =>
                          setSelectedItemIds(current =>
                            isSelected
                              ? current.filter(
                                  id => id !== String(item.product_id),
                                )
                              : [...current, String(item.product_id)],
                          )
                        }
                        className={`mr-2 flex-row items-center rounded-lg px-2 py-1 ${isSelected ? 'bg-green-50' : 'bg-[#F1F5F9]'}`}>
                        <Check
                          size={14}
                          color={isSelected ? '#15803D' : '#94A3B8'}
                        />
                        <Text
                          className={`ml-1 text-[10px] font-bold ${isSelected ? 'text-green-700' : 'text-[#64748B]'}`}>
                          {isSelected ? 'Selected' : 'Select'}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${item.product.name}`}
                        onPress={() => {
                          const productId = String(item.product_id);
                          setItems(current =>
                            current.filter((_, i) => i !== index),
                          );
                          setSelectedItemIds(current =>
                            current.filter(id => id !== productId),
                          );
                        }}
                        className="p-1">
                        <Trash2 size={18} color="#DC2626" />
                      </Pressable>
                    </View>
                    <View className="mt-3 flex-row items-center justify-between">
                      <View className="flex-row items-center rounded-lg border border-[#E2E8F0]">
                        <Pressable onPress={() => updateItem(index, { quantity: item.quantity - 1 })} className="p-2">
                          <Minus size={16} color="#475569" />
                        </Pressable>
                        <Text className="min-w-8 text-center text-sm font-bold text-[#17191C]">{item.quantity}</Text>
                        <Pressable onPress={() => updateItem(index, { quantity: item.quantity + 1 })} className="p-2">
                          <Plus size={16} color="#475569" />
                        </Pressable>
                      </View>
                      <Text className={item.quantity > stock && !allowNegativeStock ? 'text-xs font-semibold text-red-600' : 'text-xs text-[#64748B]'}>
                        GST {item.gst_rate}%
                      </Text>
                      <Text className="text-sm font-black text-[#17191C]">{formatCurrency(lineTotal)}</Text>
                    </View>
                    <View className="mt-3 flex-row items-center gap-2">
                      {(['none', 'percentage', 'fixed'] as const).map(type => (
                        <Pressable
                          key={type}
                          onPress={() => updateItem(index, { discount_type: type })}
                          className={`rounded-lg px-3 py-2 ${item.discount_type === type ? 'bg-[#1E293B]' : 'bg-[#F1F5F9]'}`}>
                          <Text className={`text-xs font-bold ${item.discount_type === type ? 'text-white' : 'text-[#475569]'}`}>
                            {type === 'none' ? 'No discount' : type === 'percentage' ? '%' : '₹'}
                          </Text>
                        </Pressable>
                      ))}
                      {item.discount_type !== 'none' ? (
                        <TextInput
                          value={String(item.discount_value)}
                          onChangeText={value => updateItem(index, { discount_value: toNumber(value) })}
                          keyboardType="decimal-pad"
                          placeholder="Discount"
                          className="h-10 min-w-20 flex-1 rounded-lg border border-[#E2E8F0] px-2 text-sm text-[#17191C]"
                        />
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}

            <View className="mt-2 border-t border-[#F1F5F9] pt-4">
              <Text className="mb-3 text-xs font-black uppercase tracking-wide text-[#64748B]">
                Import products
              </Text>
              <View className="flex-row flex-wrap items-center gap-2">
                <Pressable
                  onPress={downloadImportTemplate}
                  className="flex-row items-center rounded-lg border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2">
                  <Download size={15} color="#C2410C" />
                  <Text className="ml-1.5 text-xs font-bold text-[#C2410C]">Template</Text>
                </Pressable>
                <Pressable
                  onPress={chooseImportFile}
                  className="flex-row items-center rounded-lg border border-[#E2E8F0] bg-white px-3 py-2">
                  <FileSpreadsheet size={15} color="#475569" />
                  <Text className="ml-1.5 text-xs font-bold text-[#475569]">Choose .xlsx / .csv</Text>
                </Pressable>
                <Pressable
                  disabled={!importFile || previewingImport}
                  onPress={previewProductsImport}
                  className="rounded-lg bg-[#1E293B] px-3 py-2 disabled:opacity-50">
                  <Text className="text-xs font-bold text-white">
                    {previewingImport ? 'Checking...' : 'Preview import'}
                  </Text>
                </Pressable>
              </View>
              <Text className="mt-2 text-xs text-[#64748B]">
                {importFile?.name || 'No file selected'}
              </Text>
              {importPreview ? (
                <View className="mt-3 rounded-xl border border-[#FED7AA] bg-[#FFF7ED] p-3">
                  <View className="mb-3 flex-row items-center justify-between">
                    <View className="mr-2 flex-1">
                      <Text className="text-sm font-black text-[#1E293B]">Import preview</Text>
                      <Text className="mt-1 text-xs text-[#64748B]">
                        {importPreview.valid_count} valid · {importPreview.invalid_count} invalid · {importPreview.row_count} total
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        setImportPreview(null);
                        setImportFile(null);
                      }}
                      className="mr-2 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-2">
                      <Text className="text-xs font-bold text-[#475569]">Cancel</Text>
                    </Pressable>
                    <Pressable
                      disabled={!importPreview.valid_count || confirmingImport}
                      onPress={confirmProductsImport}
                      className="rounded-lg bg-[#F97316] px-2.5 py-2 disabled:opacity-50">
                      <Text className="text-xs font-bold text-white">
                        {confirmingImport ? 'Adding...' : 'Confirm'}
                      </Text>
                    </Pressable>
                  </View>
                  <ScrollView nestedScrollEnabled className="max-h-64">
                    {importPreview.rows?.map(row => (
                      <View
                        key={row.row_number}
                        className={`mb-2 rounded-lg border p-2.5 ${row.valid ? 'border-green-200 bg-white' : 'border-red-200 bg-red-50'}`}>
                        <Text className="text-xs font-bold text-[#1E293B]">
                          Row {row.row_number}: {row.product_name || row.sku || 'Unknown product'}
                        </Text>
                        <Text className="mt-1 text-[11px] text-[#64748B]">
                          SKU {row.sku || '—'} · Qty {row.quantity ?? '—'} · Price {row.unit_price == null ? '—' : formatCurrency(toNumber(row.unit_price))} · GST {row.gst_rate == null ? '—' : `${row.gst_rate}%`}
                        </Text>
                        <Text className={`mt-1 text-[11px] font-semibold ${row.valid ? 'text-green-700' : 'text-red-700'}`}>
                          {row.valid ? 'Valid' : (row.errors || []).join(' ')}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            <View className="mt-4 border-t border-[#F1F5F9] pt-4">
              <View className="mb-3 flex-row items-center">
                <Share2 size={15} color="#475569" />
                <Text className="ml-2 text-xs font-black uppercase tracking-wide text-[#64748B]">
                  Export invoice products
                </Text>
              </View>
              <View className="mb-3 flex-row flex-wrap gap-2">
                {exportScopes.map(([scope, label]) => (
                  <Pressable
                    key={scope}
                    onPress={() => setExportScope(scope)}
                    className={`rounded-full px-3 py-2 ${exportScope === scope ? 'bg-[#1E293B]' : 'bg-[#F1F5F9]'}`}>
                    <Text className={`text-xs font-bold ${exportScope === scope ? 'text-white' : 'text-[#475569]'}`}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {exportScope === 'selected' ? (
                <Text className="mb-2 text-xs text-[#64748B]">
                  {selectedItemIds.length} invoice product{selectedItemIds.length === 1 ? '' : 's'} selected.
                </Text>
              ) : null}
              {exportScope === 'dealer' ? (
                <Pressable
                  onPress={() => openPicker('exportDealer')}
                  className="mb-3 min-h-11 flex-row items-center justify-between rounded-lg border border-[#E2E8F0] bg-white px-3">
                  <Text className={exportDealerId ? 'text-xs text-[#17191C]' : 'text-xs text-[#94A3B8]'}>
                    {dealers.find(row => String(row.id) === exportDealerId)?.company_name ||
                      dealers.find(row => String(row.id) === exportDealerId)?.name ||
                      'Select dealer'}
                  </Text>
                  <ChevronDown size={16} color="#64748B" />
                </Pressable>
              ) : null}
              {exportScope === 'date' ? (
                <View className="mb-3 flex-row gap-2">
                  <Field label="From" value={exportFrom} onChangeText={setExportFrom} placeholder="YYYY-MM-DD" />
                  <Field label="To" value={exportTo} onChangeText={setExportTo} placeholder="YYYY-MM-DD" />
                </View>
              ) : null}
              <View className="flex-row flex-wrap gap-2">
                {(['excel', 'csv', 'pdf'] as const).map(format => (
                  <Pressable
                    key={format}
                    disabled={exporting !== null}
                    onPress={() => exportInvoiceProducts(format)}
                    className="flex-row items-center rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 disabled:opacity-50">
                    {format === 'pdf' ? (
                      <Printer size={15} color="#475569" />
                    ) : (
                      <FileSpreadsheet size={15} color="#475569" />
                    )}
                    <Text className="ml-1.5 text-xs font-bold uppercase text-[#475569]">
                      {exporting === format ? 'Exporting...' : format}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Section>

          <Section title="Invoice summary">
            <SummaryRow label="Subtotal" value={totals.subtotal} />
            <SummaryRow label="Item discounts" value={-totals.itemDiscount} />
            <NumberField label="Additional discount" value={form.additional_discount} onChangeText={value => updateForm('additional_discount', value)} />
            <SummaryRow label="Taxable amount" value={totals.taxable} />
            <SummaryRow label="CGST" value={totals.cgst} />
            <SummaryRow label="SGST" value={totals.sgst} />
            <SummaryRow label="IGST" value={totals.igst} />
            <NumberField label="Delivery charges" value={form.delivery_charges} onChangeText={value => updateForm('delivery_charges', value)} />
            <NumberField label="Installation charges" value={form.installation_charges} onChangeText={value => updateForm('installation_charges', value)} />
            <SummaryRow label="Round off" value={totals.roundOff} />
            <View className="my-3 rounded-xl bg-[#FFF1D6] p-4">
              <Text className="text-xs font-bold uppercase tracking-widest text-[#C2410C]">Grand total</Text>
              <Text className="mt-1 text-2xl font-black text-[#17191C]">{formatCurrency(totals.grandTotal)}</Text>
            </View>
            {insufficientItems.length ? (
              <Text className="mb-3 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
                Insufficient stock for {insufficientItems.map(item => item.product.name).join(', ')}. You can save a draft, but finalizing requires enough stock.
              </Text>
            ) : null}
            <NumberField label="Amount received" value={form.amount_received} onChangeText={value => updateForm('amount_received', value)} />
            {toNumber(form.amount_received) > 0 ? (
              <>
                <Text className="mb-2 mt-1 text-xs font-bold text-[#64748B]">Payment method</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                  {paymentMethods.map(method => (
                    <Pressable
                      key={method}
                      onPress={() => updateForm('payment_method', method)}
                      className={`mr-2 rounded-full px-3 py-2 ${form.payment_method === method ? 'bg-[#1E293B]' : 'bg-[#F1F5F9]'}`}>
                      <Text className={`text-xs font-bold ${form.payment_method === method ? 'text-white' : 'text-[#475569]'}`}>{method}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Field label="Transaction ID" value={form.transaction_id} onChangeText={value => updateForm('transaction_id', value)} />
                <Field label="Payment reference" value={form.reference_number} onChangeText={value => updateForm('reference_number', value)} />
              </>
            ) : null}
            <SummaryRow label="Balance due" value={totals.balance} />
            <TextInput
              value={form.notes}
              onChangeText={value => updateForm('notes', value)}
              placeholder="Invoice notes"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="mt-3 min-h-20 rounded-xl border border-[#E2E8F0] bg-white p-3 text-sm text-[#17191C]"
            />
            <Pressable
              disabled={saving}
              onPress={() => submit(false)}
              className="mt-4 items-center rounded-xl bg-[#F97316] px-4 py-3.5">
              <Text className="font-bold text-white">{saving ? 'Saving invoice...' : 'Finalize invoice'}</Text>
            </Pressable>
            <Pressable
              disabled={saving}
              onPress={() => submit(true)}
              className="mt-2 items-center rounded-xl border border-[#E2E8F0] bg-white px-4 py-3.5">
              <Text className="font-bold text-[#1E293B]">{saving ? 'Saving invoice...' : 'Save as draft'}</Text>
            </Pressable>
          </Section>
        </ScrollView>
      )}

      <Modal
        visible={picker !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setPicker(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="max-h-[82%] rounded-t-3xl bg-white px-4 pt-5"
            style={{ paddingBottom: Math.max(insets.bottom, 32) }}>
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-black text-[#17191C]">
                {isDealerPicker
                  ? picker === 'exportDealer'
                    ? 'Select export dealer'
                    : 'Select dealer'
                  : 'Add product'}
              </Text>
              <Pressable onPress={() => setPicker(null)} className="p-2">
                <X size={20} color="#475569" />
              </Pressable>
            </View>
            <View className="mb-3 flex-row items-center rounded-xl border border-[#E2E8F0] px-3">
              <Search size={18} color="#94A3B8" />
              <TextInput
                autoFocus
                value={pickerSearch}
                onChangeText={setPickerSearch}
                placeholder={isDealerPicker ? 'Search name, code, or phone' : 'Search product name or SKU'}
                placeholderTextColor="#94A3B8"
                className="ml-2 h-12 flex-1 text-sm text-[#17191C]"
              />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {pickerRows.map(row => {
                const dealerRow = row as Dealer;
                const productRow = row as Product;
                return (
                  <Pressable
                    key={String(row.id)}
                    onPress={() => {
                      if (picker === 'dealer') {
                        chooseDealer(dealerRow);
                      } else if (picker === 'exportDealer') {
                        setExportDealerId(String(dealerRow.id));
                        setPicker(null);
                      } else {
                        addProduct(productRow);
                      }
                    }}
                    className="border-b border-[#F1F5F9] py-3">
                    <Text className="text-sm font-bold text-[#17191C]">
                      {isDealerPicker
                        ? dealerRow.company_name || dealerRow.name
                        : productRow.name}
                    </Text>
                    <Text className="mt-1 text-xs text-[#64748B]">
                      {isDealerPicker
                        ? `${dealerRow.dealer_code || ''} ${dealerRow.mobile || ''}`
                        : `${productRow.product_code || 'No SKU'} · Stock ${productRow.available_stock ?? productRow.total_stock ?? 0} · ${formatCurrency(toNumber(productRow.offer_price ?? productRow.selling_price))}`}
                    </Text>
                  </Pressable>
                );
              })}
              {pickerRows.length === 0 ? (
                <Text className="py-8 text-center text-sm text-[#64748B]">
                  No matching {isDealerPicker ? 'dealers' : 'products'}.
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4 rounded-2xl border border-[#FCE6D7] bg-white p-4">
      <Text className="mb-3 text-sm font-black text-[#17191C]">{title}</Text>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View className="mb-3 flex-1">
      <Text className="mb-1 text-xs font-bold text-[#64748B]">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        className="h-12 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#17191C]"
      />
    </View>
  );
}

function NumberField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text className="mr-3 flex-1 text-sm text-[#64748B]">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        className="h-10 w-28 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2 text-right text-sm text-[#17191C]"
      />
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <View className="mb-2 flex-row justify-between">
      <Text className="text-sm text-[#64748B]">{label}</Text>
      <Text className="text-sm font-semibold text-[#1E293B]">{formatCurrency(value)}</Text>
    </View>
  );
}
