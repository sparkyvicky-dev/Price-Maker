import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function LoadingScreen({ theme }: { theme: 'dark' | 'light' }) {
  const c = colors[theme];
  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <ActivityIndicator color={c.primary} size="large" />
      <Text style={{ color: c.textMuted, marginTop: 12 }}>Loading Price Maker…</Text>
    </View>
  );
}

export function ToastBanner({ message, type, theme }: { message: string; type: string; theme: 'dark' | 'light' }) {
  const c = colors[theme];
  const bg = type === 'error' ? c.danger : type === 'info' ? c.card : c.success;
  return (
    <View style={[styles.toast, { backgroundColor: bg }]}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toast: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 14,
    zIndex: 100,
    elevation: 8,
  },
  toastText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
