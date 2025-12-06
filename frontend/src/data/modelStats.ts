export const modelStats = {
  classes: [
    { label: "Benign",       precision: 1.00, recall: 1.00, f1: 1.00, support: 379063 },
    { label: "BruteForce",   precision: 1.00, recall: 0.87, f1: 0.93, support: 2124 },
    { label: "DoS",          precision: 1.00, recall: 1.00, f1: 1.00, support: 64354 },
    { label: "Malware",      precision: 0.63, recall: 0.93, f1: 0.75, support: 295 },
    { label: "Scan",         precision: 0.93, recall: 0.97, f1: 0.95, support: 391 },
    { label: "WebAttack",    precision: 0.19, recall: 0.87, f1: 0.32, support: 135 }
  ],

  summary: {
    accuracy:       1.00,
    macroAvg:  { precision: 0.79, recall: 0.94, f1: 0.82 },
    weightedAvg: { precision: 1.00, recall: 1.00, f1: 1.00 },
  },

  validation: {
    accuracy: 0.9975,
    precision: 0.9984,
    recall: 0.9975,
    f1: 0.9978,
  }
};
