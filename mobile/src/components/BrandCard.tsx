import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DisplayGroup, Product } from '../types';
import { formatPrice, productDisplayName } from '../lib/utils';
import { colors, radius, spacing } from '../theme';

type Props = {
  group: DisplayGroup;
  currency: string;
  theme: 'dark' | 'light';
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onUpdatePrice: (id: string, price: number) => void;
  onShareOpen: () => void;
  onToggleCollapsed: () => void;
};

export function BrandCard({
  group,
  currency,
  theme,
  selectedIds,
  onToggleSelect,
  onUpdatePrice,
  onShareOpen,
  onToggleCollapsed,
}: Props) {
  const c = colors[theme];
  const collapsed = group.collapsed;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <Pressable style={styles.header} onPress={onToggleCollapsed} onLongPress={onShareOpen}>
        <Text style={[styles.brand, { color: c.text }]}>
          {group.isCustom ? '📋 ' : ''}
          {group.title}
        </Text>
        <Text style={{ color: c.textMuted }}>{group.products.length}</Text>
        <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={18} color={c.textMuted} />
      </Pressable>
      {!collapsed &&
        group.products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            currency={currency}
            theme={theme}
            selected={selectedIds.has(product.id)}
            onToggleSelect={() => onToggleSelect(product.id)}
            onUpdatePrice={onUpdatePrice}
          />
        ))}
    </View>
  );
}

function ProductRow({
  product,
  currency,
  theme,
  selected,
  onToggleSelect,
  onUpdatePrice,
}: {
  product: Product;
  currency: string;
  theme: 'dark' | 'light';
  selected: boolean;
  onToggleSelect: () => void;
  onUpdatePrice: (id: string, price: number) => void;
}) {
  const c = colors[theme];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(product.price || ''));

  const commit = () => {
    setEditing(false);
    const val = parseInt(draft.replace(/\D/g, ''), 10) || 0;
    if (val !== product.price) onUpdatePrice(product.id, val);
  };

  return (
    <View style={[styles.row, { borderTopColor: c.cardBorder }]}>
      <Pressable onPress={onToggleSelect} hitSlop={8}>
        <Ionicons
          name={selected ? 'checkbox' : 'square-outline'}
          size={22}
          color={selected ? c.primary : c.textMuted}
        />
      </Pressable>
      <Text style={[styles.model, { color: c.text }]} numberOfLines={2}>
        {productDisplayName(product)}
      </Text>
      {editing ? (
        <TextInput
          style={[styles.priceInput, { color: c.text, borderColor: c.primary, backgroundColor: c.input }]}
          value={draft}
          onChangeText={setDraft}
          keyboardType="number-pad"
          autoFocus
          onBlur={commit}
          onSubmitEditing={commit}
        />
      ) : (
        <Pressable onPress={() => { setDraft(String(product.price || '')); setEditing(true); }}>
          <Text style={[styles.price, { color: product.price ? c.success : c.warning }]}>
            {formatPrice(product.price, currency) || 'Set price'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  brand: { flex: 1, fontSize: 17, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  model: { flex: 1, fontSize: 14 },
  price: { minWidth: 72, textAlign: 'right', fontWeight: '600', fontSize: 14 },
  priceInput: {
    minWidth: 72,
    textAlign: 'right',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    fontSize: 14,
  },
});
