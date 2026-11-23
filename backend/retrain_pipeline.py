import json
from datetime import datetime, timezone
from pathlib import Path
import sqlite3
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
import xgboost as xgb

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "xgb_model.json"
REGISTRY_PATH = BASE_DIR / "model_registry.json"
DB_PATH = BASE_DIR / "supply_operations.db"

FEATURE_COLS = ["distance_km", "weather_severity", "traffic_index", "previous_delays"]


def generate_base_dataframe(n_samples: int = 1000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    data = {
        "distance_km": rng.uniform(50, 1500, n_samples),
        "weather_severity": rng.choice([0, 1, 2], n_samples, p=[0.7, 0.2, 0.1]),
        "traffic_index": rng.uniform(10, 90, n_samples),
        "previous_delays": rng.choice([0, 1], n_samples, p=[0.8, 0.2]),
    }
    df = pd.DataFrame(data)
    df["is_delayed"] = (
        ((df["distance_km"] > 1000) & (df["weather_severity"] > 0))
        | (df["traffic_index"] > 75)
    ).astype(int)
    return df


def get_discrepancy_summary(db_path: Path = DB_PATH) -> dict:
    if not db_path.exists():
        return {
            "evaluated_count": 0,
            "negative_outcomes": 0,
            "discrepancy_rate": 0.0,
            "should_retrain": False,
            "reason": "Database not found",
        }

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='decision_logs'")
        if not cur.fetchone():
            return {
                "evaluated_count": 0,
                "negative_outcomes": 0,
                "discrepancy_rate": 0.0,
                "should_retrain": False,
                "reason": "decision_logs table not found",
            }

        cur.execute("SELECT actual_cost, budget_used FROM decision_logs WHERE actual_cost IS NOT NULL")
        rows = cur.fetchall()
    finally:
        conn.close()

    evaluated_count = len(rows)
    if evaluated_count == 0:
        return {
            "evaluated_count": 0,
            "negative_outcomes": 0,
            "discrepancy_rate": 0.0,
            "should_retrain": False,
            "reason": "No evaluated decisions yet",
        }

    negative_outcomes = 0
    for r in rows:
        actual = float(r["actual_cost"] or 0.0)
        budget = float(r["budget_used"] or 0.0)
        if actual > budget:
            negative_outcomes += 1

    discrepancy_rate = round(negative_outcomes / evaluated_count, 4)
    should_retrain = negative_outcomes >= 1 or evaluated_count >= 20
    reason = (
        f"Detected {negative_outcomes} cost discrepancy(ies) across {evaluated_count} evaluated decisions"
        if negative_outcomes >= 1
        else f"Reached {evaluated_count} evaluated closed-loop samples"
    )

    return {
        "evaluated_count": evaluated_count,
        "negative_outcomes": negative_outcomes,
        "discrepancy_rate": discrepancy_rate,
        "should_retrain": should_retrain,
        "reason": reason,
    }


def load_registry(registry_path: Path = REGISTRY_PATH) -> dict:
    if registry_path.exists():
        with open(registry_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "current_version": "v1.0.0",
        "last_retrained_at": None,
        "last_accuracy": None,
        "last_trigger_reason": "Initial baseline model",
        "retrain_count": 0,
        "history": [],
    }


def retrain_xgboost_model(trigger_reason: str = "Manual / Closed-loop trigger", force: bool = False) -> dict:
    summary = get_discrepancy_summary()
    if not force and not summary["should_retrain"]:
        registry = load_registry()
        return {
            "retrained": False,
            "reason": "Retraining threshold not met",
            "discrepancy": summary,
            "registry": registry,
        }

    base_df = generate_base_dataframe(n_samples=1000, seed=42)

    # Augment with synthetic feedback rows derived from discrepancy count for continuous learning
    feedback_count = max(summary["negative_outcomes"] * 15, 10)
    rng = np.random.default_rng(100 + summary["evaluated_count"])
    feedback_df = pd.DataFrame({
        "distance_km": rng.uniform(400, 1450, feedback_count),
        "weather_severity": rng.choice([0, 1, 2], feedback_count, p=[0.4, 0.35, 0.25]),
        "traffic_index": rng.uniform(35, 92, feedback_count),
        "previous_delays": rng.choice([0, 1], feedback_count, p=[0.5, 0.5]),
    })
    feedback_df["is_delayed"] = (
        ((feedback_df["distance_km"] > 950) & (feedback_df["weather_severity"] > 0))
        | (feedback_df["traffic_index"] > 72)
        | (feedback_df["previous_delays"] == 1)
    ).astype(int)

    combined_df = pd.concat([base_df, feedback_df], ignore_index=True)
    X = combined_df[FEATURE_COLS]
    y = combined_df["is_delayed"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = xgb.XGBClassifier(
        n_estimators=60,
        max_depth=3,
        learning_rate=0.1,
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    acc = round(float(accuracy_score(y_test, preds)), 4)

    model.save_model(str(MODEL_PATH))

    registry = load_registry()
    next_num = registry.get("retrain_count", 0) + 1
    version = f"v1.{next_num}.0"
    timestamp = datetime.now(timezone.utc).isoformat()

    entry = {
        "version": version,
        "retrained_at": timestamp,
        "accuracy": acc,
        "training_rows": int(len(combined_df)),
        "trigger_reason": trigger_reason or summary["reason"],
    }

    registry["current_version"] = version
    registry["last_retrained_at"] = timestamp
    registry["last_accuracy"] = acc
    registry["last_trigger_reason"] = entry["trigger_reason"]
    registry["retrain_count"] = next_num
    registry["history"] = ([entry] + registry.get("history", []))[:10]

    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)

    return {
        "retrained": True,
        "version": version,
        "accuracy": acc,
        "training_rows": int(len(combined_df)),
        "discrepancy": summary,
        "registry": registry,
    }


if __name__ == "__main__":
    result = retrain_xgboost_model(trigger_reason="CLI closed-loop check", force=True)
    print(json.dumps(result, indent=2))
