import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  FolderOpen, 
  TableProperties, 
  AlertOctagon,
  GitCompare,
  Key,
  Globe,
  Server,
  Workflow
} from 'lucide-react';

import ChatTab from './components/ChatTab';
import DocExplorerTab from './components/DocExplorerTab';
import VisualizerTab from './components/VisualizerTab';
import DebuggerTab from './components/DebuggerTab';
import AuditorTab from './components/AuditorTab';
import DiagramTab from './components/DiagramTab';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(['chat']));
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('deepseek_key') || '');
  const [backendStatus, setBackendStatus] = useState('offline');
  const [chunksCount, setChunksCount] = useState(0);

  useEffect(() => {
    // Check backend connection and details
    const checkBackend = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/status');
        if (res.ok) {
          const json = await res.json();
          setBackendStatus('online');
          setChunksCount(json.chunks_loaded || 0);
        } else {
          setBackendStatus('error');
        }
      } catch (e) {
        setBackendStatus('offline');
      }
    };
    checkBackend();
  }, []);

  const handleApiKeyChange = (e) => {
    const val = e.target.value;
    setApiKey(val);
    localStorage.setItem('deepseek_key', val);
  };

  const switchTab = (tab) => {
    setVisitedTabs(prev => (prev.has(tab) ? prev : new Set(prev).add(tab)));
    setActiveTab(tab);
  };

  // Visited tabs stay mounted (hidden via display:none) so their state
  // survives tab switches; unvisited tabs are not mounted at all.
  const TABS = {
    chat: <ChatTab apiKey={apiKey} />,
    explorer: <DocExplorerTab />,
    visualizer: <VisualizerTab />,
    diagrams: <DiagramTab apiKey={apiKey} />,
    debugger: <DebuggerTab apiKey={apiKey} />,
    auditor: <AuditorTab apiKey={apiKey} />
  };

  const renderTabContent = () => (
    Object.entries(TABS).map(([tab, component]) => (
      visitedTabs.has(tab) ? (
        <div
          key={tab}
          style={{
            display: activeTab === tab ? 'flex' : 'none',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            height: '100%',
            overflow: 'hidden'
          }}
        >
          {component}
        </div>
      ) : null
    ))
  );

  return (
    <div className="app-container">
      {/* Left Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="logo-section">
            <div className="logo-icon">
              <Server size={18} />
            </div>
            <span className="logo-text" style={{ fontSize: '1rem' }}>Integration Architect AI</span>
          </div>

          <nav className="nav-links">
            <button 
              className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => switchTab('chat')}
            >
              <MessageSquare size={16} />
              <span>Architect Chat</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'explorer' ? 'active' : ''}`}
              onClick={() => switchTab('explorer')}
            >
              <FolderOpen size={16} />
              <span>Document Repository</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'visualizer' ? 'active' : ''}`}
              onClick={() => switchTab('visualizer')}
            >
              <TableProperties size={16} />
              <span>Data Mapping Visualizer</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'diagrams' ? 'active' : ''}`}
              onClick={() => switchTab('diagrams')}
            >
              <Workflow size={16} />
              <span>Architecture Diagrams</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'debugger' ? 'active' : ''}`}
              onClick={() => switchTab('debugger')}
            >
              <AlertOctagon size={16} />
              <span>Mule Error Analyzer</span>
            </button>
            <button 
              className={`nav-item ${activeTab === 'auditor' ? 'active' : ''}`}
              onClick={() => switchTab('auditor')}
            >
              <GitCompare size={16} />
              <span>DDD Design Auditor</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Settings */}
        <div className="sidebar-footer">
          <div className="api-settings">
            <div className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
              <Key size={12} />
              <span>DEEPSEEK API KEY</span>
            </div>
            <input
              type="password"
              className="settings-input"
              placeholder="Paste deepseek key..."
              value={apiKey}
              onChange={handleApiKeyChange}
            />
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              Saved in browser local storage
            </span>
          </div>
        </div>
      </aside>

      {/* Main Work Window */}
      <main className="main-content">
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>
              WORKSPACE:
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
              /resources/
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="status-badge" style={{ backgroundColor: backendStatus === 'online' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', color: backendStatus === 'online' ? 'var(--success)' : 'var(--danger)', borderColor: backendStatus === 'online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
              <div className="status-dot" style={{ backgroundColor: backendStatus === 'online' ? 'var(--success)' : 'var(--danger)', animation: backendStatus === 'online' ? 'pulse 2s infinite' : 'none' }} />
              <span>{backendStatus === 'online' ? `Core Services Online (${chunksCount} chunks)` : 'Core Services Offline'}</span>
            </div>
          </div>
        </header>

        <div className="tab-panel">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}
