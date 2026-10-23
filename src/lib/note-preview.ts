export function notePreview(content: string): string {
  return content.length > 160 ? `${content.slice(0, 160)}…` : content;
}
