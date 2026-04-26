const XML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

export function escapeXml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => XML_ENTITIES[ch] ?? ch);
}

export function ellipsize(input: string, maxChars: number): string {
  if (input.length <= maxChars) return input;
  if (maxChars <= 1) return input.slice(0, maxChars);
  return input.slice(0, maxChars - 1).trimEnd() + '…';
}
