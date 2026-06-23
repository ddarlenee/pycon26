from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from services.auth_service import register_user, login_user, create_token, decode_token, get_history
from services.session_store import load_session

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str


class AuthResponse(BaseModel):
    access_token: str
    user: UserOut


@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest):
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    try:
        user = register_user(req.email, req.password, req.name)
        token = create_token(user)
        return AuthResponse(access_token=token, user=UserOut(**user))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest):
    try:
        user = login_user(req.email, req.password)
        token = create_token(user)
        return AuthResponse(access_token=token, user=UserOut(**user))
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/history")
def history(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token.")
    try:
        payload = decode_token(authorization.removeprefix("Bearer "))
        return {"history": get_history(payload["sub"])}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/restore")
def restore_session(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token.")
    try:
        payload = decode_token(authorization.removeprefix("Bearer "))
        session = load_session(payload["sub"])
        return {"session": session or None}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
