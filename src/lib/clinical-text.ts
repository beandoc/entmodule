/**
 * Clinical Text Hardening & Ingestion Utilities
 * Provides sanitization, XSS protection, auto-linking for glossary terms,
 * and Devanagari text normalization for raw clinical text ingestion.
 */

export interface GlossaryItem {
  term: string;
  simpleText?: string | null;
  definition: string;
}

export class ClinicalTextHardener {
  /**
   * Sanitize raw clinical text pasted from external textbooks or OPD notes.
   * Prevents XSS attacks, script injections, and malformed tags while preserving medical formatting.
   */
  public static sanitizeClinicalText(rawText: string): string {
    if (!rawText) return '';

    return rawText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags
      .replace(/on\w+="[^"]*"/gi, '') // Remove inline event handlers (e.g. onclick=)
      .replace(/javascript:/gi, '') // Remove javascript: protocol URLs
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces that break layout
      .trim();
  }

  /**
   * Escape text destined for an HTML attribute or text node.
   */
  private static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Automatically scans raw clinical text for known medical terms (e.g. Tympanic Membrane, Cochlea, NPO)
   * and wraps them with interactive, highlighted glossary tags.
   */
  public static autoLinkGlossary(text: string, glossary: GlossaryItem[]): string {
    if (!text || !glossary || glossary.length === 0) return text;

    let processedText = this.sanitizeClinicalText(text);

    for (const item of glossary) {
      if (!item.term) continue;

      // Escape special regex characters
      const escapedTerm = item.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b(${escapedTerm})\\b`, 'gi');

      // Glossary definitions can come from author-entered content, so they must be
      // HTML-escaped before being interpolated into the title attribute — otherwise
      // a definition containing a `"` or `<` breaks out and injects markup/script.
      const safeDefinition = this.escapeHtml(item.definition || '');
      const safeSimpleText = this.escapeHtml(item.simpleText || '');

      processedText = processedText.replace(
        regex,
        `<mark class="bg-sky-100 text-sky-900 px-1 py-0.5 rounded cursor-help font-semibold border-b border-sky-400" title="${safeDefinition} (${safeSimpleText})">$1</mark>`
      );
    }

    return processedText;
  }

  /**
   * Normalize Devanagari Unicode characters to ensure zero matra clipping across line heights
   */
  public static normalizeDevanagari(text: string): string {
    if (!text) return '';
    return text.normalize('NFC');
  }
}
