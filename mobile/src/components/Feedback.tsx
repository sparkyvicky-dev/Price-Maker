import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const TOAST_IN = 90;
const TOAST_OUT = 70;
const SWIPE_DIST = 28;
const SWIPE_VEL = 0.55;

export function LoadingScreen({ theme }: { theme: 'dark' | 'light' }) {
  const c = colors[theme];
  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <ActivityIndicator color={c.primary} size="large" />
      <Text style={{ color: c.textMuted, marginTop: 12 }}>Loading Price Maker…</Text>
    </View>
  );
}

export function ToastBanner({
  message,
  type,
  theme,
  onDismiss,
}: {
  message: string;
  type: string;
  theme: 'dark' | 'light';
  onDismiss: () => void;
}) {
  const c = colors[theme];
  const bg = type === 'error' ? c.danger : type === 'info' ? '#334155' : c.success;
  const opacity = useRef(new Animated.Value(0)).current;
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 12 })).current;
  const dismissing = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const finishDismiss = useRef((dx: number, dy: number) => {
    if (dismissing.current) return;
    dismissing.current = true;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: TOAST_OUT, useNativeDriver: true }),
      Animated.timing(pos, {
        toValue: { x: dx, y: dy },
        duration: TOAST_OUT,
        useNativeDriver: true,
      }),
    ]).start(() => onDismissRef.current());
  });

  useEffect(() => {
    dismissing.current = false;
    opacity.setValue(0);
    pos.setValue({ x: 0, y: 12 });
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: TOAST_IN, useNativeDriver: true }),
      Animated.timing(pos, { toValue: { x: 0, y: 0 }, duration: TOAST_IN, useNativeDriver: true }),
    ]).start();
  }, [message, opacity, pos]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
      onPanResponderMove: (_, g) => {
        pos.setValue({ x: g.dx, y: g.dy });
        const fade = 1 - Math.min(1, Math.hypot(g.dx, g.dy) / 120);
        opacity.setValue(Math.max(0.25, fade));
      },
      onPanResponderRelease: (_, g) => {
        const dist = Math.hypot(g.dx, g.dy);
        const flung = Math.abs(g.vx) > SWIPE_VEL || Math.abs(g.vy) > SWIPE_VEL;
        if (dist > SWIPE_DIST || flung) {
          const scale = 2.2;
          const outX = g.dx * scale || (g.dx >= 0 ? 80 : -80);
          const outY = g.dy * scale || (g.dy >= 0 ? 40 : -40);
          finishDismiss.current(outX, outY);
          return;
        }
        Animated.parallel([
          Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: true, speed: 50, bounciness: 0 }),
          Animated.timing(opacity, { toValue: 1, duration: 60, useNativeDriver: true }),
        ]).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
        opacity.setValue(1);
      },
    }),
  ).current;

  return (
    <Animated.View
      {...pan.panHandlers}
      style={[
        styles.toast,
        {
          backgroundColor: bg,
          opacity,
          transform: pos.getTranslateTransform(),
        },
      ]}
    >
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
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
    padding: 12,
    zIndex: 100,
    elevation: 8,
  },
  toastText: { color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 14 },
});
