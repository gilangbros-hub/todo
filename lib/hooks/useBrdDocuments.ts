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

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const docs = await getBrdDocuments();
      setDocuments(limit ? docs.slice(0, limit) : docs);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteBrdDocument(id);
      await fetchDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  }, [fetchDocuments]);

  const handleView = useCallback((doc: BrdDocument) => {
    setActiveDocument(doc);
    router.push('/renata/results');
  }, [setActiveDocument, router]);

  return { documents, isLoading, fetchDocuments, handleDelete, handleView };
}
