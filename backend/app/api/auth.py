from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
import datetime
import jwt
from backend.app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)

# Pre-seeded authorized accounts for testing/evaluators
DEMO_USERS = {
    "auditor": {"username": "auditor", "role": "AUDITOR", "password": "auditor123"},
    "admin": {"username": "admin", "role": "ADMINISTRATOR", "password": "admin123"},
    "viewer": {"username": "viewer", "role": "VIEWER", "password": "viewer123"},
}

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class UserProfile(BaseModel):
    username: str
    role: str

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + (expires_delta or datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

@router.post("/token", response_model=TokenResponse)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = DEMO_USERS.get(form_data.username)
    if not user or user["password"] != form_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": user["username"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "username": user["username"],
    }

def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> UserProfile:
    if not token:
        if settings.ALLOW_DEMO_AUTH:
            return UserProfile(username="demo_auditor", role="AUDITOR")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role", "VIEWER")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return UserProfile(username=username, role=role)
    except jwt.PyJWTError:
        if settings.ALLOW_DEMO_AUTH:
            return UserProfile(username="demo_auditor", role="AUDITOR")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.get("/me", response_model=UserProfile)
def read_current_user(user: UserProfile = Depends(get_current_user)):
    return user
