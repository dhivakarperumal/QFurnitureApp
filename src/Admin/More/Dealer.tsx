import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Grid2X2,
  List,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from 'lucide-react-native';
import RNPrint from 'react-native-print';
import { CachesDirectoryPath, unlink, writeFile } from 'react-native-fs';
import {
  errorCodes,
  isErrorWithCode,
  saveDocuments,
} from '@react-native-documents/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api';
import TopHeader from '../Navigation/TopHeader';

type Dealer = {
  id: number | string;
  dealer_code?: string;
  name: string;
  company_name?: string;
  contact_person?: string;
  mobile?: string;
  whatsapp?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  dealer_type?: string;
  dealer_category?: string;
  billing_address?: string;
  shipping_address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  opening_balance?: number | string;
  credit_limit?: number | string;
  payment_terms?: string;
  notes?: string;
  status?: string;
  total_invoices?: number | string;
  total_purchases?: number | string;
  outstanding_balance?: number | string;
  total_paid?: number | string;
  invoices?: Invoice[];
  ledger?: LedgerEntry[];
  credit_notes?: CreditNote[];
};

type Invoice = {
  id: number | string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  customer_name?: string;
  mobile?: string;
  billing_address?: string;
  place_of_supply?: string;
  gstin?: string;
  notes?: string;
  subtotal?: number | string;
  item_discount?: number | string;
  additional_discount?: number | string;
  taxable_amount?: number | string;
  cgst_amount?: number | string;
  sgst_amount?: number | string;
  igst_amount?: number | string;
  delivery_charges?: number | string;
  installation_charges?: number | string;
  grand_total?: number | string;
  amount_paid?: number | string;
  credited_amount?: number | string;
  balance_due?: number | string;
  status?: string;
  items?: InvoiceItem[];
};

type InvoiceItem = {
  id: number | string;
  product_name: string;
  hsn_code?: string;
  unit?: string;
  quantity: number | string;
  remaining_quantity?: number | string;
  unit_price?: number | string;
  taxable_amount?: number | string;
  gst_amount?: number | string;
  line_total?: number | string;
};

type LedgerEntry = {
  id: number | string;
  transaction_date: string;
  transaction_type?: string;
  reference_number?: string;
  description?: string;
  debit?: number | string;
  credit?: number | string;
  balance?: number | string;
};

type CreditNote = {
  id: number | string;
  credit_note_number: string;
  invoice_number?: string;
  credit_date: string;
  reason?: string;
  amount?: number | string;
};

type DealerSummary = {
  total: number;
  active: number;
  inactive: number;
  invoices: number;
};

type DealerPage = {
  dealers?: Dealer[];
  summary?: Partial<DealerSummary>;
  pagination?: {
    page?: number | string;
    totalPages?: number | string;
    total?: number | string;
  };
};

type DealerForm = {
  name: string;
  company_name: string;
  contact_person: string;
  mobile: string;
  whatsapp: string;
  email: string;
  gstin: string;
  pan: string;
  dealer_type: string;
  dealer_category: string;
  billing_address: string;
  shipping_address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  opening_balance: string;
  credit_limit: string;
  payment_terms: string;
  notes: string;
  status: string;
};

type PaymentForm = {
  paid_at: string;
  amount: string;
  payment_method: string;
  transaction_id: string;
  reference_number: string;
  notes: string;
};

type CreditForm = {
  credit_date: string;
  reason: string;
  notes: string;
  quantities: Record<string, string>;
  dispositions: Record<string, string>;
};

type DealerProps = {
  onBackPress?: () => void;
  onScrollVisibilityChange?: (visible: boolean) => void;
  onCreateInvoice?: (dealerId: number | string) => void;
};

const pageSize = 25;
const today = new Date().toISOString().slice(0, 10);
const paymentMethods = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque', 'Other'];
const initialSummary: DealerSummary = {
  total: 0,
  active: 0,
  inactive: 0,
  invoices: 0,
};
const emptyDealerForm: DealerForm = {
  name: '',
  company_name: '',
  contact_person: '',
  mobile: '',
  whatsapp: '',
  email: '',
  gstin: '',
  pan: '',
  dealer_type: 'Retail Dealer',
  dealer_category: '',
  billing_address: '',
  shipping_address: '',
  city: '',
  district: '',
  state: '',
  pincode: '',
  opening_balance: '0',
  credit_limit: '0',
  payment_terms: '',
  notes: '',
  status: 'Active',
};
const dealerExportColumns: Array<keyof Dealer> = [
  'dealer_code',
  'name',
  'company_name',
  'contact_person',
  'mobile',
  'email',
  'gstin',
  'dealer_type',
  'city',
  'state',
  'status',
  'total_invoices',
  'total_purchases',
  'outstanding_balance',
];

const toNumber = (value: number | string | null | undefined, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCurrency = (value: number | string | null | undefined) =>
  `₹${toNumber(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getErrorMessage = (error: unknown, fallback: string) => {
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

const initialPaymentForm = (): PaymentForm => ({
  paid_at: today,
  amount: '',
  payment_method: 'Cash',
  transaction_id: '',
  reference_number: '',
  notes: '',
});

const initialCreditForm = (): CreditForm => ({
  credit_date: today,
  reason: '',
  notes: '',
  quantities: {},
  dispositions: {},
});

const initialDealerForm = (dealer?: Dealer | null): DealerForm => ({
  ...emptyDealerForm,
  name: dealer?.name || '',
  company_name: dealer?.company_name || '',
  contact_person: dealer?.contact_person || '',
  mobile: dealer?.mobile || '',
  whatsapp: dealer?.whatsapp || '',
  email: dealer?.email || '',
  gstin: dealer?.gstin || '',
  pan: dealer?.pan || '',
  dealer_type: dealer?.dealer_type || 'Retail Dealer',
  dealer_category: dealer?.dealer_category || '',
  billing_address: dealer?.billing_address || '',
  shipping_address: dealer?.shipping_address || '',
  city: dealer?.city || '',
  district: dealer?.district || '',
  state: dealer?.state || '',
  pincode: dealer?.pincode || '',
  opening_balance: String(dealer?.opening_balance ?? 0),
  credit_limit: String(dealer?.credit_limit ?? 0),
  payment_terms: dealer?.payment_terms || '',
  notes: dealer?.notes || '',
  status: dealer?.status || 'Active',
});

export default function Dealer({
  onBackPress,
  onScrollVisibilityChange,
  onCreateInvoice,
}: DealerProps) {
  const insets = useSafeAreaInsets();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [summary, setSummary] = useState<DealerSummary>(initialSummary);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDealers, setTotalDealers] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [savingDealer, setSavingDealer] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null);
  const [dealerForm, setDealerForm] = useState<DealerForm>(emptyDealerForm);
  const [profile, setProfile] = useState<Dealer | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [creditInvoice, setCreditInvoice] = useState<Invoice | null>(null);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [creditSaving, setCreditSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(initialPaymentForm);
  const [creditForm, setCreditForm] = useState<CreditForm>(initialCreditForm);
  const [cancelInvoiceTarget, setCancelInvoiceTarget] = useState<Invoice | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSaving, setCancelSaving] = useState(false);
  const [printingInvoiceId, setPrintingInvoiceId] = useState<string | null>(null);
  const lastScrollY = React.useRef(0);
  const dealerRequestId = React.useRef(0);
  const profileRequestId = React.useRef(0);
  const firstDealer = totalDealers ? (page - 1) * pageSize + 1 : 0;
  const lastDealer = Math.min(page * pageSize, totalDealers);

  const loadDealers = useCallback(async (refresh = false) => {
    const requestId = ++dealerRequestId.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);
    try {
      const response = await api.get<DealerPage>('/dealers', {
        params: { page, limit: pageSize, search, status },
      });
      if (requestId !== dealerRequestId.current) return;
      if (!Array.isArray(response.data.dealers)) {
        throw new Error('The dealers response did not contain a dealer list.');
      }
      setDealers(response.data.dealers);
      setSummary({ ...initialSummary, ...response.data.summary });
      const nextPage = Math.max(1, toNumber(response.data.pagination?.page, page));
      const nextTotalPages = Math.max(
        1,
        toNumber(response.data.pagination?.totalPages, 1),
      );
      setPage(nextPage);
      setTotalPages(nextTotalPages);
      setTotalDealers(toNumber(response.data.pagination?.total));
    } catch (error: unknown) {
      if (requestId !== dealerRequestId.current) return;
      setLoadError(getErrorMessage(error, 'Could not load dealers.'));
      if (__DEV__) console.warn('[Dealers] Could not load dealers:', error);
    } finally {
      if (requestId === dealerRequestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [page, search, status]);

  useEffect(() => {
    loadDealers();
  }, [loadDealers]);

  const openDealerForm = (dealer?: Dealer) => {
    setEditingDealer(dealer || null);
    setDealerForm(initialDealerForm(dealer));
    setModalOpen(true);
  };

  const updateDealerForm = <K extends keyof DealerForm>(
    field: K,
    value: DealerForm[K],
  ) => setDealerForm(current => ({ ...current, [field]: value }));

  const saveDealer = async () => {
    if (!dealerForm.name.trim()) {
      Alert.alert('Name required', 'Enter the dealer name.');
      return;
    }
    if (!dealerForm.mobile.trim()) {
      Alert.alert('Phone required', 'Enter a dealer phone number.');
      return;
    }
    if (
      toNumber(dealerForm.opening_balance) < 0 ||
      toNumber(dealerForm.credit_limit) < 0
    ) {
      Alert.alert(
        'Invalid amount',
        'Opening balance and credit limit cannot be negative.',
      );
      return;
    }
    setSavingDealer(true);
    try {
      if (editingDealer) {
        await api.put(`/dealers/${editingDealer.id}`, {
          ...dealerForm,
          opening_balance: toNumber(dealerForm.opening_balance),
          credit_limit: toNumber(dealerForm.credit_limit),
        });
      } else {
        await api.post('/dealers', {
          ...dealerForm,
          opening_balance: toNumber(dealerForm.opening_balance),
          credit_limit: toNumber(dealerForm.credit_limit),
        });
      }
      setModalOpen(false);
      Alert.alert(
        editingDealer ? 'Dealer updated' : 'Dealer added',
        editingDealer
          ? 'Dealer details have been updated.'
          : 'The dealer has been added.',
      );
      await loadDealers(true);
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Dealers] Could not save dealer:', error);
      Alert.alert('Save failed', getErrorMessage(error, 'Dealer could not be saved.'));
    } finally {
      setSavingDealer(false);
    }
  };

  const openProfile = async (dealer: Dealer) => {
    const requestId = ++profileRequestId.current;
    setProfileLoading(true);
    setProfile({ ...dealer, invoices: [], ledger: [], credit_notes: [] });
    try {
      const response = await api.get<{ dealer?: Dealer }>(`/dealers/${dealer.id}`);
      if (requestId !== profileRequestId.current) return;
      if (!response.data.dealer) {
        throw new Error('The dealer profile response was invalid.');
      }
      setProfile(response.data.dealer);
    } catch (error: unknown) {
      if (requestId !== profileRequestId.current) return;
      if (__DEV__) console.warn('[Dealers] Could not load dealer history:', error);
      Alert.alert(
        'History unavailable',
        getErrorMessage(error, 'Could not load dealer history.'),
      );
    } finally {
      if (requestId === profileRequestId.current) setProfileLoading(false);
    }
  };

  const removeDealer = (dealer: Dealer) => {
    Alert.alert(
      'Delete dealer?',
      `Delete ${dealer.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/dealers/${dealer.id}`);
              Alert.alert('Dealer deleted', 'The dealer was removed.');
              await loadDealers(true);
            } catch (error: unknown) {
              if (__DEV__) console.warn('[Dealers] Could not delete dealer:', error);
              Alert.alert(
                'Delete failed',
                getErrorMessage(error, 'Dealer could not be deleted.'),
              );
            }
          },
        },
      ],
    );
  };

  const closeProfile = () => {
    profileRequestId.current += 1;
    setProfile(null);
    setProfileLoading(false);
  };

  const exportCsv = async () => {
    setExporting(true);
    let tempPath = '';
    try {
      const allRows: Dealer[] = [];
      let total = 1;
      for (let requestedPage = 1; requestedPage <= total; requestedPage += 1) {
        const response = await api.get<DealerPage>('/dealers', {
          params: {
            page: requestedPage,
            limit: 100,
            search,
            status,
          },
        });
        if (!Array.isArray(response.data.dealers)) {
          throw new Error('The dealers response did not contain a dealer list.');
        }
        allRows.push(...response.data.dealers);
        if (requestedPage === 1) {
          total = Math.max(
            1,
            toNumber(response.data.pagination?.totalPages, 1),
          );
        }
      }
      const quote = (value: unknown) => {
        const text = String(value ?? '');
        const safe =
          typeof value === 'string' && /^[=+\-@]/.test(value)
            ? `'${value}`
            : text;
        return `"${safe.replace(/"/g, '""')}"`;
      };
      const csv = [
        dealerExportColumns.join(','),
        ...allRows.map(dealer =>
          dealerExportColumns.map(column => quote(dealer[column])).join(','),
        ),
      ].join('\r\n');
      const fileName = `dealers-${today}.csv`;
      tempPath = `${CachesDirectoryPath}/${fileName}`;
      await writeFile(tempPath, csv, 'utf8');
      const savedFiles = await saveDocuments({
        sourceUris: [encodeURI(`file://${tempPath}`)],
        mimeType: 'text/csv',
        fileName,
        copy: true,
      });
      if (savedFiles[0].error) throw new Error(savedFiles[0].error);
      Alert.alert(
        'CSV ready',
        `${savedFiles[0].name || fileName} was saved successfully.`,
      );
    } catch (error: unknown) {
      if (
        isErrorWithCode(error) &&
        error.code === errorCodes.OPERATION_CANCELED
      ) {
        return;
      }
      if (__DEV__) console.warn('[Dealers] Export failed:', error);
      Alert.alert('Export failed', getErrorMessage(error, 'Dealer export failed.'));
    } finally {
      if (tempPath) {
        try {
          await unlink(tempPath);
        } catch (error: unknown) {
          if (__DEV__) console.warn('[Dealers] Could not remove export file:', error);
        }
      }
      setExporting(false);
    }
  };

  const openPaymentForm = (invoice: Invoice) => {
    setPaymentInvoice(invoice);
    setPaymentForm({
      ...initialPaymentForm(),
      amount: String(invoice.balance_due ?? ''),
    });
  };

  const savePayment = async () => {
    if (!paymentInvoice) return;
    const amount = Number(paymentForm.amount);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > toNumber(paymentInvoice.balance_due)
    ) {
      Alert.alert(
        'Invalid amount',
        'Enter a payment amount within the remaining balance.',
      );
      return;
    }
    setPaymentSaving(true);
    try {
      await api.post(`/invoices/${paymentInvoice.id}/payments`, {
        ...paymentForm,
        amount,
      });
      setPaymentInvoice(null);
      setPaymentForm(initialPaymentForm());
      Alert.alert('Payment recorded', 'The dealer payment was recorded.');
      if (profile) await openProfile(profile);
      await loadDealers(true);
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Dealers] Payment recording failed:', error);
      Alert.alert(
        'Payment failed',
        getErrorMessage(error, 'Payment could not be recorded.'),
      );
    } finally {
      setPaymentSaving(false);
    }
  };

  const openCreditNote = async (invoice: Invoice) => {
    try {
      const response = await api.get<{ invoice?: Invoice }>(
        `/invoices/${invoice.id}`,
      );
      if (!response.data.invoice) {
        throw new Error('Invoice items could not be loaded.');
      }
      setCreditInvoice(response.data.invoice);
      setCreditForm(initialCreditForm());
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Dealers] Could not load invoice items:', error);
      Alert.alert(
        'Return unavailable',
        getErrorMessage(error, 'Invoice items could not be loaded.'),
      );
    }
  };

  const saveCreditNote = async () => {
    if (!creditInvoice) return;
    if (!creditForm.reason.trim()) {
      Alert.alert('Reason required', 'Enter a reason for the credit note.');
      return;
    }
    const items = Object.entries(creditForm.quantities)
      .filter(([, quantity]) => toNumber(quantity) > 0)
      .map(([invoiceItemId, quantity]) => ({
        invoice_item_id: Number(invoiceItemId),
        quantity: Number(quantity),
        stock_disposition: creditForm.dispositions[invoiceItemId] || 'pending',
      }));
    if (!items.length) {
      Alert.alert(
        'Quantity required',
        'Choose at least one product quantity to return.',
      );
      return;
    }
    setCreditSaving(true);
    try {
      await api.post(`/invoices/${creditInvoice.id}/credit-notes`, {
        credit_date: creditForm.credit_date,
        reason: creditForm.reason.trim(),
        notes: creditForm.notes,
        items,
      });
      setCreditInvoice(null);
      Alert.alert('Credit note issued', 'The dealer balance has been updated.');
      if (profile) await openProfile(profile);
      await loadDealers(true);
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Dealers] Credit note creation failed:', error);
      Alert.alert(
        'Credit note failed',
        getErrorMessage(error, 'Credit note could not be issued.'),
      );
    } finally {
      setCreditSaving(false);
    }
  };

  const finalizeInvoice = (invoice: Invoice) => {
    Alert.alert(
      'Finalize invoice?',
      `Finalize ${invoice.invoice_number}? This validates and deducts its products from available stock.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finalize',
          onPress: async () => {
            try {
              await api.post(`/invoices/${invoice.id}/finalize`);
              Alert.alert(
                'Invoice finalized',
                'Invoice finalized and stock updated.',
              );
              if (profile) await openProfile(profile);
              await loadDealers(true);
            } catch (error: unknown) {
              if (__DEV__) console.warn('[Dealers] Invoice finalization failed:', error);
              Alert.alert(
                'Finalize failed',
                getErrorMessage(error, 'Invoice could not be finalized.'),
              );
            }
          },
        },
      ],
    );
  };

  const cancelInvoice = async () => {
    if (!cancelInvoiceTarget) return;
    if (!cancelReason.trim()) {
      Alert.alert('Reason required', 'Enter a cancellation reason.');
      return;
    }
    setCancelSaving(true);
    try {
      await api.post(`/invoices/${cancelInvoiceTarget.id}/cancel`, {
        reason: cancelReason.trim(),
      });
      setCancelInvoiceTarget(null);
      setCancelReason('');
      Alert.alert('Invoice cancelled', 'Inventory has been updated.');
      if (profile) await openProfile(profile);
      await loadDealers(true);
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Dealers] Invoice cancellation failed:', error);
      Alert.alert(
        'Cancellation failed',
        getErrorMessage(error, 'Invoice could not be cancelled.'),
      );
    } finally {
      setCancelSaving(false);
    }
  };

  const printInvoice = async (invoice: Invoice) => {
    setPrintingInvoiceId(String(invoice.id));
    try {
      const response = await api.get<{ invoice?: Invoice }>(
        `/invoices/${invoice.id}`,
      );
      const data = response.data.invoice;
      if (!data) throw new Error('The invoice response was invalid.');
      const rows = (data.items || [])
        .map(
          item =>
            `<tr><td>${escapeHtml(item.product_name)}</td><td>${escapeHtml(item.hsn_code)}</td><td>${escapeHtml(item.quantity)} ${escapeHtml(item.unit)}</td><td>${formatCurrency(item.unit_price)}</td><td>${formatCurrency(item.taxable_amount)}</td><td>${formatCurrency(item.gst_amount)}</td><td>${formatCurrency(item.line_total)}</td></tr>`,
        )
        .join('');
      const totalTax =
        toNumber(data.cgst_amount) +
        toNumber(data.sgst_amount) +
        toNumber(data.igst_amount);
      const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
        body{font:13px Arial,sans-serif;color:#172033;margin:24px}header,.row{display:flex;justify-content:space-between;gap:20px}
        .card{border:1px solid #ddd;padding:14px;margin:16px 0}table{width:100%;border-collapse:collapse;margin:16px 0}
        th,td{border:1px solid #ddd;padding:7px;text-align:left}th{background:#f4f4f4}.totals{margin-left:auto;width:290px}
        .totals p{display:flex;justify-content:space-between;margin:7px 0}
        </style></head><body><header><div><h1>Tax Invoice</h1><p>${escapeHtml(data.invoice_number)}</p></div>
        <div><b>Invoice date</b><br>${escapeHtml(String(data.invoice_date || '').slice(0, 10))}<br>
        <b>Due date</b><br>${escapeHtml(String(data.due_date || '—').slice(0, 10))}</div></header>
        <section class="card"><b>${escapeHtml(data.customer_name)}</b><p>${escapeHtml(data.billing_address)}</p>
        <p>Mobile: ${escapeHtml(data.mobile)} · GSTIN: ${escapeHtml(data.gstin)}</p>
        <p>Place of supply: ${escapeHtml(data.place_of_supply)}</p></section>
        <table><thead><tr><th>Product</th><th>HSN/SAC</th><th>Qty</th><th>Price</th><th>Taxable</th><th>GST</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
        <section class="totals"><p><span>Subtotal</span><b>${formatCurrency(data.subtotal)}</b></p>
        <p><span>Discount</span><b>${formatCurrency(toNumber(data.item_discount) + toNumber(data.additional_discount))}</b></p>
        <p><span>Taxable amount</span><b>${formatCurrency(data.taxable_amount)}</b></p>
        <p><span>GST</span><b>${formatCurrency(totalTax)}</b></p>
        <p><span>Delivery & installation</span><b>${formatCurrency(toNumber(data.delivery_charges) + toNumber(data.installation_charges))}</b></p>
        <p><span>Grand total</span><b>${formatCurrency(data.grand_total)}</b></p>
        <p><span>Paid / Credited / Balance</span><b>${formatCurrency(data.amount_paid)} / ${formatCurrency(data.credited_amount)} / ${formatCurrency(data.balance_due)}</b></p></section>
        <p>${escapeHtml(data.notes)}</p></body></html>`;
      await RNPrint.print({ html });
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Dealers] Invoice print failed:', error);
      Alert.alert(
        'Print unavailable',
        getErrorMessage(error, 'Invoice could not be loaded for printing.'),
      );
    } finally {
      setPrintingInvoiceId(null);
    }
  };

  const statusOptions: Array<'All' | 'Active' | 'Inactive'> = [
    'All',
    'Active',
    'Inactive',
  ];
  const visibleDealers = useMemo(() => dealers, [dealers]);

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <TopHeader
        pageTitle="Dealers"
        pageSubtitle={`${totalDealers.toLocaleString()} dealer accounts`}
        onBackPress={onBackPress}
      />
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDealers(true)}
            tintColor="#F97316"
            colors={['#F97316']}
          />
        }
        contentContainerClassName="px-4 pb-[255px]"
        style={{ paddingTop: insets.top + 72 }}>
        <View className="mb-4 flex-row flex-wrap gap-2">
          <SummaryCard label="Total dealers" value={summary.total} />
          <SummaryCard label="Active" value={summary.active} />
          <SummaryCard label="Inactive" value={summary.inactive} />
          <SummaryCard label="Invoices" value={summary.invoices} />
        </View>

        <View className="mb-3 rounded-2xl border border-[#FCE6D7] bg-white p-3">
          <View className="flex-row items-center rounded-xl bg-[#F8FAFC] px-3">
            <Search size={18} color="#94A3B8" />
            <TextInput
              value={search}
              onChangeText={value => {
                setPage(1);
                setSearch(value);
              }}
              placeholder="Search name, phone, GSTIN, or code"
              placeholderTextColor="#94A3B8"
              className="ml-2 h-11 flex-1 text-sm text-[#17191C]"
            />
            {search ? (
              <Pressable onPress={() => setSearch('')} className="p-1">
                <X size={17} color="#64748B" />
              </Pressable>
            ) : null}
          </View>
          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row">
              {statusOptions.map(value => (
                <Pressable
                  key={value}
                  onPress={() => {
                    setPage(1);
                    setStatus(value);
                  }}
                  className={`mr-2 rounded-full px-3 py-2 ${status === value ? 'bg-[#1E293B]' : 'bg-[#F1F5F9]'}`}>
                  <Text className={`text-xs font-bold ${status === value ? 'text-white' : 'text-[#475569]'}`}>
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-row">
              <Pressable
                accessibilityLabel="List view"
                onPress={() => setViewMode('list')}
                className={`mr-1 rounded-lg p-2 ${viewMode === 'list' ? 'bg-[#FFF1D6]' : ''}`}>
                <List size={18} color={viewMode === 'list' ? '#C2410C' : '#94A3B8'} />
              </Pressable>
              <Pressable
                accessibilityLabel="Grid view"
                onPress={() => setViewMode('grid')}
                className={`rounded-lg p-2 ${viewMode === 'grid' ? 'bg-[#FFF1D6]' : ''}`}>
                <Grid2X2 size={18} color={viewMode === 'grid' ? '#C2410C' : '#94A3B8'} />
              </Pressable>
            </View>
          </View>
          <View className="mt-3 flex-row gap-2">
            <Pressable
              disabled={exporting || !totalDealers}
              onPress={exportCsv}
              className="flex-1 flex-row items-center justify-center rounded-xl border border-[#E2E8F0] px-3 py-3 disabled:opacity-50">
              <Download size={16} color="#475569" />
              <Text className="ml-2 text-xs font-bold text-[#475569]">
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => openDealerForm()}
              className="flex-1 flex-row items-center justify-center rounded-xl bg-[#F97316] px-3 py-3">
              <Plus size={17} color="white" />
              <Text className="ml-2 text-xs font-bold text-white">Add dealer</Text>
            </Pressable>
          </View>
        </View>

        {loadError ? (
          <View className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="text-sm text-red-700">{loadError}</Text>
            <Pressable onPress={() => loadDealers()} className="mt-2 self-start">
              <Text className="text-xs font-bold text-red-800">Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#F97316" className="py-10" />
        ) : visibleDealers.length === 0 ? (
          <View className="items-center rounded-2xl border border-[#FCE6D7] bg-white p-8">
            <Truck size={30} color="#F97316" />
            <Text className="mt-3 text-sm font-bold text-[#475569]">
              No dealers found.
            </Text>
          </View>
        ) : (
          <View className={viewMode === 'grid' ? 'flex-row flex-wrap justify-between' : ''}>
            {visibleDealers.map(dealer => (
              <DealerCard
                key={dealer.id}
                dealer={dealer}
                compact={viewMode === 'grid'}
                onHistory={() => openProfile(dealer)}
                onCreateInvoice={() => onCreateInvoice?.(dealer.id)}
                onEdit={() => openDealerForm(dealer)}
                onDelete={() => removeDealer(dealer)}
              />
            ))}
          </View>
        )}

        <View className="mt-3 flex-row items-center justify-between rounded-xl bg-white p-3">
          <Text className="text-[11px] text-[#64748B]">
            Showing {firstDealer}–{lastDealer} of {totalDealers}
          </Text>
          <View className="flex-row items-center">
            <Pressable
              disabled={page <= 1 || loading}
              onPress={() => setPage(current => Math.max(1, current - 1))}
              className="rounded-lg p-2 disabled:opacity-40">
              <ChevronLeft size={20} color="#475569" />
            </Pressable>
            <Text className="mx-1 text-xs font-bold text-[#475569]">
              {page} / {totalPages}
            </Text>
            <Pressable
              disabled={page >= totalPages || loading}
              onPress={() => setPage(current => Math.min(totalPages, current + 1))}
              className="rounded-lg p-2 disabled:opacity-40">
              <ChevronRight size={20} color="#475569" />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <DealerFormModal
        visible={modalOpen}
        editing={Boolean(editingDealer)}
        form={dealerForm}
        saving={savingDealer}
        onChange={updateDealerForm}
        onClose={() => {
          if (!savingDealer) setModalOpen(false);
        }}
        onSave={saveDealer}
      />
      <DealerProfileModal
        profile={profile}
        loading={profileLoading}
        printingInvoiceId={printingInvoiceId}
        onClose={closeProfile}
        onCreateInvoice={dealerId => {
          closeProfile();
          onCreateInvoice?.(dealerId);
        }}
        onPayment={openPaymentForm}
        onCreditNote={openCreditNote}
        onPrint={printInvoice}
        onFinalize={finalizeInvoice}
        onCancel={invoice => {
          setCancelInvoiceTarget(invoice);
          setCancelReason('');
        }}
      />
      <PaymentModal
        invoice={paymentInvoice}
        form={paymentForm}
        saving={paymentSaving}
        onChange={(field, value) =>
          setPaymentForm(current => ({ ...current, [field]: value }))
        }
        onClose={() => setPaymentInvoice(null)}
        onSave={savePayment}
      />
      <CreditNoteModal
        invoice={creditInvoice}
        form={creditForm}
        saving={creditSaving}
        onChange={setCreditForm}
        onClose={() => setCreditInvoice(null)}
        onSave={saveCreditNote}
      />
      <Modal
        visible={Boolean(cancelInvoiceTarget)}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelInvoiceTarget(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="rounded-t-3xl bg-white p-5"
            style={{ paddingBottom: Math.max(insets.bottom, 32) }}>
            <Text className="text-lg font-black text-[#17191C]">
              Cancel invoice
            </Text>
            <Text className="mt-1 text-sm text-[#64748B]">
              {cancelInvoiceTarget?.invoice_number}
            </Text>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Cancellation reason"
              placeholderTextColor="#94A3B8"
              multiline
              className="mt-4 min-h-20 rounded-xl border border-[#E2E8F0] p-3 text-sm text-[#17191C]"
            />
            <View className="mt-4 flex-row justify-end">
              <Pressable
                onPress={() => setCancelInvoiceTarget(null)}
                className="mr-2 rounded-xl border border-[#E2E8F0] px-4 py-3">
                <Text className="font-bold text-[#475569]">Back</Text>
              </Pressable>
              <Pressable
                disabled={cancelSaving}
                onPress={cancelInvoice}
                className="rounded-xl bg-red-600 px-4 py-3 disabled:opacity-50">
                <Text className="font-bold text-white">
                  {cancelSaving ? 'Cancelling...' : 'Cancel invoice'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  compact,
}: {
  label: string;
  value: number | string;
  compact?: boolean;
}) {
  return (
    <View className={`flex-1 rounded-xl border border-[#FCE6D7] bg-white p-3 ${compact ? 'min-w-0' : 'min-w-[45%]'}`}>
      <Text className="text-[11px] font-semibold text-[#64748B]">{label}</Text>
      <Text numberOfLines={1} className={`mt-1 font-black text-[#1E293B] ${compact ? 'text-xs' : 'text-xl'}`}>
        {typeof value === 'string' && value.startsWith('₹')
          ? value
          : toNumber(value).toLocaleString()}
      </Text>
    </View>
  );
}

function DealerCard({
  dealer,
  compact,
  onHistory,
  onCreateInvoice,
  onEdit,
  onDelete,
}: {
  dealer: Dealer;
  compact: boolean;
  onHistory: () => void;
  onCreateInvoice: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View
      className={`mb-3 rounded-2xl border border-[#FCE6D7] bg-white p-4 ${compact ? 'w-[48.5%]' : ''}`}>
      <View className="flex-row items-start">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1D6]">
            <Text className="text-base font-black text-[#C2410C]">
              {dealer.name?.charAt(0)?.toUpperCase() || 'D'}
            </Text>
        </View>
        <View className="ml-3 flex-1">
          <Text numberOfLines={1} className="text-sm font-black text-[#17191C]">
            {dealer.name}
          </Text>
          <Text numberOfLines={1} className="mt-1 text-[10px] text-[#64748B]">
            {dealer.dealer_code || 'No code'} · {dealer.company_name || 'No company'}
          </Text>
        </View>
        <Text
          className={`rounded-full px-2 py-1 text-[9px] font-bold ${dealer.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
          {dealer.status || 'Unknown'}
        </Text>
      </View>
      <View className="mt-3 flex-row justify-between rounded-xl bg-[#F8FAFC] p-2.5">
        <View>
          <Text className="text-[9px] text-[#64748B]">Invoices</Text>
          <Text className="mt-1 text-xs font-bold text-[#1E293B]">
            {toNumber(dealer.total_invoices)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[9px] text-[#64748B]">Outstanding</Text>
          <Text className="mt-1 text-xs font-bold text-[#1E293B]">
            {formatCurrency(dealer.outstanding_balance)}
          </Text>
        </View>
      </View>
      <Text numberOfLines={1} className="mt-3 text-xs text-[#475569]">
        {dealer.mobile || 'No phone'} · {dealer.email || 'No email'}
      </Text>
      <Text numberOfLines={1} className="mt-1 text-[11px] text-[#64748B]">
        {[dealer.city, dealer.state].filter(Boolean).join(', ') || 'No location'}
      </Text>
      <View className="mt-3 flex-row flex-wrap gap-2 border-t border-[#F1F5F9] pt-3">
        <ActionButton label="History" onPress={onHistory} />
        <ActionButton label="Invoice" primary onPress={onCreateInvoice} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${dealer.name}`}
          onPress={onEdit}
          className="items-center justify-center rounded-lg border border-[#E2E8F0] px-3 py-2">
          <Text className="text-[10px] font-bold text-[#475569]">Edit</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${dealer.name}`}
          onPress={onDelete}
          className="items-center justify-center rounded-lg bg-red-50 px-3 py-2">
          <Trash2 size={14} color="#DC2626" />
        </Pressable>
      </View>
    </View>
  );
}

function ActionButton({
  label,
  primary,
  onPress,
}: {
  label: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center rounded-lg px-2 py-2 ${primary ? 'bg-[#F97316]' : 'border border-[#FED7AA] bg-[#FFF7ED]'}`}>
      <Text className={`text-[10px] font-bold ${primary ? 'text-white' : 'text-[#C2410C]'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function DealerFormModal({
  visible,
  editing,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  editing: boolean;
  form: DealerForm;
  saving: boolean;
  onChange: <K extends keyof DealerForm>(field: K, value: DealerForm[K]) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const insets = useSafeAreaInsets();
  const fields: Array<[keyof DealerForm, string, string]> = [
    ['name', 'Dealer name *', 'Enter dealer name'],
    ['company_name', 'Company name', 'Enter company name'],
    ['contact_person', 'Contact person', 'Enter contact person'],
    ['mobile', 'Mobile number *', 'Enter mobile number'],
    ['whatsapp', 'WhatsApp number', 'Enter WhatsApp number'],
    ['email', 'Email address', 'name@example.com'],
    ['gstin', 'GSTIN', 'Enter GSTIN'],
    ['pan', 'PAN', 'Enter PAN'],
    ['dealer_category', 'Dealer category', 'e.g. Furniture'],
    ['city', 'City', 'Enter city'],
    ['district', 'District', 'Enter district'],
    ['state', 'State', 'Enter state'],
    ['pincode', 'PIN code', 'Enter PIN code'],
    ['opening_balance', 'Opening balance (₹)', '0.00'],
    ['credit_limit', 'Credit limit (₹)', '0.00'],
    ['payment_terms', 'Payment terms', 'e.g. Due on receipt'],
  ];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View
          className="max-h-[92%] rounded-t-3xl bg-white px-4 pt-5"
          style={{ paddingBottom: Math.max(insets.bottom, 32) }}>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-black text-[#17191C]">
              {editing ? 'Edit dealer' : 'Add dealer'}
            </Text>
            <Pressable onPress={onClose} className="p-2">
              <X size={20} color="#475569" />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {fields.map(([field, label, placeholder]) => (
              <View key={field} className="mb-2">
                <Text className="mb-1 text-xs font-bold text-[#64748B]">
                  {label}
                </Text>
                <TextInput
                  value={form[field]}
                  onChangeText={value => onChange(field, value)}
                  placeholder={placeholder}
                  placeholderTextColor="#94A3B8"
                  accessibilityLabel={label}
                  keyboardType={
                    field === 'opening_balance' || field === 'credit_limit'
                      ? 'decimal-pad'
                      : field === 'mobile' || field === 'whatsapp' || field === 'pincode'
                        ? 'phone-pad'
                        : field === 'email'
                          ? 'email-address'
                          : 'default'
                  }
                  className="min-h-11 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#17191C]"
                />
              </View>
            ))}
            <Text className="mb-2 mt-1 text-xs font-bold text-[#64748B]">Dealer type</Text>
            <View className="mb-3 flex-row flex-wrap">
              {[
                'Retail Dealer',
                'Wholesale Dealer',
                'Distributor',
                'Furniture Reseller',
                'Corporate Dealer',
                'Franchise Dealer',
              ].map(value => (
                <Pressable
                  key={value}
                  onPress={() => onChange('dealer_type', value)}
                  className={`mb-2 mr-2 rounded-full px-3 py-2 ${form.dealer_type === value ? 'bg-[#1E293B]' : 'bg-[#F1F5F9]'}`}>
                  <Text className={`text-xs font-bold ${form.dealer_type === value ? 'text-white' : 'text-[#475569]'}`}>
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View className="mb-2">
              <Text className="mb-1 text-xs font-bold text-[#64748B]">
                Billing address
              </Text>
              <TextInput
                value={form.billing_address}
                onChangeText={value => onChange('billing_address', value)}
                placeholder="Enter billing address"
                placeholderTextColor="#94A3B8"
                accessibilityLabel="Billing address"
                multiline
                textAlignVertical="top"
                className="min-h-20 rounded-xl border border-[#E2E8F0] px-3 py-3 text-sm text-[#17191C]"
              />
            </View>
            <View className="mb-2">
              <Text className="mb-1 text-xs font-bold text-[#64748B]">
                Shipping address
              </Text>
              <TextInput
                value={form.shipping_address}
                onChangeText={value => onChange('shipping_address', value)}
                placeholder="Enter shipping address"
                placeholderTextColor="#94A3B8"
                accessibilityLabel="Shipping address"
                multiline
                textAlignVertical="top"
                className="min-h-20 rounded-xl border border-[#E2E8F0] px-3 py-3 text-sm text-[#17191C]"
              />
            </View>
            <View className="mb-3">
              <Text className="mb-1 text-xs font-bold text-[#64748B]">Notes</Text>
              <TextInput
                value={form.notes}
                onChangeText={value => onChange('notes', value)}
                placeholder="Add any notes about this dealer"
                placeholderTextColor="#94A3B8"
                accessibilityLabel="Dealer notes"
                multiline
                textAlignVertical="top"
                className="min-h-16 rounded-xl border border-[#E2E8F0] px-3 py-3 text-sm text-[#17191C]"
              />
            </View>
            <Text className="mb-2 mt-1 text-xs font-bold text-[#64748B]">Status</Text>
            <View className="mb-3 flex-row">
              {['Active', 'Inactive'].map(value => (
                <Pressable
                  key={value}
                  onPress={() => onChange('status', value)}
                  className={`mr-2 flex-row items-center rounded-full px-3 py-2 ${form.status === value ? 'bg-[#1E293B]' : 'bg-[#F1F5F9]'}`}>
                  {form.status === value ? <Check size={13} color="white" /> : null}
                  <Text className={`ml-1 text-xs font-bold ${form.status === value ? 'text-white' : 'text-[#475569]'}`}>
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View className="mt-2 flex-row">
            <Pressable
              onPress={onClose}
              className="mr-2 flex-1 items-center rounded-xl border border-[#E2E8F0] p-3">
              <Text className="font-bold text-[#475569]">Cancel</Text>
            </Pressable>
            <Pressable
              disabled={saving}
              onPress={onSave}
              className="flex-1 items-center rounded-xl bg-[#F97316] p-3 disabled:opacity-50">
              <Text className="font-bold text-white">
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Add dealer'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DealerProfileModal({
  profile,
  loading,
  printingInvoiceId,
  onClose,
  onCreateInvoice,
  onPayment,
  onCreditNote,
  onPrint,
  onFinalize,
  onCancel,
}: {
  profile: Dealer | null;
  loading: boolean;
  printingInvoiceId: string | null;
  onClose: () => void;
  onCreateInvoice: (dealerId: number | string) => void;
  onPayment: (invoice: Invoice) => void;
  onCreditNote: (invoice: Invoice) => void;
  onPrint: (invoice: Invoice) => void;
  onFinalize: (invoice: Invoice) => void;
  onCancel: (invoice: Invoice) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={Boolean(profile)}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View
          className="max-h-[92%] rounded-t-3xl bg-[#F7F8FA]"
          style={{ paddingBottom: Math.max(insets.bottom, 32) }}>
          <View className="flex-row items-center justify-between rounded-t-3xl border-b border-[#E2E8F0] bg-white px-4 py-4">
            <View className="mr-2 flex-1">
              <Text numberOfLines={1} className="text-lg font-black text-[#17191C]">
                {profile?.name || 'Dealer history'}
              </Text>
              <Text numberOfLines={1} className="mt-1 text-xs text-[#64748B]">
                {profile?.dealer_code || ''} · {profile?.mobile || ''} · {profile?.gstin || 'No GSTIN'}
              </Text>
            </View>
            {profile ? (
              <Pressable
                onPress={() => onCreateInvoice(profile.id)}
                className="mr-2 rounded-lg bg-[#F97316] px-3 py-2">
                <Text className="text-xs font-bold text-white">New invoice</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} className="p-2">
              <X size={20} color="#475569" />
            </Pressable>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color="#F97316" className="py-12" />
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerClassName="px-4 pb-8 pt-4">
              <View className="mb-4 flex-row gap-2">
                <SummaryCard label="Purchases" value={formatCurrency(profile?.total_purchases)} compact />
                <SummaryCard label="Outstanding" value={formatCurrency(profile?.outstanding_balance)} compact />
                <SummaryCard label="Paid" value={formatCurrency(profile?.total_paid)} compact />
              </View>
              <Text className="mb-2 text-sm font-black text-[#1E293B]">Invoices</Text>
              {profile?.invoices?.length ? (
                profile.invoices.map(invoice => (
                  <View key={invoice.id} className="mb-2 rounded-xl border border-[#E2E8F0] bg-white p-3">
                    <View className="flex-row justify-between">
                      <Text className="text-sm font-black text-[#17191C]">{invoice.invoice_number}</Text>
                      <Text className="text-[10px] font-bold text-[#64748B]">{invoice.status}</Text>
                    </View>
                    <Text className="mt-1 text-[11px] text-[#64748B]">
                      {String(invoice.invoice_date || '').slice(0, 10)} · Total {formatCurrency(invoice.grand_total)}
                    </Text>
                    <Text className="mt-1 text-[11px] text-[#64748B]">
                      Paid {formatCurrency(invoice.amount_paid)} · Credit {formatCurrency(invoice.credited_amount)} · Due {formatCurrency(invoice.balance_due)}
                    </Text>
                    <View className="mt-3 flex-row flex-wrap gap-2">
                      <MiniAction label={printingInvoiceId === String(invoice.id) ? 'Printing...' : 'Print'} onPress={() => onPrint(invoice)} />
                      {invoice.status === 'Draft' ? (
                        <MiniAction label="Finalize" primary onPress={() => onFinalize(invoice)} />
                      ) : null}
                      {toNumber(invoice.balance_due) > 0 &&
                      invoice.status !== 'Cancelled' &&
                      invoice.status !== 'Draft' ? (
                        <>
                          <MiniAction label="Payment" primary onPress={() => onPayment(invoice)} />
                          <MiniAction label="Return" onPress={() => onCreditNote(invoice)} />
                        </>
                      ) : null}
                      {invoice.status !== 'Cancelled' &&
                      toNumber(invoice.amount_paid) === 0 &&
                      toNumber(invoice.credited_amount) === 0 ? (
                        <MiniAction label="Cancel" danger onPress={() => onCancel(invoice)} />
                      ) : null}
                    </View>
                  </View>
                ))
              ) : (
                <EmptyMessage text="No invoices recorded." />
              )}
              <Text className="mb-2 mt-4 text-sm font-black text-[#1E293B]">Dealer ledger</Text>
              {profile?.ledger?.length ? (
                profile.ledger.map(entry => (
                  <View key={entry.id} className="mb-2 rounded-xl border border-[#E2E8F0] bg-white p-3">
                    <View className="flex-row justify-between">
                      <Text className="text-xs font-bold text-[#17191C]">{entry.transaction_type || 'Transaction'}</Text>
                      <Text className="text-[10px] text-[#64748B]">{String(entry.transaction_date).slice(0, 10)}</Text>
                    </View>
                    <Text className="mt-1 text-[11px] text-[#64748B]">
                      {entry.description || entry.reference_number || '—'}
                    </Text>
                    <Text className="mt-1 text-[11px] text-[#64748B]">
                      Debit {formatCurrency(entry.debit)} · Credit {formatCurrency(entry.credit)} · Balance {formatCurrency(entry.balance)}
                    </Text>
                  </View>
                ))
              ) : (
                <EmptyMessage text="No ledger activity recorded." />
              )}
              <Text className="mb-2 mt-4 text-sm font-black text-[#1E293B]">Credit notes / returns</Text>
              {profile?.credit_notes?.length ? (
                profile.credit_notes.map(note => (
                  <View key={note.id} className="mb-2 rounded-xl border border-[#E2E8F0] bg-white p-3">
                    <Text className="text-xs font-bold text-[#17191C]">{note.credit_note_number}</Text>
                    <Text className="mt-1 text-[11px] text-[#64748B]">
                      {note.invoice_number || ''} · {String(note.credit_date).slice(0, 10)} · {note.reason || ''}
                    </Text>
                    <Text className="mt-1 text-xs font-bold text-[#1E293B]">{formatCurrency(note.amount)}</Text>
                  </View>
                ))
              ) : (
                <EmptyMessage text="No credit notes issued." />
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function MiniAction({
  label,
  primary,
  danger,
  onPress,
}: {
  label: string;
  primary?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-lg px-2.5 py-2 ${primary ? 'bg-[#F97316]' : danger ? 'bg-red-50' : 'border border-[#E2E8F0] bg-white'}`}>
      <Text className={`text-[10px] font-bold ${primary ? 'text-white' : danger ? 'text-red-700' : 'text-[#475569]'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <View className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-4">
      <Text className="text-center text-xs text-[#64748B]">{text}</Text>
    </View>
  );
}

function PaymentModal({
  invoice,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  invoice: Invoice | null;
  form: PaymentForm;
  saving: boolean;
  onChange: (field: keyof PaymentForm, value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={Boolean(invoice)}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View
          className="max-h-[90%] rounded-t-3xl bg-white px-4 pt-5"
          style={{ paddingBottom: Math.max(insets.bottom, 32) }}>
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-black text-[#17191C]">Record payment</Text>
              <Text className="mt-1 text-xs text-[#64748B]">
                {invoice?.invoice_number} · Remaining {formatCurrency(invoice?.balance_due)}
              </Text>
            </View>
            <Pressable onPress={onClose} className="p-2"><X size={20} color="#475569" /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <ModalField label="Amount *" value={form.amount} onChangeText={value => onChange('amount', value)} numeric />
            <ModalField label="Payment date * (YYYY-MM-DD)" value={form.paid_at} onChangeText={value => onChange('paid_at', value)} />
            <Text className="mb-2 mt-1 text-xs font-bold text-[#64748B]">Method</Text>
            <View className="mb-3 flex-row flex-wrap">
              {paymentMethods.map(method => (
                <Pressable
                  key={method}
                  onPress={() => onChange('payment_method', method)}
                  className={`mb-2 mr-2 rounded-full px-3 py-2 ${form.payment_method === method ? 'bg-[#1E293B]' : 'bg-[#F1F5F9]'}`}>
                  <Text className={`text-xs font-bold ${form.payment_method === method ? 'text-white' : 'text-[#475569]'}`}>{method}</Text>
                </Pressable>
              ))}
            </View>
            <ModalField label="Transaction ID" value={form.transaction_id} onChangeText={value => onChange('transaction_id', value)} />
            <ModalField label="Reference number" value={form.reference_number} onChangeText={value => onChange('reference_number', value)} />
            <ModalField label="Notes" value={form.notes} onChangeText={value => onChange('notes', value)} multiline />
          </ScrollView>
          <ModalActions
            saving={saving}
            saveLabel="Record payment"
            onClose={onClose}
            onSave={onSave}
          />
        </View>
      </View>
    </Modal>
  );
}

function CreditNoteModal({
  invoice,
  form,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  invoice: Invoice | null;
  form: CreditForm;
  saving: boolean;
  onChange: React.Dispatch<React.SetStateAction<CreditForm>>;
  onClose: () => void;
  onSave: () => void;
}) {
  const insets = useSafeAreaInsets();
  const items = invoice?.items || [];
  const estimate = items.reduce((total, item) => {
    const quantity = toNumber(form.quantities[String(item.id)]);
    const unitTotal = toNumber(item.line_total) / Math.max(1, toNumber(item.quantity));
    return total + unitTotal * quantity;
  }, 0);
  return (
    <Modal
      visible={Boolean(invoice)}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View
          className="max-h-[92%] rounded-t-3xl bg-white px-4 pt-5"
          style={{ paddingBottom: Math.max(insets.bottom, 32) }}>
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-black text-[#17191C]">Credit note / return</Text>
              <Text className="mt-1 text-xs text-[#64748B]">{invoice?.invoice_number}</Text>
            </View>
            <Pressable onPress={onClose} className="p-2"><X size={20} color="#475569" /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <ModalField label="Credit date * (YYYY-MM-DD)" value={form.credit_date} onChangeText={value => onChange(current => ({ ...current, credit_date: value }))} />
            <ModalField label="Reason *" value={form.reason} onChangeText={value => onChange(current => ({ ...current, reason: value }))} />
            {items.map(item => {
              const remaining = toNumber(item.remaining_quantity ?? item.quantity);
              return (
                <View key={item.id} className="mb-3 rounded-xl border border-[#E2E8F0] p-3">
                  <Text className="text-sm font-bold text-[#17191C]">{item.product_name}</Text>
                  <Text className="mt-1 text-[11px] text-[#64748B]">Sold {item.quantity} · Returnable {remaining}</Text>
                  <ModalField
                    label="Return quantity"
                    value={form.quantities[String(item.id)] || ''}
                    onChangeText={value => {
                      const quantity = Math.max(
                        0,
                        Math.min(remaining, Math.floor(toNumber(value))),
                      );
                      onChange(current => ({
                        ...current,
                        quantities: {
                          ...current.quantities,
                          [String(item.id)]: quantity ? String(quantity) : '',
                        },
                      }));
                    }}
                    numeric
                  />
                  <Text className="mb-2 text-[11px] font-bold text-[#64748B]">Stock disposition</Text>
                  <View className="flex-row flex-wrap">
                    {[
                      ['pending', 'Pending'],
                      ['sellable', 'Sellable'],
                      ['damaged', 'Damaged'],
                      ['none', 'No stock change'],
                    ].map(([value, label]) => (
                      <Pressable
                        key={value}
                        onPress={() =>
                          onChange(current => ({
                            ...current,
                            dispositions: {
                              ...current.dispositions,
                              [String(item.id)]: value,
                            },
                          }))
                        }
                        className={`mb-2 mr-2 rounded-full px-2.5 py-1.5 ${(form.dispositions[String(item.id)] || 'pending') === value ? 'bg-[#1E293B]' : 'bg-[#F1F5F9]'}`}>
                        <Text className={`text-[10px] font-bold ${(form.dispositions[String(item.id)] || 'pending') === value ? 'text-white' : 'text-[#475569]'}`}>{label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            })}
            <ModalField label="Notes" value={form.notes} onChangeText={value => onChange(current => ({ ...current, notes: value }))} multiline />
            <View className="mb-3 rounded-xl bg-[#FFF7ED] p-3">
              <Text className="text-xs font-bold text-[#C2410C]">Estimated credit value: {formatCurrency(estimate)}</Text>
            </View>
            {estimate > toNumber(invoice?.balance_due) ? (
              <Text className="mb-3 text-xs font-semibold text-red-700">
                Return value cannot exceed this invoice’s unpaid balance.
              </Text>
            ) : null}
          </ScrollView>
          <ModalActions
            saving={saving}
            saveLabel="Issue credit note"
            disabled={!items.length || estimate <= 0 || estimate > toNumber(invoice?.balance_due)}
            onClose={onClose}
            onSave={onSave}
          />
        </View>
      </View>
    </Modal>
  );
}

function ModalField({
  label,
  value,
  onChangeText,
  numeric,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  numeric?: boolean;
  multiline?: boolean;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-xs font-bold text-[#64748B]">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`rounded-xl border border-[#E2E8F0] px-3 text-sm text-[#17191C] ${multiline ? 'min-h-20 py-3' : 'h-11'}`}
      />
    </View>
  );
}

function ModalActions({
  saving,
  saveLabel,
  disabled,
  onClose,
  onSave,
}: {
  saving: boolean;
  saveLabel: string;
  disabled?: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <View className="mt-3 flex-row">
      <Pressable
        onPress={onClose}
        className="mr-2 flex-1 items-center rounded-xl border border-[#E2E8F0] p-3">
        <Text className="font-bold text-[#475569]">Cancel</Text>
      </Pressable>
      <Pressable
        disabled={saving || disabled}
        onPress={onSave}
        className="flex-1 items-center rounded-xl bg-[#F97316] p-3 disabled:opacity-50">
        <Text className="font-bold text-white">{saving ? 'Saving...' : saveLabel}</Text>
      </Pressable>
    </View>
  );
}
