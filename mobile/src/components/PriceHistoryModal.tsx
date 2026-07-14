import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { searchModelHistory } from '../db/database';
import type { Product } from '../types';
import { formatPrice, productDisplayName, productKey } from '../lib/utils';
import { colors, radius, spacing } from '../theme';

type Row = { date: string; dateKey: string; price: number };

type Props = {
  visible: boolean;
  product: Product | null;
  currency: string;
  theme: 'dark' | 'light';
  onClose: () => void;
};

export function PriceHistoryModal({ visible, product, currency, theme, onClose }: Props) {
  const c = colors[theme];
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !product) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const q = `${product.brand} ${product.model}`.trim();
        const all = await searchModelHistory(q);
        const key = productKey(product);
        const matched = all
          .filter((r) => productKey(r.product) === key)
          .map((r) => ({ date: r.date, dateKey: r.dateKey, price: r.price }));
        // Deduplicate by dateKey (latest wins since search is sorted desc)
        const byDay = new Map<string, Row>();
        for (const row of matched) {
          if (!byDay.has(row.dateKey)) byDay.set(row.dateKey, row);
        }
        if (alive) setRows([...byDay.values()]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [product, visible]);

  if (!product) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: c.card }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: c.text }]}>Price history</Text>
          <Text style={{ color: c.textMuted, marginBottom: spacing.md }}>
            {productDisplayName(product)}
          </Text>
          <Text style={{ color: c.text, marginBottom: spacing.sm }}>
            Today: {formatPrice(product.price, currency) || 'Not set'}
            {product.previousPrice
              ? ` · Yesterday baseline ${formatPrice(product.previousPrice, currency)}`
              : ''}
          </Text>

          {loading ? (
            <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.lg }} />
          ) : (
            <ScrollView style={{ maxHeight: 320 }}>
              {rows.length === 0 ? (
                <Text style={{ color: c.textMuted }}>
                  No history yet
                </Text>
              ) : (
                rows.map((row) => (
                  <View key={row.dateKey} style={[styles.row, { borderColor: c.cardBorder }]}>
                    <Text style={{ color: c.text, fontWeight: '600' }}>{row.date}</Text>
                    <Text style={{ color: c.success, fontWeight: '700' }}>
                      {formatPrice(row.price, currency) || '—'}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          <Pressable style={{ marginTop: spacing.md }} onPress={onClose}>
            <Text style={{ color: c.primary, fontWeight: '700', textAlign: 'right' }}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
