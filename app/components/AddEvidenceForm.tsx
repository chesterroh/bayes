'use client';

import { useState, useEffect } from 'react';
import { evidenceApi, bayesianApi, type Evidence, type Hypothesis } from '@/lib/api-client';

interface AddEvidenceFormProps {
  hypotheses: Hypothesis[];
  onEvidenceAdded: (evidence: Evidence) => void;
  onHypothesisUpdated: (hypothesis: Hypothesis) => void;
}

export default function AddEvidenceForm({ 
  hypotheses, 
  onEvidenceAdded,
  onHypothesisUpdated 
}: AddEvidenceFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestedId, setSuggestedId] = useState('');
  const [idError, setIdError] = useState('');
  const [checkingId, setCheckingId] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    content: '',
    source_url: '',
    hypothesisId: '',
    strength: 50,
    direction: 'supports' as 'supports' | 'contradicts',
    performUpdate: true,
  });

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
      
      const response = await fetch('/api/next-id?type=evidence', {
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
        // Fallback to E001 if no ID returned
        setSuggestedId('E001');
        setFormData(prev => ({ ...prev, id: 'E001' }));
      }
    } catch (error: any) {
      console.error('Failed to fetch next ID:', error);
      // Fallback to E001 for manual entry
      const fallbackId = 'E001';
      setSuggestedId(fallbackId);
      setFormData(prev => ({ ...prev, id: fallbackId }));
    }
  };

  const checkIdCollision = async (id: string) => {
    setCheckingId(true);
    setIdError('');
    
    try {
      const response = await fetch(`/api/check-id?type=evidence&id=${encodeURIComponent(id)}`);
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
    
    if (!formData.id || !formData.content || !formData.source_url) {
      alert('Please fill in all required fields');
      return;
    }

    if (idError) {
      alert(idError);
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Create evidence
      const evidence = await evidenceApi.create({
        id: formData.id,
        content: formData.content,
        source_url: formData.source_url,
      });
      
      onEvidenceAdded(evidence);
      
      // Link to hypothesis if selected
      if (formData.hypothesisId) {
        await evidenceApi.linkToHypothesis(
          evidence.id,
          formData.hypothesisId,
          {
            strength: formData.strength / 100,
            direction: formData.direction,
          }
        );
        
        // Perform Bayesian update if requested
        if (formData.performUpdate) {
          const result = await bayesianApi.update(
            formData.hypothesisId,
            evidence.id,
            false
          );
          
          // Fetch updated hypothesis
          const response = await fetch(`/api/hypotheses/${formData.hypothesisId}`);
          const updatedHypothesis = await response.json();
          onHypothesisUpdated(updatedHypothesis);
        }
      }
      
      // Reset form
      setFormData({
        id: '',
        content: '',
        source_url: '',
        hypothesisId: '',
        strength: 50,
        direction: 'supports',
        performUpdate: true,
      });
      setSuggestedId('');
      setIdError('');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to create evidence:', error);
      alert('Failed to create evidence. The ID might already exist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full md:w-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
      >
        + Add New Evidence
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Add New Evidence
      </h3>
      
      <div className="space-y-4">
        {/* ID Input */}
        <div>
          <label htmlFor="evidence-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Evidence ID {suggestedId && <span className="text-xs text-gray-500">(auto-generated)</span>}
            {checkingId && <span className="text-xs text-blue-500 ml-2">Checking...</span>}
          </label>
          <input
            type="text"
            id="evidence-id"
            value={formData.id || ''}
            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
            placeholder="Loading..."
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              idError 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 dark:border-gray-600 focus:ring-green-500'
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

        {/* Content Input */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Evidence Content
          </label>
          <textarea
            id="content"
            value={formData.content || ''}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Describe the evidence..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>

        {/* Source URL */}
        <div>
          <label htmlFor="source" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Source URL
          </label>
          <input
            type="text"
            id="source"
            value={formData.source_url || ''}
            onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
            placeholder="https://example.com/article"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>

        {/* Link to Hypothesis (Optional) */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Link to Hypothesis (Optional)
          </h4>
          
          <div>
            <label htmlFor="hypothesis" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Select Hypothesis
            </label>
            <select
              id="hypothesis"
              value={formData.hypothesisId || ''}
              onChange={(e) => setFormData({ ...formData, hypothesisId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">None</option>
              {hypotheses.filter(h => !h.verified).map(h => (
                <option key={h.id} value={h.id}>
                  {h.id}: {h.statement.substring(0, 50)}...
                </option>
              ))}
            </select>
          </div>

          {formData.hypothesisId && (
            <>
              {/* Direction */}
              <div className="mt-3">
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Evidence Direction
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="supports"
                      checked={formData.direction === 'supports'}
                      onChange={(e) => setFormData({ ...formData, direction: e.target.value as 'supports' })}
                      className="mr-2"
                    />
                    <span className="text-green-600 dark:text-green-400">Supports</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="contradicts"
                      checked={formData.direction === 'contradicts'}
                      onChange={(e) => setFormData({ ...formData, direction: e.target.value as 'contradicts' })}
                      className="mr-2"
                    />
                    <span className="text-red-600 dark:text-red-400">Contradicts</span>
                  </label>
                </div>
              </div>

              {/* Strength Slider */}
              <div className="mt-3">
                <label htmlFor="strength" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Evidence Strength: {formData.strength}%
                </label>
                <input
                  type="range"
                  id="strength"
                  min="0"
                  max="100"
                  value={formData.strength}
                  onChange={(e) => setFormData({ ...formData, strength: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* Auto-update checkbox */}
              <div className="mt-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.performUpdate}
                    onChange={(e) => setFormData({ ...formData, performUpdate: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Automatically perform Bayesian update
                  </span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Evidence'}
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