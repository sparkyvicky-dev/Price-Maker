import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { AppSettings, Contact, Product, SharePayload, Snapshot } from '../types';
import {
  deleteContact as dbDeleteContact,
  exportAllData,
  getAllContacts,
  getAllProducts,
  getDatabase,
  getSnapshotDateKeys,
  getYesterdaySnapshot,
  importAllData,
  saveAllProducts,
  saveContact,
  saveContactsBulk,
  saveSnapshot,
  updateProduct,
} from '../db/database';
import { parseExcelBuffer } from '../lib/excel';
import {
  DEFAULT_SETTINGS,
  getTodayFormatted,
  loadSettings,
  saveSettings,
  invalidateSettingsCache,
  toggleFavoriteBrand as toggleFavoriteBrandSetting,
} from '../lib/settings';
import { copyText, openWhatsApp, shareTextViaApps, normalizePhone } from '../lib/share';
import { generateId, groupProductsForDisplay, parsePrice, productKey, todayKey } from '../lib/utils';
import {
  buildBrandMessage,
  buildCustomGroupMessage,
  buildFullMessage,
  buildSelectedMessage,
} from '../lib/preview';
import * as Haptics from 'expo-haptics';

type ToastKind = 'success' | 'error' | 'info';
type Toast = { message: string; type: ToastKind } | null;

type UndoEntry = { id: string; price: number; previousPrice: number | null };
type UndoBatch = UndoEntry[];

type AppContextValue = {
  ready: boolean;
  products: Product[];
  settings: AppSettings;
  contacts: Contact[];
  selectedIds: Set<string>;
  selectedCount: number;
  toast: Toast;
  displayDate: string;
  groups: ReturnType<typeof groupProductsForDisplay>;
  undoCount: number;
  setSettings: (patch: Partial<AppSettings>) => Promise<void>;
  showToast: (message: string, type?: ToastKind) => void;
  dismissToast: () => void;
  uploadExcel: () => Promise<void>;
  updatePrice: (id: string, price: number) => Promise<void>;
  bulkSetPrices: (ids: string[], price: number) => Promise<void>;
  undoLast: () => Promise<void>;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  saveDailySnapshot: () => Promise<void>;
  refreshContacts: () => Promise<void>;
  addContact: (name: string, phone: string) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  importContacts: (items: Array<{ name: string; phone: string }>) => Promise<void>;
  getSharePayload: (mode: ShareMode, extra?: string) => SharePayload | null;
  handleShareAction: (
    mode: ShareMode,
    action: 'copy' | 'whatsapp' | 'apps',
    phone?: string,
    extra?: string,
  ) => Promise<boolean>;
  exportJsonBackup: () => Promise<void>;
  importJsonBackup: () => Promise<void>;
  replaceProducts: (list: Product[]) => Promise<void>;
  toggleBrandCollapsed: (brand: string) => Promise<void>;
  toggleSectionCollapsed: (sectionId: string) => Promise<void>;
  toggleFavoriteBrand: (brand: string) => Promise<void>;
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

function applyYesterdayBaselines(list: Product[], yesterdayProducts?: Product[] | null): Product[] {
  if (!yesterdayProducts?.length) return list;
  const priceMap = new Map(yesterdayProducts.map((p) => [productKey(p), p.price]));
  return list.map((p) => {
    const prev = priceMap.get(productKey(p));
    if (prev == null || prev <= 0) return p;
    return { ...p, previousPrice: prev };
  });
}

/** Keep manually set prices. Excel may add models / fill blanks only — never overwrite a set price. */
export function mergeImportedProducts(existing: Product[], incoming: Product[]): Product[] {
  const byKey = new Map(existing.map((p) => [productKey(p), p]));
  const merged: Product[] = [];
  const seen = new Set<string>();

  for (const next of incoming) {
    const key = productKey(next);
    seen.add(key);
    const prev = byKey.get(key);
    if (!prev) {
      merged.push(next);
      continue;
    }
    const keepPrice = prev.price > 0;
    merged.push({
      ...next,
      id: prev.id,
      price: keepPrice ? prev.price : next.price,
      previousPrice: next.previousPrice ?? prev.previousPrice,
      updatedAt: keepPrice ? prev.updatedAt : next.updatedAt,
      sectionId: next.sectionId ?? prev.sectionId,
    });
  }

  // Keep models that are already priced even if missing from this Excel file.
  for (const prev of existing) {
    const key = productKey(prev);
    if (seen.has(key)) continue;
    if (prev.price > 0) merged.push(prev);
  }

  return merged;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<UndoBatch[]>([]);
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayDate = useMemo(() => getTodayFormatted(settings), [settings]);
  const groups = useMemo(() => groupProductsForDisplay(products, settings), [products, settings]);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback((message: string, type: ToastKind = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    // Short-lived — swipe anywhere to dismiss sooner
    toastTimer.current = setTimeout(() => {
      toastTimer.current = null;
      setToast(null);
    }, 1100);
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
        // Open SQLite once first — concurrent opens crash Android with NullPointerException.
        await getDatabase();
        const loadedSettings = await loadSettings(storage);
        const loadedProducts = await getAllProducts();
        const loadedContacts = await getAllContacts();
        const yesterday = await getYesterdaySnapshot();
        setSettingsState(loadedSettings);
        // Only stamp previousPrice for compare — never overwrite today's prices.
        setProducts(applyYesterdayBaselines(loadedProducts, yesterday?.products));
        setContacts(loadedContacts);
      } catch (e) {
        console.error(e);
        setToast({ message: 'Load failed', type: 'error' });
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
      const yesterday = await getYesterdaySnapshot();
      const withBaseline = applyYesterdayBaselines(parsed, yesterday?.products);
      const merged = mergeImportedProducts(products, withBaseline);
      const kept = merged.filter((p) => {
        const key = productKey(p);
        const old = products.find((x) => productKey(x) === key);
        return old && old.price > 0 && p.price === old.price;
      }).length;
      await persistProducts(merged);
      showToast(`Imported ${parsed.length} · kept ${kept} priced`);
      if (meta.missingPrices > 0) {
        setTimeout(() => showToast(`${meta.missingPrices} without Excel price`, 'info'), 1150);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import failed', 'error');
    }
  }, [persistProducts, products, showToast]);

  const updatePrice = useCallback(
    async (id: string, price: number) => {
      const product = products.find((p) => p.id === id);
      if (!product) return;
      const next = { ...product, price, updatedAt: Date.now() };
      setUndoStack((s) => [...s.slice(-30), [{ id, price: product.price, previousPrice: product.previousPrice }]]);
      const list = products.map((p) => (p.id === id ? next : p));
      setProducts(list);
      await updateProduct(next);
      // First edit of the day → auto snapshot so history exists.
      if (settings.autosaveEnabled) {
        try {
          const keys = await getSnapshotDateKeys();
          if (!keys.includes(todayKey())) {
            await saveSnapshot(list, settings);
          }
        } catch {
          // non-blocking
        }
      }
    },
    [products, settings],
  );

  const bulkSetPrices = useCallback(
    async (ids: string[], price: number) => {
      if (!ids.length) return;
      const idSet = new Set(ids);
      const undos: UndoEntry[] = [];
      const list = products.map((p) => {
        if (!idSet.has(p.id) || p.price === price) return p;
        undos.push({ id: p.id, price: p.price, previousPrice: p.previousPrice });
        return { ...p, price, updatedAt: Date.now() };
      });
      if (!undos.length) {
        showToast('No prices changed', 'info');
        return;
      }
      setUndoStack((s) => [...s.slice(-30), undos]);
      await persistProducts(list);
      showToast(`Updated ${undos.length}`);
    },
    [persistProducts, products, showToast],
  );

  const undoLast = useCallback(async () => {
    const batch = undoStack[undoStack.length - 1];
    if (!batch?.length) {
      showToast('Nothing to undo', 'info');
      return;
    }
    setUndoStack((s) => s.slice(0, -1));
    const byId = new Map(batch.map((u) => [u.id, u]));
    const list = products.map((p) => {
      const u = byId.get(p.id);
      if (!u) return p;
      return { ...p, price: u.price, previousPrice: u.previousPrice, updatedAt: Date.now() };
    });
    await persistProducts(list);
    showToast(batch.length > 1 ? `Undid ${batch.length}` : 'Undone');
  }, [persistProducts, products, showToast, undoStack]);

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
      const existing = await getAllContacts();
      const byPhone = new Map(
        existing.map((c) => [normalizePhone(c.phone), c] as const).filter(([k]) => !!k),
      );
      const rows = [];
      for (const item of items) {
        if (!item.phone) continue;
        const key = normalizePhone(item.phone);
        if (!key) continue;
        const prev = byPhone.get(key);
        const row = {
          id: prev?.id || generateId(),
          name: (item.name || item.phone).trim() || item.phone,
          phone: item.phone.trim(),
          createdAt: prev?.createdAt || Date.now(),
        };
        byPhone.set(key, row);
        rows.push(row);
      }
      await saveContactsBulk(rows);
      await refreshContacts();
      showToast(`Imported ${rows.length} contacts`);
    },
    [refreshContacts, showToast],
  );

  const fullListCache = useMemo(
    () => buildFullMessage(products, settings, displayDate),
    [displayDate, products, settings],
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
        text = fullListCache;
        label = 'Full list';
      }
      if (!text.trim()) return null;
      return { text, label: extra || label };
    },
    [displayDate, fullListCache, groups, products, selectedIds, settings],
  );

  const handleShareAction = useCallback(
    async (mode: ShareMode, action: 'copy' | 'whatsapp' | 'apps', phone?: string) => {
      // Instant feedback — never await before opening the sheet.
      if (action === 'copy' || action === 'apps') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const payload = getSharePayload(mode);
      if (!payload) {
        showToast('Nothing to share', 'info');
        return false;
      }
      if (action === 'copy') {
        await copyText(payload.text);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Copied');
        return true;
      }
      if (action === 'apps') {
        // Open OS share sheet immediately (no InteractionManager defer).
        const shared = await shareTextViaApps(payload.text, payload.label || 'Price list');
        if (shared) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return shared;
      }
      if (!phone) {
        showToast('Pick a contact', 'info');
        return false;
      }
      await openWhatsApp(phone, payload.text);
      return true;
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
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const raw = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const data = JSON.parse(raw) as {
        products?: Product[];
        snapshots?: Snapshot[];
        contacts?: Contact[];
        settings?: AppSettings;
      };
      if (!data?.products && !data?.snapshots && !data?.contacts && !data?.settings) {
        showToast('Invalid backup', 'error');
        return;
      }
      await importAllData(data);
      if (data.settings) {
        invalidateSettingsCache();
        const next = await saveSettings(storage, data.settings);
        setSettingsState(next);
      }
      const list = await getAllProducts();
      setProducts(list);
      await refreshContacts();
      showToast('Backup restored');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Restore failed', 'error');
    }
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

  const toggleFavoriteBrand = useCallback(
    async (brand: string) => {
      const next = toggleFavoriteBrandSetting(settings, brand);
      await setSettings({ favoriteBrands: next.favoriteBrands });
    },
    [setSettings, settings],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      products,
      settings,
      contacts,
      selectedIds,
      selectedCount: selectedIds.size,
      toast,
      displayDate,
      groups,
      undoCount: undoStack.length,
      setSettings,
      showToast,
      dismissToast,
      uploadExcel,
      updatePrice,
      bulkSetPrices,
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
      toggleFavoriteBrand,
    }),
    [
      ready,
      products,
      settings,
      contacts,
      selectedIds,
      toast,
      displayDate,
      groups,
      undoStack.length,
      setSettings,
      showToast,
      dismissToast,
      uploadExcel,
      updatePrice,
      bulkSetPrices,
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
      toggleFavoriteBrand,
    ],
  );

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
