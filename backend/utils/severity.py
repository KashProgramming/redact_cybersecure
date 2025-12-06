import numpy as np

LABEL_BOOST = {
    'benign': -2.0, 'bruteforce': 0.9, 'dos': 1.2,
    'malware': 1.3, 'scan': 0.7, 'webattack': 1.0
}

def sigmoid(x):
    return 1 / (1 + np.exp(-np.clip(x, -500, 500)))

def get_label_boost(label: str):
    label = label.lower()
    for key, val in LABEL_BOOST.items():
        if key in label:
            return val
    return 0.5

def calculate_severity(features, attack_label):
    values = np.array(list(features.values()))
    weights = np.ones(len(values)) / len(values)

    raw = np.dot(values, weights) + get_label_boost(attack_label) / 2
    return float(sigmoid(raw))
