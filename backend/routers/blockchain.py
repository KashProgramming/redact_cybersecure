from fastapi import APIRouter, HTTPException
import json
from pathlib import Path

router = APIRouter()

# Path to the ledger file
# backend/routers/blockchain.py -> parent = backend/routers -> parent.parent = backend
# ledger is in backend/blockchain/blockchain_ledger.json
LEDGER_PATH = Path(__file__).resolve().parent.parent / "blockchain" / "blockchain_ledger.json"

@router.get("/ledger")
def get_ledger():
    if not LEDGER_PATH.exists():
        # Return empty structure if not found, or error
        return {"blocks": [], "sealed_batch_count": 0, "open_entries": []}
    try:
        with open(LEDGER_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
