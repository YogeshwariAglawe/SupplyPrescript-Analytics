import React from 'react';

export default function DecisionRoiSection({ roiData, loading, error, onRefresh }) {
  const summary = roiData?.summary;
  const evaluations = Array.isArray(roiData?.evaluations) ? roiData.evaluations : [];
  const pendingCount = Number(summary?.pending_evaluations || 0);

  const formatMoney = (val) => {
    const num = Number(val || 0);
    if (!Number.isFinite(num)) return '$0.0';
    const sign = num < 0 ? '-' : '';
    return `${sign}$${Math.abs(num).toFixed(1)}`;
  };

  const formatVariance = (val) => {
    const num = Number(val || 0);
    if (!Number.isFinite(num)) return '$0.0';
    if (num > 0) return `+$${num.toFixed(1)}`;
    if (num < 0) return `-$${Math.abs(num).toFixed(1)}`;
    return '$0.0';
  };

  return (
    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #1E293B' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
            Decision ROI & Closed-Loop Outcomes
          </h3>
          <p style={{ fontSize: '12px', color: '#94A3B8', margin: '4px 0 0 0' }}>
            Predicted vs. actual mitigation cost and business value against $350.0 delay baseline
            {pendingCount > 0 ? ` • ${pendingCount} pending evaluation` : ''}
          </p>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            style={{
              backgroundColor: '#0B0F17',
              color: '#38BDF8',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh ROI'}
          </button>
        )}
      </div>

      {summary ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#0B0F17', padding: '14px', borderRadius: '10px', border: '1px solid #1E293B' }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Decision ROI</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#38BDF8', marginTop: '6px' }}>
                {summary.decision_roi_pct ?? 0}%
              </div>
            </div>
            <div style={{ backgroundColor: '#0B0F17', padding: '14px', borderRadius: '10px', border: '1px solid #1E293B' }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Positive Rate</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#10B981', marginTop: '6px' }}>
                {summary.positive_outcome_rate_pct ?? 0}% ({summary.positive_outcomes ?? 0}/{summary.total_evaluated ?? 0})
              </div>
            </div>
            <div style={{ backgroundColor: '#0B0F17', padding: '14px', borderRadius: '10px', border: '1px solid #1E293B' }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Net Value</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: Number(summary.net_business_value) >= 0 ? '#10B981' : '#EF4444', marginTop: '6px' }}>
                {formatMoney(summary.net_business_value)}
              </div>
            </div>
            <div style={{ backgroundColor: '#0B0F17', padding: '14px', borderRadius: '10px', border: '1px solid #1E293B' }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Cost Variance</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: Number(summary.total_cost_variance) <= 0 ? '#10B981' : '#F59E0B', marginTop: '6px' }}>
                {formatVariance(summary.total_cost_variance)}
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94A3B8' }}>
                  <th style={{ padding: '8px' }}>Shipment</th>
                  <th style={{ padding: '8px' }}>Action</th>
                  <th style={{ padding: '8px' }}>Predicted</th>
                  <th style={{ padding: '8px' }}>Actual</th>
                  <th style={{ padding: '8px' }}>Net Benefit</th>
                  <th style={{ padding: '8px' }}>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.length > 0 ? (
                  evaluations.map((item, idx) => (
                    <tr key={item.id ?? idx} style={{ borderBottom: '1px solid #1E293B' }}>
                      <td style={{ padding: '8px', fontWeight: 500 }}>{item.shipment_id}</td>
                      <td style={{ padding: '8px' }}>{item.action_type}</td>
                      <td style={{ padding: '8px' }}>{formatMoney(item.predicted_cost)}</td>
                      <td style={{ padding: '8px' }}>{formatMoney(item.actual_cost)}</td>
                      <td style={{ padding: '8px', color: Number(item.net_benefit) >= 0 ? '#10B981' : '#EF4444' }}>
                        {formatMoney(item.net_benefit)}
                      </td>
                      <td style={{ padding: '8px', color: item.positive_outcome ? '#10B981' : '#EF4444' }}>
                        {item.outcome_status}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ padding: '16px', textAlign: 'center', color: '#64748B' }}>
                      {pendingCount > 0
                        ? `${pendingCount} decision(s) pending outcome evaluation.`
                        : 'No evaluated closed-loop records available yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{ padding: '14px', backgroundColor: '#0B0F17', borderRadius: '10px', border: '1px solid #1E293B', color: error ? '#EF4444' : '#64748B', fontSize: '13px' }}>
          {loading
            ? 'Loading ROI analytics...'
            : error || 'ROI metrics unavailable. Make sure FastAPI server is running on port 8000.'}
        </div>
      )}
    </div>
  );
}
