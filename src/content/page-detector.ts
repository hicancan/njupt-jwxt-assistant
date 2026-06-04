import type { PageType } from '../lib/types';

/**
 * Determine the NJUPT教务 page type from a URL string.
 * Matches against ASP.NET page names.
 */
export function detectPageType(url: string): PageType {
  const lower = url.toLowerCase();

  if (lower.includes('xs_jsmydpj.aspx')) {
    return 'satisfaction';
  }

  if (lower.includes('xsjxpj.aspx')) {
    return 'teaching-eval';
  }

  if (lower.includes('xs_main.aspx')) {
    return 'dashboard';
  }

  return 'unknown';
}

/**
 * Detect the effective page type by also checking iframes.
 * The NJUPT system loads evaluation pages inside iframes on xs_main.aspx.
 */
export function detectEffectivePageType(): PageType {
  const topType = detectPageType(window.location.href);

  if (topType === 'dashboard') {
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        // Try contentWindow first (reflects current URL after postback navigation)
        const cwLoc = (iframe as HTMLIFrameElement).contentWindow?.location;
        if (cwLoc) {
          const type = detectPageType(cwLoc.href);
          if (type !== 'unknown') return type;
        }
      } catch { /* still loading or cross-origin */ }

      try {
        // Fallback: check src attribute
        const type = detectPageType((iframe as HTMLIFrameElement).src);
        if (type !== 'unknown') return type;
      } catch { /* ignore */ }

      try {
        // Last resort: check if iframe has evaluation elements loaded
        const doc = (iframe as HTMLIFrameElement).contentDocument;
        if (doc && doc.getElementById('pjkc')) {
          // Check which type it is from the document URL
          const docUrl = doc.URL || doc.location?.href || '';
          const type = detectPageType(docUrl);
          return type !== 'unknown' ? type : 'satisfaction';
        }
      } catch { /* ignore */ }
    }
  }

  return topType;
}
