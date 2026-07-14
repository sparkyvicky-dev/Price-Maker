import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Product } from '../types';
import { formatPrice, productDisplayName } from '../lib/utils';
import { colors, radius, spacing } from '../theme';

type Props = {
  product: Product | null;
  currency: string;
  theme: 'dark' | 'light';
  onClose: () => void;
  onSave: (id: string, price: number) => void;
};

/** Always sits above the keyboard so you see the model while typing. */
export function PriceEditSheet({ product, currency, theme, onClose, onSave }: Props) {
  const c = colors[theme];
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (product) setDraft(product.price > 0 ? String(product.price) : '');
  }, [product]);

  if (!product) return null;

  const save = () => {
    const val = parseInt(draft.replace(/\D/g, ''), 10) || 0;
    onSave(product.id, val);
    onClose();
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>Set price</Text>
          <Text style={[styles.model, { color: c.text }]} numberOfLines={2}>
            {productDisplayName(product)}
          </Text>
          {product.previousPrice ? (
            <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: spacing.sm }}>
              Yesterday {formatPrice(product.previousPrice, currency)}
            </Text>
          ) : null}
          <TextInput
            value={draft}
            onChangeText={setDraft}
            keyboardType="number-pad"
            autoFocus
            selectTextOnFocus
            placeholder="0"
            placeholderTextColor={c.textMuted}
            style={[styles.input, { color: c.text, borderColor: c.primary, backgroundColor: c.input }]}
            onSubmitEditing={save}
          />
          <View style={styles.actions}>
            <Pressable style={[styles.btn, { backgroundColor: c.input }]} onPress={onClose}>
              <Text style={{ color: c.textMuted, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.btn, { backgroundColor: c.primary, flex: 1 }]} onPress={save}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  model: { fontSize: 17, fontWeight: '700' },
  input: {
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
});
