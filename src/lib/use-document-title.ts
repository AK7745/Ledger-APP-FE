'use client';

import { useEffect } from 'react';

// Chrome names a "Save as PDF" file after document.title, so every printed
// document sets its own — otherwise every invoice saves as "Ledger.pdf".
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
