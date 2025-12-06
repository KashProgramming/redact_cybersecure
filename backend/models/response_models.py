from pydantic import BaseModel

class PredictionResponse(BaseModel):
    attack: str
    severity: float
    action: str
