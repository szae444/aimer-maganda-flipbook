import { createContext } from 'react';

/** Current on-screen scale of the book (page px → screen px). A ref so gestures always read the latest value. */
export const ScaleContext = createContext<{ current: number }>({ current: 1 });

/**
 * Tracks a pointer drag on window. `onStart` fires once the pointer has actually moved
 * a few px, so plain clicks never create undo entries.
 */
export function trackDrag(
  e: { clientX: number; clientY: number },
  handlers: {
    onStart?: () => void;
    onMove: (dx: number, dy: number, ev: PointerEvent) => void;
    onEnd?: (moved: boolean, ev: PointerEvent) => void;
  },
  threshold = 3,
) {
  const sx = e.clientX;
  const sy = e.clientY;
  let moved = false;
  const move = (ev: PointerEvent) => {
    const dx = ev.clientX - sx;
    const dy = ev.clientY - sy;
    if (!moved) {
      if (Math.hypot(dx, dy) < threshold) return;
      moved = true;
      handlers.onStart?.();
    }
    handlers.onMove(dx, dy, ev);
  };
  const up = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    document.body.classList.remove('is-dragging');
    handlers.onEnd?.(moved, ev);
  };
  document.body.classList.add('is-dragging');
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

export function pickFile(accept = 'image/*'): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
