import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { getAllSnapshots, searchModelHistory } from '../../src/db/database';
import { useApp } from '../../src/context/AppProvider';
import type { Product, Snapshot } from '../../src/types';
import { formatPrice, productDisplayName, productKey } from '../../src/lib/utils';
import { colors, spacing } from '../../src/theme';

type Mode = 'date' | 'model';

type DaySnap = {
  dateKey: string;
  date: string;
  products: Product[];
  savedAt: number;
};

type ModelHit = {
  id: string;
  date: string;
  dateKey: string;
  price: number;
  label: string;
};

/** Latest snapshot per calendar day (view-only history). */
function uniqueDays(snapshots: Snapshot[]): DaySnap[] {
  const map = new Map<string, DaySnap>();
  for (const snap of snapshots) {
    const existing = map.get(snap.dateKey);
    if (!existing || snap.savedAt > existing.savedAt) {
      map.set(snap.dateKey, {
        dateKey: snap.dateKey,
        date: snap.date,
        products: snap.products || [],
        savedAt: snap.savedAt,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

function pricedSorted(products: Product[]) {
  return [...products]
    .filter((p) => (p.price || 0) > 0)
    .sort((a, b) => {
      const brand = (a.brand || '').localeCompare(b.brand || '');
      if (brand) return brand;
      return productDisplayName(a).localeCompare(productDisplayName(b));
    });
}

export default function HistoryScreen() {
  const { settings } = useApp();
  const c = colors[settings.theme];
  const [mode, setMode] = useState<Mode>('date');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedDay, setSelectedDay] = useState<DaySnap | null>(null);
  const [query, setQuery] = useState('');
  const [modelHits, setModelHits] = useState<ModelHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const days = useMemo(() => uniqueDays(snapshots), [snapshots]);

  const load = useCallback(async () => {
    setSnapshots(await getAllSnapshots());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    if (query.trim()) await runSearch(query);
    setRefreshing(false);
  };

  const runSearch = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setModelHits([]);
      return;
    }
    setSearching(true);
    try {
      const rows = await searchModelHistory(trimmed);
      // One price per model per day (latest snapshot wins — search already newest-first)
      const seen = new Set<string>();
      const hits: ModelHit[] = [];
      for (const r of rows) {
        if ((r.price || 0) <= 0) continue;
        const key = `${r.dateKey}::${productKey(r.product)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({
          id: key,
          date: r.date,
          dateKey: r.dateKey,
          price: r.price,
          label: productDisplayName(r.product),
        });
      }
      setModelHits(hits);
    } finally {
      setSearching(false);
    }
  };

  const dayProducts = useMemo(
    () => (selectedDay ? pricedSorted(selectedDay.products) : []),
    [selectedDay],
  );

  return (
    <Screen
      theme={settings.theme}
      title="History"
      subtitle={`${days.length} days`}
      right={
        <Pressable style={[styles.iconBtn, { backgroundColor: c.card }]} onPress={() => void onRefresh()}>
          <Ionicons name="refresh-outline" size={18} color={c.primary} />
        </Pressable>
      }
    >
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, mode === 'date' && { backgroundColor: c.primary }]}
          onPress={() => {
            setMode('date');
            setSelectedDay(null);
          }}
        >
          <Text style={{ color: mode === 'date' ? '#fff' : c.textMuted, fontWeight: '700' }}>By date</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === 'model' && { backgroundColor: c.primary }]}
          onPress={() => {
            setMode('model');
            setSelectedDay(null);
          }}
        >
          <Text style={{ color: mode === 'model' ? '#fff' : c.textMuted, fontWeight: '700' }}>By model</Text>
        </Pressable>
      </View>

      {mode === 'date' && !selectedDay ? (
        <FlatList
          data={days}
          keyExtractor={(item) => item.dateKey}
          contentContainerStyle={styles.listPad}
          onRefresh={() => void onRefresh()}
          refreshing={refreshing}
          ListEmptyComponent={
            <Text style={{ color: c.textMuted, textAlign: 'center', marginTop: spacing.xl }}>
              No snapshots yet
            </Text>
          }
          renderItem={({ item }) => {
            const withPrice = item.products.filter((p) => (p.price || 0) > 0).length;
            return (
              <Pressable
                style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}
                onPress={() => setSelectedDay(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.date, { color: c.text }]}>{item.date}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 13 }}>
                    {withPrice} priced · {item.products.length} models
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
              </Pressable>
            );
          }}
        />
      ) : null}

      {mode === 'date' && selectedDay ? (
        <View style={{ flex: 1 }}>
          <View style={styles.dayHeader}>
            <Pressable
              onPress={() => setSelectedDay(null)}
              style={[styles.backBtn, { backgroundColor: c.card, borderColor: c.cardBorder }]}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={18} color={c.primary} />
              <Text style={{ color: c.primary, fontWeight: '700' }}>Dates</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.date, { color: c.text }]}>{selectedDay.date}</Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>
                {dayProducts.length} prices
              </Text>
            </View>
          </View>
          <FlatList
            data={dayProducts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listPad}
            ListEmptyComponent={
              <Text style={{ color: c.textMuted, textAlign: 'center', marginTop: spacing.lg }}>
                No prices set on this day.
              </Text>
            }
            renderItem={({ item, index }) => {
              const showBrand =
                index === 0 || (dayProducts[index - 1]?.brand || '') !== (item.brand || '');
              return (
                <View>
                  {showBrand ? (
                    <Text style={[styles.brand, { color: c.primary }]}>{item.brand || 'Other'}</Text>
                  ) : null}
                  <View style={[styles.row, { borderColor: c.cardBorder }]}>
                    <Text style={[styles.model, { color: c.text }]} numberOfLines={2}>
                      {productDisplayName(item)}
                    </Text>
                    <Text style={[styles.price, { color: c.text }]}>
                      {formatPrice(item.price, settings.currency)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        </View>
      ) : null}

      {mode === 'model' ? (
        <View style={{ flex: 1 }}>
          <View style={[styles.searchWrap, { backgroundColor: c.input, borderColor: c.cardBorder }]}>
            <Ionicons name="search" size={18} color={c.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search model…"
              placeholderTextColor={c.textMuted}
              style={[styles.searchInput, { color: c.text }]}
              returnKeyType="search"
              onSubmitEditing={() => void runSearch(query)}
              autoCorrect={false}
            />
            {query ? (
              <Pressable
                onPress={() => {
                  setQuery('');
                  setModelHits([]);
                }}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={18} color={c.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            style={[styles.searchBtn, { backgroundColor: c.primary }]}
            onPress={() => void runSearch(query)}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              {searching ? '…' : 'Search'}
            </Text>
          </Pressable>
          <FlatList
            data={modelHits}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listPad}
            onRefresh={() => void onRefresh()}
            refreshing={refreshing}
            ListEmptyComponent={
              <Text style={{ color: c.textMuted, textAlign: 'center', marginTop: spacing.xl }}>
                {query.trim() ? 'No matches' : 'Search a model'}
              </Text>
            }
            renderItem={({ item, index }) => {
              const prev = modelHits[index - 1];
              const showModel = !prev || prev.label !== item.label;
              return (
                <View>
                  {showModel ? (
                    <Text style={[styles.brand, { color: c.primary }]}>{item.label}</Text>
                  ) : null}
                  <View style={[styles.row, { borderColor: c.cardBorder }]}>
                    <Text style={[styles.model, { color: c.textMuted }]}>{item.date}</Text>
                    <Text style={[styles.price, { color: c.text }]}>
                      {formatPrice(item.price, settings.currency)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  listPad: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  date: { fontSize: 16, fontWeight: '700' },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  brand: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  model: { flex: 1, fontSize: 14, fontWeight: '500' },
  price: { fontSize: 15, fontWeight: '800' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  searchBtn: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
