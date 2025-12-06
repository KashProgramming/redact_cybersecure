import os
import joblib
import xgboost as xgb
import pickle
import sys

# Default model name
MODEL_NAME = 'xgb_classifier.pkl'

def load_model(model_name=MODEL_NAME):
    # Paths to check (relative to backend directory)
    paths_to_check = [
        os.path.join('data', model_name),
        os.path.join('..', 'data', model_name),
        os.path.join('models', model_name),
        model_name
    ]
    
    model_path = None
    for p in paths_to_check:
        if os.path.exists(p):
            model_path = p
            break
            
    if not model_path:
        # Fallback for development environment
        current_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(current_dir)
        model_path = os.path.join(parent_dir, 'data', model_name)
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file '{model_name}' not found in data/ or other expected locations.")

    try:
        # 1. Try loading with joblib (standard for sklearn)
        return joblib.load(model_path)
    except:
        try:
            # 2. Try loading as XGBoost native
            model = xgb.Booster()
            model.load_model(model_path)
            return model
        except:
            try:
                # 3. Try standard pickle
                with open(model_path, 'rb') as f:
                    return pickle.load(f)
            except Exception as e:
                raise RuntimeError(f"Failed to load model '{model_name}': {e}")
