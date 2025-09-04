// API Client for BKMS Frontend

const API_BASE = '/api';

// Types (matching backend)
export interface Hypothesis {
  id: string;
  statement: string;
  confidence: number;
  updated: string;
  verified: string | null;
  verification_type?: 'confirmed' | 'refuted' | null;
  pre_verification_confidence?: number | null;
}

export interface Evidence {
  id: string;
  content: string;
  source_url: string;
  timestamp: string;
}

export interface AffectsRelationship {
  p_e_given_h: number; // P(E|H)
  p_e_given_not_h: number; // P(E|~H)
}

// Hypothesis API
export const hypothesisApi = {
  async getAll(): Promise<Hypothesis[]> {
    const res = await fetch(`${API_BASE}/hypotheses`);
    if (!res.ok) throw new Error('Failed to fetch hypotheses');
    return res.json();
  },

  async getById(id: string): Promise<Hypothesis> {
    const res = await fetch(`${API_BASE}/hypotheses/${id}`);
    if (!res.ok) throw new Error('Failed to fetch hypothesis');
    return res.json();
  },

  async create(data: Omit<Hypothesis, 'updated' | 'verified'>): Promise<Hypothesis> {
    const res = await fetch(`${API_BASE}/hypotheses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create hypothesis');
    return res.json();
  },

  async updateConfidence(id: string, confidence: number): Promise<Hypothesis> {
    const res = await fetch(`${API_BASE}/hypotheses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confidence }),
    });
    if (!res.ok) throw new Error('Failed to update hypothesis');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/hypotheses/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete hypothesis');
  },
};

// Evidence API
export const evidenceApi = {
  async getAll(): Promise<Evidence[]> {
    const res = await fetch(`${API_BASE}/evidence`);
    if (!res.ok) throw new Error('Failed to fetch evidence');
    return res.json();
  },

  async getById(id: string): Promise<Evidence> {
    const res = await fetch(`${API_BASE}/evidence/${id}`);
    if (!res.ok) throw new Error('Failed to fetch evidence');
    return res.json();
  },

  async create(data: Omit<Evidence, 'timestamp'>): Promise<Evidence> {
    const res = await fetch(`${API_BASE}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create evidence');
    return res.json();
  },

  async update(id: string, data: { content: string; source_url: string }): Promise<Evidence> {
    const res = await fetch(`${API_BASE}/evidence/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update evidence');
    return res.json();
  },

  async delete(id: string): Promise<{ success: boolean; recomputed?: Array<{ id: string; updated: number | null }> }> {
    const res = await fetch(`${API_BASE}/evidence/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete evidence');
    return res.json();
  },

  async linkToHypothesis(
    evidenceId: string,
    hypothesisId: string,
    relationship: AffectsRelationship
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/evidence/${evidenceId}/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hypothesisId, ...relationship }),
    });
    if (!res.ok) throw new Error('Failed to link evidence');
  },

  async updateLink(
    evidenceId: string,
    hypothesisId: string,
    relationship: AffectsRelationship
  ): Promise<{ recomputed?: { id: string; updated: number | null } }> {
    const res = await fetch(`${API_BASE}/evidence/${evidenceId}/link`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hypothesisId, ...relationship }),
    });
    if (!res.ok) throw new Error('Failed to update link');
    return res.json();
  },

  async deleteLink(
    evidenceId: string,
    hypothesisId: string
  ): Promise<{ recomputed?: { id: string; updated: number | null } }> {
    const res = await fetch(`${API_BASE}/evidence/${evidenceId}/link`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hypothesisId }),
    });
    if (!res.ok) throw new Error('Failed to delete link');
    return res.json();
  },
};

// Bayesian Operations
export const bayesianApi = {
  async update(hypothesisId: string, evidenceId: string, propagate = false): Promise<any> {
    const res = await fetch(`${API_BASE}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hypothesisId, evidenceId, propagate }),
    });
    if (!res.ok) throw new Error('Failed to perform Bayesian update');
    return res.json();
  },

  async verify(
    hypothesisId: string,
    evidenceId: string,
    verificationType: 'confirmed' | 'refuted'
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hypothesisId, evidenceId, verificationType }),
    });
    if (!res.ok) throw new Error('Failed to verify hypothesis');
    return res.json();
  },
};
