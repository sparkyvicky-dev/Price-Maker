import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandCard } from '../../src/components/BrandCard';
import { LoadingScreen, ToastBanner } from '../../src/components/Feedback';
import { ShareSheet } from '../../src/components/ShareSheet';
import { useApp, type ShareMode } from '../../src/context/AppProvider';
import { colors, spacing } from '../../src/theme';

export default function DashboardScreen() {
  const {
    ready,
    settings,
    products,
    groups,
    selectedIds,
    contacts,
    toast,
    displayDate,
    uploadExcel,
    undoLast,
    toggleSelect,
    clearSelection,
    getSharePayload,
    handleShareAction,
    toggleBrandCollapsed,
    toggleSectionCollapsed,
    updatePrice,
    saveDailySnapshot,
  } = useApp();

  const c = colors[settings.theme];
  const [search, setSearch] = useState('');
  const [shareMode, setShareMode] = useState<ShareMode | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        products: g.products.filter((p) =>
          `${p.brand} ${p.model} ${p.ram} ${p.storage}`.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.products.length > 0);
  }, [groups, search]);

  const brandCount = useMemo(() => new Set(products.map((p) => p.brand)).size, [products]);

  if (!ready) return <LoadingScreen theme={settings.theme} />;

  const openShare = (mode: ShareMode) => setShareMode(mode);
  const closeShare = () => setShareMode(null);
  const shareTitle = shareMode ? getSharePayload(shareMode)?.label || 'Share' : '';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.store, { color: c.text }]}>{settings.storeName}</Text>
          <Text style={{ color: c.textMuted }}>
            {settings.location} · {displayDate}
          </Text>
        </View>
        <Pressable style={[styles.iconBtn, { backgroundColor: c.card }]} onPress={uploadExcel}>
          <Ionicons name="document-outline" size={22} color={c.primary} />
        </Pressable>
        <Pressable style={[styles.iconBtn, { backgroundColor: c.card }]} onPress={() => setMenuOpen(true)}>
          <Ionicons name="ellipsis-vertical" size={22} color={c.text} />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Brands" value={String(brandCount)} c={c} />
        <Stat label="Models" value={String(products.length)} c={c} />
        <Stat label="Selected" value={String(selectedIds.size)} c={c} />
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
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: selectedIds.size ? 100 : spacing.xl }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: c.textMuted, textAlign: 'center' }}>
              Tap the document icon to upload an Excel price list.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <BrandCard
            group={item}
            currency={settings.currency}
            theme={settings.theme}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onUpdatePrice={updatePrice}
            onShareOpen={() =>
              openShare(
                item.isCustom
                  ? { type: 'group', key: item.key }
                  : { type: 'brand', brand: item.brand || item.title },
              )
            }
            onToggleCollapsed={() =>
              item.isCustom && item.sectionId
                ? toggleSectionCollapsed(item.sectionId)
                : toggleBrandCollapsed(item.brand || item.title)
            }
          />
        )}
      />

      {selectedIds.size > 0 && (
        <View style={[styles.selectionBar, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Pressable onPress={clearSelection}>
            <Text style={{ color: c.textMuted }}>Clear</Text>
          </Pressable>
          <Pressable
            style={[styles.shareBtn, { backgroundColor: c.primary }]}
            onPress={() => openShare({ type: 'selected' })}
          >
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={styles.shareBtnText}>Share {selectedIds.size}</Text>
          </Pressable>
        </View>
      )}

      <ShareSheet
        visible={!!shareMode}
        title={shareTitle}
        contacts={contacts}
        theme={settings.theme}
        onClose={closeShare}
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

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={[styles.menu, { backgroundColor: c.card }]}>
            <MenuItem
              label="Share full list"
              icon="share-outline"
              onPress={() => {
                setMenuOpen(false);
                openShare({ type: 'full' });
              }}
              c={c}
            />
            <MenuItem label="Save snapshot" icon="save-outline" onPress={() => { setMenuOpen(false); saveDailySnapshot(); }} c={c} />
            <MenuItem label="Undo price" icon="arrow-undo-outline" onPress={() => { setMenuOpen(false); undoLast(); }} c={c} />
          </View>
        </Pressable>
      </Modal>

      {toast && <ToastBanner message={toast.message} type={toast.type || 'success'} theme={settings.theme} />}
    </SafeAreaView>
  );
}

function Stat({ label, value, c }: { label: string; value: string; c: (typeof colors)['dark'] }) {
  return (
    <View style={[styles.stat, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <Text style={{ color: c.textMuted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: c.text, fontWeight: '700', fontSize: 18 }}>{value}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.sm },
  store: { fontSize: 22, fontWeight: '800' },
  iconBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  stat: { flex: 1, borderWidth: 1, borderRadius: 12, padding: spacing.md },
  search: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: 10 },
  empty: { padding: spacing.xl },
  selectionBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  shareBtnText: { color: '#fff', fontWeight: '700' },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 90, paddingRight: 16 },
  menu: { minWidth: 220, borderRadius: 12, paddingVertical: 8, elevation: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
});
