'use client';

import { useState, useEffect } from 'react';
import { hypothesisApi, evidenceApi, type Hypothesis, type Evidence } from '@/lib/api-client';
import HypothesisList from '@/components/HypothesisList';
import AddHypothesisForm from '@/components/AddHypothesisForm';
import EvidenceList from '@/components/EvidenceList';
import AddEvidenceForm from '@/components/AddEvidenceForm';

export default function Dashboard() {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hypotheses' | 'evidence'>('hypotheses');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [hyp, ev] = await Promise.all([
        hypothesisApi.getAll(),
        evidenceApi.getAll()
      ]);
      
      // Deduplicate hypotheses by ID (keep the latest)
      const uniqueHyp = hyp.reduce((acc: Hypothesis[], current) => {
        const existing = acc.find(h => h.id === current.id);
        if (!existing) {
          acc.push(current);
        } else if (new Date(current.updated) > new Date(existing.updated)) {
          // Replace with newer version
          const index = acc.indexOf(existing);
          acc[index] = current;
        }
        return acc;
      }, []);
      
      // Deduplicate evidence by ID
      const uniqueEv = ev.reduce((acc: Evidence[], current) => {
        const existing = acc.find(e => e.id === current.id);
        if (!existing) {
          acc.push(current);
        }
        return acc;
      }, []);
      
      setHypotheses(uniqueHyp);
      setEvidence(uniqueEv);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHypothesisAdded = async (hypothesis: Hypothesis) => {
    setHypotheses([hypothesis, ...hypotheses]);
  };

  const handleEvidenceAdded = async (newEvidence: Evidence) => {
    setEvidence([newEvidence, ...evidence]);
  };

  const handleHypothesisUpdated = async (updated: Hypothesis) => {
    setHypotheses(hypotheses.map(h => 
      h.id === updated.id ? updated : h
    ));
  };

  const handleHypothesisDeleted = async (id: string) => {
    setHypotheses(hypotheses.filter(h => h.id !== id));
  };

  const handleEvidenceUpdated = async (updated: Evidence) => {
    setEvidence(evidence.map(e => 
      e.id === updated.id ? updated : e
    ));
  };

  const handleEvidenceDeleted = async (id: string) => {
    setEvidence(evidence.filter(e => e.id !== id));
  };

  const handleHypothesesRecomputed = async (updates: Array<{ id: string; updated: number | null }>) => {
    if (!updates || updates.length === 0) return;
    // Fetch the latest version for the affected hypotheses to sync timestamps and fields
    try {
      const refreshed = await Promise.all(
        updates.map(u => hypothesisApi.getById(u.id).catch(() => null as any))
      );
      const valid = refreshed.filter(Boolean) as Hypothesis[];
      if (valid.length > 0) {
        setHypotheses(prev => {
          const map = new Map(prev.map(h => [h.id, h]));
          for (const h of valid) map.set(h.id, h);
          return Array.from(map.values());
        });
      }
    } catch (e) {
      console.warn('Failed to refresh recomputed hypotheses:', e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Bayesian Knowledge Management System
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Track how your beliefs evolve with evidence
              </p>
            </div>
            <div className="flex items-center gap-4">
              <nav className="flex gap-2">
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
              <button
                onClick={loadData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('hypotheses')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'hypotheses'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Hypotheses ({hypotheses.length})
            </button>
            <button
              onClick={() => setActiveTab('evidence')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'evidence'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Evidence ({evidence.length})
            </button>
          </nav>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'hypotheses' ? (
              <div className="space-y-8">
                <AddHypothesisForm onHypothesisAdded={handleHypothesisAdded} />
                <HypothesisList
                  hypotheses={hypotheses}
                  evidence={evidence}
                  onHypothesisUpdated={handleHypothesisUpdated}
                  onHypothesisDeleted={handleHypothesisDeleted}
                />
              </div>
            ) : (
              <div className="space-y-8">
                <AddEvidenceForm 
                  hypotheses={hypotheses}
                  onEvidenceAdded={handleEvidenceAdded}
                  onHypothesisUpdated={handleHypothesisUpdated}
                />
                <EvidenceList 
                  evidence={evidence}
                  onEvidenceUpdated={handleEvidenceUpdated}
                  onEvidenceDeleted={handleEvidenceDeleted}
                  onHypothesesRecomputed={handleHypothesesRecomputed}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
