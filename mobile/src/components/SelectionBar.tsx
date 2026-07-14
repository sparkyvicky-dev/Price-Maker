import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

type Props = {
  selectedCount: number;
  theme: 'dark' | 'light';
  onClear: () => void;
  onSetPrice: () => void;
  onCopy: () => void;
  onShare: () => void;
};

/** Fixed tray above the tab bar — no drag chrome. */
export function SelectionBar({
  selectedCount,
  theme,
  onClear,
  onSetPrice,
  onCopy,
  onShare,
}: Props) {
  const c = colors[theme];
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8) + 56;

  return (
    <View
      style={[
        styles.wrap,
        {
          bottom,
          backgroundColor: c.card,
          borderColor: c.cardBorder,
        },
      ]}
    >
      <Pressable onPress={onClear} hitSlop={8}>
        <Text style={{ color: c.textMuted, fontWeight: '600' }}>Clear</Text>
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          style={[styles.barBtn, { backgroundColor: c.input, borderColor: c.cardBorder }]}
          onPress={onSetPrice}
        >
          <Text style={[styles.barBtnText, { color: c.text }]}>Set ₹</Text>
        </Pressable>
        <Pressable
          style={[styles.barBtn, { backgroundColor: c.input, borderColor: c.cardBorder }]}
          onPress={onCopy}
        >
          <Ionicons name="copy-outline" size={16} color={c.primary} />
          <Text style={[styles.barBtnText, { color: c.primary }]}>Copy {selectedCount}</Text>
        </Pressable>
        <Pressable style={[styles.barBtn, { backgroundColor: c.primary }]} onPress={onShare}>
          <Ionicons name="share-social-outline" size={16} color="#fff" />
          <Text style={[styles.barBtnText, { color: '#fff' }]}>Share</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 50,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  barBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  barBtnText: { fontWeight: '700', fontSize: 12 },
});
