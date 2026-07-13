import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Contact } from '../types';
import { colors, radius, spacing } from '../theme';

type Props = {
  visible: boolean;
  title: string;
  contacts: Contact[];
  onClose: () => void;
  onCopy: () => void;
  onWhatsApp: (contact: Contact) => void;
  theme: 'dark' | 'light';
};

export function ShareSheet({ visible, title, contacts, onClose, onCopy, onWhatsApp, theme }: Props) {
  const c = colors[theme];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: c.card }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          <Pressable style={[styles.row, { borderColor: c.cardBorder }]} onPress={onCopy}>
            <Ionicons name="copy-outline" size={22} color={c.primary} />
            <Text style={[styles.rowText, { color: c.text }]}>Copy to clipboard</Text>
          </Pressable>
          <Text style={[styles.section, { color: c.textMuted }]}>Send via WhatsApp</Text>
          {contacts.length === 0 ? (
            <Text style={{ color: c.textMuted, padding: spacing.md }}>Add contacts first</Text>
          ) : (
            contacts.map((contact) => (
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '70%' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  section: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: spacing.sm, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { fontSize: 16, fontWeight: '500' },
});
