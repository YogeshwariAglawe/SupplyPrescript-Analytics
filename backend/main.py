from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import xgboost as xgb
import numpy as np
import os

app = FastAPI(title="SupplyPrescript Analytics API", version="2.0")

# enabling CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# load the trained XGBoost model if available
model = xgb.XGBClassifier()
model_path = "xgb_model.json"

if os.path.exists(model_path):
    model.load_model(model_path)
    print("Loaded XGBoost model successfully!")
else:
    model = None
    print("Warning: xgb_model.json not found.")

class PredictionRequest(BaseModel):
    shipment_id: str

# Optimization Audit: Hard Budget Constraint Guard
MAX_ALLOWED_BUDGET = 500.0  # Defined hard budget limit in USD

def audit_prescription_budget(prescriptions: list) -> list:
    """
    Audits the prescriptive recommendations to prove that 
    no action violates the hard budget constraint.
    """
    validated_prescriptions = []
    for rec in prescriptions:
        cost_val = rec.get("cost_impact", "$0")
        if isinstance(cost_val, str):
            clean_cost = float(cost_val.replace("+$", "").replace("$", ""))
        else:
            clean_cost = float(cost_val)
            
        if clean_cost <= MAX_ALLOWED_BUDGET:
            validated_prescriptions.append(rec)
        else:
            print(f"Audit Warning: Action {rec.get('action_id')} exceeded budget limit and was filtered.")
            
    return validated_prescriptions

@app.get("/")
def read_root():
    return {"status": "SupplyPrescript Prescriptive Engine is active"}

@app.post("/predict")
def predict_delay(data: PredictionRequest):
    delay_prob = 0.15 # default optimal
    
    if model is not None:
        hash_val = abs(hash(data.shipment_id)) % 1000
        distance = 200 + (hash_val % 1200)
        weather = hash_val % 3 
        traffic = 20 + (hash_val % 60)
        prev_delay = 1 if hash_val % 5 == 0 else 0

        features = np.array([[distance, weather, traffic, prev_delay]])
        prob = model.predict_proba(features)[0]
        delay_prob = float(prob[1])
        
    status = "Delayed Risk" if delay_prob > 0.4 else "Optimal"
    confidence_pct = f"{round(delay_prob * 100 if delay_prob > 0.4 else (1 - delay_prob) * 100, 1)}%"
    est_delay_hours = f"{int(delay_prob * 48)} Hours" if delay_prob > 0.4 else "0 Hours"


    prescriptions = []
    if status == "Delayed Risk":
        prescriptions = [
            {
                "action_id": "REC-01",
                "title": "Re-route via Highway 44 (Avoids Traffic)",
                "cost_impact": "+$120",
                "time_saved": "6 Hours",
                "feasibility": "High"
            },
            {
                "action_id": "REC-02",
                "title": "Express Air Freight Upgrade",
                "cost_impact": "+$450",
                "time_saved": "18 Hours",
                "feasibility": "Medium"
            },
            {
                "action_id": "REC-03",
                "title": "Dispatch Secondary Hub Backup Fleet",
                "cost_impact": "+$210",
                "time_saved": "10 Hours",
                "feasibility": "High"
            }
        ]
    else:
        prescriptions = [
            {
                "action_id": "REC-00",
                "title": "Standard Route Operating Optimally - No Action Required",
                "cost_impact": "$0",
                "time_saved": "0 Hours",
                "feasibility": "Optimal"
            }
        ]

    # apply optimization audit guard
    prescriptions = audit_prescription_budget(prescriptions)

    return {
        "shipment_id": data.shipment_id,
        "status": status,
        "confidence": confidence_pct,
        "estimated_delay": est_delay_hours,
        "prescriptions": prescriptions,
        "message": "Prescriptive optimization pipeline executed successfully"
    }
 HEAD
import sqlite3
from typing import Optional

# writeback check: operational database setup
DB_FILE = "supply_operations.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS decision_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shipment_id TEXT,
            action_id TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT
        )
    """)
    conn.commit()
    conn.close()

# initialize database on startup
init_db()

class DecisionRequest(BaseModel):
    shipment_id: str
    action_id: str

@app.post("/execute-decision")
def execute_decision(data: DecisionRequest):
    """
    Write-Back Check: Performs an INSERT statement into the operational 
    database when a prescriptive decision is executed from the UI.
    """
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO decision_logs (shipment_id, action_id, status) VALUES (?, ?, ?)",
            (data.shipment_id, data.action_id, "Executed Successfully")
        )
        conn.commit()
        conn.close()
        
        return {
            "status": "success",
            "message": f"Action {data.action_id} for shipment {data.shipment_id} written back to operational DB.",
            "shipment_id": data.shipment_id,
            "action_id": data.action_id
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

 4c7e1539716a8c7a29634df09f3ddf1f5eecba5f
# decision analytics- fetch logged decisions
@app.get("/decision-logs")
def get_decision_logs():
    """
    Retrieves all recorded prescriptive decisions from the operational database
    for auditing and analytics visual dashboard.
    """
    try:
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row  # enables dictionary-like access
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM decision_logs ORDER BY timestamp DESC LIMIT 50")
        rows = cursor.fetchall()
        conn.close()
        
        logs = [dict(row) for row in rows]
        
        return {
            "status": "success",
            "total_records": len(logs),
            "data": logs
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }