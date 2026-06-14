'use client';

import { useRouter } from 'next/navigation';
import { History, Loader, ExternalLink, Trash2 } from 'lucide-react';
import { useBrdDocuments } from '@/lib/hooks/useBrdDocuments';
import { StatusBadge } from '@/components/renata/StatusBadge';

export default function HistoryPage() {
  const router = useRouter();
  const { documents, isLoading, handleDelete, handleView } = useBrdDocuments();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="font-outfit text-2xl font-bold text-sys-text">Analysis History</h2>
        <p className="font-geist text-sm text-sys-muted mt-1">All uploaded BRD documents and their analysis results.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader size={32} className="animate-spin text-sys-muted" />
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <History size={64} className="text-sys-faint mb-4" />
          <p className="font-geist text-sys-muted">No previous analyses found.</p>
          <button
            onClick={() => router.push('/renata/mission-control')}
            className="mt-4 px-6 py-2.5 bg-sys-primary text-white rounded-xl font-geist text-sm font-semibold hover:bg-sys-primary/90 transition-colors cursor-pointer"
          >
            Upload Your First BRD
          </button>
        </div>
      ) : (
        <div className="bg-sys-surface border border-sys-border rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-sys-border text-sys-muted font-geist text-xs uppercase tracking-wider">
                <th className="py-3 px-4 font-medium">Project</th>
                <th className="py-3 px-4 font-medium hidden sm:table-cell">Status</th>
                <th className="py-3 px-4 font-medium hidden md:table-cell">Date</th>
                <th className="py-3 px-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="font-geist text-sm">
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-sys-border hover:bg-sys-bg transition-colors group">
                  <td className="py-3 px-4">
                    <span className="text-sys-text font-medium">{doc.title}</span>
                    <span className="block text-sys-faint text-xs sm:hidden mt-0.5">
                      {doc.analysis_status} · {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <StatusBadge status={doc.analysis_status} />
                  </td>
                  <td className="py-3 px-4 text-sys-muted text-xs hidden md:table-cell">
                    {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleView(doc)}
                        className="p-2 text-sys-muted hover:text-sys-primary transition-colors cursor-pointer"
                        title="View"
                      >
                        <ExternalLink size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-sys-muted hover:text-sys-error transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
