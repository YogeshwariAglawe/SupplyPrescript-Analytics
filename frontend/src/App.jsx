import React, { useState, useEffect } from 'react';
import DecisionRoiSection from './DecisionRoiSection';
import ModelRegistryCard from './ModelRegistryCard';

export default function App() {
  const [shipmentId, setShipmentId] = useState('SP-00001');
  const [loading, setLoading] = useState(false);
  const [executingId, setExecutingId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [roiData, setRoiData] = useState(null);
  const [roiLoading, setRoiLoading] = useState(false);
  const [roiError, setRoiError] = useState("");

  // HITL override draft state keyed by prescription index
  const [hitlDrafts, setHitlDrafts] = useState({});

  const fetchLogs = async () => {
    try {
      const response = await fetch('http://localhost:8000/decision-logs');
      if (response.ok) {
        const res = await response.json();
        setLogs(res.data || []);
      }
    } catch (err) {
      console.error("Error fetching decision logs:", err);
    }
  };

  const fetchRoiAnalytics = async () => {
    setRoiLoading(true);
    setRoiError("");
    try {
      const response = await fetch('http://localhost:8000/evaluate-decisions');
      if (response.ok) {
        const res = await response.json();
        setRoiData(res);
      } else {
        setRoiError("Unable to load ROI evaluation metrics.");
      }
    } catch (err) {
      console.error("Error fetching ROI analytics:", err);
      setRoiError("Backend unreachable while loading ROI metrics.");
    } finally {
      setRoiLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchRoiAnalytics();
  }, []);

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHitlDrafts({});

    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shipment_id: shipmentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect to backend analytics engine.');
      }

      const data = await response.json();
      setResult({
        status: data.status,
        confidence: data.confidence,
        estimatedDelay: data.estimated_delay,
        prescriptions: data.prescriptions || [],
      });
    } catch (err) {
      setError('Backend connection error. Make sure FastAPI server is running.');
    } finally {
      setLoading(false);
    }
  };

  const parseCost = (costImpact) => {
    if (typeof costImpact === 'number') return costImpact;
    return parseFloat(String(costImpact || 0).replace(/[^0-9.]/g, '')) || 0.0;
  };

  const updateHitlDraft = (idx, field, value) => {
    setHitlDrafts((prev) => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        [field]: value,
      },
    }));
  };

  // HITL Approve, Override, or Reject decision write-back
  const handleHitlDecision = async (rec, idx, mode = 'approve') => {
    const rowKey = `${idx}-${mode}`;
    setExecutingId(rowKey);
    try {
      const draft = hitlDrafts[idx] || {};
      const defaultCost = parseCost(rec.cost_impact);
      const customCost = draft.budget !== undefined && draft.budget !== ''
        ? Math.max(0, parseFloat(draft.budget) || 0.0)
        : defaultCost;

      const noteSuffix = draft.note && draft.note.trim()
        ? ` [HITL: ${draft.note.trim()}]`
        : '';

      let statusLabel = 'HITL Approved & Executed';
      let budgetToLog = defaultCost;

      if (mode === 'override') {
        statusLabel = 'HITL Overridden & Executed';
        budgetToLog = customCost;
      } else if (mode === 'reject') {
        statusLabel = 'HITL Rejected (No Action)';
        budgetToLog = 0.0;
      }

      const payload = {
        shipment_id: shipmentId || "SP-00001",
        action_id: rec.action_id || "REC-00",
        action_type: `${rec.title || "Standard Route Operating Optimally"}${noteSuffix}`,
        status: statusLabel,
        budget_used: budgetToLog,
      };

      const response = await fetch('http://localhost:8000/execute-decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        fetchLogs();
        fetchRoiAnalytics();
      } else {
        alert("Failed to record HITL decision on backend.");
      }
    } catch (err) {
      console.error("Error recording HITL decision:", err);
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <div style={{ backgroundColor: '#0B0F17', color: '#F8FAFC', minHeight: '100vh', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      {/* header */}
      <div style={{ maxWidth: '900px', margin: '0 auto 40px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: '#2563EB', color: '#fff', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>SP</div>
          <div>
            <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>SupplyPrescript</h1>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>Closed-Loop Operational Analytics • HITL Enabled</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#10B981' }}>
          <span style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%', display: 'inline-block' }}></span>
          System Active
        </div>
      </div>

      {/* main container */}
      <div style={{ maxWidth: '760px', margin: '0 auto', backgroundColor: '#161C28', border: '1px solid #1E293B', borderRadius: '16px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 500, margin: '0 0 8px 0' }}>Shipment Delay Risk Lookup</h2>
        <p style={{ fontSize: '14px', color: '#94A3B8', margin: '0 0 24px 0' }}>Enter a tracking ID to calculate real-time delay probabilities via FastAPI.</p>

        <form onSubmit={handlePredict} style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={shipmentId}
            onChange={(e) => setShipmentId(e.target.value)}
            style={{ flex: 1, backgroundColor: '#0B0F17', border: '1px solid #334155', borderRadius: '10px', padding: '12px 16px', color: '#fff', fontSize: '14px', outline: 'none' }}
          />
          <button
            type="submit"
            style={{ backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: 500, cursor: 'pointer', fontSize: '14px' }}
          >
            {loading ? 'Analyzing...' : 'Predict Delay'}
          </button>
        </form>

        {error && <div style={{ color: '#EF4444', fontSize: '13px', marginTop: '16px' }}>{error}</div>}

        {result && (
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #1E293B' }}>
            {/* prediction metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ backgroundColor: '#0B0F17', padding: '16px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Risk Status</span>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#10B981', marginTop: '6px' }}>{result.status}</div>
              </div>
              <div style={{ backgroundColor: '#0B0F17', padding: '16px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Prediction Score</span>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginTop: '6px' }}>{result.confidence}</div>
              </div>
              <div style={{ backgroundColor: '#0B0F17', padding: '16px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Estimated Delay</span>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginTop: '6px' }}>{result.estimatedDelay}</div>
              </div>
            </div>

            {/* Human-in-the-Loop Prescriptive Review Panel */}
            {result.prescriptions && result.prescriptions.length > 0 && (
              <div style={{ marginTop: '24px', backgroundColor: '#0B0F17', padding: '20px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#38BDF8', margin: 0 }}>Prescriptive Actions • HITL Review</h3>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Approve, override budget/note, or reject</span>
                </div>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px 0' }}>
                  Review AI recommendations before writing operational decisions to the audit log:
                </p>

                <div style={{ display: 'grid', gap: '12px' }}>
                  {result.prescriptions.map((rec, index) => {
                    const draft = hitlDrafts[index] || {};
                    const isBusy = executingId !== null && executingId.startsWith(`${index}-`);
                    return (
                      <div
                        key={index}
                        style={{
                          backgroundColor: '#161C28',
                          padding: '14px 16px',
                          borderRadius: '8px',
                          border: '1px solid #1E293B',
                          borderLeft: '4px solid #38BDF8',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                              {rec.action_id} • Feasibility: {rec.feasibility}
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: '#F8FAFC', marginTop: '2px' }}>{rec.title}</div>
                            <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px' }}>
                              Recommended Cost: {rec.cost_impact} | Saved: {rec.time_saved}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleHitlDecision(rec, index, 'approve')}
                              disabled={isBusy}
                              style={{ backgroundColor: '#10B981', color: '#0B0F17', border: 'none', borderRadius: '6px', padding: '7px 12px', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}
                            >
                              {executingId === `${index}-approve` ? 'Approving...' : 'Approve & Execute'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleHitlDecision(rec, index, 'override')}
                              disabled={isBusy}
                              style={{ backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 12px', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}
                            >
                              {executingId === `${index}-override` ? 'Overriding...' : 'Override & Log'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleHitlDecision(rec, index, 'reject')}
                              disabled={isBusy}
                              style={{ backgroundColor: 'transparent', color: '#F87171', border: '1px solid #7F1D1D', borderRadius: '6px', padding: '7px 12px', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}
                            >
                              {executingId === `${index}-reject` ? 'Rejecting...' : 'Reject'}
                            </button>
                          </div>
                        </div>

                        {/* Optional HITL override inputs */}
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', marginTop: '12px' }}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder={`Budget ($ ${parseCost(rec.cost_impact)})`}
                            value={draft.budget ?? ''}
                            onChange={(e) => updateHitlDraft(index, 'budget', e.target.value)}
                            style={{ backgroundColor: '#0B0F17', border: '1px solid #334155', borderRadius: '6px', padding: '6px 10px', color: '#F8FAFC', fontSize: '12px' }}
                          />
                          <input
                            type="text"
                            placeholder="Optional operator note / override reason..."
                            value={draft.note ?? ''}
                            onChange={(e) => updateHitlDraft(index, 'note', e.target.value)}
                            style={{ backgroundColor: '#0B0F17', border: '1px solid #334155', borderRadius: '6px', padding: '6px 10px', color: '#F8FAFC', fontSize: '12px' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ROI & Closed-Loop Section */}
        <DecisionRoiSection roiData={roiData} loading={roiLoading} error={roiError} onRefresh={fetchRoiAnalytics} />

        {/* Model Registry & Retraining Card */}
        <ModelRegistryCard />

        {/* Audit Logs Table Section */}
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #1E293B' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', margin: '0 0 12px 0' }}>Operational Audit Logs</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8' }}>
                  <th style={{ padding: '8px' }}>ID</th>
                  <th style={{ padding: '8px' }}>Action Type</th>
                  <th style={{ padding: '8px' }}>Status</th>
                  <th style={{ padding: '8px' }}>Budget</th>
                  <th style={{ padding: '8px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #1E293B' }}>
                      <td style={{ padding: '8px' }}>{log.id}</td>
                      <td style={{ padding: '8px' }}>{log.action_type}</td>
                      <td style={{ padding: '8px', color: '#10B981' }}>{log.status}</td>
                      <td style={{ padding: '8px' }}>${log.budget_used}</td>
                      <td style={{ padding: '8px', color: '#64748B' }}>{log.timestamp}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: '#64748B' }}>No audit logs recorded yet. Review a prescription to log an action.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
