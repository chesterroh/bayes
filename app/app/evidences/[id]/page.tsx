'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Evidence } from '@/lib/types';

interface LinkedHypothesis {
  hypothesis: {
    id: string;
    statement: string;
    confidence: number;
  };
  relationship: {
    p_e_given_h: number;
    p_e_given_not_h: number;
  };
}

export default function EvidencePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [linkedHypotheses, setLinkedHypotheses] = useState<LinkedHypothesis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchEvidence();
      fetchLinkedHypotheses();
    }
  }, [id]);

  const fetchEvidence = async () => {
    try {
      const response = await fetch(`/api/evidence/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Evidence not found');
        }
        throw new Error('Failed to fetch evidence');
      }
      const data = await response.json();
      setEvidence(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedHypotheses = async () => {
    try {
      const response = await fetch(`/api/evidence/${id}/links`);
      if (!response.ok) return;
      const data = await response.json();
      setLinkedHypotheses(data);
    } catch (err) {
      console.error('Error fetching linked hypotheses:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-600 dark:text-gray-400">Loading evidence...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !evidence) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Error
            </h2>
            <p className="text-red-600 dark:text-red-400">{error || 'Evidence not found'}</p>
            <Link
              href="/evidences"
              className="mt-4 inline-block px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Back to Evidence
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                  <Link
                    href="/"
                    className="text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <div className="flex items-center">
                    <span className="mx-2 text-gray-400">/</span>
                    <Link
                      href="/evidences"
                      className="text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
                    >
                      Evidence
                    </Link>
                  </div>
                </li>
                <li>
                  <div className="flex items-center">
                    <span className="mx-2 text-gray-400">/</span>
                    <span className="text-gray-500 dark:text-gray-400">{evidence.id}</span>
                  </div>
                </li>
              </ol>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
          <div className="mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {evidence.id}
                  </h1>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(evidence.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Edit in Dashboard
              </button>
            </div>
          </div>

          {/* Content Section */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Content
            </h2>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {evidence.content}
              </p>
            </div>
          </div>

          {/* Source URL Section */}
          {evidence.source_url && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Source
              </h2>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                <a
                  href={evidence.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span className="break-all">{evidence.source_url}</span>
                </a>
              </div>
            </div>
          )}

          {/* Metadata Section */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Metadata
            </h2>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Evidence ID</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {evidence.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Timestamp</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {new Date(evidence.timestamp).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Permanent Link Section */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                  Permanent Link
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300 font-mono break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/evidences/${evidence.id}` : ''}
                </p>
              </div>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(`${window.location.origin}/evidences/${evidence.id}`);
                  }
                }}
                className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700"
              >
                Copy Link
              </button>
            </div>
          </div>

          {/* Related Hypotheses Section */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Linked Hypotheses
            </h2>
            {linkedHypotheses.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>No hypotheses linked. Link hypotheses from the <Link href="/" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">main dashboard</Link>.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {linkedHypotheses.map((link) => (
                  <div key={link.hypothesis.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <Link
                          href={`/hypotheses/${link.hypothesis.id}`}
                          className="text-sm font-mono text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {link.hypothesis.id}
                        </Link>
                        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                          {link.hypothesis.statement}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Current confidence:
                          </span>
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {(link.hypothesis.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            P(E|H)
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {(link.relationship.p_e_given_h * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                          <div 
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${link.relationship.p_e_given_h * 100}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Likelihood if hypothesis is true
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            P(E|¬H)
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {(link.relationship.p_e_given_not_h * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                          <div 
                            className="bg-orange-500 h-1.5 rounded-full"
                            style={{ width: `${link.relationship.p_e_given_not_h * 100}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Likelihood if hypothesis is false
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}