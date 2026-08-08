from fastapi import APIRouter

from .. import schemas
from ..services import voice_parser

router = APIRouter(prefix="/api/voice", tags=["voice"])


@router.post("/parse")
def parse_voice(payload: schemas.VoiceParseRequest):
    return voice_parser.parse_voice_complaint(payload.transcript, payload.language)
