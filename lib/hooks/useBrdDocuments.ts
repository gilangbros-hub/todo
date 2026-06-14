'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getBrdDocuments, deleteBrdDocument } from '@/lib/services/brd';
import { useRenata } from '@/lib/renata/context';
import { BrdDocument } from '@/lib/types';

interface UseBrdDocumentsOptions {
  limit?: number;
}

export function useBrdDocuments(options: UseBrdDocumentsOptions = {}) {
  const { limit } = options;
  const router = useRouter();
  const { setActiveDocument } = useRenata();
  const [documents, setDocuments] = useState<BrdDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const docs = await getBrdDocuments();
      setDocuments(limit ? docs.slice(0, limit) : docs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load documents';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      setError(null);
      await deleteBrdDocument(id);
      await fetchDocuments();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete document';
      setError(msg);
    }
  }, [fetchDocuments]);

  const handleView = useCallback((doc: BrdDocument) => {
    setActiveDocument(doc);
    router.push('/renata/results');
  }, [setActiveDocument, router]);

  return { documents, isLoading, error, fetchDocuments, handleDelete, handleView };
}
