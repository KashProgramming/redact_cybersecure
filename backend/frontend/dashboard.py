import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import time
from datetime import datetime
import requests
import json
import base64
import os

# API Configuration
API_URL = "http://localhost:8000"

# Page config
st.set_page_config(
    page_title="Network IDS Dashboard",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .threat-high { background-color: #ff4444; color: white; padding: 5px 10px; border-radius: 5px; }
    .threat-medium { background-color: #ff8800; color: white; padding: 5px 10px; border-radius: 5px; }
    .threat-low { background-color: #ffbb33; color: white; padding: 5px 10px; border-radius: 5px; }
    .benign { background-color: #00C851; color: white; padding: 5px 10px; border-radius: 5px; }
</style>
""", unsafe_allow_html=True)

# Load test data
@st.cache_data
def load_data():
    # Try to find data relative to this file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Expected: backend/frontend/dashboard.py -> backend/data/test.csv
    data_path = os.path.join(current_dir, '..', 'data', 'test.csv')
    
    if not os.path.exists(data_path):
        st.error(f"Data file not found at {data_path}")
        return pd.DataFrame(), data_path
        
    # Limit to 100,000 rows as requested
    df = pd.read_csv(data_path, nrows=100000)
    return df, data_path

# API Helper Functions
def api_predict_flow(features):
    try:
        # Ensure features are native Python types (float) not numpy types
        # Handle None values which might come from backend NaNs
        clean_features = {k: float(v) if v is not None else 0.0 for k, v in features.items()}
        response = requests.post(f"{API_URL}/predict/", json={"features": clean_features})
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"Prediction failed: {response.text}")
            return None
    except Exception as e:
        st.error(f"API Error: {e}")
        return None

def api_batch_predict(features_list):
    try:
        # Limit batch size to avoid timeouts if necessary, or handle in chunks
        # For this demo, we'll send chunks of 1000
        results = []
        chunk_size = 1000
        
        progress_bar = st.progress(0)
        total = len(features_list)
        
        for i in range(0, total, chunk_size):
            chunk = features_list[i:i+chunk_size]
            # Convert to list of dicts with native types
            clean_chunk = [{k: float(v) if v is not None else 0.0 for k, v in item.items()} for item in chunk]
            
            response = requests.post(f"{API_URL}/predict/batch", json={"items": clean_chunk})
            if response.status_code == 200:
                results.extend(response.json()['results'])
            else:
                st.error(f"Batch prediction failed: {response.text}")
                return []
            
            progress_bar.progress(min((i + chunk_size) / total, 1.0))
            
        progress_bar.empty()
        return results
    except Exception as e:
        st.error(f"API Error: {e}")
        return []

def api_generate_report(attack_summary, classification_report, threat_statistics):
    try:
        payload = {
            "attack_summary": attack_summary,
            "classification_report": classification_report,
            "threat_statistics": threat_statistics
        }
        response = requests.post(f"{API_URL}/reports/generate", json=payload)
        if response.status_code == 200:
            return response.json().get("report"), None
        else:
            return None, f"API Error: {response.text}"
    except Exception as e:
        return None, str(e)

def api_get_monitor_flow(index):
    try:
        response = requests.get(f"{API_URL}/monitor/next/{index}")
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"Backend Error ({response.status_code}): {response.text}")
            return None
    except Exception as e:
        st.error(f"Connection Error: {e}")
        return None

def api_get_feature_importance():
    try:
        response = requests.get(f"{API_URL}/predict/feature-importance")
        if response.status_code == 200:
            return response.json()
        return None
    except:
        return None

# Initialize session state
if 'predictions' not in st.session_state:
    st.session_state.predictions = [] # List of result dicts
if 'monitoring' not in st.session_state:
    st.session_state.monitoring = False
if 'current_index' not in st.session_state:
    st.session_state.current_index = 0
if 'threat_log' not in st.session_state:
    st.session_state.threat_log = []

# Sidebar
st.sidebar.title("🛡️ Network IDS Control")
page = st.sidebar.radio("Navigation", 
    ["📊 Dashboard", "🔴 Live Monitor", "📈 Analytics", "🎯 Manual Prediction"])

if st.sidebar.button("🗑️ Clear Cache & Reset"):
    st.cache_data.clear()
    st.session_state.predictions = []
    st.session_state.threat_log = []
    st.rerun()

df, data_path = load_data()
st.sidebar.markdown("---")
st.sidebar.success(f"📂 **Data Source:**\n`{os.path.abspath(data_path)}`")
st.sidebar.info(f"📊 **Loaded Flows:** {len(df):,}")

if df.empty:
    st.stop()

# Prepare feature columns (exclude labels)
feature_cols = [col for col in df.columns if col not in ['Attack_type', 'Attack_encode']]

# Main Dashboard
if page == "📊 Dashboard":
    st.title("🛡️ Network Intrusion Detection System")
    st.markdown("---")
    
    # Run batch prediction if not done
    if len(st.session_state.predictions) == 0:
        st.info(f"Starting analysis on full dataset ({len(df):,} flows). This may take a while...")
        
        results = []
        chunk_size = 2000 
        total_rows = len(df)
        progress_bar = st.progress(0)
        status_text = st.empty()
        
        start_time = time.time()
        
        # Process full dataset in chunks to manage memory and avoid timeouts
        for start_idx in range(0, total_rows, chunk_size):
            end_idx = min(start_idx + chunk_size, total_rows)
            
            # Slice and convert only this chunk
            chunk_df = df.iloc[start_idx:end_idx]
            chunk_features = chunk_df[feature_cols].to_dict(orient='records')
            
            # Clean features (handle NaNs/None)
            clean_chunk = [{k: float(v) if pd.notnull(v) else 0.0 for k, v in item.items()} for item in chunk_features]
            
            try:
                response = requests.post(f"{API_URL}/predict/batch", json={"items": clean_chunk})
                if response.status_code == 200:
                    results.extend(response.json()['results'])
                else:
                    st.error(f"Batch failed at index {start_idx}: {response.text}")
                    # Continue or break? Breaking is safer to avoid cascading errors
                    break
            except Exception as e:
                st.error(f"Connection error at index {start_idx}: {e}")
                break
            
            # Update progress
            progress = end_idx / total_rows
            progress_bar.progress(progress)
            
            # Calculate ETA
            elapsed = time.time() - start_time
            if elapsed > 0:
                rate = end_idx / elapsed
                remaining = (total_rows - end_idx) / rate
                status_text.caption(f"Processed {end_idx:,}/{total_rows:,} flows ({rate:.0f} flows/s). Est. remaining: {remaining:.0f}s")
            
        st.session_state.predictions = results
        status_text.empty()
        progress_bar.empty()
        
        if len(results) < total_rows:
            st.warning(f"Analysis completed partially. Processed {len(results)}/{total_rows} flows.")
        else:
            st.success(f"Analysis complete! Processed all {len(results):,} flows.")
    
    results = st.session_state.predictions
    
    if not results:
        st.warning("No predictions available. Backend might be down.")
        st.stop()
        
    # Extract data for metrics
    pred_labels = [r['attack'] for r in results]
    severities = [r['severity'] for r in results]
    
    # KPI Metrics
    col1, col2, col3, col4, col5 = st.columns(5)
    
    total_flows = len(results)
    benign_count = pred_labels.count('Benign')
    malicious_count = total_flows - benign_count
    detection_rate = (malicious_count / total_flows * 100) if total_flows > 0 else 0
    
    with col1:
        st.metric("Total Flows", f"{total_flows:,}")
    with col2:
        st.metric("Benign", f"{benign_count:,}", delta=f"{benign_count/total_flows*100:.1f}%")
    with col3:
        st.metric("Malicious", f"{malicious_count:,}", delta=f"{malicious_count/total_flows*100:.1f}%", delta_color="inverse")
    with col4:
        st.metric("Detection Rate", f"{detection_rate:.2f}%")
    with col5:
        st.metric("Threats Logged", len(st.session_state.threat_log))
    
    st.markdown("---")
    
    # Charts Row 1
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Attack Distribution")
        attack_counts = pd.Series(pred_labels).value_counts()
        
        fig = px.pie(values=attack_counts.values, names=attack_counts.index,
                     color_discrete_sequence=px.colors.qualitative.Set3,
                     hole=0.4)
        fig.update_traces(textposition='inside', textinfo='percent+label')
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.subheader("Attack Type Counts")
        fig = px.bar(x=attack_counts.index, y=attack_counts.values,
                     labels={'x': 'Attack Type', 'y': 'Count'},
                     color=attack_counts.index,
                     color_discrete_sequence=px.colors.qualitative.Bold)
        fig.update_layout(showlegend=False)
        st.plotly_chart(fig, use_container_width=True)
    
    # Charts Row 2
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Protocol Distribution (All Traffic)")
        # Use full processed data
        processed_df = df.head(len(results))
        protocol_counts = processed_df['Protocol'].value_counts().head(10)
        fig = px.bar(x=protocol_counts.index, y=protocol_counts.values,
                     labels={'x': 'Protocol', 'y': 'Flow Count'},
                     color=protocol_counts.values,
                     color_continuous_scale='Reds')
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.subheader("Protocol Distribution (Malicious Only)")
        # Filter malicious from processed data
        malicious_mask = [p != 'Benign' for p in pred_labels]
        malicious_df = processed_df[malicious_mask]
        
        if len(malicious_df) > 0:
            mal_protocol = malicious_df['Protocol'].value_counts().head(10)
            fig = px.bar(x=mal_protocol.index, y=mal_protocol.values,
                         labels={'x': 'Protocol', 'y': 'Attack Count'},
                         color=mal_protocol.values,
                         color_continuous_scale='OrRd')
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No malicious traffic detected")
    
    # Recent Detections
    st.markdown("---")
    st.subheader("🚨 Recent Threat Detections")
    
    # Filter malicious
    malicious_indices = [i for i, r in enumerate(results) if r['attack'] != 'Benign']
    
    if malicious_indices:
        recent_indices = malicious_indices[-10:][::-1]
        threat_data = []
        
        for idx in recent_indices:
            res = results[idx]
            # Map back to original DF for protocol info (assuming 1:1 mapping with sample)
            orig_row = df.iloc[idx]
            
            threat_data.append({
                'Flow ID': idx,
                'Attack Type': res['attack'],
                'Severity': f"{res['severity']:.2f}",
                'Protocol': orig_row.get('Protocol', 'N/A'),
                'Action': res['action'],
                'Fwd Packets': int(orig_row.get('Total Fwd Packets', 0)),
                'Bwd Packets': int(orig_row.get('Total Backward Packets', 0))
            })
        
        st.dataframe(pd.DataFrame(threat_data), use_container_width=True, hide_index=True)
    else:
        st.success("✅ No threats detected in current sample")

# Live Monitor
elif page == "🔴 Live Monitor":
    st.title("🔴 Real-Time Threat Monitor")
    st.markdown("Simulated real-time monitoring using test data")
    
    col1, col2, col3 = st.columns([2, 2, 1])
    with col1:
        if st.button("▶️ Start Monitoring" if not st.session_state.monitoring else "⏸️ Pause Monitoring"):
            st.session_state.monitoring = not st.session_state.monitoring
    
    with col2:
        if st.button("🔄 Reset"):
            st.session_state.current_index = 0
            st.session_state.threat_log = []
            st.rerun()
    
    with col3:
        speed = st.slider("Speed", 1, 10, 2)
    
    placeholder = st.empty()
    
    if st.session_state.monitoring:
        while st.session_state.monitoring:
            idx = st.session_state.current_index
            
            # 1. Get Flow Data from Backend Monitor Endpoint
            monitor_data = api_get_monitor_flow(idx)
            
            if not monitor_data or monitor_data.get('end'):
                st.session_state.monitoring = False
                st.info("Monitoring complete or backend unreachable")
                break
                
            flow_data = monitor_data['flow']
            
            # 2. Send to Predict Endpoint
            # Filter flow_data to only feature columns expected by model
            pred_features = {k: v for k, v in flow_data.items() if k in feature_cols}
            
            prediction = api_predict_flow(pred_features)
            
            if prediction:
                attack_label = prediction['attack']
                severity = prediction['severity']
                action = prediction['action']
                
                # Log threats
                if attack_label != 'Benign':
                    st.session_state.threat_log.append({
                        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                        'flow_id': idx,
                        'attack_type': attack_label,
                        'severity': severity,
                        'action': action
                    })
                
                with placeholder.container():
                    st.markdown(f"### Flow #{idx} - {datetime.now().strftime('%H:%M:%S')}")
                    
                    col1, col2, col3, col4 = st.columns(4)
                    col1.metric("Attack Type", attack_label)
                    col2.metric("Severity", f"{severity:.2f}")
                    col3.metric("Protocol", flow_data.get('Protocol', 'N/A'))
                    col4.metric("Action", action)
                    
                    if attack_label != 'Benign':
                        st.error(f"🚨 THREAT DETECTED: {attack_label}")
                        
                        st.markdown("**Key Flow Characteristics:**")
                        key_features = ['Total Fwd Packets', 'Total Backward Packets', 
                                      'Flow Bytes/s', 'SYN Flag Count', 'ACK Flag Count']
                        
                        cols = st.columns(len(key_features))
                        for i, feat in enumerate(key_features):
                            val = flow_data.get(feat, 0)
                            cols[i].metric(feat, f"{float(val):.2f}")
                    else:
                        st.success("✅ Benign Traffic - Allowed")
                    
                    st.progress((idx % 100) / 100) # Simple progress bar
                    
                    # Show recent threat log
                    if len(st.session_state.threat_log) > 0:
                        st.markdown("---")
                        st.markdown("**Recent Threats:**")
                        log_df = pd.DataFrame(st.session_state.threat_log[-5:][::-1])
                        st.dataframe(log_df, use_container_width=True, hide_index=True)
            
            st.session_state.current_index += 1
            time.sleep(1.0 / speed)

# Analytics
elif page == "📈 Analytics":
    st.title("📈 Detailed Analytics")
    
    if len(st.session_state.predictions) == 0:
        st.warning("Please visit the Dashboard page first to run the initial analysis.")
        st.stop()
        
    results = st.session_state.predictions
    pred_labels = [r['attack'] for r in results]
    
    # Confusion Matrix (if labels exist in loaded df)
    if 'Attack_encode' in df.columns:
        # We need to align results with the DF. 
        # Assuming results correspond to df.head(len(results))
        sample_df = df.head(len(results))
        y_true = sample_df['Attack_encode'].values
        
        # Filter out NaN values
        valid_mask = ~np.isnan(y_true)
        
        if valid_mask.sum() > 0:
            y_true_clean = y_true[valid_mask]
            # Convert predictions to encode if possible, or map names to indices
            # ATTACK_MAP = {0: 'Benign', 1: 'DoS', 2: 'BruteForce', 3: 'Scan', 4: 'Malware', 5: 'WebAttack'}
            # Inverse map
            NAME_TO_ENCODE = {'Benign': 0, 'DoS': 1, 'BruteForce': 2, 'Scan': 3, 'Malware': 4, 'WebAttack': 5, 'Unknown': -1}
            
            preds_clean = [NAME_TO_ENCODE.get(p, -1) for p in np.array(pred_labels)[valid_mask]]
            
            st.subheader("Confusion Matrix")
            from sklearn.metrics import confusion_matrix
            
            # Filter out unknowns if any
            valid_preds_mask = [p != -1 for p in preds_clean]
            if any(valid_preds_mask):
                y_true_final = y_true_clean[valid_preds_mask]
                preds_final = np.array(preds_clean)[valid_preds_mask]
                
                cm = confusion_matrix(y_true_final, preds_final)
                
                attack_names = ['Benign', 'DoS', 'BruteForce', 'Scan', 'Malware', 'WebAttack']
                # Ensure labels match unique values present or use fixed list if we are sure
                
                fig = px.imshow(cm, 
                                labels=dict(x="Predicted", y="Actual", color="Count"),
                                x=attack_names[:len(cm)], # Simplified, might need proper alignment
                                y=attack_names[:len(cm)],
                                color_continuous_scale='Blues',
                                text_auto=True)
                st.plotly_chart(fig, use_container_width=True)

    # Report Generation
    st.markdown("---")
    st.subheader("📄 Generate Comprehensive Threat Report")
    
    col1, col2 = st.columns([3, 1])
    with col1:
        st.info("The report will include attack classifications, MITRE ATT&CK framework recommendations, and actionable security measures.")
    
    with col2:
        if st.button("📥 Generate Report", type="primary", use_container_width=True):
            with st.spinner("Generating comprehensive threat report using AI..."):
                # Prepare stats
                attack_counts = pd.Series(pred_labels).value_counts().to_dict()
                
                # Mock classification report summary
                report_summary = {
                    "analyzed_flows": len(results),
                    "attack_distribution": attack_counts
                }
                
                threat_stats = {
                    "total_flows": len(results),
                    "malicious_flows": len([p for p in pred_labels if p != 'Benign']),
                    "benign_flows": pred_labels.count('Benign'),
                    "threat_percentage": len([p for p in pred_labels if p != 'Benign']) / len(results) * 100
                }
                
                report_text, error = api_generate_report(attack_counts, report_summary, threat_stats)
                
                if error:
                    st.error(error)
                    st.info("💡 To use report generation, please set your GROQ_API_KEY in Streamlit secrets (st.secrets) or as an environment variable.")
                else:
                    st.success("✅ Report generated successfully!")
                    st.markdown("### 📋 Report Preview")
                    with st.expander("View Generated Report", expanded=True):
                        st.markdown(report_text)
                    
                    # Download
                    b64 = base64.b64encode(report_text.encode()).decode()
                    href = f'<a href="data:text/plain;base64,{b64}" download="threat_report.txt" style="background-color: #764ba2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">📄 Download Text Report</a>'
                    st.markdown(href, unsafe_allow_html=True)

    # Feature Importance
    st.markdown("---")
    st.subheader("Top 15 Important Features")
    
    fi_data = api_get_feature_importance()
    if fi_data:
        importances = None
        if 'importances' in fi_data and fi_data['importances']:
            importances = np.array(fi_data['importances'])
            indices = np.argsort(importances)[::-1][:15]
            top_features = [feature_cols[i] for i in indices]
            top_importances = importances[indices]
        elif 'importances_dict' in fi_data:
            # Sort dict by value
            sorted_items = sorted(fi_data['importances_dict'].items(), key=lambda x: x[1], reverse=True)[:15]
            top_features = [k for k, v in sorted_items]
            top_importances = [v for k, v in sorted_items]
        
        if importances is not None or 'importances_dict' in fi_data:
            fig = px.bar(x=top_features, 
                         y=top_importances,
                         labels={'x': 'Feature', 'y': 'Importance'},
                         color=top_importances,
                         color_continuous_scale='Viridis')
            fig.update_layout(xaxis_tickangle=-45)
            st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("Feature importance not available from backend model.")

    # Feature correlation for malicious traffic
    st.markdown("---")
    st.subheader("Feature Correlation Heatmap (Malicious Traffic)")
    
    sample_df = df.head(len(results))
    malicious_mask = [p != 'Benign' for p in pred_labels]
    malicious_df = sample_df[malicious_mask]
    
    if len(malicious_df) > 0:
        key_features = ['Total Fwd Packets', 'Total Backward Packets', 
                       'Flow Bytes/s', 'Flow Packets/s', 'Packet Length Mean',
                       'SYN Flag Count', 'ACK Flag Count', 'PSH Flag Count']
        key_features = [f for f in key_features if f in df.columns]
        
        corr = malicious_df[key_features].corr()
        
        fig = px.imshow(corr, 
                        labels=dict(color="Correlation"),
                        x=key_features, y=key_features,
                        color_continuous_scale='RdBu_r',
                        zmin=-1, zmax=1,
                        text_auto='.2f')
        st.plotly_chart(fig, use_container_width=True)
        
    # Statistical summary by attack type
    st.markdown("---")
    st.subheader("Statistical Summary by Attack Type")
    
    df_with_pred = sample_df.copy()
    df_with_pred['Predicted_Attack'] = pred_labels
    
    selected_attack = st.selectbox("Select Attack Type", 
                                   sorted(df_with_pred['Predicted_Attack'].unique()))
    
    attack_subset = df_with_pred[df_with_pred['Predicted_Attack'] == selected_attack]
    
    summary_features = ['Total Fwd Packets', 'Total Backward Packets', 
                       'Flow Bytes/s', 'Packet Length Mean', 'Flow IAT Mean']
    summary_features = [f for f in summary_features if f in df.columns]
    
    st.dataframe(attack_subset[summary_features].describe(), use_container_width=True)

# Manual Prediction
elif page == "🎯 Manual Prediction":
    st.title("🎯 Manual Flow Classification")
    st.markdown("Upload a CSV or input features manually")
    
    tab1, tab2 = st.tabs(["📁 Upload CSV", "⌨️ Manual Input"])
    
    with tab1:
        uploaded_file = st.file_uploader("Upload CSV file", type=['csv'])
        if uploaded_file:
            test_df = pd.read_csv(uploaded_file)
            st.success(f"Loaded {len(test_df)} flows")
            
            if st.button("🔍 Classify Flows"):
                features_list = test_df[feature_cols].to_dict(orient='records')
                with st.spinner("Classifying..."):
                    results = api_batch_predict(features_list)
                    
                    if results:
                        # Add results to DF
                        test_df['Prediction'] = [r['attack'] for r in results]
                        test_df['Severity'] = [r['severity'] for r in results]
                        test_df['Action'] = [r['action'] for r in results]
                        
                        st.dataframe(test_df, use_container_width=True)
                        
                        csv = test_df.to_csv(index=False)
                        st.download_button("📥 Download Results", csv, 
                                         "predictions.csv", "text/csv")
    
    with tab2:
        st.markdown("**Enter flow features:**")
        
        input_data = {}
        cols = st.columns(3)
        
        # Dynamically create inputs for all features
        for i, feature in enumerate(feature_cols):
            col_idx = i % 3
            with cols[col_idx]:
                input_data[feature] = st.number_input(feature, value=0.0, 
                                                     format="%.2f", key=feature)
                
        if st.button("🔍 Classify Flow"):
            with st.spinner("Querying API..."):
                result = api_predict_flow(input_data)
                
                if result:
                    st.markdown("---")
                    st.markdown("### 🎯 Prediction Result")
                    
                    col1, col2, col3 = st.columns(3)
                    col1.metric("Attack Type", result['attack'])
                    col2.metric("Severity", f"{result['severity']:.2f}")
                    col3.metric("Recommended Action", result['action'])
                    
                    if result['attack'] != 'Benign':
                        st.error(f"🚨 THREAT DETECTED: {result['attack']}")
                        st.markdown(f"**Recommended Action:** {result['action']}")
                    else:
                        st.success("✅ Benign Traffic - Allow")

# Footer
st.sidebar.markdown("---")
st.sidebar.info(f"Dashboard v1.0 | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
