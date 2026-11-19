/**
 * The tiny bit of Markdown the memory text supports:
 * blank line = new paragraph, single line break = line break, **bold**, *italic*.
 * Everything else is shown as plain text (HTML is escaped).
 */
export function renderMemory(text: string): string {
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return text
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n\s*\n/)
    .map((para) => {
      const html = escape(para.trim())
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
        .replace(/\n/g, '<br>');
      return `<p>${html}</p>`;
    })
    .join('');
}
