import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { DisplayGroup, Product } from '../types';
import { formatPrice, productDisplayName } from '../lib/utils';
import { colors, radius, spacing } from '../theme';

type Props = {
  group: DisplayGroup;
  currency: string;
  theme: 'dark' | 'light';
  selectedIds: Set<string>;
  isFavorite?: boolean;
  onToggleSelect: (id: string) => void;
  onEditPrice: (product: Product) => void;
  onShareOpen: (group: DisplayGroup) => void;
  onToggleCollapsed: (group: DisplayGroup) => void;
  onToggleFavorite?: (brand: string) => void;
  onShowHistory?: (product: Product) => void;
};

function brandSelectionSig(group: DisplayGroup, selectedIds: Set<string>) {
  let sig = '';
  for (const p of group.products) {
    if (selectedIds.has(p.id)) sig += p.id + ',';
  }
  return sig;
}

function BrandCardInner({
  group,
  currency,
  theme,
  selectedIds,
  isFavorite,
  onToggleSelect,
  onEditPrice,
  onShareOpen,
  onToggleCollapsed,
  onToggleFavorite,
  onShowHistory,
}: Props) {
  const c = colors[theme];
  const collapsed = group.collapsed;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.headerMain}
          onPress={() => onToggleCollapsed(group)}
          onLongPress={() => onShareOpen(group)}
          android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
        >
          <Text style={[styles.brand, { color: c.text }]} numberOfLines={1}>
            {group.isCustom ? '📋 ' : ''}
            {group.title}
          </Text>
          <Text style={{ color: c.textMuted }}>{group.products.length}</Text>
          <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={18} color={c.textMuted} />
        </Pressable>
        {onToggleFavorite && !group.isCustom ? (
          <Pressable
            style={styles.iconHit}
            onPress={() => onToggleFavorite(group.brand || group.title)}
            hitSlop={8}
          >
            <Ionicons
              name={isFavorite ? 'star' : 'star-outline'}
              size={18}
              color={isFavorite ? c.warning : c.textMuted}
            />
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.copyBtn, { backgroundColor: c.input }]}
          onPress={() => onShareOpen(group)}
          hitSlop={8}
          accessibilityLabel={`Share ${group.title}`}
        >
          <Ionicons name="copy-outline" size={18} color={c.primary} />
        </Pressable>
      </View>
      {!collapsed &&
        group.products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            currency={currency}
            theme={theme}
            selected={selectedIds.has(product.id)}
            onToggleSelect={onToggleSelect}
            onEditPrice={onEditPrice}
            onShowHistory={onShowHistory}
          />
        ))}
    </View>
  );
}

export const BrandCard = memo(BrandCardInner, (prev, next) => {
  if (prev.group !== next.group) return false;
  if (prev.currency !== next.currency) return false;
  if (prev.theme !== next.theme) return false;
  if (prev.isFavorite !== next.isFavorite) return false;
  if (prev.onToggleSelect !== next.onToggleSelect) return false;
  if (prev.onEditPrice !== next.onEditPrice) return false;
  if (prev.onShareOpen !== next.onShareOpen) return false;
  if (prev.onToggleCollapsed !== next.onToggleCollapsed) return false;
  if (prev.onToggleFavorite !== next.onToggleFavorite) return false;
  if (prev.onShowHistory !== next.onShowHistory) return false;
  return brandSelectionSig(prev.group, prev.selectedIds) === brandSelectionSig(next.group, next.selectedIds);
});

const ProductRow = memo(function ProductRow({
  product,
  currency,
  theme,
  selected,
  onToggleSelect,
  onEditPrice,
  onShowHistory,
}: {
  product: Product;
  currency: string;
  theme: 'dark' | 'light';
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEditPrice: (product: Product) => void;
  onShowHistory?: (product: Product) => void;
}) {
  const c = colors[theme];

  const onCheck = useCallback(() => {
    void Haptics.selectionAsync();
    onToggleSelect(product.id);
  }, [onToggleSelect, product.id]);

  const prev = product.previousPrice;
  const changed = prev != null && prev > 0 && product.price > 0 && prev !== product.price;
  const up = changed && product.price > (prev || 0);
  const deltaColor = up ? c.danger : c.success;

  return (
    <View style={[styles.row, { borderTopColor: c.cardBorder }]}>
      <Pressable
        onPress={onCheck}
        hitSlop={10}
        android_ripple={{ color: 'rgba(59,130,246,0.2)', borderless: true, radius: 18 }}
      >
        <Ionicons
          name={selected ? 'checkbox' : 'square-outline'}
          size={22}
          color={selected ? c.primary : c.textMuted}
        />
      </Pressable>
      <Pressable
        style={styles.modelWrap}
        onLongPress={() => onShowHistory?.(product)}
        delayLongPress={350}
      >
        <Text style={[styles.model, { color: c.text }]} numberOfLines={2}>
          {productDisplayName(product)}
        </Text>
        {changed ? (
          <Text style={[styles.delta, { color: deltaColor }]}>
            {up ? '▲' : '▼'} was {formatPrice(prev, currency)}
          </Text>
        ) : null}
      </Pressable>
      <Pressable onPress={() => onEditPrice(product)} onLongPress={() => onShowHistory?.(product)} hitSlop={6}>
        <Text style={[styles.price, { color: product.price ? c.success : c.warning }]}>
          {formatPrice(product.price, currency) || 'Set price'}
        </Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.md, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  headerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  brand: { flex: 1, fontSize: 17, fontWeight: '700' },
  iconHit: { padding: 6 },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modelWrap: { flex: 1 },
  model: { fontSize: 14 },
  delta: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  price: { minWidth: 72, textAlign: 'right', fontWeight: '600', fontSize: 14 },
});
