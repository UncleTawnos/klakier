export function parseParagraphs(text: string): string[] {
  if (!text.trim()) {
    return [];
  }

  return text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
}
