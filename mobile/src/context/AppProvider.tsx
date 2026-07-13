import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { AppSettings, Contact, Product, SharePayload, Snapshot } from '../types';
import {
  deleteContact as dbDeleteContact,
  exportAllData,
  getAllContacts,
  getAllProducts,
  getYesterdaySnapshot,
  importAllData,
  saveAllProducts,
  saveContact,
  saveSnapshot,
  updateProduct,
} from '../db/database';
import { parseExcelBuffer } from '../lib/excel';
import {
  DEFAULT_SETTINGS,
  getTodayFormatted,
  loadSettings,
  saveSettings,
} from '../lib/settings';
import { copyText, openWhatsApp } from '../lib/share';
import { generateId, groupProductsForDisplay, parsePrice, productKey, todayKey } from '../lib/utils';
import {
  buildBrandMessage,
  buildCustomGroupMessage,
  buildFullMessage,
  buildSelectedMessage,
} from '../lib/preview';

type ToastKind = 'success' | 'error' | 'info';
type Toast = { message: string; type: ToastKind } | null;

type UndoItem = { id: string; price: number; previousPrice: number | null };

type AppContextValue = {
  ready: boolean;
  products: Product[];
  settings: AppSettings;
  contacts: Contact[];
  selectedIds: Set<string>;
  toast: Toast;
  displayDate: string;
  groups: ReturnType<typeof groupProductsForDisplay>;
  setSettings: (patch: Partial<AppSettings>) => Promise<void>;
  showToast: (message: string, type?: ToastKind) => void;
  uploadExcel: () => Promise<void>;
  updatePrice: (id: string, price: number) => Promise<void>;
  undoLast: () => Promise<void>;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  saveDailySnapshot: () => Promise<void>;
  refreshContacts: () => Promise<void>;
  addContact: (name: string, phone: string) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  importContacts: (items: Array<{ name: string; phone: string }>) => Promise<void>;
  getSharePayload: (mode: ShareMode, extra?: string) => SharePayload | null;
  handleShareAction: (mode: ShareMode, action: 'copy' | 'whatsapp', phone?: string, extra?: string) => Promise<void>;
  exportJsonBackup: () => Promise<void>;
  importJsonBackup: () => Promise<void>;
  replaceProducts: (list: Product[]) => Promise<void>;
  toggleBrandCollapsed: (brand: string) => Promise<void>;
  toggleSectionCollapsed: (sectionId: string) => Promise<void>;
};

export type ShareMode =
  | { type: 'brand'; brand: string }
  | { type: 'group'; key: string }
  | { type: 'selected' }
  | { type: 'full' };

const AppContext = createContext<AppContextValue | null>(null);

const storage = {
  getItem: (k: string) => AsyncStorage.getItem(k),
  setItem: (k: string, v: string) => AsyncStorage.setItem(k, v),
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<UndoItem[]>([]);
  const [toast, setToast] = useState<Toast>(null);

  const displayDate = useMemo(() => getTodayFormatted(settings), [settings]);
  const groups = useMemo(() => groupProductsForDisplay(products, settings), [products, settings]);

  const showToast = useCallback((message: string, type: ToastKind = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const persistProducts = useCallback(async (list: Product[]) => {
    setProducts(list);
    await saveAllProducts(list);
  }, []);

  const setSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const next = await saveSettings(storage, patch);
    setSettingsState(next);
  }, []);

  const refreshContacts = useCallback(async () => {
    setContacts(await getAllContacts());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [loadedSettings, loadedProducts, loadedContacts, yesterday] = await Promise.all([
          loadSettings(storage),
          getAllProducts(),
          getAllContacts(),
          getYesterdaySnapshot(),
        ]);
        setSettingsState(loadedSettings);
        let list = loadedProducts;
        if (yesterday?.products?.length) {
          const priceMap = new Map(yesterday.products.map((p) => [productKey(p), p.price]));
          list = list.map((p) => {
            const prev = priceMap.get(productKey(p));
            return prev != null && prev > 0 ? { ...p, price: prev, previousPrice: prev } : p;
          });
        }
        setProducts(list);
        setContacts(loadedContacts);
      } catch (e) {
        console.error(e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const uploadExcel = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    try {
      const uri = result.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const { products: parsed, meta } = await parseExcelBuffer(bytes.buffer);
      await persistProducts(parsed);
      showToast(`Imported ${parsed.length} models (${meta.format})`);
      if (meta.missingPrices > 0) {
        setTimeout(() => showToast(`${meta.missingPrices} without price`, 'info'), 2600);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import failed', 'error');
    }
  }, [persistProducts, showToast]);

  const updatePrice = useCallback(
    async (id: string, price: number) => {
      const product = products.find((p) => p.id === id);
      if (!product) return;
      const next = { ...product, price, previousPrice: product.price, updatedAt: Date.now() };
      setUndoStack((s) => [...s.slice(-30), { id, price: product.price, previousPrice: product.previousPrice }]);
      const list = products.map((p) => (p.id === id ? next : p));
      setProducts(list);
      await updateProduct(next);
    },
    [products],
  );

  const undoLast = useCallback(async () => {
    const last = undoStack[undoStack.length - 1];
    if (!last) {
      showToast('Nothing to undo', 'info');
      return;
    }
    const product = products.find((p) => p.id === last.id);
    if (!product) return;
    const next = { ...product, price: last.price, previousPrice: last.previousPrice, updatedAt: Date.now() };
    const list = products.map((p) => (p.id === last.id ? next : p));
    setProducts(list);
    await updateProduct(next);
    setUndoStack((s) => s.slice(0, -1));
    showToast('Undone');
  }, [products, showToast, undoStack]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const saveDailySnapshot = useCallback(async () => {
    await saveSnapshot(products, settings);
    showToast('Snapshot saved');
  }, [products, settings, showToast]);

  const addContact = useCallback(
    async (name: string, phone: string) => {
      const c: Contact = { id: generateId(), name: name.trim(), phone: phone.trim(), createdAt: Date.now() };
      await saveContact(c);
      await refreshContacts();
      showToast('Contact added');
    },
    [refreshContacts, showToast],
  );

  const removeContact = useCallback(
    async (id: string) => {
      await dbDeleteContact(id);
      await refreshContacts();
      showToast('Contact removed');
    },
    [refreshContacts, showToast],
  );

  const importContacts = useCallback(
    async (items: Array<{ name: string; phone: string }>) => {
      for (const item of items) {
        if (!item.phone) continue;
        await saveContact({
          id: generateId(),
          name: item.name || item.phone,
          phone: item.phone,
          createdAt: Date.now(),
        });
      }
      await refreshContacts();
      showToast(`Imported ${items.length} contacts`);
    },
    [refreshContacts, showToast],
  );

  const getSharePayload = useCallback(
    (mode: ShareMode, extra?: string): SharePayload | null => {
      let text = '';
      let label = '';
      if (mode.type === 'brand') {
        text = buildBrandMessage(mode.brand, products, settings, {
          date: displayDate,
          includeHeader: false,
          includeFooter: false,
        });
        label = mode.brand;
      } else if (mode.type === 'group') {
        const group = groups.find((g) => g.key === mode.key);
        if (!group) return null;
        text = buildCustomGroupMessage(group, settings, displayDate, false, false);
        label = group.title;
      } else if (mode.type === 'selected') {
        text = buildSelectedMessage(products, selectedIds, settings, displayDate, {
          includeHeader: false,
          includeFooter: false,
        });
        label = `Selected (${selectedIds.size})`;
      } else {
        text = buildFullMessage(products, settings, displayDate);
        label = 'Full list';
      }
      if (!text.trim()) return null;
      return { text, label: extra || label };
    },
    [displayDate, groups, products, selectedIds, settings],
  );

  const handleShareAction = useCallback(
    async (mode: ShareMode, action: 'copy' | 'whatsapp', phone?: string) => {
      const payload = getSharePayload(mode);
      if (!payload) {
        showToast('Nothing to share', 'info');
        return;
      }
      if (action === 'copy') {
        await copyText(payload.text);
        showToast('Copied');
        return;
      }
      if (!phone) {
        showToast('Pick a contact', 'info');
        return;
      }
      await openWhatsApp(phone, payload.text);
    },
    [getSharePayload, showToast],
  );

  const exportJsonBackup = useCallback(async () => {
    const data = await exportAllData(products, settings);
    const path = `${FileSystem.cacheDirectory}price-maker-backup-${todayKey()}.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(data, null, 2));
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: 'application/json' });
    }
    showToast('Backup ready to share');
  }, [products, settings, showToast]);

  const importJsonBackup = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const raw = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const data = JSON.parse(raw);
    await importAllData(data);
    const list = await getAllProducts();
    setProducts(list);
    await refreshContacts();
    showToast('Backup restored');
  }, [refreshContacts, showToast]);

  const replaceProducts = useCallback(
    async (list: Product[]) => {
      await persistProducts(list);
    },
    [persistProducts],
  );

  const toggleBrandCollapsed = useCallback(
    async (brand: string) => {
      const collapsed = { ...settings.collapsedBrands, [brand]: !settings.collapsedBrands[brand] };
      await setSettings({ collapsedBrands: collapsed });
    },
    [setSettings, settings.collapsedBrands],
  );

  const toggleSectionCollapsed = useCallback(
    async (sectionId: string) => {
      const collapsed = { ...settings.collapsedSections, [sectionId]: !settings.collapsedSections[sectionId] };
      await setSettings({ collapsedSections: collapsed });
    },
    [setSettings, settings.collapsedSections],
  );

  const value: AppContextValue = {
    ready,
    products,
    settings,
    contacts,
    selectedIds,
    toast,
    displayDate,
    groups,
    setSettings,
    showToast,
    uploadExcel,
    updatePrice,
    undoLast,
    toggleSelect,
    clearSelection,
    saveDailySnapshot,
    refreshContacts,
    addContact,
    removeContact,
    importContacts,
    getSharePayload,
    handleShareAction,
    exportJsonBackup,
    importJsonBackup,
    replaceProducts,
    toggleBrandCollapsed,
    toggleSectionCollapsed,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function parsePriceInput(text: string) {
  return parsePrice(text);
}
