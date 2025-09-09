'use client';

import { useState } from 'react';
import { Evidence, evidenceApi, Hypothesis } from '@/lib/api-client';

interface EvidenceListProps {
  evidence: Evidence[];
  onEvidenceUpdated?: (evidence: Evidence) => void;
  onEvidenceDeleted?: (id: string) => void;
  onHypothesesRecomputed?: (updates: Array<{ id: string; updated: number | null }>) => void;
}

export default function EvidenceList({ 
  evidence, 
  onEvidenceUpdated,
  onEvidenceDeleted,
  onHypothesesRecomputed,
}: EvidenceListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editSourceUrl, setEditSourceUrl] = useState('');
  const navigateTo = (id: string) => {
    if (editingId) return; // don't navigate while editing
    window.location.href = `/evidences/${id}`;
  };

  if (evidence.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
        <p className="text-gray-500 dark:text-gray-400">No evidence yet. Add some evidence above!</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleEdit = (item: Evidence) => {
    setEditingId(item.id);
    setEditContent(item.content);
    setEditSourceUrl(item.source_url);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
    setEditSourceUrl('');
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const updated = await evidenceApi.update(id, {
        content: editContent,
        source_url: editSourceUrl
      });
      onEvidenceUpdated?.(updated);
      setEditingId(null);
      setEditContent('');
      setEditSourceUrl('');
    } catch (error) {
      console.error('Failed to update evidence:', error);
      alert('Failed to update evidence');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this evidence? This will remove all links to hypotheses.')) {
      try {
        const resp = await evidenceApi.delete(id);
        onEvidenceDeleted?.(id);
        if (resp?.recomputed && resp.recomputed.length > 0) {
          onHypothesesRecomputed?.(resp.recomputed);
        }
      } catch (error) {
        console.error('Failed to delete evidence:', error);
        alert('Failed to delete evidence');
      }
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Evidence Library</h2>
      <div className="space-y-3">
        {evidence.map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => navigateTo(item.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') navigateTo(item.id); }}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow ${editingId === item.id ? '' : 'cursor-pointer'}`}
          >
            {editingId === item.id ? (
              // Edit mode
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="inline-block px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded">
                    {item.id}
                  </span>
                  <div className="space-x-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSaveEdit(item.id); }}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={3}
                />
                <input
                  type="url"
                  value={editSourceUrl}
                  onChange={(e) => setEditSourceUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Source URL"
                />
              </div>
            ) : (
              // View mode
              <>
                <div className="flex justify-between items-start mb-2">
                  <span className="inline-block px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded">
                    {item.id}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(item.timestamp)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <p className="text-gray-900 dark:text-white mb-2">{item.content}</p>
                
                {item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    🔗 {item.source_url}
                  </a>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
