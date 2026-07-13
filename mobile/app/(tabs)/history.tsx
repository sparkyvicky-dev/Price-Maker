import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { getAllSnapshots, getSnapshotById } from '../../src/db/database';
import { ToastBanner } from '../../src/components/Feedback';
import { useApp } from '../../src/context/AppProvider';
import type { Snapshot } from '../../src/types';
import { colors, spacing } from '../../src/theme';

export default function HistoryScreen() {
  const { settings, toast, replaceProducts, setSettings } = useApp();
  const c = colors[settings.theme];
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [detail, setDetail] = useState<Snapshot | null>(null);

  const load = useCallback(async () => {
    setSnapshots(await getAllSnapshots());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const restore = async (id: string) => {
    const snap = await getSnapshotById(id);
    if (!snap) return;
    await replaceProducts(snap.products);
    await setSettings(snap.settings);
    setDetail(null);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: c.bg }]}>
      <Text style={[styles.title, { color: c.text }]}>History</Text>
      <FlatList
        data={snapshots}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg }}
        onRefresh={load}
        refreshing={false}
        ListEmptyComponent={<Text style={{ color: c.textMuted }}>No snapshots yet. Save from Prices → ⋮ menu.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}
            onPress={() => setDetail(item)}
          >
            <Text style={[styles.date, { color: c.text }]}>{item.date}</Text>
            <Text style={{ color: c.textMuted }}>{item.products?.length || 0} models</Text>
          </Pressable>
        )}
      />

      {detail && (
        <View style={styles.detailOverlay}>
          <View style={[styles.detailCard, { backgroundColor: c.card }]}>
            <Text style={[styles.date, { color: c.text }]}>{detail.date}</Text>
            <Text style={{ color: c.textMuted, marginBottom: spacing.md }}>
              {detail.products.length} models saved
            </Text>
            <Pressable style={[styles.action, { backgroundColor: c.primary }]} onPress={() => restore(detail.id)}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Load this snapshot</Text>
            </Pressable>
            <Pressable style={styles.action} onPress={() => setDetail(null)}>
              <Text style={{ color: c.textMuted }}>Close</Text>
            </Pressable>
          </View>
        </View>
      )}

      {toast && <ToastBanner message={toast.message} type={toast.type || 'success'} theme={settings.theme} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: { fontSize: 24, fontWeight: '800', padding: spacing.lg, paddingBottom: 0 },
  card: { borderWidth: 1, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm },
  date: { fontSize: 17, fontWeight: '700' },
  detailOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  detailCard: { borderRadius: 16, padding: spacing.lg },
  action: { alignItems: 'center', paddingVertical: spacing.md },
});
