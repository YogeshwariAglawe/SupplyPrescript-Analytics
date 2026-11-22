from pathlib import Path
import sqlite3
from typing import Dict, Any, List

DEFAULT_DB_PATH = str(Path(__file__).resolve().with_name("supply_operations.db"))
DELAY_PENALTY_BASELINE = 350.0


def evaluate_closed_loop(db_path: str = DEFAULT_DB_PATH) -> Dict[str, Any]:
    resolved_path = Path(db_path)
    if not resolved_path.exists():
        fallback = Path(__file__).resolve().with_name(Path(db_path).name)
        if fallback.exists():
            resolved_path = fallback

    conn = sqlite3.connect(str(resolved_path))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    pending_row = cur.execute("""
        SELECT COUNT(*) AS cnt
        FROM decision_logs
        WHERE actual_cost IS NULL
    """).fetchone()
    pending_count = int(pending_row["cnt"] or 0) if pending_row else 0

    rows = cur.execute("""
        SELECT id, shipment_id, action_id, action_type, status,
               budget_used, actual_cost, outcome_status, timestamp
        FROM decision_logs
        WHERE actual_cost IS NOT NULL
        ORDER BY timestamp DESC
    """).fetchall()
    conn.close()

    evaluations: List[Dict[str, Any]] = []
    total_predicted = 0.0
    total_actual = 0.0
    total_value_saved = 0.0
    positive_count = 0

    for row in rows:
        predicted = float(row["budget_used"] or 0.0)
        actual = float(row["actual_cost"] or 0.0)
        variance = round(actual - predicted, 2)
        raw_outcome = (row["outcome_status"] or "").strip()
        outcome = raw_outcome if raw_outcome else "Pending Evaluation"
        is_positive = outcome.lower().startswith("positive")

        if is_positive:
            positive_count += 1

        if row["action_id"] != "REC-00":
            gross_benefit = DELAY_PENALTY_BASELINE if is_positive else 0.0
            net_benefit = round(gross_benefit - actual, 2)
        else:
            net_benefit = round(predicted - actual, 2)

        total_predicted += predicted
        total_actual += actual
        total_value_saved += net_benefit

        evaluations.append({
            "id": row["id"],
            "shipment_id": row["shipment_id"] or "N/A",
            "action_id": row["action_id"] or "N/A",
            "action_type": row["action_type"] or "Unknown Action",
            "predicted_cost": predicted,
            "actual_cost": actual,
            "cost_variance": variance,
            "net_benefit": net_benefit,
            "outcome_status": outcome,
            "positive_outcome": is_positive,
            "timestamp": row["timestamp"] or "",
        })

    total_evaluated = len(evaluations)
    positive_rate = round((positive_count / total_evaluated) * 100, 1) if total_evaluated else 0.0
    decision_roi_pct = round((total_value_saved / total_actual) * 100, 1) if total_actual > 0 else 0.0

    return {
        "summary": {
            "total_evaluated": total_evaluated,
            "pending_evaluations": pending_count,
            "positive_outcomes": positive_count,
            "positive_outcome_rate_pct": positive_rate,
            "total_predicted_cost": round(total_predicted, 2),
            "total_actual_cost": round(total_actual, 2),
            "total_cost_variance": round(total_actual - total_predicted, 2),
            "net_business_value": round(total_value_saved, 2),
            "decision_roi_pct": decision_roi_pct,
        },
        "evaluations": evaluations,
    }


if __name__ == "__main__":
    import json
    result = evaluate_closed_loop()
    print(json.dumps(result["summary"], indent=2))
    print(f"\nEvaluated {len(result['evaluations'])} closed-loop records.")
