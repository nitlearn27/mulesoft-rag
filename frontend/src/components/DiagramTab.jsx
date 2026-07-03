import React, { useState, useRef } from 'react';
import { Workflow, Copy, Check, Download, Image, ExternalLink, Sparkles, BookOpen } from 'lucide-react';
import MermaidDiagram from './MermaidDiagram';
import GroundingBar from './GroundingBar';

const DIAGRAM_TYPES = [
  { id: 'flowchart', label: 'Flowchart' },
  { id: 'sequence', label: 'Sequence' },
  { id: 'c4', label: 'C4 Context' },
  { id: 'component', label: 'Component' }
];

const PRESETS = [
  'Patient enrollment flow from Salesforce to Epic FHIR',
  'Order fulfillment integration from Salesforce to NetSuite ERP',
  'Error handling flow with retry and dead-letter queue for system errors',
  'End-to-end API-led architecture for the patient domain across experience, process and system layers'
];

export default function DiagramTab({ apiKey }) {
  const [description, setDescription] = useState('');
  const [diagramType, setDiagramType] = useState('flowchart');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const repairAttempted = useRef(false);
  const previewRef = useRef(null);

  const handleGenerate = async (repair = null, descOverride = null) => {
    const desc = descOverride || description;
    if (!desc.trim()) return;

    if (!repair) {
      repairAttempted.current = false;
      setResult(null);
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('http://localhost:8000/api/generate-diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, diagramType, apiKey, repair })
      });
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const json = await res.json();

      if (!json.mermaid) {
        setErrorMsg(json.raw || 'The model did not return a Mermaid diagram. Try rephrasing the description.');
        setResult(null);
      } else {
        setResult(json);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to reach the backend server on port 8000. Make sure it is running and your DeepSeek API key is set.');
    } finally {
      setLoading(false);
    }
  };

  const handleRenderError = (code, message) => {
    if (!repairAttempted.current) {
      repairAttempted.current = true;
      handleGenerate({ code, error: message });
    }
  };

  const triggerDownload = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.mermaid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMmd = () => {
    const blob = new Blob([result.mermaid], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, 'architecture-diagram.mmd');
    URL.revokeObjectURL(url);
  };

  const getSvgElement = () => previewRef.current?.querySelector('svg');

  const serializeSvg = () => {
    const svgEl = getSvgElement();
    if (!svgEl) return null;
    const vb = svgEl.viewBox?.baseVal;
    const width = Math.ceil(vb?.width || svgEl.getBoundingClientRect().width || 1200);
    const height = Math.ceil(vb?.height || svgEl.getBoundingClientRect().height || 800);
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return { data: new XMLSerializer().serializeToString(clone), width, height };
  };

  const downloadSvg = () => {
    const svg = serializeSvg();
    if (!svg) return;
    const blob = new Blob([svg.data], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, 'architecture-diagram.svg');
    URL.revokeObjectURL(url);
  };

  const downloadPng = () => {
    const svg = serializeSvg();
    if (!svg) return;
    const blob = new Blob([svg.data], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new window.Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = svg.width * scale;
      canvas.height = svg.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0b101c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, svg.width, svg.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((png) => {
        const pngUrl = URL.createObjectURL(png);
        triggerDownload(pngUrl, 'architecture-diagram.png');
        URL.revokeObjectURL(pngUrl);
      });
    };
    img.src = url;
  };

  const openInMermaidLive = () => {
    const state = { code: result.mermaid, mermaid: '{"theme":"dark"}', autoSync: true, updateDiagram: true };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    window.open(`https://mermaid.live/edit#base64:${encoded}`, '_blank', 'noopener');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }} className="title-gradient">Architecture Diagram Studio</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Generate professional, document-grounded Mermaid architecture diagrams — exportable to draw.io, Lucidchart, SVG and PNG.</p>
      </div>

      <div className="debugger-layout" style={{ flex: 1 }}>
        <div className="input-panel">
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="form-label">DESCRIBE THE FLOW OR ARCHITECTURE</div>
              <Workflow size={16} style={{ color: 'var(--text-muted)' }} />
            </div>

            <textarea
              className="form-control"
              style={{ flex: 1, resize: 'none', fontSize: '0.85rem', lineHeight: '1.5' }}
              placeholder="Describe the integration flow, the systems involved, and what you want the diagram to show..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="form-group">
              <label className="form-label">DIAGRAM TYPE</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {DIAGRAM_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="suggestion-chip"
                    style={{
                      cursor: 'pointer',
                      color: diagramType === t.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
                      border: `1px solid ${diagramType === t.id ? 'var(--accent-cyan)' : 'var(--border-color)'}`
                    }}
                    onClick={() => setDiagramType(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={() => handleGenerate()}
                disabled={loading || !description.trim()}
              >
                {loading && <div className="spinner" style={{ width: '12px', height: '12px' }} />}
                <Sparkles size={16} />
                <span>Generate Diagram</span>
              </button>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem' }}>
            <div className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>PRESET SCENARIOS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  className="sheet-btn"
                  style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem', textAlign: 'left' }}
                  onClick={() => {
                    setDescription(preset);
                    handleGenerate(null, preset);
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card output-panel" style={{ backgroundColor: '#0b101c' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div className="spinner" style={{ width: '30px', height: '30px', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {repairAttempted.current ? 'Repairing diagram syntax...' : 'Retrieving architecture context and drawing diagram...'}
              </p>
            </div>
          ) : result ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Workflow size={14} /> Generated Architecture Diagram
                </h4>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem' }} onClick={handleCopy}>
                    {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy Mermaid'}
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem' }} onClick={downloadMmd}>
                    <Download size={12} /> .mmd
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem' }} onClick={downloadSvg}>
                    <Download size={12} /> SVG
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem' }} onClick={downloadPng}>
                    <Image size={12} /> PNG
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem' }} onClick={openInMermaidLive}>
                    <ExternalLink size={12} /> Mermaid Live
                  </button>
                </div>
              </div>

              <div ref={previewRef}>
                <MermaidDiagram code={result.mermaid} onError={handleRenderError} />
              </div>

              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.5rem 0 1rem' }}>
                Import into draw.io: Insert → Advanced → Mermaid · Lucidchart: Import → Mermaid (paste the copied code)
              </div>

              {result.notes && (
                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', whiteSpace: 'pre-wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  {result.notes}
                </div>
              )}

              <GroundingBar grounding={result.grounding} />

              {result.sources && result.sources.length > 0 && (
                <div className="sources-panel" style={{ marginTop: '0.75rem' }}>
                  <div className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Sources utilized:</div>
                  {[...new Set(result.sources.map((s) => s.filename))].map((fname, idx) => (
                    <span key={idx} className="source-tag">
                      <BookOpen size={10} />
                      {fname}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : errorMsg ? (
            <div style={{ color: 'var(--danger)', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{errorMsg}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center' }}>
              <Workflow size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <p style={{ fontSize: '0.9rem' }}>Describe an integration flow (or pick a preset) and click "Generate Diagram" to draw a document-grounded architecture diagram.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
