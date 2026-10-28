import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split

print("Training lightweight XGBoost Supply Chain model...")

# 1. Create synthetic operational training data
np.random.seed(42)
n_samples = 1000

data = {
    'distance_km': np.random.uniform(50, 1500, n_samples),
    'weather_severity': np.random.choice([0, 1, 2], n_samples, p=[0.7, 0.2, 0.1]),
    'traffic_index': np.random.uniform(10, 90, n_samples),
    'previous_delays': np.random.choice([0, 1], n_samples, p=[0.8, 0.2])
}

df = pd.DataFrame(data)
# Target: 1 if delayed, 0 if optimal
df['is_delayed'] = ((df['distance_km'] > 1000) & (df['weather_severity'] > 0)) | (df['traffic_index'] > 75)
df['is_delayed'] = df['is_delayed'].astype(int)

X = df[['distance_km', 'weather_severity', 'traffic_index', 'previous_delays']]
y = df['is_delayed']

# 2. Train XGBoost Model
model = xgb.XGBClassifier(n_estimators=50, max_depth=3, learning_rate=0.1)
model.fit(X, y)

# 3. Save model to JSON file
model.save_model("xgb_model.json")
print("XGBoost model successfully trained and saved as 'xgb_model.json'!")