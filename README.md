# CyberSecure - Network Intrusion Detection System

A comprehensive, AI-powered Network Intrusion Detection System (IDS) with real-time threat monitoring, blockchain-secured audit trails, and advanced analytics. Built with FastAPI (Python) backend and Next.js (React/TypeScript) frontend.

## Overview
CyberSecure is an enterprise-grade Network Intrusion Detection System that combines machine learning, blockchain technology, and AI-powered analytics to provide comprehensive network security monitoring. The system can detect various attack types including DoS, Brute Force, Port Scanning, Malware, and Web Attacks with 98% accuracy.

### Key Capabilities
- **Real-time Network Flow Analysis**: Monitor and analyze network traffic in real-time
- **AI-Powered Threat Detection**: XGBoost model with 98% accuracy for attack classification
- **Blockchain-Secured Audit Trail**: Immutable threat logging using Merkle trees and digital signatures
- **PCAP File Support**: Convert and analyze packet capture files
- **Advanced Analytics**: SHAP-based feature importance analysis with AI interpretation
- **MITRE ATT&CK Integration**: Educational guide with attack type mapping
- **Professional Reporting**: Generate PDF and text reports with AI-generated insights

## Features

### 1. **Dashboard & Real-Time Monitoring**
- **Overview Dashboard**: Comprehensive statistics including total flows, attack distribution, protocol analysis
- **Live Monitor**: Real-time network flow analysis with configurable speed
- **Threat Log**: Automatic logging of detected threats with severity scoring
- **Analytics**: Feature importance visualization and AI-powered interpretations

### 2. **File Analysis**
- **CSV Upload**: Upload and analyze network flow data in CSV format
- **PCAP Conversion**: Automatic conversion of PCAP/PCAPNG files to CSV format
- **Batch Processing**: Analyze up to 100,000 flows per file
- **Multi-File Support**: Compare multiple analyses simultaneously
- **Feature Importance**: SHAP values for model transparency

### 3. **AI-Powered Features**
- **SHAP Interpretation**: AI-generated explanations of feature importance using Groq API
- **Threat Reports**: Comprehensive reports with AI-generated executive summaries
- **MITRE ATT&CK Guide**: Interactive educational tool with AI chat assistant
- **Attack Analysis**: Deep explanations of attack types and mitigation strategies

### 4. **Blockchain & Immutability**
- **Merkle Tree Implementation**: Cryptographic verification of threat logs
- **Blockchain Ledger**: Immutable audit trail with RSA-2048 digital signatures
- **Block Explorer**: Visualize and verify blockchain integrity
- **Tamper Detection**: Automatic detection of log modifications

### 5. **Reporting & Export**
- **PDF Reports**: Professional reports with charts, tables, and AI insights
- **Text Reports**: Plain text format for easy sharing
- **Export Options**: Download interpretations and reports in multiple formats
- **Report Customization**: Include attack statistics, protocol distributions, and recommendations

## Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Landing  │  │Dashboard │  │ Analyze  │  │  Guide   │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Context Providers (State Management)         │   │
│  │  Dashboard | Monitor | Analyze | Analytics           │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │ REST API
┌───────────────────────┴─────────────────────────────────────┐
│                  Backend (FastAPI)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Predict  │  │ Monitor  │  │ Reports  │  │ Upload   │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │Blockchain│  │  Model   │  │   Utils  │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
   ┌────────┐                    ┌──────────┐
   │  ML    │                    │ Groq API │
   │ Model  │                    │   (AI)   │
   └────────┘                    └──────────┘
```

### Data Flow

1. **Network Flow Input**: CSV files or PCAP files uploaded via frontend
2. **Feature Extraction**: PCAP files converted to CIC-IDS-2017 compatible features
3. **ML Prediction**: XGBoost model classifies flows into attack types
4. **Severity Calculation**: Dynamic severity scoring based on features and attack type
5. **Blockchain Logging**: Threats logged to immutable blockchain ledger
6. **Analytics Processing**: Feature importance and statistics calculated
7. **AI Enhancement**: Groq API generates interpretations and reports
8. **Visualization**: Results displayed in interactive dashboards

## Installation
### Prerequisites
- Python 3.12+
- Node.js 20+
- npm or yarn
- Wireshark/TShark (for PCAP conversion)

### Backend Setup
1. **Clone the repository**
```bash
git clone <repository-url>
cd redact_cybersecure
```
2. **Create virtual environment**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```
3. **Install dependencies**
```bash
pip install -r requirements.txt
```
4. **Place ML model**
   - Ensure `xgb_classifier.pkl` is in `backend/data/` directory
   - The model should be trained on CIC-IDS-2017 compatible features
5. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env and add:
# GROQ_API_KEY=your_groq_api_key_here
```

### Frontend Setup
1. **Navigate to frontend directory**
```bash
cd frontend
```
2. **Install dependencies**
```bash
npm install
```
3. **Set up environment variables**
```bash
cp .env.example .env.local
# Edit .env.local and add:
# NEXT_PUBLIC_API_URL=http://localhost:8000/
# NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
```

## ⚙️ Configuration

### Backend Configuration
**Environment Variables** (`.env` in backend directory):
```env
GROQ_API_KEY=your_groq_api_key_here
```
**Model Configuration**:
- Model file: `backend/data/xgb_classifier.pkl`
- Expected features: CIC-IDS-2017 compatible (78 features)
- Attack classes: Benign, DoS, BruteForce, Scan, Malware, WebAttack
**Blockchain Configuration**:
- Ledger file: `backend/blockchain/blockchain_ledger.json`
- Batch size: 10,000 entries (configurable)
- Signature algorithm: RSA-2048

### Frontend Configuration
**Environment Variables** (`.env.local` in frontend directory):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/
NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
```
**API Endpoints**:
- Default backend URL: `http://localhost:8000`
- For production: Update `NEXT_PUBLIC_API_URL`

## Usage
### Starting the Backend
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```
### Starting the Frontend
```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:3000`

## 🔒 Security Features
### 1. **Blockchain Immutability**
- Merkle tree-based verification
- RSA-2048 digital signatures
- Linked block structure
- Tamper detection

### 2. **Model Security**
- Secure model loading
- Input validation and sanitization
- Feature extraction validation

### 3. **API Security**
- CORS configuration
- Input validation with Pydantic
- Error handling and logging

### 4. **Data Privacy**
- No sensitive data storage
- Secure file handling
- Temporary file cleanup

### Environment Variables for Production
**Backend**:
- `GROQ_API_KEY`: Required for AI features
- `ALLOWED_ORIGINS`: CORS origins (comma-separated)

**Frontend**:
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_GROQ_API_KEY`: Optional (for client-side AI)

## 📊 Model Performance
- **Accuracy**: ~98%
- **Precision**: ~96%
- **Recall**: ~94%
- **Algorithm**: XGBoost Classifier
- **Features**: 78 CIC-IDS-2017 compatible features

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request
