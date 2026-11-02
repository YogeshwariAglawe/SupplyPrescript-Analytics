import React, { useState } from 'react';

export default function App() {
  const [shipmentId, setShipmentId] = useState('SP-00001');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
        prescriptions: data.prescriptions || [], // 👈 Backend se aane wali prescriptive recommendations
      });
    } catch (err) {
      setError('Backend connection error. Make sure FastAPI server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#0B0F17', color: '#F8FAFC', minHeight: '100vh', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ maxWidth: '900px', margin: '0 auto 40px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E293B', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: '#2563EB', color: '#fff', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>SP</div>
          <div>
            <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>SupplyPrescript</h1>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>Closed-Loop Operational Analytics</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#10B981' }}>
          <span style={{ width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%', display: 'inline-block' }}></span>
          System Active
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '700px', margin: '0 auto', backgroundColor: '#161C28', border: '1px solid #1E293B', borderRadius: '16px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
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
            {/* Prediction Metric Cards */}
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

            {/* 🤖 Prescriptive Recommendations Panel */}
            {result.prescriptions && result.prescriptions.length > 0 && (
              <div style={{ marginTop: '24px', backgroundColor: '#0B0F17', padding: '20px', borderRadius: '12px', border: '1px solid #1E293B' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '16px' }}>⚡</span>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#38BDF8', margin: 0 }}>Prescriptive Optimization Actions</h3>
                </div>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px 0' }}>
                  AI-driven operational mitigations mapped to predicted delay risk:
                </p>

                <div style={{ display: 'grid', gap: '10px' }}>
                  {result.prescriptions.map((rec, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        backgroundColor: '#161C28', 
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        border: '1px solid #1E293B',
                        borderLeft: '4px solid #38BDF8',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>{rec.action_id}</div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#F8FAFC', marginTop: '2px' }}>{rec.title}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>Cost: {rec.cost_impact}</div>
                        <div style={{ fontSize: '12px', color: '#38BDF8' }}>Saved: {rec.time_saved}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}