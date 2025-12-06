import CryptoJS from 'crypto-js';

export const sha256 = (data: string): string => {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
};

export interface LogEntry {
  timestamp: string;
  flow_id: string;
  attack_label: string;
  severity: number;
  src_ip: string;
  dst_ip: string;
  action: string;
  _tampered?: boolean; // For UI highlighting
}

export const createLogEntry = (i: number): LogEntry => {
  const attackTypes = ["Benign", "DoS Hulk", "PortScan"];
  return {
    timestamp: new Date().toISOString(),
    flow_id: `flow_${i + 1}`,
    attack_label: attackTypes[i % 3],
    severity: Number((0.1 + (i % 10) * 0.07).toFixed(2)),
    src_ip: `10.0.0.${(i % 6) + 1}`,
    dst_ip: `192.168.0.${(i % 10) + 1}`,
    action: "",
  };
};

export const entryToCanonical = (entry: LogEntry): string => {
  // Matches Python: flow_id|attack_label|severity|src_ip|dst_ip|action|timestamp
  // Note: Python timestamp might be specific format, but we'll stick to ISO string for now or simple string
  // The prompt says: "{flow_id}|{attack_label}|{severity}|..."
  // Let's assume the order from the python code if visible, or just consistent order.
  // Python code: flow_id, attack_label, severity, src_ip, dst_ip, action, timestamp
  return [
    entry.flow_id,
    entry.attack_label,
    entry.severity,
    entry.src_ip,
    entry.dst_ip,
    entry.action,
    entry.timestamp
  ].join('|');
};

export class MerkleTree {
  leaves: string[];
  levels: string[][];
  root: string;

  constructor(leaves: string[]) {
    this.leaves = leaves;
    this.levels = [];
    this.root = "";
    this.build();
  }

  build() {
    // 1. Hash leaves
    let currentLevel = this.leaves.map(l => sha256(l));
    this.levels.push(currentLevel);

    // 2. Build up
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = (i + 1 < currentLevel.length) ? currentLevel[i + 1] : left; // Duplicate if odd
        nextLevel.push(sha256(left + right));
      }
      this.levels.push(nextLevel);
      currentLevel = nextLevel;
    }

    this.root = currentLevel.length > 0 ? currentLevel[0] : "";
  }
}
