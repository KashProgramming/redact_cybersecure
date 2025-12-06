import pandas as pd
import numpy as np
import pyshark
import os
from statistics import mean, stdev

def safe_float(x, default=0.0):
    """Safely convert value to float"""
    try:
        return float(x)
    except:
        return default

def safe_int(x, default=0):
    """Safely convert value to int"""
    try:
        return int(x)
    except:
        return default

def make_key_tuple(src, dst, sport, dport, proto):
    """Create a flow key tuple"""
    return (src, dst, sport, dport, proto)

def convert_pcap_to_csv(pcap_file_path):
    """
    Convert a PCAP file to a Pandas DataFrame with CIC-IDS-2017 like features using PyShark.
    This implementation provides more accurate feature extraction compared to Scapy.
    """
    try:
        # Detect tshark path based on OS
        import platform
        import subprocess
        
        tshark_path = None
        
        if platform.system() == 'Windows':
            # Try common Windows paths
            possible_paths = [
                r"C:\Program Files\Wireshark\tshark.exe",
                r"C:\Program Files (x86)\Wireshark\tshark.exe",
                r"C:\Applications\Wireshark\tshark.exe",
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    tshark_path = path
                    print(f"Found TShark at: {tshark_path}")
                    break
            
            # If not found in common paths, try system PATH
            if not tshark_path:
                try:
                    result = subprocess.run(['where', 'tshark'], capture_output=True, text=True)
                    if result.returncode == 0:
                        tshark_path = result.stdout.strip().split('\n')[0]
                        print(f"Found TShark in PATH: {tshark_path}")
                except:
                    pass
        else:
            # Linux/Mac - use system PATH
            tshark_path = "tshark"
            try:
                subprocess.run(['which', 'tshark'], check=True, capture_output=True)
                print("TShark found in system PATH")
            except:
                print("TShark not found in system PATH")
                tshark_path = None
        
        if not tshark_path:
            raise Exception("TShark not found. Please install Wireshark from https://www.wireshark.org/")
        
        print(f"Using TShark: {tshark_path}")
        print(f"Processing PCAP file: {pcap_file_path}")
        
        # Open PCAP file with PyShark
        cap = pyshark.FileCapture(pcap_file_path, keep_packets=False, tshark_path=tshark_path)
        
        flows = {}
        ACTIVE_THRESH = 1.0  # Active threshold in seconds
        
        # Process packets
        for pkt in cap:
            try:
                # Skip non-IP packets
                if not hasattr(pkt, 'ip') and not hasattr(pkt, 'ipv6'):
                    continue
                
                # Extract protocol
                proto = pkt.transport_layer if hasattr(pkt, 'transport_layer') else (
                    pkt.highest_layer if hasattr(pkt, 'highest_layer') else 'UNK'
                )
                
                # Extract IP addresses
                if hasattr(pkt, 'ip'):
                    src = pkt.ip.src
                    dst = pkt.ip.dst
                else:
                    src = pkt.ipv6.src
                    dst = pkt.ipv6.dst
                
                # Extract ports
                sport = "0"
                dport = "0"
                if hasattr(pkt, 'transport_layer'):
                    tl = pkt.transport_layer
                    try:
                        sport = getattr(pkt[tl], 'srcport')
                        dport = getattr(pkt[tl], 'dstport')
                    except:
                        sport = "0"
                        dport = "0"
                
                # Extract packet length and timestamp
                length = safe_int(getattr(pkt, 'length', getattr(pkt, 'frame_len', 0)))
                ts = safe_float(getattr(pkt.frame_info, 'time_epoch', 0.0))
                
                # Determine flow (forward or backward)
                key = make_key_tuple(src, dst, sport, dport, proto)
                rev_key = make_key_tuple(dst, src, dport, sport, proto)
                
                flow_key = None
                if key in flows:
                    flow_key = key
                    direction = "fwd"
                elif rev_key in flows:
                    flow_key = rev_key
                    direction = "bwd"
                else:
                    # Create new flow
                    flow_key = key
                    direction = "fwd"
                    flows[flow_key] = {
                        "src_ip": src,
                        "dst_ip": dst,
                        "src_port": sport,
                        "dst_port": dport,
                        "protocol": proto,
                        "timestamps": [],
                        "fwd_timestamps": [],
                        "bwd_timestamps": [],
                        "fwd_pkt_lens": [],
                        "bwd_pkt_lens": [],
                        "all_pkt_lens": [],
                        "fwd_tcp_len_vals": [],
                        "flags_total": {"fin": 0, "syn": 0, "rst": 0, "psh": 0, "ack": 0, "urg": 0},
                        "flags_fwd": {"psh": 0, "urg": 0},
                        "cwr_count": 0,
                        "ece_count": 0,
                        "init_fwd_win": None,
                        "init_bwd_win": None,
                        "fwd_header_lengths": [],
                        "bwd_header_lengths": [],
                    }
                
                f = flows[flow_key]
                f["timestamps"].append(ts)
                f["all_pkt_lens"].append(length)
                
                # Process forward/backward packets
                if direction == "fwd":
                    f["fwd_timestamps"].append(ts)
                    f["fwd_pkt_lens"].append(length)
                    
                    # TCP payload length
                    if hasattr(pkt, 'tcp'):
                        try:
                            tcp_len = safe_int(getattr(pkt.tcp, 'len', 0))
                        except:
                            tcp_len = 0
                        if tcp_len > 0:
                            f["fwd_tcp_len_vals"].append(tcp_len)
                    
                    # Header length
                    if hasattr(pkt, 'ip'):
                        try:
                            hdr = safe_int(getattr(pkt.ip, 'hdr_len', 0))
                        except:
                            hdr = 0
                    else:
                        hdr = 0
                    f["fwd_header_lengths"].append(hdr)
                else:
                    f["bwd_timestamps"].append(ts)
                    f["bwd_pkt_lens"].append(length)
                    
                    # Header length
                    if hasattr(pkt, 'ip'):
                        try:
                            hdr = safe_int(getattr(pkt.ip, 'hdr_len', 0))
                        except:
                            hdr = 0
                    else:
                        hdr = 0
                    f["bwd_header_lengths"].append(hdr)
                
                # Process TCP flags
                if hasattr(pkt, 'tcp'):
                    flags_str = ""
                    try:
                        flags_str = str(pkt.tcp.flags)
                    except:
                        flags_str = ""
                    
                    # Parse flags
                    try:
                        if 'SYN' in flags_str.upper() or '0x0002' in flags_str:
                            f["flags_total"]["syn"] += 1
                        if 'FIN' in flags_str.upper() or '0x0001' in flags_str:
                            f["flags_total"]["fin"] += 1
                        if 'RST' in flags_str.upper() or '0x0004' in flags_str:
                            f["flags_total"]["rst"] += 1
                        if 'PSH' in flags_str.upper() or '0x0008' in flags_str:
                            f["flags_total"]["psh"] += 1
                        if 'ACK' in flags_str.upper() or '0x0010' in flags_str:
                            f["flags_total"]["ack"] += 1
                        if 'URG' in flags_str.upper() or '0x0020' in flags_str:
                            f["flags_total"]["urg"] += 1
                        if 'CWR' in flags_str.upper() or '0x0080' in flags_str:
                            f["cwr_count"] += 1
                        if 'ECE' in flags_str.upper() or '0x0040' in flags_str:
                            f["ece_count"] += 1
                        
                        if direction == "fwd":
                            if 'PSH' in flags_str.upper() or '0x0008' in flags_str:
                                f["flags_fwd"]["psh"] += 1
                            if 'URG' in flags_str.upper() or '0x0020' in flags_str:
                                f["flags_fwd"]["urg"] += 1
                    except:
                        pass
                    
                    # Extract window sizes
                    try:
                        win = getattr(pkt.tcp, 'window_size_value', None)
                        if win is None:
                            win = getattr(pkt.tcp, 'window_size', None)
                        if direction == "fwd" and f["init_fwd_win"] is None and win is not None:
                            f["init_fwd_win"] = safe_int(win)
                        if direction == "bwd" and f["init_bwd_win"] is None and win is not None:
                            f["init_bwd_win"] = safe_int(win)
                    except:
                        pass
                        
            except Exception as e:
                continue
        
        cap.close()
        
        print(f"Processed {len(flows)} flows from PCAP file")
        
        if len(flows) == 0:
            print("WARNING: No flows extracted from PCAP file")
            print("Possible reasons:")
            print("  - PCAP file contains no IP packets")
            print("  - PCAP file is encrypted or corrupted")
            print("  - TShark cannot read the file format")
        
        # Convert flows to DataFrame rows
        rows = []
        for k, v in flows.items():
            try:
                ts_all = sorted([t for t in v["timestamps"] if t > 0])
                if not ts_all:
                    continue
                
                start = ts_all[0]
                end = ts_all[-1]
                dur = end - start if end > start else 0.000001
                
                # Basic packet/byte counts
                total_fwd_packets = len(v["fwd_pkt_lens"])
                total_bwd_packets = len(v["bwd_pkt_lens"])
                total_fwd_bytes = sum(v["fwd_pkt_lens"])
                total_bwd_bytes = sum(v["bwd_pkt_lens"])
                
                # Packet length statistics
                pkt_all = v["all_pkt_lens"] if v["all_pkt_lens"] else []
                pkt_min = int(min(pkt_all)) if pkt_all else 0
                pkt_max = int(max(pkt_all)) if pkt_all else 0
                pkt_mean = float(mean(pkt_all)) if pkt_all else 0.0
                pkt_std = float(stdev(pkt_all)) if len(pkt_all) > 1 else 0.0
                
                min_fwd = int(min(v["fwd_pkt_lens"])) if v["fwd_pkt_lens"] else 0
                max_fwd = int(max(v["fwd_pkt_lens"])) if v["fwd_pkt_lens"] else 0
                mean_fwd = float(mean(v["fwd_pkt_lens"])) if v["fwd_pkt_lens"] else 0.0
                std_fwd = float(stdev(v["fwd_pkt_lens"])) if len(v["fwd_pkt_lens"]) > 1 else 0.0
                
                min_bwd = int(min(v["bwd_pkt_lens"])) if v["bwd_pkt_lens"] else 0
                max_bwd = int(max(v["bwd_pkt_lens"])) if v["bwd_pkt_lens"] else 0
                mean_bwd = float(mean(v["bwd_pkt_lens"])) if v["bwd_pkt_lens"] else 0.0
                std_bwd = float(stdev(v["bwd_pkt_lens"])) if len(v["bwd_pkt_lens"]) > 1 else 0.0
                
                # IAT (Inter-Arrival Time) calculations
                diffs = [j - i for i, j in zip(ts_all[:-1], ts_all[1:])] if len(ts_all) > 1 else []
                flow_iat_mean = float(mean(diffs)) if diffs else 0.0
                flow_iat_std = float(stdev(diffs)) if len(diffs) > 1 else 0.0
                flow_iat_max = float(max(diffs)) if diffs else 0.0
                
                fwd_diffs = [j - i for i, j in zip(sorted(v["fwd_timestamps"])[:-1], 
                            sorted(v["fwd_timestamps"])[1:])] if len(v["fwd_timestamps"]) > 1 else []
                bwd_diffs = [j - i for i, j in zip(sorted(v["bwd_timestamps"])[:-1], 
                            sorted(v["bwd_timestamps"])[1:])] if len(v["bwd_timestamps"]) > 1 else []
                
                fwd_iat_std = float(stdev(fwd_diffs)) if len(fwd_diffs) > 1 else 0.0
                fwd_iat_max = float(max(fwd_diffs)) if fwd_diffs else 0.0
                bwd_iat_std = float(stdev(bwd_diffs)) if len(bwd_diffs) > 1 else 0.0
                bwd_iat_max = float(max(bwd_diffs)) if bwd_diffs else 0.0
                
                # Packet rates
                fwd_pkts_per_s = total_fwd_packets / dur if dur > 0 else 0.0
                bwd_pkts_per_s = total_bwd_packets / dur if dur > 0 else 0.0
                flow_bytes_per_sec = (total_fwd_bytes + total_bwd_bytes) / dur if dur > 0 else 0.0
                flow_packets_per_sec = (total_fwd_packets + total_bwd_packets) / dur if dur > 0 else 0.0
                
                # TCP flags
                fin_cnt = v["flags_total"]["fin"]
                syn_cnt = v["flags_total"]["syn"]
                rst_cnt = v["flags_total"]["rst"]
                psh_cnt = v["flags_total"]["psh"]
                ack_cnt = v["flags_total"]["ack"]
                urg_cnt = v["flags_total"]["urg"]
                fwd_psh = v["flags_fwd"]["psh"]
                fwd_urg = v["flags_fwd"]["urg"]
                
                # Header lengths
                fwd_hdr_len = int(mean(v["fwd_header_lengths"])) if v["fwd_header_lengths"] else 0
                bwd_hdr_len = int(mean(v["bwd_header_lengths"])) if v["bwd_header_lengths"] else 0
                
                # CWR/ECE counts
                cwe_cnt = v["cwr_count"]
                ece_cnt = v["ece_count"]
                
                # Down/Up ratio
                down_up = (total_bwd_bytes / total_fwd_bytes) if total_fwd_bytes > 0 else (
                    total_bwd_packets / total_fwd_packets if total_fwd_packets > 0 else 0.0
                )
                
                # Window sizes
                init_fwd_win = v["init_fwd_win"] if v["init_fwd_win"] is not None else 0
                init_bwd_win = v["init_bwd_win"] if v["init_bwd_win"] is not None else 0
                
                # Forward active data packets
                fwd_act_data_pkts = len([x for x in v.get("fwd_tcp_len_vals", []) if x > 0])
                fwd_seg_min = min(v.get("fwd_tcp_len_vals")) if v.get("fwd_tcp_len_vals") else 0
                
                # Active/Idle times calculation
                ts_sorted = sorted(ts_all)
                act_periods = []
                idle_periods = []
                
                if len(ts_sorted) > 1:
                    cur_start = ts_sorted[0]
                    cur_prev = ts_sorted[0]
                    for t in ts_sorted[1:]:
                        gap = t - cur_prev
                        if gap <= ACTIVE_THRESH:
                            cur_prev = t
                        else:
                            act_periods.append(cur_prev - cur_start)
                            idle_periods.append(gap)
                            cur_start = t
                            cur_prev = t
                    act_periods.append(cur_prev - cur_start)
                else:
                    act_periods = [0.0]
                
                active_mean = mean(act_periods) if act_periods else 0.0
                active_std = stdev(act_periods) if len(act_periods) > 1 else 0.0
                active_max = max(act_periods) if act_periods else 0.0
                active_min = min(act_periods) if act_periods else 0.0
                
                if idle_periods:
                    idle_mean = mean(idle_periods)
                    idle_std = stdev(idle_periods) if len(idle_periods) > 1 else 0.0
                    idle_max = max(idle_periods)
                    idle_min = min(idle_periods)
                else:
                    idle_mean = idle_std = idle_max = idle_min = 0.0
                
                # Create row with all features
                row = {
                    "Protocol": v["protocol"],
                    "Total Fwd Packets": total_fwd_packets,
                    "Total Backward Packets": total_bwd_packets,
                    "Fwd Packets Length Total": total_fwd_bytes,
                    "Bwd Packets Length Total": total_bwd_bytes,
                    "Fwd Packet Length Max": max_fwd,
                    "Fwd Packet Length Min": min_fwd,
                    "Fwd Packet Length Std": std_fwd,
                    "Bwd Packet Length Max": max_bwd,
                    "Bwd Packet Length Min": min_bwd,
                    "Bwd Packet Length Std": std_bwd,
                    "Flow Bytes/s": flow_bytes_per_sec,
                    "Flow Packets/s": flow_packets_per_sec,
                    "Flow IAT Mean": flow_iat_mean,
                    "Flow IAT Std": flow_iat_std,
                    "Flow IAT Max": flow_iat_max,
                    "Fwd IAT Std": fwd_iat_std,
                    "Fwd IAT Max": fwd_iat_max,
                    "Bwd IAT Std": bwd_iat_std,
                    "Bwd IAT Max": bwd_iat_max,
                    "Fwd PSH Flags": fwd_psh,
                    "Fwd URG Flags": fwd_urg,
                    "Fwd Header Length": fwd_hdr_len,
                    "Bwd Header Length": bwd_hdr_len,
                    "Fwd Packets/s": fwd_pkts_per_s,
                    "Bwd Packets/s": bwd_pkts_per_s,
                    "Packet Length Min": pkt_min,
                    "Packet Length Max": pkt_max,
                    "Packet Length Mean": pkt_mean,
                    "Packet Length Std": pkt_std,
                    "FIN Flag Count": fin_cnt,
                    "SYN Flag Count": syn_cnt,
                    "RST Flag Count": rst_cnt,
                    "PSH Flag Count": psh_cnt,
                    "ACK Flag Count": ack_cnt,
                    "URG Flag Count": urg_cnt,
                    "CWE Flag Count": cwe_cnt,
                    "ECE Flag Count": ece_cnt,
                    "Down/Up Ratio": down_up,
                    "Init Fwd Win Bytes": init_fwd_win,
                    "Init Bwd Win Bytes": init_bwd_win,
                    "Fwd Act Data Packets": fwd_act_data_pkts,
                    "Fwd Seg Size Min": fwd_seg_min,
                    "Active Mean": active_mean,
                    "Active Std": active_std,
                    "Active Max": active_max,
                    "Active Min": active_min,
                    "Idle Mean": idle_mean,
                    "Idle Std": idle_std,
                    "Idle Max": idle_max,
                    "Idle Min": idle_min,
                    "Attack_encode": 0,
                    "mapped_label": "",
                    "severity_raw": "",
                    "severity": ""
                }
                rows.append(row)
            except Exception:
                continue
        
        # Create DataFrame with all columns in proper order
        df = pd.DataFrame(rows, columns=[
            "Protocol", "Total Fwd Packets", "Total Backward Packets", "Fwd Packets Length Total", "Bwd Packets Length Total",
            "Fwd Packet Length Max", "Fwd Packet Length Min", "Fwd Packet Length Std", "Bwd Packet Length Max", "Bwd Packet Length Min",
            "Bwd Packet Length Std", "Flow Bytes/s", "Flow Packets/s", "Flow IAT Mean", "Flow IAT Std", "Flow IAT Max",
            "Fwd IAT Std", "Fwd IAT Max", "Bwd IAT Std", "Bwd IAT Max", "Fwd PSH Flags", "Fwd URG Flags", "Fwd Header Length",
            "Bwd Header Length", "Fwd Packets/s", "Bwd Packets/s", "Packet Length Min", "Packet Length Max", "Packet Length Mean",
            "Packet Length Std", "FIN Flag Count", "SYN Flag Count", "RST Flag Count", "PSH Flag Count", "ACK Flag Count", "URG Flag Count",
            "CWE Flag Count", "ECE Flag Count", "Down/Up Ratio", "Init Fwd Win Bytes", "Init Bwd Win Bytes", "Fwd Act Data Packets",
            "Fwd Seg Size Min", "Active Mean", "Active Std", "Active Max", "Active Min", "Idle Mean", "Idle Std", "Idle Max", "Idle Min",
            "Attack_encode", "mapped_label", "severity_raw", "severity"
        ])
        
        return df

    except Exception as e:
        print(f"Error converting PCAP: {e}")
        import traceback
        traceback.print_exc()
        # Return empty DataFrame on error
        return pd.DataFrame()
