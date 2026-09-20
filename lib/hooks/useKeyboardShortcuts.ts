'use client';

import { useEffect } from 'react';

type ShortcutHandler = (event: KeyboardEvent) => void;

interface Shortcut {
  keys: string;
  handler: ShortcutHandler;
}

function isTextInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  const editable =
    target.isContentEditable ||
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select';
  return editable;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTextInput(event.target)) return;

      const keyCombo = [
        event.metaKey ? 'meta' : null,
        event.ctrlKey ? 'ctrl' : null,
        event.shiftKey ? 'shift' : null,
        event.altKey ? 'alt' : null,
        event.key.length === 1 ? event.key.toLowerCase() : event.key,
      ]
        .filter(Boolean)
        .join('+');

      shortcuts.forEach((shortcut) => {
        if (shortcut.keys === keyCombo) {
          shortcut.handler(event);
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}


