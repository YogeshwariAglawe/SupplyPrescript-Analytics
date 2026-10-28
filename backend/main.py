from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import xgboost as xgb
import numpy as np
import os

app = FastAPI(title="SupplyPrescript Analytics API", version="2.0")

# Enable CORS for Frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the trained XGBoost model if available
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

    # Week 2 Prescriptive Recommendations (Generated if risk detected)
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

    return {
        "shipment_id": data.shipment_id,
        "status": status,
        "confidence": confidence_pct,
        "estimated_delay": est_delay_hours,
        "prescriptions": prescriptions,
        "message": "Prescriptive optimization pipeline executed successfully"
    }