import React, { useState, useEffect } from 'react';
import { FileText, Table, Presentation, FileCode, AlertCircle, RefreshCw, Upload, Trash2 } from 'lucide-react';

const DOC_DESCRIPTIONS = {
  "Enterprise_API_Directory_and_Data_Mappings.xlsx": "Excel database housing the catalog of System, Process, and Experience APIs, as well as DataWeave fields mapping specifications for patient enrollments and logistics orders.",
  "MuleSoft_Development_Best_Practices_and_Standards.docx": "Official developer standards guide outlining API naming formats, performance strategies, and global JSON error schemas.",
  "MuleSoft_Integration_Architecture_Blueprint.pptx": "Presentation outlining the API-Led Connectivity design framework and centralized error router mechanics.",
  "Mulesoft.docx": "Comprehensive reference guide detailing runtime hosting options, control vs runtime planes, and platform delivery frameworks.",
  "Sample Mulesoft docs1.pdf": "Confluence specification detailing the shift to Domain-Driven Design (DDD) for API boundaries and schemas.",
  "Sample error test 3.pdf": "Detailed design for self-service business error tracking via Salesforce custom objects and Mule VM/JMS DLQ implementations.",
  "Sample integration patterns.pdf": "Consolidated catalog of 8 core integration patterns (Async, Sync, Batch, ETL) with applicability policies.",
  "mulesoft_whitepaper---blueprint-for-implementing-ai.pdf": "Whitepaper outlining architectural blueprints for connecting enterprise data with LLMs and triggering downstream workflows."
};

export default function DocExplorerTab() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDocs = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:8000/api/documents');
      if (!res.ok) throw new Error("Failed to load documents");
      const data = await res.json();
      setDocs(data);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to connect to backend server. Make sure FastAPI backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const handleReload = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const reloadRes = await fetch('http://localhost:8000/api/reload', {
        method: 'POST'
      });
      if (!reloadRes.ok) throw new Error("Failed to trigger re-indexing");
      await fetchDocs();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to connect to backend server. Make sure FastAPI backend is running on port 8000.");
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setErrorMsg('');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('http://localhost:8000/api/documents/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error("Upload failed");
      await fetchDocs();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to upload file. Verify backend is running and file type is supported (.pdf, .docx, .pptx, .xlsx).");
      setLoading(false);
    } finally {
      // Clear input so same file can be uploaded again if deleted
      e.target.value = '';
    }
  };

  const handleDeleteDoc = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}? This will permanently remove it from the resources folder and re-index the RAG database.`)) return;
    setLoading(true);
    setErrorMsg('');
    
    try {
      const res = await fetch(`http://localhost:8000/api/documents/delete/${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error("Delete failed");
      await fetchDocs();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to delete file from repository.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const getDocIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'xlsx') return { icon: <Table size={20} />, className: 'doc-xlsx' };
    if (ext === 'pptx') return { icon: <Presentation size={20} />, className: 'doc-pptx' };
    if (ext === 'pdf') return { icon: <FileText size={20} />, className: 'doc-pdf' };
    return { icon: <FileCode size={20} />, className: 'doc-docx' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }} className="title-gradient">Document Repository Explorer</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Verify documents loaded in the RAG search database and their metadata.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="file"
            id="doc-file-upload"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            accept=".pdf,.docx,.pptx,.xlsx"
            disabled={loading}
          />
          <label 
            htmlFor="doc-file-upload" 
            className="btn btn-primary" 
            style={{ cursor: loading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', opacity: loading ? 0.6 : 1 }}
          >
            <Upload size={14} />
            <span>Upload Doc</span>
          </label>
          <button className="btn btn-secondary" onClick={handleReload} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Reload Repo</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="glass-card" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div className="spinner" style={{ width: '40px', height: '40px', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Parsing and loading integration repository...</p>
        </div>
      ) : (
        <div className="doc-grid">
          {docs.map((doc, idx) => {
            const iconObj = getDocIcon(doc.filename);
            return (
              <div key={idx} className="glass-card doc-card">
                <div>
                  <div className="doc-header">
                    <div className={`doc-icon-container ${iconObj.className}`}>
                      {iconObj.icon}
                    </div>
                    <div>
                      <h4 className="doc-title">{doc.filename}</h4>
                      <span className="doc-meta" style={{ display: 'block', marginTop: '0.2rem' }}>
                        Chunks: {doc.chunks} | Type: {doc.type.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineBreak: 'normal', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {DOC_DESCRIPTIONS[doc.filename] || "Enterprise integration architectural reference document indexed for RAG operations."}
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', background: 'transparent' }}
                    onClick={() => handleDeleteDoc(doc.filename)}
                    disabled={loading}
                    title="Delete Document"
                  >
                    <Trash2 size={12} />
                  </button>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 229, 255, 0.2)', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>
                    Active Index
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
