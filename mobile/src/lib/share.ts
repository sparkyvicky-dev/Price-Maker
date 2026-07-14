import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Share } from 'react-native';

/** Digits only; Indian 10-digit mobiles get 91 prefix for WhatsApp. */
export function normalizePhone(phone: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.startsWith('0') && digits.length === 11) digits = `91${digits.slice(1)}`;
  return digits;
}

export async function copyText(text: string) {
  if (!text.trim()) return false;
  await Clipboard.setStringAsync(text);
  return true;
}

/** Opens the OS share sheet (WhatsApp, Telegram, Messages, Gmail, Drive, etc.). */
export async function shareTextViaApps(text: string, title = 'Price list') {
  if (!text.trim()) return false;
  const result = await Share.share(
    {
      message: text,
      title,
    },
    {
      dialogTitle: title,
      subject: title,
    },
  );
  if (result.action === Share.sharedAction) return true;
  if (result.action === Share.dismissedAction) return false;
  return true;
}

export async function openWhatsApp(phone: string, text: string) {
  const digits = normalizePhone(phone);
  const encoded = encodeURIComponent(text);
  const url = digits
    ? `whatsapp://send?phone=${digits}&text=${encoded}`
    : `whatsapp://send?text=${encoded}`;

  try {
    await Linking.openURL(url);
    return true;
  } catch {
    const webUrl = digits
      ? `https://wa.me/${digits}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    await Linking.openURL(webUrl);
    return true;
  }
}
