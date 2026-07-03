import React, { useState } from 'react';
import { Terminal, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle, FileCode } from 'lucide-react';
import GroundingBar from './GroundingBar';

const ERROR_SAMPLES = [
  {
    name: "Business Schema Error (Invalid Field)",
    log: "ERROR 2026-07-01 13:45:00,105 [[MuleRuntime].uber.02: [proc-patient-enrollment-v1].patient-enrollment-flow.CPU_INT @29b9a11] org.mule.runtime.core.internal.exception.OnErrorContinueHandler: \nMessage: Epic FHIR schema validation failed for field: coverage[0].subscriberId. Value 'XEH123456' did not meet the mandatory length criteria. \nElement: /patient-enrollment-flow/processors/2 @ proc-patient-enrollment-v1 \nElement DSL: <salesforce:create type=\"Integration_Error__c\" config-ref=\"Salesforce_Config\"/> \nError Type: VALIDATION:INVALID_BOOLEAN \nFlowStack: patient-enrollment-flow (line 12)"
  },
  {
    name: "System Connection Timeout",
    log: "WARN 2026-07-01 14:10:02,400 [[MuleRuntime].uber.05: [sys-epic-patients-v1].query-patients-flow.BLOCKING @10a8d2] org.mule.extension.http.api.request.validator.ResponseValidator: \nHTTP POST on resource 'https://fhir.epic.com/api/v1/patients' failed: gateway timeout (504). Network connection was closed prematurely by remote host. \nElement: /queryPatientSubFlow/processors/1 @ sys-epic-patients-v1 \nError Type: HTTP:TIMEOUT \nFlowStack: queryPatientSubFlow -> fhir-request-route"
  },
  {
    name: "Database Connectivity Failure",
    log: "ERROR 2026-07-01 14:15:33,002 [[MuleRuntime].uber.09: [proc-fulfillment-service-v1].fulfillment-ingest-flow.BLOCKING @ab93d] org.mule.db.commons.api.exception.DbConnectivityException: \nCannot obtain connection from data source pool. Connection refused: connect. SQLState: 08001, Error Code: 0 \nElement: /fulfillment-ingest-flow/processors/5 @ proc-fulfillment-service-v1 \nError Type: DB:CONNECTIVITY"
  }
];

export default function DebuggerTab({ apiKey }) {
  const [logInput, setLogInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState([]);
  const [grounding, setGrounding] = useState(null);

  const handleDebug = async () => {
    if (!logInput.trim()) return;
    setLoading(true);
    setResult('');
    setSources([]);
    setGrounding(null);
    
    try {
      const res = await fetch('http://localhost:8000/api/debug-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log: logInput, apiKey: apiKey })
      });
      
      if (!res.ok) throw new Error("Error querying debugger api");
      const json = await res.json();
      setResult(json.analysis);
      setSources(json.relevant_sources || []);
      setGrounding(json.grounding);
    } catch (err) {
      console.error(err);
      setResult("### ✕ Connection Error\n\nFailed to connect to backend server. Ensure that the FastAPI server is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  // Simple Markdown renderer helper
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
            <div className="code-block-header">{lang || 'xml'}</div>
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
          // parse bold inside list items
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
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }} className="title-gradient">MuleSoft Error Log Analyzer</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Paste raw integration log lines to classify failures, obtain DataWeave remediation mappings, and configure propagation scopes.</p>
      </div>

      <div className="debugger-layout" style={{ flex: 1 }}>
        <div className="input-panel">
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="form-label">PASTE RAW EXCEPTION LOG</div>
              <Terminal size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
            
            <textarea
              className="form-control"
              style={{ flex: 1, resize: 'none', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: '1.4', backgroundColor: '#05070c' }}
              placeholder="Paste exception message, error stacktrace, or Mule event description..."
              value={logInput}
              onChange={(e) => setLogInput(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setLogInput('')}
                disabled={loading || !logInput}
              >
                Clear
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleDebug}
                disabled={loading || !logInput.trim()}
              >
                {loading && <div className="spinner" style={{ width: '12px', height: '12px' }} />}
                <ShieldAlert size={16} />
                <span>Audit Error</span>
              </button>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem' }}>
            <div className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>PRESET TESTING SAMPLES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {ERROR_SAMPLES.map((sample, idx) => (
                <button
                  key={idx}
                  className="sheet-btn"
                  style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}
                  onClick={() => setLogInput(sample.log)}
                >
                  <span>{sample.name}</span>
                  <span style={{ color: 'var(--accent-cyan)' }}>Load ➜</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card output-panel" style={{ backgroundColor: '#0b101c' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div className="spinner" style={{ width: '30px', height: '30px', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Retrieving standard guidelines and analyzing logs...</p>
            </div>
          ) : result ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={14} /> Analysis Report
                </h4>
                {sources.length > 0 && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Referenced: {sources.join(', ')}
                  </span>
                )}
              </div>
              <div className="md-output">
                {renderMarkdown(result)}
              </div>
              <GroundingBar grounding={grounding} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center' }}>
              <Terminal size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <p style={{ fontSize: '0.9rem' }}>Paste a log on the left and click "Audit Error" to invoke the AI Architecture Auditor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
