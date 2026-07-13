import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

export async function copyText(text: string) {
  if (!text.trim()) return false;
  await Clipboard.setStringAsync(text);
  return true;
}

export async function openWhatsApp(phone: string, text: string) {
  const digits = normalizePhone(phone);
  const encoded = encodeURIComponent(text);
  const url = digits
    ? `whatsapp://send?phone=${digits}&text=${encoded}`
    : `whatsapp://send?text=${encoded}`;

  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
    return true;
  }

  const webUrl = digits
    ? `https://wa.me/${digits}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  await Linking.openURL(webUrl);
  return true;
}
