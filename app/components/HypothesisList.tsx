'use client';

import { Hypothesis, Evidence } from '@/lib/api-client';
import HypothesisCard from './HypothesisCard';

interface HypothesisListProps {
  hypotheses: Hypothesis[];
  evidence: Evidence[];
  onHypothesisUpdated: (hypothesis: Hypothesis) => void;
  onHypothesisDeleted: (id: string) => void;
}

export default function HypothesisList({
  hypotheses,
  evidence,
  onHypothesisUpdated,
  onHypothesisDeleted,
}: HypothesisListProps) {
  if (hypotheses.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
        <p className="text-gray-500 dark:text-gray-400">No hypotheses yet. Create your first one above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Hypotheses</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {hypotheses.map((hypothesis) => (
          <HypothesisCard
            key={hypothesis.id}
            hypothesis={hypothesis}
            evidence={evidence}
            onUpdate={onHypothesisUpdated}
            onDelete={onHypothesisDeleted}
          />
        ))}
      </div>
    </div>
  );
}