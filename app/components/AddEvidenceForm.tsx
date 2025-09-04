'use client';

import { useState, useEffect, useRef } from 'react';
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
    p_e_given_h: 50,
    p_e_given_not_h: 50,
    performUpdate: true,
  });
  const [fetchingX, setFetchingX] = useState(false);
  const [xFetchError, setXFetchError] = useState<string>('');
  const [xAutofilledFromUrl, setXAutofilledFromUrl] = useState<string>('');

  // Gemini suggestion + chat state
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string>('');
  const [suggestion, setSuggestion] = useState<{ p_e_given_h: number; p_e_given_not_h: number; rationale: string } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatOpen) {
      // focus chat input when opening chat panel
      setTimeout(() => chatInputRef.current?.focus(), 0);
    }
  }, [chatOpen]);

  async function sendChatMessage() {
    const msg = chatInput.trim();
    if (!msg) return;
    const selected = hypotheses.find(h => h.id === formData.hypothesisId);
    if (!selected) return;
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatInput('');
    try {
      const res = await fetch('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hypothesis: { id: selected.id, statement: selected.statement, prior: selected.confidence },
          evidence: { content: formData.content },
          messages: [...chatMessages, { role: 'user', content: msg }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Chat failed (${res.status})`);
      }
      const data = await res.json();
      const reply = String(data?.reply || '').trim();
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply || '(no response)' }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e?.message || 'failed to get reply'}` }]);
    } finally {
      chatInputRef.current?.focus();
    }
  }

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

  // Auto-suggest likelihoods when a hypothesis is selected and content exists
  useEffect(() => {
    const selected = hypotheses.find(h => h.id === formData.hypothesisId);
    if (!selected || !formData.content || formData.content.trim() === '') {
      return;
    }
    const key = `${selected.id}|${formData.content.trim().slice(0, 100)}`;
    if ((window as any).__bkms_lastSuggestKey === key) return;
    (window as any).__bkms_lastSuggestKey = key;

    (async () => {
      setGeminiLoading(true);
      setGeminiError('');
      try {
        const res = await fetch('/api/llm/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hypothesis: { id: selected.id, statement: selected.statement, prior: selected.confidence },
            evidence: { content: formData.content },
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || `Failed to get suggestions (${res.status})`);
        }
        const data = await res.json();
        const s = {
          p_e_given_h: Number(data.p_e_given_h ?? 0.5),
          p_e_given_not_h: Number(data.p_e_given_not_h ?? 0.5),
          rationale: String(data.rationale ?? ''),
        };
        setSuggestion(s);
        setChatOpen(true);
        setChatMessages([
          {
            role: 'assistant',
            content: `Suggested P(E|H)=${(s.p_e_given_h * 100).toFixed(0)}%, P(E|~H)=${(s.p_e_given_not_h * 100).toFixed(0)}%\nReason: ${s.rationale}`,
          },
        ]);
      } catch (e: any) {
        setGeminiError(e?.message || 'Failed to get suggestions');
      } finally {
        setGeminiLoading(false);
      }
    })();
  }, [formData.hypothesisId, formData.content, hypotheses]);

  // Attempt to auto-fill evidence content when only an X/Twitter URL is provided
  useEffect(() => {
    const url = formData.source_url?.trim();
    const contentEmpty = !formData.content || formData.content.trim() === '';

    const isXUrl = (u: string) => {
      try {
        const parsed = new URL(u);
        const host = parsed.hostname.toLowerCase();
        return (host.endsWith('x.com') || host.endsWith('twitter.com')) && /\/status\//.test(parsed.pathname);
      } catch {
        return false;
      }
    };

    if (!url || !contentEmpty || !isXUrl(url)) {
      return;
    }

    if (xAutofilledFromUrl === url) return; // prevent repeat fetches for same URL

    let cancelled = false;
    setFetchingX(true);
    setXFetchError('');

    const t = setTimeout(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`/api/extract/x?url=${encodeURIComponent(url)}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || `Failed to fetch X.com content (${res.status})`);
        }
        const data = await res.json();
        if (!cancelled && data?.text) {
          setFormData(prev => ({ ...prev, content: data.text }));
          setXAutofilledFromUrl(url);
        }
      } catch (e: any) {
        if (!cancelled) {
          setXFetchError(e?.message || 'Failed to extract text from X.com');
        }
      } finally {
        if (!cancelled) setFetchingX(false);
      }
    }, 500); // small debounce while user types

    return () => {
      clearTimeout(t);
      cancelled = true;
    };
  }, [formData.source_url, formData.content, xAutofilledFromUrl]);

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
    // Double-check if chat is open to avoid accidental submit while conversing
    if (chatOpen) {
      const proceed = window.confirm('You have an open AI chat. Submit this evidence now?');
      if (!proceed) {
        // Keep focus in chat
        chatInputRef.current?.focus();
        return;
      }
    }
    
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
            p_e_given_h: formData.p_e_given_h / 100,
            p_e_given_not_h: formData.p_e_given_not_h / 100,
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
        p_e_given_h: 50,
        p_e_given_not_h: 50,
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
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const target = e.target as HTMLElement;
          const isTextArea = target && target.tagName === 'TEXTAREA';
          const isChat = chatInputRef.current && target === chatInputRef.current;
          if (chatOpen && !isChat && !isTextArea) {
            e.preventDefault();
            e.stopPropagation();
            chatInputRef.current?.focus();
          }
        }
      }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
    >
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
          {(geminiLoading || geminiError) && (
            <p className="mt-1 text-xs">
              {geminiLoading && <span className="text-blue-500">Getting AI suggestions…</span>}
              {!geminiLoading && geminiError && <span className="text-yellow-600 dark:text-yellow-400">{geminiError}</span>}
            </p>
          )}
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
          {(fetchingX || xFetchError || xAutofilledFromUrl) && (
            <div className="mt-1 text-xs">
              {fetchingX && (
                <span className="text-blue-500">Fetching text from X.com…</span>
              )}
              {!fetchingX && xFetchError && (
                <span className="text-yellow-600 dark:text-yellow-400">{xFetchError}</span>
              )}
              {!fetchingX && !xFetchError && xAutofilledFromUrl && formData.content && (
                <span className="text-green-600 dark:text-green-400">Auto-filled from X.com</span>
              )}
            </div>
          )}
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
              {/* P(E|H) */}
              <div className="mt-3">
                <label htmlFor="peh" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  P(Evidence | Hypothesis true): {formData.p_e_given_h}%
                </label>
                <input
                  type="range"
                  id="peh"
                  min="0"
                  max="100"
                  value={formData.p_e_given_h}
                  onChange={(e) => setFormData({ ...formData, p_e_given_h: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* P(E|~H) */}
              <div className="mt-3">
                <label htmlFor="penh" className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  P(Evidence | Hypothesis false): {formData.p_e_given_not_h}%
                </label>
                <input
                  type="range"
                  id="penh"
                  min="0"
                  max="100"
                  value={formData.p_e_given_not_h}
                  onChange={(e) => setFormData({ ...formData, p_e_given_not_h: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Tip: 50% / 50% is neutral. The greater the gap between these two, the more diagnostic the evidence.
                </div>
              </div>

              {/* AI Suggestions + Chat */}
              <div className="mt-4 p-3 border rounded-md dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200">AI Suggested Likelihoods (Gemini)</h5>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!suggestion) return;
                        setFormData(prev => ({
                          ...prev,
                          p_e_given_h: Math.round((suggestion.p_e_given_h || 0.5) * 100),
                          p_e_given_not_h: Math.round((suggestion.p_e_given_not_h || 0.5) * 100),
                        }));
                      }}
                      className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      disabled={!suggestion}
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatOpen(v => !v)}
                      className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded"
                    >
                      {chatOpen ? 'Hide Chat' : 'Show Chat'}
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                  {suggestion ? (
                    <>
                      <div>P(E|H): {(suggestion.p_e_given_h * 100).toFixed(0)}%  ·  P(E|~H): {(suggestion.p_e_given_not_h * 100).toFixed(0)}%</div>
                      {suggestion.rationale && (
                        <div className="mt-1 opacity-80">Reason: {suggestion.rationale}</div>
                      )}
                    </>
                  ) : (
                    <div className="opacity-80">Select a hypothesis and enter content to see suggestions.</div>
                  )}
                </div>

                {chatOpen && (
                  <div className="mt-3" data-chat-container>
                    <div className="max-h-40 overflow-y-auto space-y-2 p-2 border rounded dark:border-gray-700 bg-white dark:bg-gray-800">
                      {chatMessages.length === 0 && (
                        <div className="text-xs text-gray-500">Start chatting with AI about this evidence and hypothesis.</div>
                      )}
                      {chatMessages.map((m, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="font-semibold">{m.role === 'user' ? 'You' : 'AI'}:</span> <span className="whitespace-pre-wrap">{m.content}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        ref={chatInputRef}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            e.stopPropagation();
                            sendChatMessage();
                          }
                        }}
                        placeholder="Ask a question or request justification…"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      />
                      <button
                        type="button"
                        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        disabled={!chatInput.trim()}
                        onClick={() => { sendChatMessage(); }}
                      >
                        Send
                      </button>
                    </div>
                  </div>
                )}
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
