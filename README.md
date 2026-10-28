#  "Supply Prescript": Closed-Loop Prescriptive Analytics 

Supply Prescript is an enterprise-grade, full-stack supply chain intelligence platform that bridges the gap between predictive machine learning and prescriptive operational recovery.

## Overview

Traditional supply chain management often relies on reactive troubleshooting after delays have already impacted operations. SupplyPrescript aims to transform logistics monitoring by predicting shipment delays using machine learning and instantly providing actionable, cost-optimized mitigation strategies.

The application combines a React/Vite frontend, a FastAPI backend, an XGBoost predictive model, and a structured prescriptive engine to deliver real-time operational insights.

## Features

- Real-time shipment delay risk prediction
- Prediction confidence scores and risk status classification
- Estimated delay duration calculation (in hours)
- AI-driven prescriptive optimization actions (Re-routing, Air Freight Upgrades, Secondary Fleet Dispatch)
- Cost impact and time-saved metrics for operational recovery
- Enterprise dark-slate UI aesthetic (`#0B0F17`)
- Asynchronous REST API with robust Pydantic data validation

## Technology Stack

### Frontend
- React
- Vite
- Modern System UI / Custom Dark-Slate Styling

### Backend & Machine Learning
- Python
- FastAPI
- Uvicorn
- XGBoost
- NumPy
- Pydantic

## Architecture

1. The user enters a shipment tracking ID in the React frontend interface.
2. The FastAPI backend receives the request and triggers the XGBoost analytics pipeline.
3. The engine computes the risk status, confidence score, and estimated delay.
4. If a delay risk is detected, the prescriptive module generates top-3 mitigation actions with associated costs and time savings.
5. The frontend dynamically renders the metric cards and the interactive Prescriptive Optimization Actions panel in real time.

## Project Structure

```text
SupplyPrescript-Analytics/
├── backend/
│   ├── main.py
│   └── .venv/
├── frontend/
│   ├── src/
│   │   │   └── App.jsx
│   ├── package.json
│   └── ...
├── .gitignore
└── README.md
```
## Prerequisite

Ensure you have the following installed before running the application:
1. Python 3.12 or a compatible version
2. Node.js and npm (for the React frontend)

## Local Setup
1. Start the Backend
Open PowerShell and navigate to your backend directory:

- PowerShell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install fastapi uvicorn xgboost pydantic numpy
uvicorn main:app --reload

- Backend base URL: http://localhost:8000
- Interactive API documentation: http://localhost:8000/docs

2. Start the Frontend
Open a second PowerShell window and navigate to your frontend directory:

- PowerShell
cd frontend
npm install
npm run dev
Open the application at the Vite local development URL (e.g., http://localhost:5173).

- Keep both development server windows open while using the application.

## Example Usage
Try entering tracking IDs such as:
SP-00001 (or any custom shipment ID) to evaluate delay probabilities and view recommended recovery routes.

## API Endpoints
The FastAPI backend exposes endpoints for application health checks, delay predictions, and prescriptive action mapping. Visit /docs on the running backend server for complete request/response schemas.

## Security Notes
- Never commit secrets, API keys, or private tokens to public repositories.

- Keep local virtual environments (.venv/) and dependency folders (node_modules/) excluded via .gitignore.

- Review all changes before pushing updates to GitHub.

## Current Status
SupplyPrescript has successfully implemented its core predictive model, FastAPI backend integration, prescriptive action engine, and React dark-slate dashboard interface. Further enhancements and cloud deployments are planned for production readiness.

## Future Improvements
1. Integrate advanced data visualization charts (Cost vs. Time tradeoffs)

2. Implement automated report generation (PDF/CSV exports)

3. Expand the XGBoost training dataset with multi-region logistics telemetry

4. Deploy frontend to Vercel/Netlify and backend to Render/Railway

## Author
Developed as an advanced enterprise-grade supply chain analytics project focused on combining predictive machine learning with automated prescriptive operational recovery.

