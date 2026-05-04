// Stub — video embed helper.
export function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return url;
}

export function normalizeTrustedVideoEmbedUrl(url: string): string | null {
  return getVideoEmbedUrl(url);
}
