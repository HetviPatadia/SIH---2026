import uuid
import datetime
from typing import Dict, Any

# In-memory background task registry (compatible with Celery/Redis for production)
TASK_REGISTRY: Dict[str, Dict[str, Any]] = {}

def create_task_record(task_name: str) -> str:
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    TASK_REGISTRY[job_id] = {
        "job_id": job_id,
        "task_name": task_name,
        "status": "QUEUED",
        "progress": 0.0,
        "started_at": datetime.datetime.utcnow().isoformat(),
        "completed_at": None,
        "error": None,
        "result": None,
    }
    return job_id

def update_task_progress(job_id: str, progress: float, status: str = "RUNNING"):
    if job_id in TASK_REGISTRY:
        TASK_REGISTRY[job_id]["progress"] = progress
        TASK_REGISTRY[job_id]["status"] = status

def complete_task(job_id: str, result: Any = None):
    if job_id in TASK_REGISTRY:
        TASK_REGISTRY[job_id]["status"] = "COMPLETED"
        TASK_REGISTRY[job_id]["progress"] = 100.0
        TASK_REGISTRY[job_id]["completed_at"] = datetime.datetime.utcnow().isoformat()
        TASK_REGISTRY[job_id]["result"] = result

def fail_task(job_id: str, error: str):
    if job_id in TASK_REGISTRY:
        TASK_REGISTRY[job_id]["status"] = "FAILED"
        TASK_REGISTRY[job_id]["completed_at"] = datetime.datetime.utcnow().isoformat()
        TASK_REGISTRY[job_id]["error"] = error
