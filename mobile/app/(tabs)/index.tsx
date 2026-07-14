import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BrandCard } from '../../src/components/BrandCard';
import { LoadingScreen } from '../../src/components/Feedback';
import { PriceEditSheet } from '../../src/components/PriceEditSheet';
import { PriceHistoryModal } from '../../src/components/PriceHistoryModal';
import { SelectionBar } from '../../src/components/SelectionBar';
import { ShareSheet } from '../../src/components/ShareSheet';
import { useApp, type ShareMode } from '../../src/context/AppProvider';
import { getYesterdaySnapshot } from '../../src/db/database';
import type { DisplayGroup, Product } from '../../src/types';
import { formatPrice, productDisplayName, productKey } from '../../src/lib/utils';
import { colors, spacing } from '../../src/theme';

type FilterKey = 'all' | 'changed' | 'missing' | 'favorites';

export default function DashboardScreen() {
  const {
    ready,
    settings,
    products,
    groups,
    selectedIds,
    selectedCount,
    contacts,
    displayDate,
    undoCount,
    uploadExcel,
    undoLast,
    toggleSelect,
    clearSelection,
    getSharePayload,
    handleShareAction,
    toggleBrandCollapsed,
    toggleSectionCollapsed,
    toggleFavoriteBrand,
    updatePrice,
    bulkSetPrices,
    saveDailySnapshot,
  } = useApp();

  const c = colors[settings.theme];
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [shareMode, setShareMode] = useState<ShareMode | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const [vsOpen, setVsOpen] = useState(false);
  const [vsLines, setVsLines] = useState<string[]>([]);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const changedCount = useMemo(
    () =>
      products.filter(
        (p) => p.previousPrice != null && p.previousPrice > 0 && p.price > 0 && p.previousPrice !== p.price,
      ).length,
    [products],
  );
  const missingCount = useMemo(() => products.filter((p) => !p.price).length, [products]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fav = new Set(settings.favoriteBrands);
    return groups
      .map((g) => {
        let list = g.products;
        if (filter === 'changed') {
          list = list.filter(
            (p) => p.previousPrice != null && p.previousPrice > 0 && p.price > 0 && p.previousPrice !== p.price,
          );
        } else if (filter === 'missing') {
          list = list.filter((p) => !p.price);
        } else if (filter === 'favorites') {
          if (g.isCustom || !fav.has(g.brand || g.title)) list = [];
        }
        if (q) {
          list = list.filter((p) =>
            `${p.brand} ${p.model} ${p.ram} ${p.storage}`.toLowerCase().includes(q),
          );
        }
        return { ...g, products: list };
      })
      .filter((g) => g.products.length > 0)
      .sort((a, b) => {
        const af = !a.isCustom && fav.has(a.brand || a.title) ? 0 : 1;
        const bf = !b.isCustom && fav.has(b.brand || b.title) ? 0 : 1;
        return af - bf;
      });
  }, [filter, groups, search, settings.favoriteBrands]);

  const brandCount = useMemo(() => new Set(products.map((p) => p.brand)).size, [products]);

  const openShare = useCallback((mode: ShareMode) => setShareMode(mode), []);
  const closeShare = useCallback(() => setShareMode(null), []);

  const onShareGroup = useCallback(
    (group: DisplayGroup) => {
      openShare(
        group.isCustom
          ? { type: 'group', key: group.key }
          : { type: 'brand', brand: group.brand || group.title },
      );
    },
    [openShare],
  );

  const onToggleGroupCollapsed = useCallback(
    (group: DisplayGroup) => {
      if (group.isCustom && group.sectionId) toggleSectionCollapsed(group.sectionId);
      else toggleBrandCollapsed(group.brand || group.title);
    },
    [toggleBrandCollapsed, toggleSectionCollapsed],
  );

  const onToggleFavorite = useCallback(
    (brand: string) => {
      void toggleFavoriteBrand(brand);
    },
    [toggleFavoriteBrand],
  );

  const copyAll = useCallback(() => {
    void handleShareAction({ type: 'full' }, 'copy');
  }, [handleShareAction]);

  const copySelected = useCallback(() => {
    void handleShareAction({ type: 'selected' }, 'copy');
  }, [handleShareAction]);

  const onShowHistory = useCallback((product: Product) => {
    setHistoryProduct(product);
  }, []);

  const onEditPrice = useCallback((product: Product) => {
    setEditProduct(product);
  }, []);

  const renderBrand = useCallback(
    ({ item }: { item: DisplayGroup }) => (
      <BrandCard
        group={item}
        currency={settings.currency}
        theme={settings.theme}
        selectedIds={selectedIds}
        isFavorite={settings.favoriteBrands.includes(item.brand || item.title)}
        onToggleSelect={toggleSelect}
        onEditPrice={onEditPrice}
        onToggleFavorite={onToggleFavorite}
        onShareOpen={onShareGroup}
        onToggleCollapsed={onToggleGroupCollapsed}
        onShowHistory={onShowHistory}
      />
    ),
    [
      onEditPrice,
      onShareGroup,
      onShowHistory,
      onToggleFavorite,
      onToggleGroupCollapsed,
      selectedIds,
      settings.currency,
      settings.favoriteBrands,
      settings.theme,
      toggleSelect,
    ],
  );

  const openVsYesterday = async () => {
    const yesterday = await getYesterdaySnapshot();
    if (!yesterday?.products?.length) {
      Alert.alert('No yesterday', 'Save a snapshot first.');
      return;
    }
    const mapY = new Map(yesterday.products.map((p) => [productKey(p), p.price]));
    const lines: string[] = [];
    for (const p of products) {
      const old = mapY.get(productKey(p));
      if (old != null && old > 0 && p.price > 0 && old !== p.price) {
        const arrow = p.price > old ? '▲' : '▼';
        lines.push(
          `${arrow} ${productDisplayName(p)}: ${formatPrice(old, settings.currency)} → ${formatPrice(p.price, settings.currency)}`,
        );
      }
    }
    setVsLines(lines);
    setVsOpen(true);
  };

  const applyBulk = async () => {
    const val = parseInt(bulkPrice.replace(/\D/g, ''), 10) || 0;
    const ids = selectedCount
      ? [...selectedIds]
      : products.filter((p) => !p.price).map((p) => p.id);
    if (!ids.length) {
      Alert.alert('Nothing selected', 'Select models first.');
      return;
    }
    await bulkSetPrices(ids, val);
    setBulkOpen(false);
    setBulkPrice('');
    clearSelection();
  };

  if (!ready) return <LoadingScreen theme={settings.theme} />;

  const shareTitle = shareMode ? getSharePayload(shareMode)?.label || 'Share' : '';

  return (
    <View style={[styles.screen, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.store, { color: c.text }]} numberOfLines={1}>
            {settings.storeName}
          </Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]} numberOfLines={1}>
            {settings.location} · {displayDate}
          </Text>
        </View>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: c.card, opacity: undoCount ? 1 : 0.4 }]}
          onPress={undoLast}
          disabled={!undoCount}
        >
          <Ionicons name="arrow-undo-outline" size={20} color={c.text} />
        </Pressable>
        <Pressable style={[styles.iconBtn, { backgroundColor: c.card }]} onPress={uploadExcel}>
          <Ionicons name="document-outline" size={20} color={c.primary} />
        </Pressable>
        <Pressable style={[styles.iconBtn, { backgroundColor: c.card }]} onPress={() => setMenuOpen(true)}>
          <Ionicons name="ellipsis-vertical" size={20} color={c.text} />
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={[styles.copyAllBtn, { backgroundColor: c.primary }]} onPress={copyAll}>
          <Ionicons name="copy-outline" size={18} color="#fff" />
          <Text style={styles.copyAllText}>Copy all</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryBtn, { backgroundColor: c.card, borderColor: c.cardBorder }]}
          onPress={() => void handleShareAction({ type: 'full' }, 'apps')}
        >
          <Ionicons name="share-social-outline" size={18} color={c.primary} />
          <Text style={[styles.secondaryBtnText, { color: c.primary }]}>Share all</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Brands" value={String(brandCount)} c={c} />
        <Stat label="Models" value={String(products.length)} c={c} />
        <Stat label="Changed" value={String(changedCount)} c={c} />
      </View>

      <View style={styles.chips}>
        {(
          [
            { key: 'all', label: 'All' },
            { key: 'changed', label: `Changed ${changedCount}` },
            { key: 'missing', label: `Missing ${missingCount}` },
            { key: 'favorites', label: 'Favorites' },
          ] as const
        ).map((chip) => {
          const active = filter === chip.key;
          return (
            <Pressable
              key={chip.key}
              onPress={() => setFilter(chip.key)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? c.primary : c.card,
                  borderColor: active ? c.primary : c.cardBorder,
                },
              ]}
            >
              <Text numberOfLines={1} style={[styles.chipText, { color: active ? '#fff' : c.text }]}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={openVsYesterday}
          style={[styles.chip, { backgroundColor: c.card, borderColor: c.cardBorder }]}
        >
          <Text numberOfLines={1} style={[styles.chipText, { color: c.accent }]}>
            Vs yesterday
          </Text>
        </Pressable>
      </View>

      <TextInput
        placeholder="Search models…"
        placeholderTextColor={c.textMuted}
        value={search}
        onChangeText={setSearch}
        style={[styles.search, { backgroundColor: c.card, color: c.text, borderColor: c.cardBorder }]}
      />

      <FlatList
        data={filteredGroups}
        keyExtractor={keyExtractor}
        renderItem={renderBrand}
        extraData={selectedCount}
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={40}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: selectedCount ? 120 : spacing.xl,
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: c.textMuted, textAlign: 'center' }}>
              {products.length
                ? 'Nothing matches this filter.'
                : 'Upload Excel to start'}
            </Text>
          </View>
        }
      />

      {selectedCount > 0 && (
        <SelectionBar
          selectedCount={selectedCount}
          theme={settings.theme}
          onClear={clearSelection}
          onSetPrice={() => {
            setBulkPrice('');
            setBulkOpen(true);
          }}
          onCopy={copySelected}
          onShare={() => void handleShareAction({ type: 'selected' }, 'apps')}
        />
      )}

      <PriceEditSheet
        product={editProduct}
        currency={settings.currency}
        theme={settings.theme}
        onClose={() => setEditProduct(null)}
        onSave={(id, price) => {
          void updatePrice(id, price);
        }}
      />

      <PriceHistoryModal
        visible={!!historyProduct}
        product={historyProduct}
        currency={settings.currency}
        theme={settings.theme}
        onClose={() => setHistoryProduct(null)}
      />

      <ShareSheet
        visible={!!shareMode}
        title={shareTitle}
        contacts={contacts}
        theme={settings.theme}
        onClose={closeShare}
        onShareApps={async () => {
          if (!shareMode) return;
          await handleShareAction(shareMode, 'apps');
          closeShare();
        }}
        onCopy={async () => {
          if (!shareMode) return;
          await handleShareAction(shareMode, 'copy');
          closeShare();
        }}
        onWhatsApp={async (contact) => {
          if (!shareMode) return;
          await handleShareAction(shareMode, 'whatsapp', contact.phone);
          closeShare();
        }}
      />

      <Modal visible={bulkOpen} transparent animationType="none" onRequestClose={() => setBulkOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={[styles.modal, { backgroundColor: c.card }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>
              Set price for {selectedCount || missingCount} models
            </Text>
            <TextInput
              placeholder="Enter price"
              placeholderTextColor={c.textMuted}
              value={bulkPrice}
              onChangeText={setBulkPrice}
              keyboardType="number-pad"
              autoFocus
              style={[styles.modalInput, { color: c.text, borderColor: c.cardBorder, backgroundColor: c.input }]}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setBulkOpen(false)}>
                <Text style={{ color: c.textMuted }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={applyBulk}>
                <Text style={{ color: c.primary, fontWeight: '700' }}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={vsOpen} transparent animationType="fade" onRequestClose={() => setVsOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={[styles.modal, { backgroundColor: c.card, maxHeight: '70%' }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Vs yesterday</Text>
            <ScrollView style={{ marginVertical: spacing.md }}>
              {vsLines.length ? (
                vsLines.map((line) => (
                  <Text key={line} style={{ color: c.text, marginBottom: 8, fontSize: 14 }}>
                    {line}
                  </Text>
                ))
              ) : (
                <Text style={{ color: c.textMuted }}>No price changes vs yesterday.</Text>
              )}
            </ScrollView>
            <Pressable onPress={() => setVsOpen(false)}>
              <Text style={{ color: c.primary, fontWeight: '700', textAlign: 'right' }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={menuOpen} transparent animationType="none" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable
            style={[styles.menu, { backgroundColor: c.card, marginTop: insets.top + 56 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <MenuItem
              label="Copy all brands"
              icon="copy-outline"
              onPress={() => {
                setMenuOpen(false);
                copyAll();
              }}
              c={c}
            />
            <MenuItem
              label="Share all brands"
              icon="share-outline"
              onPress={() => {
                setMenuOpen(false);
                void handleShareAction({ type: 'full' }, 'apps');
              }}
              c={c}
            />
            <MenuItem
              label="Save snapshot"
              icon="save-outline"
              onPress={() => {
                setMenuOpen(false);
                saveDailySnapshot();
              }}
              c={c}
            />
            <MenuItem
              label="Undo price"
              icon="arrow-undo-outline"
              onPress={() => {
                setMenuOpen(false);
                undoLast();
              }}
              c={c}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function keyExtractor(item: DisplayGroup) {
  return item.key;
}

function Stat({ label, value, c }: { label: string; value: string; c: (typeof colors)['dark'] }) {
  return (
    <View style={[styles.stat, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <Text style={{ color: c.textMuted, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: c.text, fontWeight: '700', fontSize: 16 }}>{value}</Text>
    </View>
  );
}

function MenuItem({
  label,
  icon,
  onPress,
  c,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  c: (typeof colors)['dark'];
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={20} color={c.text} />
      <Text style={{ color: c.text, fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerText: { flex: 1, minWidth: 0, paddingRight: spacing.sm },
  store: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 2 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  copyAllBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  copyAllText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: { fontWeight: '700', fontSize: 15 },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  chip: {
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontWeight: '600',
    fontSize: 13,
  },
  search: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  empty: { padding: spacing.xl },
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modal: { borderRadius: 16, padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 16,
  },
  menu: { minWidth: 220, borderRadius: 12, paddingVertical: 8, elevation: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
