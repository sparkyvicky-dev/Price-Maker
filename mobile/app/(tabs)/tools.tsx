import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getAllSnapshots, searchModelHistory } from '../../src/db/database';
import { ToastBanner } from '../../src/components/Feedback';
import { useApp } from '../../src/context/AppProvider';
import { DEFAULT_FOOTER_TEMPLATES, DEFAULT_TITLE_TEMPLATES, DEFAULT_VALIDITY_TEMPLATES } from '../../src/lib/settings';
import { formatPrice, productDisplayName } from '../../src/lib/utils';
import { colors, spacing } from '../../src/theme';

export default function ToolsScreen() {
  const { settings, toast, setSettings, exportJsonBackup, importJsonBackup } = useApp();
  const c = colors[settings.theme];
  const [modelQuery, setModelQuery] = useState('');
  const [modelResults, setModelResults] = useState<
    Array<{ date: string; price: number; product: { brand: string; model: string } }>
  >([]);
  const [compareA, setCompareA] = useState('');
  const [compareB, setCompareB] = useState('');
  const [compareOut, setCompareOut] = useState('');

  const runModelSearch = async () => {
    const rows = await searchModelHistory(modelQuery);
    setModelResults(rows.slice(0, 30));
  };

  const runCompare = async () => {
    const snaps = await getAllSnapshots();
    const a = snaps.find((s) => s.dateKey === compareA || s.date === compareA);
    const b = snaps.find((s) => s.dateKey === compareB || s.date === compareB);
    if (!a || !b) {
      setCompareOut('Pick valid snapshot dates from history (YYYY-MM-DD).');
      return;
    }
    const mapB = new Map(b.products.map((p) => [`${p.brand}|${p.model}|${p.ram}|${p.storage}`, p.price]));
    const lines: string[] = [];
    for (const p of a.products) {
      const key = `${p.brand}|${p.model}|${p.ram}|${p.storage}`;
      const old = mapB.get(key);
      if (old != null && old !== p.price) {
        lines.push(`${productDisplayName(p)}: ${formatPrice(old, settings.currency)} → ${formatPrice(p.price, settings.currency)}`);
      }
    }
    setCompareOut(lines.length ? lines.join('\n') : 'No price changes between these snapshots.');
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Text style={[styles.title, { color: c.text }]}>More</Text>

        <Section title="Store" c={c}>
          <Field label="Store name" value={settings.storeName} onChange={(v) => setSettings({ storeName: v })} c={c} />
          <Field label="Location" value={settings.location} onChange={(v) => setSettings({ location: v })} c={c} />
          <Field
            label="List title"
            value={settings.header.title}
            onChange={(v) => setSettings({ header: { ...settings.header, title: v } })}
            c={c}
          />
          <Field
            label="Validity"
            value={settings.header.validity}
            onChange={(v) => setSettings({ header: { ...settings.header, validity: v } })}
            c={c}
          />
        </Section>

        <Section title="Footer" c={c}>
          <Field label="Line 1" value={settings.footer.line1} onChange={(v) => setSettings({ footer: { ...settings.footer, line1: v } })} c={c} />
          <Field label="Line 2" value={settings.footer.line2} onChange={(v) => setSettings({ footer: { ...settings.footer, line2: v } })} c={c} />
          <Field label="Line 3" value={settings.footer.line3} onChange={(v) => setSettings({ footer: { ...settings.footer, line3: v } })} c={c} />
        </Section>

        <Section title="Appearance" c={c}>
          <View style={styles.rowBetween}>
            <Text style={{ color: c.text }}>Dark theme</Text>
            <Switch
              value={settings.theme === 'dark'}
              onValueChange={(v) => setSettings({ theme: v ? 'dark' : 'light' })}
            />
          </View>
        </Section>

        <Section title="Backup" c={c}>
          <ToolButton label="Export JSON backup" onPress={exportJsonBackup} c={c} />
          <ToolButton label="Import JSON backup" onPress={importJsonBackup} c={c} />
        </Section>

        <Section title="Model history" c={c}>
          <TextInput
            placeholder="Search model e.g. Vivo T4"
            placeholderTextColor={c.textMuted}
            value={modelQuery}
            onChangeText={setModelQuery}
            style={[styles.input, { color: c.text, borderColor: c.cardBorder, backgroundColor: c.card }]}
          />
          <ToolButton label="Search" onPress={runModelSearch} c={c} />
          {modelResults.map((r, i) => (
            <Text key={i} style={{ color: c.textMuted, fontSize: 13 }}>
              {r.date} — {productDisplayName(r.product as never)} — {formatPrice(r.price, settings.currency)}
            </Text>
          ))}
        </Section>

        <Section title="Compare snapshots" c={c}>
          <Field label="Date A (YYYY-MM-DD)" value={compareA} onChange={setCompareA} c={c} />
          <Field label="Date B (YYYY-MM-DD)" value={compareB} onChange={setCompareB} c={c} />
          <ToolButton label="Compare" onPress={runCompare} c={c} />
          {!!compareOut && <Text style={{ color: c.text, fontSize: 13 }}>{compareOut}</Text>}
        </Section>

        <Text style={{ color: c.textMuted, fontSize: 12 }}>
          Templates: {DEFAULT_TITLE_TEMPLATES.length} titles, {DEFAULT_VALIDITY_TEMPLATES.length} validity,{' '}
          {DEFAULT_FOOTER_TEMPLATES.length} footers (editable above).
        </Text>
      </ScrollView>

      {toast && <ToastBanner message={toast.message} type={toast.type || 'success'} theme={settings.theme} />}
    </SafeAreaView>
  );
}

function Section({ title, children, c }: { title: string; children: React.ReactNode; c: (typeof colors)['dark'] }) {
  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  c,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  c: (typeof colors)['dark'];
}) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={{ color: c.textMuted, marginBottom: 4, fontSize: 12 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={[styles.input, { color: c.text, borderColor: c.cardBorder, backgroundColor: c.input }]}
      />
    </View>
  );
}

function ToolButton({ label, onPress, c }: { label: string; onPress: () => void; c: (typeof colors)['dark'] }) {
  return (
    <Pressable style={[styles.toolBtn, { backgroundColor: c.primary }]} onPress={onPress}>
      <Text style={{ color: '#fff', fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: { fontSize: 24, fontWeight: '800' },
  section: { borderWidth: 1, borderRadius: 12, padding: spacing.md, gap: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 10 },
  toolBtn: { alignItems: 'center', paddingVertical: 10, borderRadius: 10, marginTop: spacing.xs },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
