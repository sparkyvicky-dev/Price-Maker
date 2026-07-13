import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { ToastBanner } from '../../src/components/Feedback';
import { ShareSheet } from '../../src/components/ShareSheet';
import { useApp } from '../../src/context/AppProvider';
import { openWhatsApp } from '../../src/lib/share';
import { buildFullMessage } from '../../src/lib/preview';
import { copyText } from '../../src/lib/share';
import { colors, spacing } from '../../src/theme';

export default function ContactsScreen() {
  const {
    settings,
    contacts,
    products,
    displayDate,
    toast,
    addContact,
    removeContact,
    importContacts,
    getSharePayload,
  } = useApp();

  const c = colors[settings.theme];
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [shareOpen, setShareOpen] = useState(false);

  const filtered = contacts.filter((x) => x.name.toLowerCase().includes(query.toLowerCase()) || x.phone.includes(query));

  const importFromPhone = useCallback(async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow contacts access to import dealers.');
      return;
    }
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    });
    const items = data
      .flatMap((contact) =>
        (contact.phoneNumbers || []).map((p) => ({
          name: contact.name || 'Unknown',
          phone: p.number || '',
        })),
      )
      .filter((x) => x.phone);
    if (!items.length) {
      Alert.alert('No contacts', 'No phone numbers found in your contacts.');
      return;
    }
    await importContacts(items.slice(0, 200));
  }, [importContacts]);

  const fullMessage = buildFullMessage(products, settings, displayDate);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Contacts</Text>
        <Pressable style={[styles.btn, { backgroundColor: c.card }]} onPress={importFromPhone}>
          <Ionicons name="download-outline" size={18} color={c.primary} />
          <Text style={{ color: c.primary, fontWeight: '600' }}>Import</Text>
        </Pressable>
        <Pressable style={[styles.btn, { backgroundColor: c.primary }]} onPress={() => setAddOpen(true)}>
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </View>

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
        contentContainerStyle={{ padding: spacing.lg }}
        ListEmptyComponent={<Text style={{ color: c.textMuted, textAlign: 'center' }}>Import or add dealer contacts.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: c.text }]}>{item.name}</Text>
              <Text style={{ color: c.textMuted }}>{item.phone}</Text>
            </View>
            <Pressable
              style={[styles.waBtn, { backgroundColor: '#25D366' }]}
              onPress={() => openWhatsApp(item.phone, fullMessage)}
            >
              <Ionicons name="logo-whatsapp" size={22} color="#fff" />
            </Pressable>
            <Pressable onPress={() => removeContact(item.id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={c.danger} />
            </Pressable>
          </View>
        )}
      />

      <Pressable style={[styles.fab, { backgroundColor: c.primary }]} onPress={() => setShareOpen(true)}>
        <Ionicons name="share-social-outline" size={22} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '700' }}>Share list</Text>
      </Pressable>

      <ShareSheet
        visible={shareOpen}
        title="Full price list"
        contacts={contacts}
        theme={settings.theme}
        onClose={() => setShareOpen(false)}
        onCopy={async () => {
          const payload = getSharePayload({ type: 'full' });
          if (payload) await copyText(payload.text);
          setShareOpen(false);
        }}
        onWhatsApp={async (contact) => {
          await openWhatsApp(contact.phone, fullMessage);
          setShareOpen(false);
        }}
      />

      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={[styles.modal, { backgroundColor: c.card }]}>
            <Text style={[styles.title, { color: c.text }]}>Add contact</Text>
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

      {toast && <ToastBanner message={toast.message} type={toast.type || 'success'} theme={settings.theme} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  title: { flex: 1, fontSize: 24, fontWeight: '800' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  search: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: 10 },
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
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 10 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
});
