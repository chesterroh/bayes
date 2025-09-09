'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hypothesis, Evidence, hypothesisApi, bayesianApi } from '@/lib/api-client';

interface HypothesisCardProps {
  hypothesis: Hypothesis;
  evidence: Evidence[];
  onUpdate: (hypothesis: Hypothesis) => void;
  onDelete: (id: string) => void;
}

export default function HypothesisCard({
  hypothesis,
  evidence,
  onUpdate,
  onDelete,
}: HypothesisCardProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const confidencePercent = Math.round(hypothesis.confidence * 100);
  // Only consider verified if explicitly confirmed or refuted
  const isVerified = hypothesis.verification_type === 'confirmed' || hypothesis.verification_type === 'refuted';
  const isConfirmed = hypothesis.verification_type === 'confirmed';
  const isRefuted = hypothesis.verification_type === 'refuted';
  
  // Determine status color
  const getStatusColor = () => {
    if (isVerified) {
      return isConfirmed ? 'bg-green-500' : 'bg-red-500';
    }
    if (confidencePercent >= 75) return 'bg-green-500';
    if (confidencePercent >= 50) return 'bg-yellow-500';
    if (confidencePercent >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this hypothesis?')) return;
    
    try {
      setIsUpdating(true);
      await hypothesisApi.delete(hypothesis.id);
      onDelete(hypothesis.id);
    } catch (error) {
      console.error('Failed to delete hypothesis:', error);
      alert('Failed to delete hypothesis');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVerify = async (type: 'confirmed' | 'refuted') => {
    const evidenceId = prompt('Enter evidence ID for verification:');
    if (!evidenceId) return;

    try {
      setIsUpdating(true);
      const result = await bayesianApi.verify(hypothesis.id, evidenceId, type);
      onUpdate(result.hypothesis);
    } catch (error) {
      console.error('Failed to verify hypothesis:', error);
      alert('Failed to verify hypothesis');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not verified';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/hypotheses/${hypothesis.id}`)}
      onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/hypotheses/${hypothesis.id}`); }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
          {hypothesis.statement}
        </h3>
        <button
          onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
          className="ml-2 p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 text-xl font-bold"
          title="Show actions menu"
        >
          ⋮
        </button>
      </div>

      {/* ID Badge */}
      <div className="mb-4">
        <span className="inline-block px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded">
          {hypothesis.id}
        </span>
        {isVerified ? (
          <span className={`ml-2 inline-block px-2 py-1 text-xs text-white rounded ${
            isConfirmed ? 'bg-green-600' : isRefuted ? 'bg-red-600' : 'bg-gray-600'
          }`}>
            {isConfirmed ? '✓ Confirmed' : isRefuted ? '✗ Refuted' : '? Verified'}
          </span>
        ) : (
          <span className="ml-2 inline-block px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
            ⏳ Pending
          </span>
        )}
      </div>

      {/* Confidence Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-400">Confidence</span>
          <span className="font-medium text-gray-900 dark:text-white">{confidencePercent}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${getStatusColor()}`}
            style={{ width: `${confidencePercent}%` }}
          />
        </div>
      </div>
      
      {/* Prediction Accuracy (for verified hypotheses) */}
      {isVerified && hypothesis.pre_verification_confidence !== undefined && hypothesis.pre_verification_confidence !== null && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <div className="font-medium mb-1">📊 Prediction Accuracy</div>
            <div className="space-y-1 text-xs">
              <div>Your prediction: <span className="font-bold">{Math.round(hypothesis.pre_verification_confidence * 100)}%</span></div>
              <div>Actual outcome: <span className="font-bold">{isConfirmed ? 'TRUE (100%)' : 'FALSE (0%)'}</span></div>
              <div className="mt-2">
                {(() => {
                  const preConf = hypothesis.pre_verification_confidence * 100;
                  const accuracy = isConfirmed ? preConf : (100 - preConf);
                  let assessment = '';
                  if (accuracy >= 80) assessment = '🎯 Excellent prediction!';
                  else if (accuracy >= 60) assessment = '👍 Good prediction';
                  else if (accuracy >= 40) assessment = '😐 Moderate prediction';
                  else assessment = '❌ Poor prediction';
                  
                  return (
                    <>
                      <div>Accuracy: <span className="font-bold">{Math.round(accuracy)}%</span></div>
                      <div className="mt-1">{assessment}</div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <div>Updated: {formatDate(hypothesis.updated)}</div>
        {isVerified && <div>Verified: {formatDate(hypothesis.verified)}</div>}
      </div>

      {/* Action Menu */}
      {showActions && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {!isVerified && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); }}
                onClick={() => {
                  const newConfidence = prompt('Enter new confidence (0-100):', String(confidencePercent));
                  if (newConfidence) {
                    const value = parseFloat(newConfidence) / 100;
                    if (value >= 0 && value <= 1) {
                      setIsUpdating(true);
                      hypothesisApi.updateConfidence(hypothesis.id, value)
                        .then(onUpdate)
                        .finally(() => setIsUpdating(false));
                    }
                  }
                }}
                disabled={isUpdating}
                className="w-full text-left px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                Update Confidence
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleVerify('confirmed'); }}
                  disabled={isUpdating}
                  className="px-3 py-2 text-sm bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded hover:bg-green-100 dark:hover:bg-green-900/30"
                >
                  Verify ✓
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleVerify('refuted'); }}
                  disabled={isUpdating}
                  className="px-3 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  Refute ✗
                </button>
              </div>
            </>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            disabled={isUpdating}
            className="w-full px-3 py-2 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
