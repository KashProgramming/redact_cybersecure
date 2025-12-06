from fastapi import APIRouter
import pandas as pd

router = APIRouter()

import os

# Robust data path finding
DATA_PATH = "data/test.csv"
if not os.path.exists(DATA_PATH):
    # Try finding it relative to this file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)
    DATA_PATH = os.path.join(parent_dir, "data", "test.csv")

if os.path.exists(DATA_PATH):
    df = pd.read_csv(DATA_PATH)
else:
    print(f"Warning: Test data not found at {DATA_PATH}")
    df = pd.DataFrame() # Empty dataframe to prevent crash on import

@router.get("/next/{index}")
def get_flow(index: int):
    try:
        if index >= len(df):
            return {"end": True}

        row = df.iloc[index]
        # Handle NaN values for JSON serialization
        # Use a simpler approach if where() fails
        d = row.to_dict()
        clean_d = {}
        for k, v in d.items():
            if pd.isna(v):
                clean_d[k] = None
            else:
                clean_d[k] = v
        
        return {
            "index": index,
            "flow": clean_d,
            "end": False
        }
    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc(), "end": True}

# Import necessary modules for prediction
from routers.predict import model, predict_with_model, ATTACK_MAP
import numpy as np

# @router.get("/stats")
# def get_dashboard_stats():
#     try:
#         if df.empty:
#             return {"error": "No data loaded"}
            
#         # Limit to 100,000 rows for stats calculation as requested
#         limit = 100000
#         stats_df = df.head(limit)
        
#         # Perform Prediction on the loaded data (replicating dashboard1.py logic)
#         # We need to predict to get the actual current model's view of the data
#         # Filter out non-feature columns explicitly
#         feature_cols = [col for col in stats_df.columns if col not in ['Attack_type', 'Attack_encode']]
#         X = stats_df[feature_cols]
        
#         # Predict
#         if model:
#             preds = predict_with_model(model, X)
#             # Convert predictions to labels
#             # preds might be floats from XGBoost, cast to int
#             pred_labels = [int(p) if isinstance(p, (int, float, np.number)) else int(p) for p in preds]
#             pred_names = [ATTACK_MAP.get(p, 'Unknown') for p in pred_labels]
#         else:
#             # Fallback if model not loaded (shouldn't happen if app started correctly)
#             return {"error": "Model not loaded"}

#         # 1. Total Flows
#         total_flows = len(stats_df)
        
#         # 2. Attack Distribution (based on PREDICTIONS)
#         attack_counts = {}
#         for name in pred_names:
#             attack_counts[name] = attack_counts.get(name, 0) + 1
            
#         # 3. Protocol Distribution (All)
#         if 'Protocol' in stats_df.columns:
#             protocol_counts = stats_df['Protocol'].value_counts().head(10).to_dict()
#         else:
#             protocol_counts = {}
            
#         # 4. Protocol Distribution (Malicious)
#         malicious_protocol_counts = {}
#         recent_threats = []
        
#         # Filter malicious based on predictions
#         # Create a temporary dataframe with predictions for filtering
#         temp_df = stats_df.copy()
#         temp_df['Predicted_Attack'] = pred_names
        
#         malicious_df = temp_df[temp_df['Predicted_Attack'] != 'Benign']
        
#         if not malicious_df.empty:
#             if 'Protocol' in malicious_df.columns:
#                 malicious_protocol_counts = malicious_df['Protocol'].value_counts().head(10).to_dict()
            
#             # 5. Recent Threats (Take last 20 malicious flows)
#             threats_df = malicious_df.tail(20).iloc[::-1]
            
#             for idx, row in threats_df.iterrows():
#                 recent_threats.append({
#                     "id": int(idx),
#                     "attack": row['Predicted_Attack'],
#                     "protocol": row['Protocol'] if 'Protocol' in row else "Unknown",
#                     "severity": "High", # Simplified for summary
#                     "fwd_packets": int(row.get('Total Fwd Packets', 0)),
#                     "bwd_packets": int(row.get('Total Backward Packets', 0))
#                 })

#         return {
#             "total_flows": total_flows,
#             "attack_counts": attack_counts,
#             "protocol_counts": protocol_counts,
#             "malicious_protocol_counts": malicious_protocol_counts,
#             "recent_threats": recent_threats
#         }
#     except Exception as e:
#         import traceback
#         print(traceback.format_exc())
#         return {"error": str(e)}


@router.get("/stats")
def get_dashboard_stats():
    import numpy as np
    import pandas as pd

    try:
        if df.empty:
            return {"error": "No data loaded"}

        limit = 100000
        stats_df = df.head(limit).copy()

        # ------------------------------
        # 1. PREDICTION PREPROCESSING
        # ------------------------------
        feature_cols = [
            col for col in stats_df.columns
            if col not in ["Attack_type", "Attack_encode"]
        ]

        X = stats_df[feature_cols]

        if not model:
            return {"error": "Model not loaded"}

        preds = predict_with_model(model, X)
        pred_labels = [int(p) for p in preds]
        pred_names = [ATTACK_MAP.get(p, "Unknown") for p in pred_labels]

        # Add predictions to dataframe
        stats_df["Predicted_Attack"] = pred_names

        # ------------------------------
        # 2. EXISTING (UNCHANGED) FIELDS
        # ------------------------------

        # Total flows
        total_flows = len(stats_df)

        # Attack distribution
        attack_counts = {}
        for name in pred_names:
            attack_counts[name] = attack_counts.get(name, 0) + 1

        # Protocol distribution (all)
        protocol_counts = stats_df["Protocol"].value_counts().head(10).to_dict()

        # Malicious protocol distribution
        malicious_df = stats_df[stats_df["Predicted_Attack"] != "Benign"]
        malicious_protocol_counts = {}
        if not malicious_df.empty:
            malicious_protocol_counts = (
                malicious_df["Protocol"].value_counts().head(10).to_dict()
            )

        # Recent threats (existing frontend depends on this)
        recent_threats = []
        if not malicious_df.empty:
            threats_df = malicious_df.tail(20).iloc[::-1]
            for idx, row in threats_df.iterrows():
                recent_threats.append({
                    "id": int(idx),
                    "attack": row["Predicted_Attack"],
                    "severity": "High",
                    "protocol": row.get("Protocol", "Unknown"),
                    "fwd_packets": int(row.get("Total Fwd Packets", 0)),
                    "bwd_packets": int(row.get("Total Backward Packets", 0)),
                })

        # ------------------------------
        # 3. NEW ENHANCED ANALYTICS
        # ------------------------------

        # Attack Trend (rolling window of 2000 flows)
        # 3. NEW ENHANCED ANALYTICS
        # Attack Trend (rolling window of 2000 flows)
        window = 2000
        attack_numeric = [1 if a != "Benign" else 0 for a in pred_names]
        attack_series = pd.Series(attack_numeric)

        # Full rolling trend
        attack_trend_raw = (    
            attack_series.rolling(window=window, min_periods=1)
            .mean()
            .round(4)
            .tolist()
        )

        # Downsample for UI performance
        MAX_POINTS = 1000
        step = max(1, len(attack_trend_raw) // MAX_POINTS)
        attack_trend = attack_trend_raw[::step]

        # Packet Size Stats
        packet_size_stats = {
            "packet_length_mean_mean": float(stats_df["Packet Length Mean"].mean()),
            "packet_length_mean_max": float(stats_df["Packet Length Mean"].max()),
            "packet_length_mean_min": float(stats_df["Packet Length Mean"].min()),
            "packet_length_std_avg": float(stats_df["Packet Length Std"].mean()),
        }

        # Flag Distribution
        flag_columns = [
            "SYN Flag Count", "ACK Flag Count", "PSH Flag Count",
            "FIN Flag Count", "RST Flag Count"
        ]
        flag_distribution = {
            flag: float(stats_df[flag].sum()) 
            for flag in flag_columns if flag in stats_df.columns
        }

        # Flow Throughput Stats
        flow_throughput_stats = {
            "avg_bytes_per_sec": float(stats_df["Flow Bytes/s"].mean()),
            "max_bytes_per_sec": float(stats_df["Flow Bytes/s"].max()),
            "avg_packets_per_sec": float(stats_df["Flow Packets/s"].mean()),
        }

        # Active / Idle Time Stats
        active_idle_stats = {
            "active_mean_avg": float(stats_df["Active Mean"].mean()),
            "active_max_avg": float(stats_df["Active Max"].mean()),
            "idle_mean_avg": float(stats_df["Idle Mean"].mean()),
            "idle_max_avg": float(stats_df["Idle Max"].mean()),
        }

        # Top Anomalous Flows (simple anomaly score)
        stats_df["anomaly_score"] = (
            stats_df["Packet Length Std"] +
            stats_df["Flow IAT Std"] +
            stats_df["Active Max"] -
            stats_df["Idle Mean"]
        )
        top_anomalous = (
            stats_df.nlargest(10, "anomaly_score")[[
                "Packet Length Std", "Flow IAT Std", "Active Max", "Idle Mean"
            ]]
            .round(3)
            .to_dict(orient="records")
        )

        # Feature Summary (basic mean/std for main features)
        feature_summary = stats_df[feature_cols].describe().round(3).to_dict()

        # ------------------------------
        # 4. FINAL RESPONSE
        # ------------------------------
        return {
            # OLD FIELDS (unchanged)
            "total_flows": total_flows,
            "attack_counts": attack_counts,
            "protocol_counts": protocol_counts,
            "malicious_protocol_counts": malicious_protocol_counts,
            "recent_threats": recent_threats,

            # NEW FIELDS (added)
            "attack_trend": attack_trend,
            "packet_size_stats": packet_size_stats,
            "flag_distribution": flag_distribution,
            "flow_throughput_stats": flow_throughput_stats,
            "active_idle_stats": active_idle_stats,
            "top_anomalous_flows": top_anomalous,
            "feature_summary": feature_summary,
        }

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"error": str(e)}
