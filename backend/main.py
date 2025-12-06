from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import predict, monitor, reports, upload, blockchain
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()
# Trigger reload

app = FastAPI(
    title="Network IDS API",
    description="Backend API for Intrusion Detection System",
    version="1.0.0"
)

# Allow Streamlit frontend and Vercel deployment
origins = [
    "http://localhost:3000",
    "http://localhost:8501",
    "https://redact-cybersecure-tau.vercel.app",
    "https://huggingface.co",
    "https://ketannnn-cybersecureupload.hf.space",
    "https://huggingface.co/spaces/ketannnn/cybersecure",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(predict.router, prefix="/predict", tags=["Prediction"])
app.include_router(monitor.router, prefix="/monitor", tags=["Live Monitor"])
app.include_router(reports.router, prefix="/reports", tags=["Threat Reports"])
app.include_router(upload.router, prefix="/upload", tags=["File Upload"])
app.include_router(blockchain.router, prefix="/blockchain", tags=["Blockchain"])


@app.get("/")
def home():
    return {"message": "Network IDS Backend Running!"}