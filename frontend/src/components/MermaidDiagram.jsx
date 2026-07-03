import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'loose',
  fontFamily: 'inherit',
  flowchart: {
    curve: 'basis',
    htmlLabels: true,
    nodeSpacing: 60,
    rankSpacing: 80,
    padding: 20
  },
  sequence: {
    actorMargin: 60,
    messageMargin: 45,
    boxMargin: 12,
    noteMargin: 12,
    mirrorActors: false
  },
  themeVariables: {
    darkMode: true,
    fontSize: '15px',
    background: '#0b101c',
    // nodes
    primaryColor: '#155e75',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#22d3ee',
    secondaryColor: '#1e40af',
    secondaryTextColor: '#f8fafc',
    secondaryBorderColor: '#60a5fa',
    tertiaryColor: '#1e293b',
    tertiaryTextColor: '#f8fafc',
    tertiaryBorderColor: '#475569',
    // text everywhere must stay light on the dark canvas
    textColor: '#e2e8f0',
    labelTextColor: '#e2e8f0',
    titleColor: '#f8fafc',
    // edges: light line + dark slate label chip (fixes unreadable edge labels)
    lineColor: '#7dd3fc',
    edgeLabelBackground: '#1e293b',
    arrowheadColor: '#7dd3fc',
    // layer containers (subgraphs)
    clusterBkg: 'rgba(148,163,184,0.07)',
    clusterBorder: '#475569',
    // sequence diagrams
    actorBkg: '#1e293b',
    actorBorder: '#22d3ee',
    actorTextColor: '#f8fafc',
    actorLineColor: '#64748b',
    signalColor: '#e2e8f0',
    signalTextColor: '#e2e8f0',
    labelBoxBkgColor: '#164e63',
    labelBoxBorderColor: '#22d3ee',
    loopTextColor: '#e2e8f0',
    activationBkgColor: '#0e7490',
    activationBorderColor: '#22d3ee',
    noteBkgColor: '#312e81',
    noteTextColor: '#e0e7ff',
    noteBorderColor: '#6366f1'
  }
});

let renderCounter = 0;

export default function MermaidDiagram({ code, onError, onRender }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  // Keep callbacks in refs so inline handler props don't retrigger rendering
  const callbacksRef = useRef({ onError, onRender });
  callbacksRef.current = { onError, onRender };

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    setSvg('');
    setError('');
    const id = `mermaid-render-${++renderCounter}`;

    mermaid.render(id, code)
      .then((result) => {
        if (cancelled) return;
        setSvg(result.svg);
        callbacksRef.current.onRender?.(result.svg);
      })
      .catch((err) => {
        const msg = err?.message || String(err);
        // mermaid.render can leave an orphaned error element in the body on failure
        document.getElementById(id)?.remove();
        document.getElementById(`d${id}`)?.remove();
        if (cancelled) return;
        setError(msg);
        callbacksRef.current.onError?.(code, msg);
      });

    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div style={{ margin: '0.5rem 0' }}>
        <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
          Diagram could not be rendered ({error.split('\n')[0]}). Showing Mermaid source instead:
        </div>
        <pre className="code-pre"><code>{code}</code></pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 0' }}>
        <div className="spinner" style={{ width: '14px', height: '14px' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Rendering diagram...</span>
      </div>
    );
  }

  return (
    <div
      style={{ overflowX: 'auto', background: '#0b101c', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', margin: '0.5rem 0' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
