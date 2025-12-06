from pydantic import BaseModel
from typing import Dict, List, Any

class FlowFeatures(BaseModel):
    features: Dict[str, Any]

class BatchRequest(BaseModel):
    items: List[Dict[str, Any]]
