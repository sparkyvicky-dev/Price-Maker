import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Contact } from '../types';
import { normalizePhone } from '../lib/share';
import { colors, radius, spacing } from '../theme';

type Props = {
  visible: boolean;
  title: string;
  contacts: Contact[];
  onClose: () => void;
  onCopy: () => void;
  onShareApps: () => void;
  onWhatsApp: (contact: Contact) => void;
  theme: 'dark' | 'light';
};

export function ShareSheet({
  visible,
  title,
  contacts,
  onClose,
  onCopy,
  onShareApps,
  onWhatsApp,
  theme,
}: Props) {
  const c = colors[theme];
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = query.replace(/\D/g, '');
    if (!q) return contacts;
    return contacts.filter((x) => {
      const nameHit = x.name.toLowerCase().includes(q);
      const phoneHit =
        x.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
        (qDigits.length > 0 && normalizePhone(x.phone).includes(qDigits));
      return nameHit || phoneHit;
    });
  }, [contacts, query]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => setQuery('')}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: c.card }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>

          <Pressable style={[styles.row, { borderColor: c.cardBorder }]} onPress={onShareApps}>
            <Ionicons name="share-social-outline" size={22} color={c.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowText, { color: c.text }]}>Share to apps</Text>
            </View>
          </Pressable>

          <Pressable style={[styles.row, { borderColor: c.cardBorder }]} onPress={onCopy}>
            <Ionicons name="copy-outline" size={22} color={c.primary} />
            <Text style={[styles.rowText, { color: c.text }]}>Copy to clipboard</Text>
          </Pressable>

          <Text style={[styles.section, { color: c.textMuted }]}>WhatsApp a dealer</Text>
          {contacts.length > 0 ? (
            <TextInput
              placeholder="Search dealers…"
              placeholderTextColor={c.textMuted}
              value={query}
              onChangeText={setQuery}
              style={[styles.search, { backgroundColor: c.input, color: c.text, borderColor: c.cardBorder }]}
            />
          ) : null}
          <ScrollView style={{ maxHeight: 260 }} keyboardShouldPersistTaps="handled">
            {contacts.length === 0 ? (
              <Text style={{ color: c.textMuted, padding: spacing.md }}>No dealers saved</Text>
            ) : filtered.length === 0 ? (
              <Text style={{ color: c.textMuted, padding: spacing.md }}>No matching contacts.</Text>
            ) : (
              filtered.map((contact) => (
                <Pressable
                  key={contact.id}
                  style={[styles.row, { borderColor: c.cardBorder }]}
                  onPress={() => onWhatsApp(contact)}
                >
                  <Ionicons name="logo-whatsapp" size={22} color={c.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowText, { color: c.text }]}>{contact.name}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>{contact.phone}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
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
    maxHeight: '78%',
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  section: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  search: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { fontSize: 16, fontWeight: '500' },
});
