'use client';

import { useEffect, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BrdDocument } from '@/lib/types';

/**
 * Hook that subscribes to real-time changes on a specific BRD document.
 * Returns the latest document state and auto-updates when sections complete.
 */
export function useBrdRealtime(documentId: string | null) {
  const [document, setDocument] = useState<BrdDocument | null>(null);
  const [sectionsReady, setSectionsReady] = useState<string[]>([]);

  const fetchDocument = useCallback(async () => {
    if (!documentId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('brd_documents')
      .select('*')
      .eq('id', documentId)
      .single();
    if (error) {
      console.error('Failed to fetch BRD document for realtime:', error.message);
      return;
    }
    if (data) {
      setDocument(data as BrdDocument);
      setSectionsReady(data.sections_completed || []);
    }
  }, [documentId]);

  useEffect(() => {
    if (!documentId) return;

    fetchDocument();

    const supabase = createClient();
    const channel = supabase
      .channel(`brd-doc-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'brd_documents',
          filter: `id=eq.${documentId}`,
        },
        (payload) => {
          const updated = payload.new as BrdDocument;
          setDocument(updated);
          setSectionsReady(updated.sections_completed || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId, fetchDocument]);

  return { document, sectionsReady };
}
