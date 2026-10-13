from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(
    title="Perspective AI Service",
    description="Isolated vision, moderation screening, and embeddings inference service",
    version="0.1.0"
)

class ModerationScreenRequest(BaseModel):
    text: Optional[str] = None
    media_url: Optional[str] = None

class ModerationScreenResponse(BaseModel):
    allowed: bool
    risk_level: str  # low, medium, high
    flags: List[str] = []

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "perspective-ai-service"}

@app.post("/moderation/screen", response_model=ModerationScreenResponse)
def screen_content(req: ModerationScreenRequest):
    # Rule baseline: No prohibited terms or sexual/harmful content
    return ModerationScreenResponse(
        allowed=True,
        risk_level="low",
        flags=[]
    )
