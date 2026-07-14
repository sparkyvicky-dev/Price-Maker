import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { useApp } from '../../src/context/AppProvider';
import { normalizePhone } from '../../src/lib/share';
import { colors, spacing } from '../../src/theme';

function contactDisplayName(contact: Contacts.Contact): string {
  if (contact.name?.trim()) return contact.name.trim();
  const parts = [contact.firstName, contact.middleName, contact.lastName].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return 'Unknown';
}

function phoneFromEntry(p: Contacts.PhoneNumber): string {
  return (p.number || p.digits || '').trim();
}

export default function ContactsScreen() {
  const {
    settings,
    contacts,
    addContact,
    removeContact,
    importContacts,
    handleShareAction,
  } = useApp();

  const c = colors[settings.theme];
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [importing, setImporting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = query.replace(/\D/g, '');
    if (!q) return contacts;
    return contacts.filter((x) => {
      const nameHit = x.name.toLowerCase().includes(q);
      const phoneHit =
        x.phone.toLowerCase().includes(q) ||
        (qDigits.length > 0 && normalizePhone(x.phone).includes(qDigits));
      return nameHit || phoneHit;
    });
  }, [contacts, query]);

  const importFromPhone = useCallback(async () => {
    if (importing) return;
    setImporting(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow contacts access.');
        return;
      }

      const pageSize = 300;
      let pageOffset = 0;
      let hasNextPage = true;
      const raw: Contacts.Contact[] = [];

      while (hasNextPage && pageOffset < 5000) {
        const page = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
          pageSize,
          pageOffset,
          sort: Contacts.SortTypes.FirstName,
        });
        raw.push(...(page.data || []));
        hasNextPage = !!page.hasNextPage;
        pageOffset += pageSize;
      }

      const seen = new Set<string>();
      const items: Array<{ name: string; phone: string }> = [];

      for (const contact of raw) {
        const displayName = contactDisplayName(contact);
        for (const p of contact.phoneNumbers || []) {
          const value = phoneFromEntry(p);
          if (!value) continue;
          const key = normalizePhone(value);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          items.push({ name: displayName, phone: value });
        }
      }

      if (!items.length) {
        Alert.alert('No phone numbers', 'No usable numbers found.');
        return;
      }

      await importContacts(items.slice(0, 300));
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Could not read contacts.');
    } finally {
      setImporting(false);
    }
  }, [importContacts, importing]);

  return (
    <Screen
      theme={settings.theme}
      title="Contacts"
      subtitle={`${contacts.length} dealers`}
      right={
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: c.card, opacity: importing ? 0.6 : 1 }]}
            onPress={importFromPhone}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <Ionicons name="download-outline" size={18} color={c.primary} />
            )}
          </Pressable>
          <Pressable style={[styles.iconBtn, { backgroundColor: c.primary }]} onPress={() => setAddOpen(true)}>
            <Ionicons name="add" size={20} color="#fff" />
          </Pressable>
        </View>
      }
    >
      <TextInput
        placeholder="Search contacts…"
        placeholderTextColor={c.textMuted}
        value={query}
        onChangeText={setQuery}
        style={[styles.search, { backgroundColor: c.card, color: c.text, borderColor: c.cardBorder }]}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: c.textMuted, textAlign: 'center', marginBottom: spacing.md }}>
              No dealers yet
            </Text>
            <Pressable
              style={[styles.emptyBtn, { backgroundColor: c.primary, opacity: importing ? 0.6 : 1 }]}
              onPress={importFromPhone}
              disabled={importing}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {importing ? 'Importing…' : 'Import from phone'}
              </Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: c.text }]}>{item.name}</Text>
              <Text style={{ color: c.textMuted }}>{item.phone}</Text>
            </View>
            <Pressable
              style={[styles.waBtn, { backgroundColor: '#25D366' }]}
              onPress={() => void handleShareAction({ type: 'full' }, 'whatsapp', item.phone)}
            >
              <Ionicons name="logo-whatsapp" size={22} color="#fff" />
            </Pressable>
            <Pressable onPress={() => removeContact(item.id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={c.danger} />
            </Pressable>
          </View>
        )}
      />

      <Pressable
        style={[styles.fab, { backgroundColor: c.primary }]}
        onPress={() => void handleShareAction({ type: 'full' }, 'apps')}
      >
        <Ionicons name="share-social-outline" size={22} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '700' }}>Share list</Text>
      </Pressable>

      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={[styles.modal, { backgroundColor: c.card }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Add contact</Text>
            <TextInput
              placeholder="Name"
              placeholderTextColor={c.textMuted}
              value={name}
              onChangeText={setName}
              style={[styles.input, { color: c.text, borderColor: c.cardBorder, backgroundColor: c.input }]}
            />
            <TextInput
              placeholder="+91 phone number"
              placeholderTextColor={c.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={[styles.input, { color: c.text, borderColor: c.cardBorder, backgroundColor: c.input }]}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setAddOpen(false)}>
                <Text style={{ color: c.textMuted }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!phone.trim()) return;
                  await addContact(name || phone, phone);
                  setName('');
                  setPhone('');
                  setAddOpen(false);
                }}
              >
                <Text style={{ color: c.primary, fontWeight: '700' }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  empty: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  name: { fontSize: 16, fontWeight: '600' },
  waBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 4,
  },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: spacing.lg },
  modal: { borderRadius: 16, padding: spacing.lg, gap: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
});
