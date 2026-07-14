import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '../src/context/AppProvider';
import { ToastBanner } from '../src/components/Feedback';

function GlobalToast() {
  const { toast, settings, dismissToast } = useApp();
  if (!toast) return null;
  return (
    <ToastBanner
      message={toast.message}
      type={toast.type || 'success'}
      theme={settings.theme}
      onDismiss={dismissToast}
    />
  );
}

function ThemedStatusBar() {
  const { settings } = useApp();
  return <StatusBar style={settings.theme === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <AppProvider>
      <ThemedStatusBar />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 120,
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
      <GlobalToast />
    </AppProvider>
  );
}
