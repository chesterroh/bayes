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
