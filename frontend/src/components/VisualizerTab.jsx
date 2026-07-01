import React, { useState, useEffect } from 'react';
import { Table, Search, Download, AlertCircle } from 'lucide-react';

export default function VisualizerTab() {
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState('');
  const [data, setData] = useState({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchMappings = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/mapping-visualizer');
        if (!res.ok) throw new Error("Failed to load mappings");
        const json = await res.json();
        setSheets(json.sheets || []);
        if (json.sheets && json.sheets.length > 0) {
          setActiveSheet(json.sheets[0]);
        }
        setData(json.data || {});
      } catch (err) {
        console.error(err);
        setErrorMsg("Failed to load mapping specifications from Excel. Make sure backend is running.");
      } finally {
        setLoading(false);
      }
    };
    fetchMappings();
  }, []);

  const getSheetRows = () => {
    if (!activeSheet || !data[activeSheet]) return [];
    const rows = data[activeSheet];
    if (!search.trim()) return rows;
    
    // Header is row 0 or 1 depending on sheets, let's keep headers and filter data rows
    const headerRowIdx = activeSheet === 'API Directory' ? 3 : activeSheet === 'Patient Enrollment Mapping' ? 3 : 3;
    const header = rows[headerRowIdx] || [];
    const dataRows = rows.slice(headerRowIdx + 1);
    
    const filteredData = dataRows.filter(row => 
      row.some(cell => cell.toLowerCase().includes(search.toLowerCase()))
    );
    
    return [...rows.slice(0, headerRowIdx + 1), ...filteredData];
  };

  const rows = getSheetRows();

  // Helper to distinguish title, description, headers and table rows
  const renderRow = (row, rIdx) => {
    // For API Directory, row 0 and 1 are sheet headers/descriptions
    if (activeSheet === 'API Directory') {
      if (rIdx === 0) return <tr key={rIdx}><td colSpan={row.length} style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-cyan)', border: 'none', paddingBottom: '0' }}>{row[0]}</td></tr>;
      if (rIdx === 1) return <tr key={rIdx}><td colSpan={row.length} style={{ color: 'var(--text-muted)', border: 'none', paddingBottom: '1.5rem', fontSize: '0.85rem' }}>{row[0]}</td></tr>;
      if (rIdx === 2) return null; // empty row
      if (rIdx === 3) {
        return (
          <tr key={rIdx}>
            {row.map((cell, cIdx) => <th key={cIdx}>{cell}</th>)}
          </tr>
        );
      }
    }
    
    // For Enrollment / Fulfillment, row 0 and 1 are title and descriptions
    if (activeSheet === 'Patient Enrollment Mapping' || activeSheet === 'Fulfillment Mapping') {
      if (rIdx === 0) return <tr key={rIdx}><td colSpan={row.length} style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent-cyan)', border: 'none', paddingBottom: '0' }}>{row[0]}</td></tr>;
      if (rIdx === 1) return <tr key={rIdx}><td colSpan={row.length} style={{ color: 'var(--text-muted)', border: 'none', paddingBottom: '1.5rem', fontSize: '0.85rem' }}>{row[0]}</td></tr>;
      if (rIdx === 2) return null;
      if (rIdx === 3) {
        return (
          <tr key={rIdx}>
            {row.map((cell, cIdx) => <th key={cIdx}>{cell}</th>)}
          </tr>
        );
      }
    }

    return (
      <tr key={rIdx}>
        {row.map((cell, cIdx) => {
          // Add custom styling for specific columns (like status or layers)
          let cellStyle = {};
          if (cell === 'Production') cellStyle = { color: 'var(--success)', fontWeight: 'bold' };
          if (cell === 'Active Development') cellStyle = { color: 'var(--warning)' };
          if (cell === 'Testing') cellStyle = { color: 'var(--accent-blue)' };
          if (cell === 'System') cellStyle = { color: 'var(--accent-purple)', fontWeight: 'bold' };
          if (cell === 'Process') cellStyle = { color: 'var(--accent-blue)', fontWeight: 'bold' };
          if (cell === 'Experience') cellStyle = { color: 'var(--accent-cyan)', fontWeight: 'bold' };
          if (cell === 'Yes' || cell === 'Required') cellStyle = { color: 'var(--danger)', fontWeight: '500' };
          
          // Render multi-line code/DW formulas cleanly
          const hasNewlines = cell.includes('\n');
          return (
            <td key={cIdx} style={cellStyle}>
              {hasNewlines ? (
                <pre style={{ margin: 0, padding: '0.2rem', fontFamily: 'monospace', fontSize: '0.75rem', background: '#05070c', border: '1px solid var(--border-color)', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                  {cell}
                </pre>
              ) : (
                cell
              )}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }} className="title-gradient">Data Mapping & API Catalog Visualizer</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Inspect active integrations, FHIR endpoint mapping requirements, and DataWeave schema transformations.</p>
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
          <p style={{ color: 'var(--text-muted)' }}>Parsing Excel sheet mapping specification...</p>
        </div>
      ) : (
        <div className="mapping-layout">
          <div className="sheet-selector">
            <div className="form-label" style={{ fontSize: '0.75rem', paddingLeft: '0.25rem' }}>SHEETS AVAILABLE</div>
            {sheets.map((sheet, idx) => (
              <button 
                key={idx}
                className={`sheet-btn ${activeSheet === sheet ? 'active' : ''}`}
                onClick={() => {
                  setActiveSheet(sheet);
                  setSearch('');
                }}
              >
                <Table size={14} style={{ inlineSize: '14px', marginRight: '0.5rem', verticalAlign: 'middle', display: 'inline' }} />
                {sheet}
              </button>
            ))}
            
            <div style={{ marginTop: 'auto', padding: '0.5rem' }}>
              <div className="glass-card" style={{ padding: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderStyle: 'dashed' }}>
                💡 <strong>Architect tip:</strong> These mapping files dictate the rules indexed by the RAG search chatbot.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: '1rem' }}>
            <div className="glass-card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Search size={18} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder={`Search rows in '${activeSheet}'...`}
                className="form-control"
                style={{ border: 'none', padding: '0.2rem', backgroundColor: 'transparent' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="suggestion-chip" style={{ border: 'none' }} onClick={() => setSearch('')}>
                  Clear
                </button>
              )}
            </div>

            <div className="table-container" style={{ flex: 1 }}>
              {rows.length > 0 ? (
                <table className="mapping-table">
                  <tbody>
                    {rows.map((row, rIdx) => renderRow(row, rIdx))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No matching mapping rows found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
