import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Copia texto: usa el portapapeles moderno y, si el navegador lo bloquea, el método clásico */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* sigue con el método clásico */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
    // dentro del panel abierto, para que no le saque el foco
    const host = (document.activeElement?.closest('[role=dialog]') as HTMLElement) ?? document.body;
    host.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function scrollToTop(behavior: ScrollBehavior = 'instant') {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, left: 0, behavior });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}
