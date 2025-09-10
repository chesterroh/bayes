'use client';

import { useState, useEffect } from 'react';
import { hypothesisApi, type Hypothesis } from '@/lib/api-client';

interface AddHypothesisFormProps {
  onHypothesisAdded: (hypothesis: Hypothesis) => void;
}

export default function AddHypothesisForm({ onHypothesisAdded }: AddHypothesisFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedId, setSuggestedId] = useState('');
  const [idError, setIdError] = useState('');
  const [checkingId, setCheckingId] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    statement: '',
    confidence: 50,
  });

  // AI Review state (manual trigger)
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [review, setReview] = useState<null | {
    valid_bayesian: boolean;
    atomicity_score: number;
    issues: string[];
    falsifiable: boolean;
    measurable: boolean;
    time_bound: boolean;
    suggested_rewrite: string;
    operationalization?: {
      measurable_event?: string;
      threshold?: string;
      timeframe?: string;
      scope?: string;
    };
    evidence_ideas?: string[];
    suggested_tags?: string[];
    note?: string;
  }>(null);

  // Fetch suggested ID when form opens
  useEffect(() => {
    if (isOpen) {
      fetchNextId();
    }
  }, [isOpen]);

  // Check for ID collisions when user changes ID
  useEffect(() => {
    if (formData.id && formData.id !== suggestedId) {
      checkIdCollision(formData.id);
    } else {
      setIdError('');
    }
  }, [formData.id, suggestedId]);

  const fetchNextId = async () => {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('/api/next-id?type=hypothesis', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.nextId) {
        setSuggestedId(data.nextId);
        setFormData(prev => ({ ...prev, id: data.nextId }));
      } else {
        // Fallback to H001 if no ID returned
        setSuggestedId('H001');
        setFormData(prev => ({ ...prev, id: 'H001' }));
      }
    } catch (error: any) {
      console.error('Failed to fetch next ID:', error);
      // Fallback to H001 for manual entry
      const fallbackId = 'H001';
      setSuggestedId(fallbackId);
      setFormData(prev => ({ ...prev, id: fallbackId }));
    }
  };

  const checkIdCollision = async (id: string) => {
    setCheckingId(true);
    setIdError('');
    
    try {
      const response = await fetch(`/api/check-id?type=hypothesis&id=${encodeURIComponent(id)}`);
      const data = await response.json();
      
      if (data.exists) {
        setIdError(`ID "${id}" already exists! Please choose a different ID.`);
      }
    } catch (error) {
      console.error('Failed to check ID:', error);
    } finally {
      setCheckingId(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.id || !formData.statement) {
      alert('Please fill in all fields');
      return;
    }

    if (idError) {
      alert(idError);
      return;
    }

    try {
      setIsSubmitting(true);
      const hypothesis = await hypothesisApi.create({
        id: formData.id,
        statement: formData.statement,
        confidence: formData.confidence / 100,
      });
      
      onHypothesisAdded(hypothesis);
      
      // Reset form
      setFormData({ id: '', statement: '', confidence: 50 });
      setReview(null);
      setReviewError('');
      setReviewLoading(false);
      setSuggestedId('');
      setIdError('');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to create hypothesis:', error);
      alert('Failed to create hypothesis. The ID might already exist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        + Add New Hypothesis
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Create New Hypothesis
      </h3>
      
      <div className="space-y-4">
        {/* ID Input */}
        <div>
          <label htmlFor="id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Hypothesis ID {suggestedId && <span className="text-xs text-gray-500">(auto-generated)</span>}
            {checkingId && <span className="text-xs text-blue-500 ml-2">Checking...</span>}
          </label>
          <input
            type="text"
            id="id"
            value={formData.id || ''}
            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
            placeholder="Loading..."
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              idError 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
            } ${
              formData.id === suggestedId ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-700'
            } dark:text-white`}
            readOnly={formData.id === suggestedId}
            required
          />
          {idError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {idError}
            </p>
          )}
        </div>

        {/* Statement Input */}
        <div>
          <label htmlFor="statement" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Statement
          </label>
          <textarea
            id="statement"
            value={formData.statement || ''}
            onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
            placeholder="e.g., AI will transform software development by 2025"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            required
          />
          {/* AI Review Trigger */}
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                setReviewError('');
                setReview(null);
                if (!formData.statement.trim()) {
                  setReviewError('Enter a statement first.');
                  return;
                }
                try {
                  setReviewLoading(true);
                  const res = await fetch('/api/llm/hypothesis/review', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ statement: formData.statement.trim() }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    throw new Error(data?.error || `Review failed (${res.status})`);
                  }
                  setReview(data);
                } catch (e: any) {
                  setReviewError(e?.message || 'Failed to get AI review');
                } finally {
                  setReviewLoading(false);
                }
              }}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 disabled:opacity-50"
              disabled={reviewLoading}
            >
              {reviewLoading ? 'Reviewing…' : 'Get AI Review'}
            </button>
            {reviewError && <span className="text-xs text-yellow-700 dark:text-yellow-400">{reviewError}</span>}
          </div>
          {/* AI Review Panel */}
          {review && (
            <div className="mt-3 border rounded-md p-3 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${review.valid_bayesian ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'}`}>
                  {review.valid_bayesian ? 'Valid Bayesian' : 'Needs Refinement'}
                </span>
                <span className="text-gray-600 dark:text-gray-300">Atomicity: {(review.atomicity_score * 100).toFixed(0)}%</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${review.falsifiable ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>Falsifiable</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${review.measurable ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>Measurable</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${review.time_bound ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>Time‑bound</span>
              </div>
              {review.issues && review.issues.length > 0 && (
                <div className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                  Issues: {review.issues.map((i, idx) => (
                    <span key={idx} className="inline-block mr-1 mb-1 px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
                      {i}
                    </span>
                  ))}
                </div>
              )}
              {/* Suggested rewrite */}
              {review.suggested_rewrite && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Suggested rewrite</div>
                  <div className="flex items-start gap-2">
                    <textarea
                      readOnly
                      value={review.suggested_rewrite}
                      className="flex-1 text-sm px-2 py-2 border rounded dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      rows={2}
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, statement: review.suggested_rewrite }))}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Replace Statement
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(review.suggested_rewrite).catch(() => {});
                        }}
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Operationalization */}
              {review.operationalization && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {review.operationalization.measurable_event && (
                    <div><span className="font-medium">Event:</span> {review.operationalization.measurable_event}</div>
                  )}
                  {review.operationalization.threshold && (
                    <div><span className="font-medium">Threshold:</span> {review.operationalization.threshold}</div>
                  )}
                  {review.operationalization.timeframe && (
                    <div><span className="font-medium">Timeframe:</span> {review.operationalization.timeframe}</div>
                  )}
                  {review.operationalization.scope && (
                    <div><span className="font-medium">Scope:</span> {review.operationalization.scope}</div>
                  )}
                </div>
              )}
              {/* Evidence ideas */}
              {review.evidence_ideas && review.evidence_ideas.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Evidence ideas</div>
                  <ul className="list-disc list-inside text-xs text-gray-700 dark:text-gray-300">
                    {review.evidence_ideas.map((idea, idx) => (
                      <li key={idx}>{idea}</li>
                    ))}
                  </ul>
                </div>
              )}
              {review.note && (
                <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 opacity-90">
                  {review.note}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Confidence Slider */}
        <div>
          <label htmlFor="confidence" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Initial Confidence: {formData.confidence}%
          </label>
          <input
            type="range"
            id="confidence"
            min="0"
            max="100"
            value={formData.confidence || 50}
            onChange={(e) => setFormData({ ...formData, confidence: parseInt(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Tip: This is your prior belief. 50% = genuinely unsure; evidence you add later will update this.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Hypothesis'}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
