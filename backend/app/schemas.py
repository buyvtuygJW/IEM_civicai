from typing import Optional, List
from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "citizen"  # "citizen" | "government"
    department: Optional[str] = None  # government users only
    phone: Optional[str] = None
    government_code: Optional[str] = None  # required if role == "government"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    department: Optional[str] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class CitizenProfile(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None  # male, female, other
    occupation: Optional[str] = None
    annual_income: Optional[float] = None
    state: Optional[str] = None
    owns_land: Optional[bool] = None
    owns_pucca_house: Optional[bool] = None
    has_girl_child_under_10: Optional[bool] = None
    bpl_or_seci_listed: Optional[bool] = None
    has_disability: Optional[bool] = None


class SchemeResult(BaseModel):
    id: str
    name: str
    category: str
    description: str
    benefit: str
    documents: List[str]
    apply_url: str
    match_score: float
    matched_criteria: List[str]
    missing_criteria: List[str]
    status: str  # "eligible" | "almost_eligible"


class EligibilityResponse(BaseModel):
    eligible: List[SchemeResult]
    almost_eligible: List[SchemeResult]


class ChatMessage(BaseModel):
    message: str
    profile: Optional[CitizenProfile] = None


class ComplaintCreate(BaseModel):
    description: Optional[str] = None
    transcript: Optional[str] = None
    language: Optional[str] = "en"
    area: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    reporter_name: Optional[str] = None
    reporter_contact: Optional[str] = None
    photo_data_url: Optional[str] = None


class ComplaintOut(BaseModel):
    id: str
    description: str
    category: str
    department: str
    priority: str
    area: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    status: str
    escalation_level: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class StatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None


class VoiceParseRequest(BaseModel):
    transcript: str
    language: Optional[str] = "en"
