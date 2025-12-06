from fastapi import APIRouter, HTTPException
from utils.model_loader import load_model
from utils.severity import calculate_severity
from models.request_models import FlowFeatures, BatchRequest
from models.response_models import PredictionResponse
import numpy as np
import pandas as pd
import xgboost as xgb

router = APIRouter()

# Load model on startup (or lazy load)
try:
    model = load_model()
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

ATTACK_MAP = {0: "Benign", 1: "DoS", 2: "BruteForce", 3: "Scan", 4: "Malware", 5: "WebAttack"}

ACTIONS = {
    'DoS': 'BLOCK IP + Rate Limiting',
    'BruteForce': 'BLOCK IP + Account Lockout',
    'Scan': 'LOG + Monitor Suspicious Activity',
    'Malware': 'QUARANTINE + Deep Scan',
    'WebAttack': 'BLOCK Request + WAF Rule Update',
    'Benign': 'Allow Traffic'
}

def predict_with_model(model, data):
    """
    Wrapper to handle prediction for both XGBoost (DMatrix) and Sklearn (DataFrame) models.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Check if it's an XGBoost Booster
    if isinstance(model, xgb.Booster):
        dmatrix = xgb.DMatrix(data)
        return model.predict(dmatrix)
    
    # Default to sklearn-style predict
    try:
        return model.predict(data)
    except Exception as e:
        # Fallback: try converting to DMatrix
        try:
            dmatrix = xgb.DMatrix(data)
            return model.predict(dmatrix)
        except:
            raise e

@router.post("/", response_model=PredictionResponse)
def predict_flow(data: FlowFeatures):
    try:
        # Sanitize features: ensure all values are numeric
        clean_features = {}
        for k, v in data.features.items():
            try:
                clean_features[k] = float(v)
            except (ValueError, TypeError):
                clean_features[k] = 0.0
                
        # Convert dict to DataFrame
        df = pd.DataFrame([clean_features])
        
        # Remove target columns if present (they shouldn't be in features, but just in case)
        cols_to_drop = [col for col in df.columns if col in ['Attack_type', 'Attack_encode']]
        if cols_to_drop:
            df = df.drop(columns=cols_to_drop)
            
        # Predict
        raw_pred = predict_with_model(model, df)
        pred = int(raw_pred[0]) if isinstance(raw_pred[0], (int, float, np.number)) else int(raw_pred[0])
        
        attack = ATTACK_MAP.get(pred, "Unknown")
        
        # Calculate severity
        severity = calculate_severity(data.features, attack)
        action = ACTIONS.get(attack, "Monitor")

        return PredictionResponse(
            attack=attack,
            severity=severity,
            action=action
        )
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch")
def batch_predict(data: BatchRequest):
    try:
        df = pd.DataFrame(data.items)
        preds = predict_with_model(model, df)

        results = []
        for i, p in enumerate(preds):
            pred_val = int(p) if isinstance(p, (int, float, np.number)) else int(p)
            attack = ATTACK_MAP.get(pred_val, "Unknown")
            
            # Get features for this item to calculate severity
            # Note: data.items is a list of dicts
            sev = calculate_severity(data.items[i], attack)
            
            results.append({
                "attack": attack,
                "severity": sev,
                "action": ACTIONS.get(attack, "Monitor")
            })

        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/feature-importance")
def get_feature_importance():
    try:
        if model is None:
            raise HTTPException(status_code=503, detail="Model not loaded")
            
        # Check for feature_importances_ (sklearn style)
        if hasattr(model, 'feature_importances_'):
            return {"importances": model.feature_importances_.tolist()}
            
        # Check for get_score (XGBoost native)
        if hasattr(model, 'get_score'):
            # This returns a dict {feature_name: score}
            # We might need to map it back to feature indices if names aren't preserved or match input
            return {"importances_dict": model.get_score(importance_type='weight')}
            
        return {"importances": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
