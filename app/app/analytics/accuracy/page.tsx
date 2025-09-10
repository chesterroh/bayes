'use client';

import { useEffect, useState } from 'react';

type Summary = {
  total: number;
  confirmed: number;
  refuted: number;
  withPreCount: number;
  avgPre: number | null;
  brierMean: number | null;
};

type Item = {
  id: string;
  statement: string;
  pre_confidence: number | null;
  verification_type: 'confirmed' | 'refuted' | null;
  verified: string | null;
  outcome: 0 | 1 | null;
  brier: number | null;
};

export default function AccuracyDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/analytics/accuracy');
        const data = await res.json();
        setSummary(data.summary);
        setItems(data.items);
      } catch (e) {
        console.error('Failed to load analytics', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fmtPct = (v: number | null | undefined) =>
    v == null ? '—' : `${(v * 100).toFixed(1)}%`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Prediction Accuracy
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Calibration and Brier score across verified hypotheses
              </p>
            </div>
            <nav className="flex gap-2">
              <a
                href="/"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Dashboard
              </a>
              <a
                href="/hypotheses"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                All Hypotheses
              </a>
              <a
                href="/evidences"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                All Evidence
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            {summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                  <div className="text-gray-500 dark:text-gray-400 text-sm">Verified Total</div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">{summary.total}</div>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                  <div className="text-gray-500 dark:text-gray-400 text-sm">Confirmed / Refuted</div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">{summary.confirmed} / {summary.refuted}</div>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                  <div className="text-gray-500 dark:text-gray-400 text-sm">Avg Pre-Verification</div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">{fmtPct(summary.avgPre)}</div>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                  <div className="text-gray-500 dark:text-gray-400 text-sm">Brier Mean</div>
                  <div className="text-2xl font-semibold text-gray-900 dark:text-white">{summary.brierMean == null ? '—' : summary.brierMean.toFixed(3)}</div>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Statement</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pre‑Conf</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Outcome</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Brier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Verified</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map((it) => (
                    <tr key={it.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400"><a href={`/hypotheses/${it.id}`}>{it.id}</a></td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{it.statement}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{fmtPct(it.pre_confidence)}</td>
                      <td className="px-4 py-3 text-sm">
                        {it.verification_type === 'confirmed' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">Confirmed</span>
                        ) : it.verification_type === 'refuted' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">Refuted</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{it.brier == null ? '—' : it.brier.toFixed(3)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{it.verified ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

