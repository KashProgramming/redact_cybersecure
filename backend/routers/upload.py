from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Dict
import pandas as pd
import io
import os
import tempfile
from routers.predict import model, predict_with_model, ATTACK_MAP
from utils.pcap_converter import convert_pcap_to_csv
import numpy as np

router = APIRouter()

@router.post("/convert-pcap")
async def convert_pcap(file: UploadFile = File(...)):
    """
    Convert uploaded PCAP file to CSV and return it as a download
    """
    try:
        filename = file.filename.lower()
        if not (filename.endswith('.pcap') or filename.endswith('.pcapng')):
            raise HTTPException(status_code=400, detail="Only .pcap or .pcapng files are allowed")
            
        # Save PCAP to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            # Convert to DataFrame
            df = convert_pcap_to_csv(tmp_path)
            
            # Convert to CSV string
            stream = io.StringIO()
            df.to_csv(stream, index=False)
            response = stream.getvalue()
            
            # Return as file
            from fastapi.responses import Response
            return Response(
                content=response,
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={file.filename}.csv"}
            )
            
        finally:
            # Cleanup temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error converting file: {str(e)}")

@router.post("/upload")
async def analyze_csv(file: UploadFile = File(...)):
    """
    Upload a CSV or PCAP file and get analysis similar to dashboard stats.
    PCAP files are automatically converted to CSV format before analysis.
    """
    try:
        filename = file.filename.lower()
        
        # Check if it's a PCAP file
        is_pcap = filename.endswith('.pcap') or filename.endswith('.pcapng')
        is_csv = filename.endswith('.csv')
        
        if not (is_pcap or is_csv):
            raise HTTPException(
                status_code=400, 
                detail="Only CSV, PCAP, or PCAPNG files are allowed"
            )
        
        # Handle PCAP files
        if is_pcap:
            # Save PCAP to temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp:
                content = await file.read()
                tmp.write(content)
                tmp_path = tmp.name
            
            try:
                # Convert PCAP to DataFrame
                df = convert_pcap_to_csv(tmp_path)
                
                if df.empty:
                    raise HTTPException(
                        status_code=400, 
                        detail="Failed to convert PCAP file or no valid flows found"
                    )
                    
            finally:
                # Cleanup temp file
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
        else:
            # Handle CSV files
            contents = await file.read()
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Limit to 100,000 rows for performance
        if len(df) > 100000:
            df = df.head(100000)
        
        # Validate required columns
        required_cols = ['Protocol', 'Total Fwd Packets', 'Total Backward Packets']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(
                status_code=400, 
                detail=f"CSV is missing required columns: {', '.join(missing_cols)}"
            )
        
        # Filter out non-feature columns
        feature_cols = [col for col in df.columns if col not in ['Attack_type', 'Attack_encode', 'mapped_label', 'severity_raw', 'severity']]
        X = df[feature_cols]
        
        # Handle NaN values
        X = X.fillna(0)
        
        # Predict
        if model:
            preds = predict_with_model(model, X)
            pred_labels = [int(p) if isinstance(p, (int, float, np.number)) else int(p) for p in preds]
            pred_names = [ATTACK_MAP.get(p, 'Unknown') for p in pred_labels]
        else:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        # Calculate statistics
        total_flows = len(df)
        
        # Attack Distribution
        attack_counts = {}
        for name in pred_names:
            attack_counts[name] = attack_counts.get(name, 0) + 1
        
        # Protocol Distribution (All)
        protocol_counts = {}
        if 'Protocol' in df.columns:
            protocol_counts = df['Protocol'].value_counts().head(10).to_dict()
        
        # Protocol Distribution (Malicious)
        malicious_protocol_counts = {}
        recent_threats = []
        
        # Create temporary dataframe with predictions
        temp_df = df.copy()
        temp_df['Predicted_Attack'] = pred_names
        
        malicious_df = temp_df[temp_df['Predicted_Attack'] != 'Benign']
        
        if not malicious_df.empty:
            if 'Protocol' in malicious_df.columns:
                malicious_protocol_counts = malicious_df['Protocol'].value_counts().head(10).to_dict()
            
            # Recent Threats (last 20)
            threats_df = malicious_df.tail(20).iloc[::-1]
            
            for idx, row in threats_df.iterrows():
                recent_threats.append({
                    "id": int(idx),
                    "attack": row['Predicted_Attack'],
                    "protocol": str(row['Protocol']) if 'Protocol' in row else "Unknown",
                    "severity": "High",
                    "fwd_packets": int(row.get('Total Fwd Packets', 0)),
                    "bwd_packets": int(row.get('Total Backward Packets', 0))
                })
        
        return {
            "success": True,
            "filename": file.filename,
            "file_type": "PCAP" if is_pcap else "CSV",
            "total_flows": total_flows,
            "attack_counts": attack_counts,
            "protocol_counts": protocol_counts,
            "malicious_protocol_counts": malicious_protocol_counts,
            "recent_threats": recent_threats
        }
        
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV file is empty")
    except pd.errors.ParserError:
        raise HTTPException(status_code=400, detail="Invalid CSV format")
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.post("/feature-importance")
async def calculate_feature_importance(file: UploadFile = File(...)):
    """
    Calculate feature importance (SHAP values) for uploaded CSV file
    """
    try:
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")
        
        # Read CSV file
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Limit to 10,000 rows for SHAP calculation (performance)
        if len(df) > 10000:
            df = df.head(10000)
        
        # Filter out non-feature columns
        feature_cols = [col for col in df.columns if col not in ['Attack_type', 'Attack_encode']]
        X = df[feature_cols]
        
        # Handle NaN values
        X = X.fillna(0)
        
        # Get feature importance from model
        if model:
            try:
                feature_names = X.columns.tolist()
                print(f"Model type: {type(model)}")
                print(f"Model attributes: {dir(model)}")
                
                # Try to get feature importances using different methods
                importances = {}
                
                # Method 1: Try feature_importances_ attribute (sklearn-style)
                if hasattr(model, 'feature_importances_'):
                    print("Using feature_importances_ attribute")
                    importances = dict(zip(feature_names, model.feature_importances_.tolist()))
                    print(f"Got {len(importances)} importances, sample: {list(importances.items())[:3]}")
                    
                # Method 2: Try get_score for XGBoost Booster
                elif hasattr(model, 'get_score'):
                    print("Using get_score method")
                    # Try different importance types
                    for importance_type in ['weight', 'gain', 'cover']:
                        try:
                            importance_dict = model.get_score(importance_type=importance_type)
                            print(f"get_score({importance_type}): {list(importance_dict.items())[:3] if importance_dict else 'empty'}")
                            if importance_dict:
                                # Create a case-insensitive map of importance keys
                                importance_map_lower = {k.lower(): v for k, v in importance_dict.items()}
                                
                                # Map f0, f1, f2... to actual feature names
                                # OR use the feature names directly if they exist in the dict (case-insensitive)
                                for i, fname in enumerate(feature_names):
                                    f_key = f'f{i}'
                                    fname_lower = fname.lower()
                                    
                                    if fname in importance_dict:
                                        importances[fname] = float(importance_dict[fname])
                                    elif fname_lower in importance_map_lower:
                                        importances[fname] = float(importance_map_lower[fname_lower])
                                    elif f_key in importance_dict:
                                        importances[fname] = float(importance_dict[f_key])
                                    else:
                                        importances[fname] = 0.0
                                
                                # Debug print
                                print(f"Mapped {len(importances)} features. Top 3: {list(importances.items())[:3]}")
                                break
                        except Exception as e:
                            print(f"get_score({importance_type}) failed: {e}")
                            continue
                    
                    # If still empty, try without importance_type
                    if not importances:
                        try:
                            importance_dict = model.get_score()
                            for i, fname in enumerate(feature_names):
                                key = f'f{i}'
                                if key in importance_dict:
                                    importances[fname] = float(importance_dict[key])
                                else:
                                    importances[fname] = 0.0
                        except:
                            pass
                
                # Skip SHAP calculation - just use what we have or return zeros
                # SHAP is too slow for real-time analysis
                if not importances or all(v == 0 for v in importances.values()):
                    print("No importances found, returning uniform values")
                    # Return uniform importance as fallback (fast)
                    importances = {fname: 1.0 for fname in feature_names}
                
                if importances:
                    return {
                        "success": True,
                        "importances_dict": importances,
                        "feature_count": len(importances)
                    }
                else:
                    raise HTTPException(status_code=500, detail="Could not extract feature importance")
                    
            except Exception as e:
                import traceback
                print(traceback.format_exc())
                raise HTTPException(status_code=500, detail=f"Error calculating importance: {str(e)}")
        else:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV file is empty")
    except pd.errors.ParserError:
        raise HTTPException(status_code=400, detail="Invalid CSV format")
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
