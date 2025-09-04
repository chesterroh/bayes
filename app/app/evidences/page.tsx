'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Evidence } from '@/lib/types';

interface EvidenceWithLinks extends Evidence {
  linkCount?: number;
}

export default function EvidencesPage() {
  const [evidence, setEvidence] = useState<EvidenceWithLinks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvidence();
  }, []);

  const fetchEvidence = async () => {
    try {
      const response = await fetch('/api/evidence');
      if (!response.ok) throw new Error('Failed to fetch evidence');
      const data = await response.json();
      
      // Fetch link counts for each evidence
      const evidenceWithLinks = await Promise.all(
        data.map(async (ev: Evidence) => {
          try {
            const linkResponse = await fetch(`/api/evidence/${ev.id}/links`);
            if (linkResponse.ok) {
              const links = await linkResponse.json();
              return { ...ev, linkCount: links.length };
            }
          } catch {
            // Ignore errors for individual link fetches
          }
          return ev;
        })
      );
      
      setEvidence(evidenceWithLinks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
    } catch {
      return url;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-600 dark:text-gray-400">Loading evidence...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-red-600 dark:text-red-400">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Evidence</h1>
            <div className="flex gap-4">
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Back to Dashboard
              </Link>
              <Link
                href="/hypotheses"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                View Hypotheses
              </Link>
            </div>
          </div>
        </div>

        {evidence.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <p className="text-gray-600 dark:text-gray-400">No evidence found</p>
            <Link
              href="/"
              className="mt-4 inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Add First Evidence
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {evidence.map((item) => (
              <Link
                key={item.id}
                href={`/evidences/${item.id}`}
                className="block"
              >
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                        {item.id}
                      </span>
                      {item.linkCount && item.linkCount > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {item.linkCount} {item.linkCount === 1 ? 'hypothesis' : 'hypotheses'} linked
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-gray-700 dark:text-gray-300 line-clamp-3">
                      {truncateText(item.content)}
                    </p>
                    
                    {item.source_url && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span className="text-sm text-blue-600 dark:text-blue-400 truncate">
                          {formatUrl(item.source_url)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}