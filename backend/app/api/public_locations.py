from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from backend.app.database.connection import get_db
from backend.app.database.models import Project, ProjectLocation

router = APIRouter(prefix="/api/public/locations", tags=["Public Location Hierarchy API"])

@router.get("/states", response_model=List[str])
def get_states(db: Session = Depends(get_db)):
    """Returns list of all available states in the public dataset."""
    results = (
        db.query(Project.state)
        .filter(Project.state != None, Project.state != "")
        .distinct()
        .order_by(Project.state)
        .all()
    )
    return [r[0] for r in results]


@router.get("/districts", response_model=List[str])
def get_districts(
    state: Optional[str] = Query(None, description="Filter districts by state"),
    db: Session = Depends(get_db)
):
    """Returns list of available districts, filtered by state if provided."""
    query = db.query(Project.district).filter(Project.district != None, Project.district != "")
    if state and state.strip():
        query = query.filter(Project.state.ilike(state.strip()))

    results = query.distinct().order_by(Project.district).all()
    return [r[0] for r in results]


@router.get("/constituencies", response_model=List[str])
def get_constituencies(
    state: Optional[str] = Query(None, description="Filter constituencies by state"),
    district: Optional[str] = Query(None, description="Filter constituencies by district"),
    db: Session = Depends(get_db)
):
    """Returns list of constituencies, filtered by state and district if provided."""
    query = db.query(Project.constituency).filter(Project.constituency != None, Project.constituency != "")
    if state and state.strip():
        query = query.filter(Project.state.ilike(state.strip()))
    if district and district.strip():
        query = query.filter(Project.district.ilike(district.strip()))

    results = query.distinct().order_by(Project.constituency).all()
    return [r[0] for r in results]


@router.get("/blocks", response_model=List[str])
def get_blocks(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    constituency: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Returns list of blocks, dependent on state/district/constituency."""
    query = (
        db.query(ProjectLocation.block)
        .join(Project, Project.project_id == ProjectLocation.project_id)
        .filter(ProjectLocation.block != None, ProjectLocation.block != "")
    )
    if state and state.strip():
        query = query.filter(Project.state.ilike(state.strip()))
    if district and district.strip():
        query = query.filter(Project.district.ilike(district.strip()))
    if constituency and constituency.strip():
        query = query.filter(Project.constituency.ilike(constituency.strip()))

    results = query.distinct().order_by(ProjectLocation.block).all()
    return [r[0] for r in results]


@router.get("/villages", response_model=List[str])
def get_villages(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    constituency: Optional[str] = Query(None),
    block: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Returns list of villages, dependent on parent location filters."""
    query = (
        db.query(ProjectLocation.village)
        .join(Project, Project.project_id == ProjectLocation.project_id)
        .filter(ProjectLocation.village != None, ProjectLocation.village != "")
    )
    if state and state.strip():
        query = query.filter(Project.state.ilike(state.strip()))
    if district and district.strip():
        query = query.filter(Project.district.ilike(district.strip()))
    if constituency and constituency.strip():
        query = query.filter(Project.constituency.ilike(constituency.strip()))
    if block and block.strip():
        query = query.filter(ProjectLocation.block.ilike(block.strip()))

    results = query.distinct().order_by(ProjectLocation.village).all()
    return [r[0] for r in results]
