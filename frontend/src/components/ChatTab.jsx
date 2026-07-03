import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import GroundingBar from './GroundingBar';
import MermaidDiagram from './MermaidDiagram';

const SUGGESTIONS = [
  "What are the naming conventions for Mule applications?",
  "Explain the difference between On-Error Propagate and On-Error Continue.",
  "What is the Reliable Acquisition pattern for error handling?",
  "How does Domain-Driven Design (DDD) change our API-led architecture?",
  "What does the mulesoft AI whitepaper say about grounding AI models?"
];

export default function ChatTab({ apiKey }) {
  const [messages, setMessages] = useState([
    {
      role: 'agent',
      content: "Hello! I am Integration Architect AI. Ask me anything about naming standards, API layers, error propagation, mapping specifications, domain-driven designs, or AI blueprints from our repository.",
      sources: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeSource, setActiveSource] = useState(null);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend) => {
    const queryText = textToSend || input;
    if (!queryText.trim()) return;

    if (!textToSend) setInput('');
    setLoading(true);
    setErrorMsg('');

    // Last 5 turns give the model conversational memory
    const history = messages
      .slice(-5)
      .map(m => ({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.content }));

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: queryText }]);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText, apiKey: apiKey, history })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        role: 'agent',
        content: data.response,
        sources: data.sources || [],
        grounding: data.grounding
      }]);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to query RAG Agent. Check that the backend server is running on port 8000 and your DeepSeek API Key is valid.");
    } finally {
      setLoading(false);
    }
  };

  // Simple Markdown renderer (bold, code blocks, bullet points)
  const renderMessageContent = (text) => {
    const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const codeText = part.substring(3, part.length - 3);
        // Find if there is a language label
        const firstLineEnd = codeText.indexOf('\n');
        const lang = codeText.substring(0, firstLineEnd).trim();
        const codeLines = codeText.substring(firstLineEnd + 1);

        if (lang === 'mermaid') {
          return <MermaidDiagram key={index} code={codeLines.trim()} />;
        }

        return (
          <div key={index} style={{ margin: '1rem 0' }}>
            <div className="code-block-header">{lang || 'code'}</div>
            <pre className="code-pre">
              <code>{codeLines}</code>
            </pre>
          </div>
        );
      } else if (part.startsWith('`')) {
        return <code key={index}>{part.substring(1, part.length - 1)}</code>;
      }
      
      // Handle simple formatting (newlines and bold text)
      const lines = part.split('\n');
      return lines.map((line, lIdx) => {
        let lineEl = line;
        // Check for bullet
        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
        if (isBullet) {
          lineEl = line.trim().replace(/^[-•]\s*/, '');
        }

        // Bold regex
        const boldParts = lineEl.split(/(\*\*[^*]+\*\*)/g);
        const formattedLine = boldParts.map((bp, bpIdx) => {
          if (bp.startsWith('**') && bp.endsWith('**')) {
            return <strong key={bpIdx}>{bp.substring(2, bp.length - 2)}</strong>;
          }
          return bp;
        });

        if (isBullet) {
          return <li key={lIdx} style={{ marginLeft: '1.5rem', marginBottom: '0.25rem' }}>{formattedLine}</li>;
        }

        return (
          <p key={lIdx} style={{ margin: line.trim() ? '0.35rem 0' : '0.75rem 0', minHeight: line.trim() ? '0' : '1em' }}>
            {formattedLine}
          </p>
        );
      });
    });
  };

  return (
    <div className="chat-container">
      <div className="messages-list">
        {messages.map((m, idx) => (
          <div key={idx} className={`message-bubble ${m.role}`}>
            <div className={`message-avatar ${m.role}`}>
              {m.role === 'agent' ? 'AI' : 'UA'}
            </div>
            <div className="message-body">
              {renderMessageContent(m.content)}

              {m.role === 'agent' && <GroundingBar grounding={m.grounding} />}

              {m.role === 'agent' && m.sources && m.sources.length > 0 && (
                <div className="sources-panel">
                  <div className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Sources utilized:</div>
                  {m.sources.map((src, sIdx) => (
                    <span 
                      key={sIdx} 
                      className="source-tag" 
                      onClick={() => setActiveSource(src)}
                    >
                      <BookOpen size={10} />
                      {src.filename}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message-bubble agent">
            <div className="message-avatar agent">AI</div>
            <div className="message-body" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="spinner" />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Searching repository and consulting DeepSeek...</span>
            </div>
          </div>
        )}
        {errorMsg && (
          <div className="glass-card" style={{ borderColor: 'var(--danger)', display: 'flex', gap: '0.75rem', alignSelf: 'center', color: 'var(--danger)', fontSize: '0.875rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="suggestions-grid">
        {SUGGESTIONS.map((s, idx) => (
          <div key={idx} className="suggestion-chip" onClick={() => handleSendMessage(s)}>
            {s}
          </div>
        ))}
      </div>

      <form 
        className="chat-input-bar" 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        <input
          type="text"
          className="form-control"
          placeholder="Ask about mappings, error strategies, naming rules, integrations..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
          <Send size={16} />
          <span>Ask Agent</span>
        </button>
      </form>

      {activeSource && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 100, padding: '2rem'
        }}>
          <div className="glass-card" style={{ maxWidth: '700px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--accent-cyan)' }}>Source Content: {activeSource.filename}</h3>
              <button 
                className="suggestion-chip" 
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1rem' }}
                onClick={() => setActiveSource(null)}
              >
                ✕
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, fontSize: '0.875rem', lineHeight: '1.6', fontFamily: 'monospace', whiteSpace: 'pre-wrap', backgroundColor: '#05070c', padding: '1rem', borderRadius: '6px' }}>
              {activeSource.content}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setActiveSource(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
