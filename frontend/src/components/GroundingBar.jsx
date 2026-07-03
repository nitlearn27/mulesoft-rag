import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

export default function GroundingBar({ grounding }) {
  if (!grounding || typeof grounding.rag_pct !== 'number') return null;

  const rag = Math.max(0, Math.min(100, grounding.rag_pct));
  const model = 100 - rag;

  return (
    <div
      style={{ marginTop: '0.85rem' }}
      title={`Estimated ~${rag}% of this answer is grounded in your indexed repository documents and ~${model}% comes from the AI model's own knowledge.`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.3rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-cyan)' }}>
          <BookOpen size={11} /> Repository docs {rag}%
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-purple)' }}>
          <Sparkles size={11} /> AI model {model}%
        </span>
      </div>
      <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ width: `${rag}%`, background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))' }} />
        <div style={{ width: `${model}%`, background: 'linear-gradient(90deg, var(--accent-purple), #c084fc)' }} />
      </div>
    </div>
  );
}
