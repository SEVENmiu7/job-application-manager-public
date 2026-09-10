export function safeSpreadsheetText(value?: string): string {
  const text: string = value || '';
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}
