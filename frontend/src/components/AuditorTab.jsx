import React, { useState } from 'react';
import { Sparkles, FileCheck, CheckSquare, Plus, Trash, AlertTriangle, ShieldCheck } from 'lucide-react';
import GroundingBar from './GroundingBar';

export default function AuditorTab({ apiKey }) {
  const [apiName, setApiName] = useState('na-order-sync-prc-api');
  const [description, setDescription] = useState('Process regional order sync from Salesforce event and publish to Netsuite ERP backend in North America.');
  const [endpoints, setEndpoints] = useState(['/orders/sync', '/orders/fetch-status']);
  const [newEndpoint, setNewEndpoint] = useState('');
  const [systemsConnected, setSystemsConnected] = useState(['Salesforce NA', 'Netsuite ERP']);
  const [newSystem, setNewSystem] = useState('');
  
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [grounding, setGrounding] = useState(null);

  const handleAddEndpoint = () => {
    if (newEndpoint.trim() && !endpoints.includes(newEndpoint.trim())) {
      setEndpoints([...endpoints, newEndpoint.trim()]);
      setNewEndpoint('');
    }
  };

  const handleRemoveEndpoint = (index) => {
    setEndpoints(endpoints.filter((_, idx) => idx !== index));
  };

  const handleAddSystem = () => {
    if (newSystem.trim() && !systemsConnected.includes(newSystem.trim())) {
      setSystemsConnected([...systemsConnected, newSystem.trim()]);
      setNewSystem('');
    }
  };

  const handleRemoveSystem = (index) => {
    setSystemsConnected(systemsConnected.filter((_, idx) => idx !== index));
  };

  const handleAudit = async () => {
    setLoading(true);
    setResult('');
    setGrounding(null);

    try {
      const res = await fetch('http://localhost:8000/api/audit-ddd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiName,
          endpoints,
          description,
          systemsConnected,
          apiKey
        })
      });
      
      if (!res.ok) throw new Error("Failed to audit API specs");
      const json = await res.json();
      setResult(json.audit);
      setGrounding(json.grounding);
    } catch (err) {
      console.error(err);
      setResult("### ✕ Connection Failure\n\nFailed to send audit payload to FastAPI backend server. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // Markdown renderer
  const renderMarkdown = (text) => {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const codeText = part.substring(3, part.length - 3);
        const firstLineEnd = codeText.indexOf('\n');
        const lang = codeText.substring(0, firstLineEnd).trim();
        const codeLines = codeText.substring(firstLineEnd + 1);
        
        return (
          <div key={index} style={{ margin: '1rem 0' }}>
            <div className="code-block-header">{lang || 'json'}</div>
            <pre className="code-pre">
              <code>{codeLines}</code>
            </pre>
          </div>
        );
      } else if (part.startsWith('`')) {
        return <code key={index} style={{ color: 'var(--accent-cyan)' }}>{part.substring(1, part.length - 1)}</code>;
      }
      
      const lines = part.split('\n');
      return lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('###')) {
          return <h3 key={lIdx} style={{ fontSize: '1.05rem', color: '#fff', marginTop: '1.25rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.2rem' }}>{line.replace('###', '').trim()}</h3>;
        }
        if (trimmed.startsWith('##')) {
          return <h2 key={lIdx} style={{ fontSize: '1.25rem', color: 'var(--accent-cyan)', marginTop: '1.5rem', marginBottom: '0.75rem' }}>{line.replace('##', '').trim()}</h2>;
        }
        if (trimmed.startsWith('#')) {
          return <h1 key={lIdx} style={{ fontSize: '1.5rem', color: '#fff', marginTop: '1.5rem', marginBottom: '1rem' }}>{line.replace('#', '').trim()}</h1>;
        }
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          // Check checklist boxes
          const matchesScore = line.match(/^[-*]\s*\[([ xX])\]/);
          if (matchesScore) {
            const checked = matchesScore[1] !== ' ';
            const rest = line.replace(/^[-*]\s*\[[ xX]\]/, '');
            return (
              <div key={lIdx} className="checklist-item">
                <CheckSquare size={14} style={{ color: checked ? 'var(--success)' : 'var(--danger)', flexShrink: 0, marginTop: '0.25rem' }} />
                <span style={{ color: '#cbd5e1' }}>{parseBold(rest)}</span>
              </div>
            );
          }
          return <li key={lIdx} style={{ marginLeft: '1.25rem', marginBottom: '0.35rem', color: '#cbd5e1' }}>{parseBold(line.replace(/^[-*]\s*/, ''))}</li>;
        }
        return <p key={lIdx} style={{ margin: '0.5rem 0', color: '#cbd5e1', fontSize: '0.925rem' }}>{parseBold(line)}</p>;
      });
    });
  };

  const parseBold = (text) => {
    const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bp, bpIdx) => {
      if (bp.startsWith('**') && bp.endsWith('**')) {
        return <strong key={bpIdx} style={{ color: '#fff' }}>{bp.substring(2, bp.length - 2)}</strong>;
      }
      return bp;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }} className="title-gradient">DDD Architecture Auditor</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Test your new MuleSoft API design against Domain-Driven Design (DDD) enterprise principles and canonical model standards.</p>
      </div>

      <div className="debugger-layout" style={{ flex: 1 }}>
        <div className="input-panel" style={{ overflowY: 'auto', paddingRight: '0.25rem' }}>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">PROPOSED API NAME</label>
              <input 
                type="text" 
                className="form-control" 
                value={apiName} 
                onChange={(e) => setApiName(e.target.value)} 
                placeholder="e.g. order-sync-prc-api"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Avoid system acronyms (sap, sf) or regional contexts (na, emea).</span>
            </div>

            <div className="form-group">
              <label className="form-label">FUNCTIONAL DESCRIPTION</label>
              <textarea 
                className="form-control" 
                style={{ height: '70px', resize: 'none' }}
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what the API does and the business domain it represents..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">ENDPOINTS</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ padding: '0.5rem' }}
                  value={newEndpoint} 
                  onChange={(e) => setNewEndpoint(e.target.value)}
                  placeholder="e.g. /orders/international"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEndpoint())}
                />
                <button type="button" className="btn btn-secondary" onClick={handleAddEndpoint}>
                  <Plus size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {endpoints.map((ep, idx) => (
                  <span key={idx} className="suggestion-chip" style={{ color: 'var(--text-main)', border: '1px solid var(--accent-cyan)' }}>
                    {ep}
                    <button 
                      type="button" 
                      style={{ border: 'none', background: 'transparent', marginLeft: '0.3rem', color: 'var(--danger)', cursor: 'pointer' }}
                      onClick={() => handleRemoveEndpoint(idx)}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">CONNECTED BACKEND SYSTEMS</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ padding: '0.5rem' }}
                  value={newSystem} 
                  onChange={(e) => setNewSystem(e.target.value)}
                  placeholder="e.g. NetSuite ERP"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSystem())}
                />
                <button type="button" className="btn btn-secondary" onClick={handleAddSystem}>
                  <Plus size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {systemsConnected.map((sys, idx) => (
                  <span key={idx} className="suggestion-chip" style={{ color: 'var(--text-main)', border: '1px solid var(--accent-purple)' }}>
                    {sys}
                    <button 
                      type="button" 
                      style={{ border: 'none', background: 'transparent', marginLeft: '0.3rem', color: 'var(--danger)', cursor: 'pointer' }}
                      onClick={() => handleRemoveSystem(idx)}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleAudit}
                disabled={loading || !apiName.trim()}
              >
                {loading && <div className="spinner" style={{ width: '12px', height: '12px' }} />}
                <ShieldCheck size={16} />
                <span>Run DDD Audit</span>
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card output-panel" style={{ backgroundColor: '#0b101c' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div className="spinner" style={{ width: '30px', height: '30px', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Analyzing compliance score and DDD rules...</p>
            </div>
          ) : result ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={14} /> DDD Compliance Report
                </h4>
              </div>
              <div className="md-output">
                {renderMarkdown(result)}
              </div>
              <GroundingBar grounding={grounding} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center' }}>
              <FileCheck size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <p style={{ fontSize: '0.9rem' }}>Fill in the API proposal specifications and click "Run DDD Audit" to test alignment with enterprise architecture standards.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
