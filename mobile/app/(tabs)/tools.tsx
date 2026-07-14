import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { getAllSnapshots, searchModelHistory } from '../../src/db/database';
import { useApp } from '../../src/context/AppProvider';
import {
  addFooterTemplate,
  addTitleTemplate,
  addValidityTemplate,
  footerKey,
} from '../../src/lib/settings';
import { formatPrice, productDisplayName, productKey } from '../../src/lib/utils';
import { colors, spacing } from '../../src/theme';

type TabKey = 'list' | 'templates' | 'lookup';

export default function ToolsScreen() {
  const { settings, setSettings, exportJsonBackup, importJsonBackup, showToast } = useApp();
  const c = colors[settings.theme];
  const [tab, setTab] = useState<TabKey>('list');
  const [tplKind, setTplKind] = useState<'title' | 'validity' | 'footer'>('title');
  const [draft, setDraft] = useState('');
  const [modelQuery, setModelQuery] = useState('');
  const [modelResults, setModelResults] = useState<
    Array<{ date: string; dateKey: string; price: number; product: { brand: string; model: string; ram: string; storage: string } }>
  >([]);
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [compareOut, setCompareOut] = useState('');

  const titleTemplates = settings.titleTemplates?.length
    ? settings.titleTemplates
    : ['Price List', 'Daily Mobile Price List', 'Dealer Price Sheet'];
  const validityTemplates = settings.validityTemplates?.length
    ? settings.validityTemplates
    : ['Valid For Today Only', 'Valid Till Stock Lasts', 'Prices Subject to Change'];
  const footerTemplates = settings.footerTemplates?.length
    ? settings.footerTemplates
    : [
        { line1: 'No DOA Support', line2: 'Payment Always Prepaid', line3: 'Call or WhatsApp for Orders' },
        { line1: 'No Return No Exchange', line2: '100% Advance Payment', line3: 'WhatsApp for Orders' },
        { line1: 'GST Extra If Applicable', line2: 'Delivery Charges Extra', line3: 'Contact for Bulk Orders' },
      ];

  const activeFooterKey = footerKey(settings.footer);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'list', label: 'List' },
    { key: 'templates', label: 'Templates' },
    { key: 'lookup', label: 'Lookup' },
  ];

  const addTemplate = async () => {
    if (tplKind === 'title') {
      const next = addTitleTemplate(settings, draft);
      if (!next) return showToast('Empty or already saved', 'info');
      await setSettings({
        titleTemplates: next.titleTemplates,
        header: { ...settings.header, title: draft.trim() },
      });
    } else if (tplKind === 'validity') {
      const next = addValidityTemplate(settings, draft);
      if (!next) return showToast('Empty or already saved', 'info');
      await setSettings({
        validityTemplates: next.validityTemplates,
        header: { ...settings.header, validity: draft.trim() },
      });
    } else {
      const next = addFooterTemplate(settings, settings.footer);
      if (!next) return showToast('Already saved', 'info');
      await setSettings({ footerTemplates: next.footerTemplates });
      showToast('Footer saved');
      setDraft('');
      return;
    }
    setDraft('');
    showToast('Template added');
  };

  const runModelSearch = async () => {
    if (!modelQuery.trim()) {
      Alert.alert('Search', 'Enter a model name');
      return;
    }
    const rows = await searchModelHistory(modelQuery);
    setModelResults(rows.slice(0, 40));
    if (!rows.length) showToast('No history', 'info');
  };

  const runCompare = async () => {
    const snaps = await getAllSnapshots();
    const a = snaps.find((s) => s.dateKey === compareA || s.date === compareA);
    const b = snaps.find((s) => s.dateKey === compareB || s.date === compareB);
    if (!a || !b) {
      setCompareOut('Pick two dates from History');
      return;
    }
    const mapB = new Map(b.products.map((p) => [productKey(p), p.price]));
    const lines: string[] = [];
    for (const p of a.products) {
      const old = mapB.get(productKey(p));
      if (old != null && old !== p.price) {
        lines.push(
          `${productDisplayName(p)}: ${formatPrice(old, settings.currency)} → ${formatPrice(p.price, settings.currency)}`,
        );
      }
    }
    setCompareOut(lines.length ? lines.join('\n') : 'No changes.');
  };

  const preview = useMemo(
    () =>
      [
        settings.storeName,
        settings.location,
        settings.header.title,
        settings.header.validity,
        settings.footer.line1,
      ]
        .filter(Boolean)
        .join(' · '),
    [settings],
  );

  return (
    <Screen
      theme={settings.theme}
      title="More"
      subtitle={preview}
      right={
        <View style={styles.headerActions}>
          <Pressable style={[styles.iconBtn, { backgroundColor: c.card }]} onPress={exportJsonBackup}>
            <Ionicons name="download-outline" size={18} color={c.primary} />
          </Pressable>
          <Pressable style={[styles.iconBtn, { backgroundColor: c.card }]} onPress={importJsonBackup}>
            <Ionicons name="cloud-upload-outline" size={18} color={c.primary} />
          </Pressable>
        </View>
      }
    >
      <View style={styles.segmentWrap}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[
                styles.segment,
                { backgroundColor: active ? c.primary : c.card, borderColor: active ? c.primary : c.cardBorder },
              ]}
            >
              <Text style={{ color: active ? '#fff' : c.text, fontWeight: '700', fontSize: 13 }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {tab === 'list' && (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <View style={styles.row2}>
              <CompactField
                label="Store"
                value={settings.storeName}
                onChange={(v) => setSettings({ storeName: v })}
                c={c}
              />
              <CompactField
                label="Location"
                value={settings.location}
                onChange={(v) => setSettings({ location: v })}
                c={c}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: c.cardBorder }]} />
            <View style={styles.rowBetween}>
              <Text style={{ color: c.text, fontWeight: '600' }}>Dark theme</Text>
              <Switch
                value={settings.theme === 'dark'}
                onValueChange={(v) => setSettings({ theme: v ? 'dark' : 'light' })}
              />
            </View>
            <Text style={[styles.live, { color: c.textMuted }]}>
              {settings.header.title} · {settings.header.validity}
            </Text>
            <Text style={[styles.live, { color: c.textMuted }]} numberOfLines={2}>
              {[settings.footer.line1, settings.footer.line2, settings.footer.line3].filter(Boolean).join(' · ')}
            </Text>
          </View>
        )}

        {tab === 'templates' && (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <View style={styles.kindRow}>
              {(['title', 'validity', 'footer'] as const).map((k) => {
                const active = tplKind === k;
                const label = k === 'title' ? 'Title' : k === 'validity' ? 'Validity' : 'Footer';
                return (
                  <Pressable
                    key={k}
                    onPress={() => {
                      setTplKind(k);
                      setDraft('');
                    }}
                    style={[
                      styles.kindChip,
                      {
                        backgroundColor: active ? c.primary : c.input,
                        borderColor: active ? c.primary : c.cardBorder,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? '#fff' : c.text, fontWeight: '700', fontSize: 12 }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {tplKind !== 'footer' ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hChips}>
                  {(tplKind === 'title' ? titleTemplates : validityTemplates).map((t) => {
                    const active =
                      tplKind === 'title' ? settings.header.title === t : settings.header.validity === t;
                    return (
                      <Pressable
                        key={t}
                        onPress={() =>
                          setSettings({
                            header: {
                              ...settings.header,
                              ...(tplKind === 'title' ? { title: t } : { validity: t }),
                            },
                          })
                        }
                        style={[
                          styles.hChip,
                          {
                            backgroundColor: active ? c.primary : c.input,
                            borderColor: active ? c.primary : c.cardBorder,
                          },
                        ]}
                      >
                        <Text style={{ color: active ? '#fff' : c.text, fontSize: 12 }} numberOfLines={1}>
                          {t}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <View style={styles.addRow}>
                  <TextInput
                    placeholder={tplKind === 'title' ? 'New title…' : 'New validity…'}
                    placeholderTextColor={c.textMuted}
                    value={draft}
                    onChangeText={setDraft}
                    style={[styles.addInput, { color: c.text, borderColor: c.cardBorder, backgroundColor: c.input }]}
                  />
                  <Pressable style={[styles.addBtn, { backgroundColor: c.primary }]} onPress={addTemplate}>
                    <Ionicons name="add" size={22} color="#fff" />
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hChips}>
                  {footerTemplates.map((ft, idx) => {
                    const active = footerKey(ft) === activeFooterKey;
                    const label = ft.line1 || ft.line2 || `Footer ${idx + 1}`;
                    return (
                      <Pressable
                        key={`${idx}-${footerKey(ft)}`}
                        onPress={() => setSettings({ footer: { ...ft } })}
                        style={[
                          styles.hChip,
                          {
                            maxWidth: 160,
                            backgroundColor: active ? c.primary : c.input,
                            borderColor: active ? c.primary : c.cardBorder,
                          },
                        ]}
                      >
                        <Text style={{ color: active ? '#fff' : c.text, fontSize: 12 }} numberOfLines={1}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <CompactField
                  label="Line 1"
                  value={settings.footer.line1}
                  onChange={(v) => setSettings({ footer: { ...settings.footer, line1: v } })}
                  c={c}
                  full
                />
                <CompactField
                  label="Line 2"
                  value={settings.footer.line2}
                  onChange={(v) => setSettings({ footer: { ...settings.footer, line2: v } })}
                  c={c}
                  full
                />
                <CompactField
                  label="Line 3"
                  value={settings.footer.line3}
                  onChange={(v) => setSettings({ footer: { ...settings.footer, line3: v } })}
                  c={c}
                  full
                />
                <Pressable style={[styles.saveFooter, { backgroundColor: c.primary }]} onPress={addTemplate}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Save footer template</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {tab === 'lookup' && (
          <View style={{ gap: spacing.md }}>
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>Model price by day</Text>
              <View style={styles.addRow}>
                <TextInput
                  placeholder="Model name"
                  placeholderTextColor={c.textMuted}
                  value={modelQuery}
                  onChangeText={setModelQuery}
                  style={[styles.addInput, { color: c.text, borderColor: c.cardBorder, backgroundColor: c.input }]}
                  onSubmitEditing={runModelSearch}
                />
                <Pressable style={[styles.addBtn, { backgroundColor: c.primary }]} onPress={runModelSearch}>
                  <Ionicons name="search" size={18} color="#fff" />
                </Pressable>
              </View>
              {modelResults.slice(0, 12).map((r, i) => (
                <View key={`${r.dateKey}-${i}`} style={styles.historyRow}>
                  <Text style={{ color: c.textMuted, width: 72, fontSize: 12 }}>{r.date}</Text>
                  <Text style={{ color: c.text, flex: 1, fontSize: 13 }} numberOfLines={1}>
                    {productDisplayName(r.product as never)}
                  </Text>
                  <Text style={{ color: c.success, fontWeight: '700', fontSize: 13 }}>
                    {formatPrice(r.price, settings.currency)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>Compare days</Text>
              <View style={styles.row2}>
                <CompactField label="Date A" value={compareA} onChange={setCompareA} c={c} placeholder="YYYY-MM-DD" />
                <CompactField label="Date B" value={compareB} onChange={setCompareB} c={c} placeholder="YYYY-MM-DD" />
              </View>
              <Pressable style={[styles.saveFooter, { backgroundColor: c.primary }]} onPress={runCompare}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Compare</Text>
              </Pressable>
              {!!compareOut && (
                <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 8 }}>{compareOut}</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function CompactField({
  label,
  value,
  onChange,
  c,
  full,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  c: (typeof colors)['dark'];
  full?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={{ flex: full ? undefined : 1, marginBottom: full ? spacing.sm : 0 }}>
      <Text style={{ color: c.textMuted, fontSize: 11, marginBottom: 4, fontWeight: '600' }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        style={[
          styles.field,
          { color: c.text, borderColor: c.cardBorder, backgroundColor: c.input },
        ]}
      />
    </View>
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
  segmentWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  card: { borderWidth: 1, borderRadius: 14, padding: spacing.md, gap: spacing.sm },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  row2: { flexDirection: 'row', gap: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  live: { fontSize: 12, lineHeight: 16 },
  kindRow: { flexDirection: 'row', gap: 8 },
  kindChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  hChips: { gap: 8, paddingVertical: 4 },
  hChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
  },
  saveFooter: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
});
