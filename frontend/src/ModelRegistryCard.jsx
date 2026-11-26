import React, { useState, useEffect, useCallback } from 'react';

export default function ModelRegistryCard() {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchRetrainStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/retrain-status');
      if (!res.ok) throw new Error('Failed to fetch model registry status');
      const data = await res.json();
      if (data.status === 'success') {
        setStatusData(data);
      } else {
        setError(data.message || 'Unable to read registry status');
      }
    } catch (err) {
      setError('Backend unreachable for model registry status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRetrainStatus();
  }, [fetchRetrainStatus]);

  const handleTriggerRetrain = async (force = false) => {
    setRetraining(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('http://localhost:8000/retrain-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger_reason: force ? 'Forced UI operator retrain' : 'UI closed-loop retrain trigger',
          force,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setMessage(data.message || (data.retrained ? 'Model retrained & reloaded.' : 'Retrain check completed.'));
        await fetchRetrainStatus();
      } else {
        setError(data.message || 'Retraining request failed.');
      }
    } catch (err) {
      setError('Error triggering model retraining.');
    } finally {
      setRetraining(false);
    }
  };

  const registry = statusData?.registry || {};
  const discrepancy = statusData?.discrepancy || {};

  return (
    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #1E293B' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
            Model Registry & Retraining Pipeline
          </h3>
          <p style={{ fontSize: '12px', color: '#94A3B8', margin: '4px 0 0 0' }}>
            Active XGBoost artifact version, closed-loop discrepancy signals, and hot-reload trigger
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={fetchRetrainStatus}
            disabled={loading || retraining}
            style={{
              backgroundColor: '#0B0F17',
              color: '#38BDF8',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {loading ? 'Checking...' : 'Refresh Status'}
          </button>
          <button
            type="button"
            onClick={() => handleTriggerRetrain(false)}
            disabled={retraining}
            style={{
              backgroundColor: '#2563EB',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {retraining ? 'Retraining...' : 'Retrain Model'}
          </button>
          <button
            type="button"
            onClick={() => handleTriggerRetrain(true)}
            disabled={retraining}
            style={{
              backgroundColor: '#0B0F17',
              color: '#F59E0B',
              border: '1px solid #78350F',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Force Retrain
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div style={{ backgroundColor: '#0B0F17', padding: '14px', borderRadius: '10px', border: '1px solid #1E293B' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Active Version</span>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#38BDF8', marginTop: '6px' }}>
            {registry.current_version || 'N/A'}
          </div>
        </div>
        <div style={{ backgroundColor: '#0B0F17', padding: '14px', borderRadius: '10px', border: '1px solid #1E293B' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Last Accuracy</span>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#10B981', marginTop: '6px' }}>
            {registry.last_accuracy !== undefined ? `${(Number(registry.last_accuracy) * 100).toFixed(2)}%` : 'N/A'}
          </div>
        </div>
        <div style={{ backgroundColor: '#0B0F17', padding: '14px', borderRadius: '10px', border: '1px solid #1E293B' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Discrepancy Rate</span>
          <div style={{ fontSize: '16px', fontWeight: 700, color: discrepancy.should_retrain ? '#F59E0B' : '#F8FAFC', marginTop: '6px' }}>
            {discrepancy.discrepancy_rate !== undefined ? `${(Number(discrepancy.discrepancy_rate) * 100).toFixed(2)}%` : '0.00%'}
          </div>
        </div>
        <div style={{ backgroundColor: '#0B0F17', padding: '14px', borderRadius: '10px', border: '1px solid #1E293B' }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Retrain Runs</span>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC', marginTop: '6px' }}>
            {registry.retrain_count ?? 0}
          </div>
        </div>
      </div>

      {discrepancy.reason && (
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#94A3B8' }}>
          Signal: {discrepancy.reason}
        </div>
      )}
      {message && (
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#10B981' }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#EF4444' }}>
          {error}
        </div>
      )}
    </div>
  );
}
