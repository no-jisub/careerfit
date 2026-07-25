import { useCallback, useEffect, useState } from 'react';
import { mergeNotificationReadIds } from '../utils/notifications';

const READ_STATE_EVENT = 'careerfit:notification-read-state';
const storageKeyFor = recipientUid => `careerfit_read_notifications_${recipientUid}`;

function readStoredIds(recipientUid) {
  if (!recipientUid || typeof localStorage === 'undefined') return [];
  try {
    const stored = JSON.parse(localStorage.getItem(storageKeyFor(recipientUid)));
    return Array.isArray(stored) ? stored.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

export default function useNotificationReadState(recipientUid) {
  const [readIds, setReadIds] = useState(() => readStoredIds(recipientUid));

  useEffect(() => {
    setReadIds(readStoredIds(recipientUid));
    if (!recipientUid || typeof window === 'undefined') return undefined;

    const storageKey = storageKeyFor(recipientUid);
    const syncReadState = event => {
      if (event.type === 'storage' && event.key !== storageKey) return;
      if (event.type === READ_STATE_EVENT && event.detail?.recipientUid !== recipientUid) return;
      setReadIds(readStoredIds(recipientUid));
    };

    window.addEventListener('storage', syncReadState);
    window.addEventListener(READ_STATE_EVENT, syncReadState);
    return () => {
      window.removeEventListener('storage', syncReadState);
      window.removeEventListener(READ_STATE_EVENT, syncReadState);
    };
  }, [recipientUid]);

  const markReadIds = useCallback(ids => {
    if (!recipientUid || typeof localStorage === 'undefined') return [];
    const next = mergeNotificationReadIds(readStoredIds(recipientUid), ids);
    localStorage.setItem(storageKeyFor(recipientUid), JSON.stringify(next));
    setReadIds(next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(READ_STATE_EVENT, { detail: { recipientUid } }));
    }
    return next;
  }, [recipientUid]);

  return { readIds, markReadIds };
}
