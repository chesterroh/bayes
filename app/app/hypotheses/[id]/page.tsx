'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Hypothesis, Evidence } from '@/lib/types';
import { evidenceApi, hypothesisApi } from '@/lib/api-client';

export default function HypothesisPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [hypothesis, setHypothesis] = useState<Hypothesis | null>(null);
  type LinkedEvidence = {
    evidence: Evidence;
    relationship: { p_e_given_h: number; p_e_given_not_h: number };
  };
  const [linkedEvidence, setLinkedEvidence] = useState<LinkedEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, { p_e_given_h: number; p_e_given_not_h: number }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (id) {
      fetchHypothesis();
      fetchLinkedEvidence();
    }
  }, [id]);

  const fetchHypothesis = async () => {
    try {
      const response = await fetch(`/api/hypotheses/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Hypothesis not found');
        }
        throw new Error('Failed to fetch hypothesis');
      }
      const data = await response.json();
      setHypothesis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedEvidence = async () => {
    try {
      const response = await fetch(`/api/hypotheses/${id}/links`);
      if (!response.ok) {
        if (response.status === 404) throw new Error('Hypothesis not found');
        throw new Error('Failed to fetch linked evidence');
      }
      const data = (await response.json()) as LinkedEvidence[];
      setLinkedEvidence(data);
    } catch (err) {
      console.error('Error fetching linked evidence:', err);
    }
  };

  const getStatusBadge = (h: Hypothesis) => {
    if (!h.verification_type) {
      return <span className="px-3 py-1 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-full dark:bg-yellow-900 dark:text-yellow-200">⏳ Pending</span>;
    }
    if (h.verification_type === 'confirmed') {
      return <span className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-200">✓ Confirmed</span>;
    }
    return <span className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-full dark:bg-red-900 dark:text-red-200">✗ Refuted</span>;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    if (confidence >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const isLocked = !!hypothesis?.verified;

  async function saveLikelihoods(evId: string) {
    const vals = editing[evId];
    if (!vals || !hypothesis) return;
    try {
      setSaving(prev => ({ ...prev, [evId]: true }));
      await evidenceApi.updateLink(evId, hypothesis.id, {
        p_e_given_h: vals.p_e_given_h / 100,
        p_e_given_not_h: vals.p_e_given_not_h / 100,
      });
      // Refresh hypothesis and links to reflect recompute
      const fresh = await hypothesisApi.getById(hypothesis.id);
      setHypothesis(fresh);
      await fetchLinkedEvidence();
      setEditing(prev => ({ ...prev, [evId]: undefined as any }));
    } catch (e) {
      console.error('Failed to update link:', e);
      alert('Failed to update likelihoods');
    } finally {
      setSaving(prev => ({ ...prev, [evId]: false }));
    }
  }

  async function unlinkEvidence(evId: string) {
    if (!hypothesis) return;
    if (!confirm('Remove link between this evidence and the hypothesis?')) return;
    try {
      setSaving(prev => ({ ...prev, [evId]: true }));
      await evidenceApi.deleteLink(evId, hypothesis.id);
      const fresh = await hypothesisApi.getById(hypothesis.id);
      setHypothesis(fresh);
      await fetchLinkedEvidence();
    } catch (e) {
      console.error('Failed to unlink evidence:', e);
      alert('Failed to unlink');
    } finally {
      setSaving(prev => ({ ...prev, [evId]: false }));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-600 dark:text-gray-400">Loading hypothesis...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !hypothesis) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Error
            </h2>
            <p className="text-red-600 dark:text-red-400">{error || 'Hypothesis not found'}</p>
            <Link
              href="/hypotheses"
              className="mt-4 inline-block px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Back to Hypotheses
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
                      href="/hypotheses"
                      className="text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white"
                    >
                      Hypotheses
                    </Link>
                  </div>
                </li>
                <li>
                  <div className="flex items-center">
                    <span className="mx-2 text-gray-400">/</span>
                    <span className="text-gray-500 dark:text-gray-400">{hypothesis.id}</span>
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
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {hypothesis.id}
                  </h1>
                  {getStatusBadge(hypothesis)}
                </div>
                <p className="text-lg text-gray-700 dark:text-gray-300">
                  {hypothesis.statement}
                </p>
              </div>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Edit in Dashboard
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Confidence Section */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Confidence Level
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(hypothesis.confidence * 100).toFixed(1)}%
                  </span>
                  {hypothesis.base_confidence && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Base: {(hypothesis.base_confidence * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                  <div 
                    className={`h-3 rounded-full ${getConfidenceColor(hypothesis.confidence)}`}
                    style={{ width: `${hypothesis.confidence * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Metadata Section */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Metadata
              </h2>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Last Updated</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(hypothesis.updated).toLocaleString()}
                  </dd>
                </div>
                {hypothesis.verified && (
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Verified Date</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(hypothesis.verified).toLocaleString()}
                    </dd>
                  </div>
                )}
                {hypothesis.pre_verification_confidence !== undefined && hypothesis.verified && (
                  <div>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Pre-verification Confidence</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-white">
                      {(hypothesis.pre_verification_confidence * 100).toFixed(1)}%
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Permanent Link Section */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                  Permanent Link
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-300 font-mono break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/hypotheses/${hypothesis.id}` : ''}
                </p>
              </div>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(`${window.location.origin}/hypotheses/${hypothesis.id}`);
                  }
                }}
                className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700"
              >
                Copy Link
              </button>
            </div>
          </div>

          {/* Related Evidence Section */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Linked Evidence
            </h2>
            {linkedEvidence.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                No evidence linked to this hypothesis.
              </div>
            ) : (
              <div className="space-y-4">
                {linkedEvidence.map((link) => {
                  const ev = link.evidence;
                  const rel = link.relationship;
                  const edit = editing[ev.id];
                  const isSaving = !!saving[ev.id];
                  return (
                    <div key={ev.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Link
                            href={`/evidences/${ev.id}`}
                            className="text-sm font-mono text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {ev.id}
                          </Link>
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                            {ev.content}
                          </p>
                        </div>
                        <div className="ml-3 flex gap-2">
                          {!isLocked && (
                            <>
                              {edit ? (
                                <button
                                  disabled={isSaving}
                                  onClick={() => saveLikelihoods(ev.id)}
                                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                  Save
                                </button>
                              ) : (
                                <button
                                  disabled={isSaving}
                                  onClick={() =>
                                    setEditing((prev) => ({
                                      ...prev,
                                      [ev.id]: {
                                        p_e_given_h: Math.round(rel.p_e_given_h * 100),
                                        p_e_given_not_h: Math.round(rel.p_e_given_not_h * 100),
                                      },
                                    }))
                                  }
                                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                  Edit Likelihoods
                                </button>
                              )}
                              <button
                                disabled={isSaving}
                                onClick={() => unlinkEvidence(ev.id)}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                              >
                                Unlink
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400">P(E|H)</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {((edit?.p_e_given_h ?? rel.p_e_given_h * 100)).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${(edit ? edit.p_e_given_h : rel.p_e_given_h * 100)}%` }}
                            />
                          </div>
                          {edit && !isLocked && (
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={edit.p_e_given_h}
                              onChange={(e) =>
                                setEditing((prev) => ({
                                  ...prev,
                                  [ev.id]: { ...prev[ev.id], p_e_given_h: parseInt(e.target.value) },
                                }))
                              }
                              className="w-full mt-1"
                            />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600 dark:text-gray-400">P(E|¬H)</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {((edit?.p_e_given_not_h ?? rel.p_e_given_not_h * 100)).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                            <div
                              className="bg-orange-500 h-1.5 rounded-full"
                              style={{ width: `${(edit ? edit.p_e_given_not_h : rel.p_e_given_not_h * 100)}%` }}
                            />
                          </div>
                          {edit && !isLocked && (
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={edit.p_e_given_not_h}
                              onChange={(e) =>
                                setEditing((prev) => ({
                                  ...prev,
                                  [ev.id]: { ...prev[ev.id], p_e_given_not_h: parseInt(e.target.value) },
                                }))
                              }
                              className="w-full mt-1"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
