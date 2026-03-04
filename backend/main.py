"""
Job Opportunity Tracker — FastAPI Backend
A lightweight API for tracking job opportunities across multiple companies.
Now with application pipeline and analytics.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
import sqlite3
import os

# ── Database Setup ───────────────────────────────────────────────────────────

DB_PATH = os.path.join(os.path.dirname(__file__), "jobs.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            career_page_url TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            location TEXT,
            role_type TEXT CHECK(role_type IN ('full-time', 'internship', 'contract', 'part-time', 'other')),
            salary_range TEXT,
            job_url TEXT,
            date_posted DATE,
            date_added TEXT DEFAULT (datetime('now')),
            status TEXT NOT NULL DEFAULT 'saved' CHECK(status IN ('saved', 'applied', 'interviewing', 'offer', 'rejected')),
            status_updated_at TEXT DEFAULT (datetime('now')),
            applied_date TEXT,
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
        CREATE INDEX IF NOT EXISTS idx_jobs_role_type ON jobs(role_type);
        CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
        CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            title TEXT,
            linkedin_url TEXT,
            email TEXT,
            phone TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
    """)

    # Migration: add columns if they don't exist (for existing databases)
    try:
        conn.execute("SELECT status FROM jobs LIMIT 1")
    except sqlite3.OperationalError:
        conn.execute("ALTER TABLE jobs ADD COLUMN status TEXT NOT NULL DEFAULT 'saved'")
        conn.execute("ALTER TABLE jobs ADD COLUMN status_updated_at TEXT DEFAULT (datetime('now'))")
        conn.execute("ALTER TABLE jobs ADD COLUMN applied_date TEXT")

    conn.commit()
    conn.close()


# ── Pydantic Models ──────────────────────────────────────────────────────────

VALID_STATUSES = ['saved', 'applied', 'interviewing', 'offer', 'rejected']

class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    career_page_url: Optional[str] = None


class CompanyOut(BaseModel):
    id: int
    name: str
    career_page_url: Optional[str]
    created_at: str
    job_count: int = 0


class JobCreate(BaseModel):
    company_id: int
    title: str = Field(..., min_length=1, max_length=300)
    location: Optional[str] = None
    role_type: Optional[str] = "full-time"
    salary_range: Optional[str] = None
    job_url: Optional[str] = None
    date_posted: Optional[str] = None
    status: Optional[str] = "saved"


class JobUpdate(BaseModel):
    title: Optional[str] = None
    location: Optional[str] = None
    role_type: Optional[str] = None
    salary_range: Optional[str] = None
    job_url: Optional[str] = None
    date_posted: Optional[str] = None
    company_id: Optional[int] = None
    status: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


class ContactCreate(BaseModel):
    company_id: int
    name: str = Field(..., min_length=1, max_length=200)
    title: Optional[str] = None
    linkedin_url: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    linkedin_url: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company_id: Optional[int] = None


class ContactOut(BaseModel):
    id: int
    company_id: int
    company_name: str
    name: str
    title: Optional[str]
    linkedin_url: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    created_at: str


class JobOut(BaseModel):
    id: int
    company_id: int
    company_name: str
    title: str
    location: Optional[str]
    role_type: Optional[str]
    salary_range: Optional[str]
    job_url: Optional[str]
    date_posted: Optional[str]
    date_added: str
    status: str
    status_updated_at: Optional[str]
    applied_date: Optional[str]


# ── FastAPI App ──────────────────────────────────────────────────────────────

app = FastAPI(title="Job Opportunity Tracker", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


# ── Company Endpoints ────────────────────────────────────────────────────────

@app.get("/api/companies", response_model=list[CompanyOut])
def list_companies():
    conn = get_db()
    rows = conn.execute("""
        SELECT c.*, COUNT(j.id) as job_count
        FROM companies c
        LEFT JOIN jobs j ON j.company_id = c.id
        GROUP BY c.id
        ORDER BY c.name
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/companies", response_model=CompanyOut, status_code=201)
def create_company(company: CompanyCreate):
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO companies (name, career_page_url) VALUES (?, ?)",
            (company.name.strip(), company.career_page_url),
        )
        conn.commit()
        row = conn.execute(
            "SELECT *, 0 as job_count FROM companies WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
        return dict(row)
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Company already exists")
    finally:
        conn.close()


@app.delete("/api/companies/{company_id}", status_code=204)
def delete_company(company_id: int):
    conn = get_db()
    cur = conn.execute("DELETE FROM companies WHERE id = ?", (company_id,))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Company not found")


# ── Job Endpoints ────────────────────────────────────────────────────────────

@app.get("/api/jobs", response_model=list[JobOut])
def list_jobs(
    company_id: Optional[int] = Query(None),
    role_type: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    conn = get_db()
    query = """
        SELECT j.*, c.name as company_name
        FROM jobs j
        JOIN companies c ON c.id = j.company_id
        WHERE 1=1
    """
    params = []

    if company_id:
        query += " AND j.company_id = ?"
        params.append(company_id)
    if role_type:
        query += " AND j.role_type = ?"
        params.append(role_type)
    if location:
        query += " AND LOWER(j.location) LIKE LOWER(?)"
        params.append(f"%{location}%")
    if search:
        query += " AND (LOWER(j.title) LIKE LOWER(?) OR LOWER(c.name) LIKE LOWER(?))"
        params.extend([f"%{search}%", f"%{search}%"])
    if status:
        query += " AND j.status = ?"
        params.append(status)

    query += " ORDER BY j.date_added DESC"

    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/jobs", response_model=JobOut, status_code=201)
def create_job(job: JobCreate):
    conn = get_db()
    company = conn.execute("SELECT id, name FROM companies WHERE id = ?", (job.company_id,)).fetchone()
    if not company:
        conn.close()
        raise HTTPException(status_code=404, detail="Company not found")

    status = job.status if job.status in VALID_STATUSES else "saved"
    now = datetime.utcnow().isoformat()
    applied_date = now if status == "applied" else None

    cur = conn.execute(
        """INSERT INTO jobs (company_id, title, location, role_type, salary_range, job_url, date_posted, status, status_updated_at, applied_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (job.company_id, job.title.strip(), job.location, job.role_type,
         job.salary_range, job.job_url, job.date_posted, status, now, applied_date),
    )
    conn.commit()
    row = conn.execute(
        """SELECT j.*, c.name as company_name FROM jobs j
           JOIN companies c ON c.id = j.company_id WHERE j.id = ?""",
        (cur.lastrowid,),
    ).fetchone()
    conn.close()
    return dict(row)


@app.patch("/api/jobs/{job_id}/status", response_model=JobOut)
def update_job_status(job_id: int, body: StatusUpdate):
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")

    conn = get_db()
    existing = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Job not found")

    now = datetime.utcnow().isoformat()
    applied_date = now if body.status == "applied" and not existing["applied_date"] else existing["applied_date"]

    conn.execute(
        "UPDATE jobs SET status = ?, status_updated_at = ?, applied_date = ? WHERE id = ?",
        (body.status, now, applied_date, job_id),
    )
    conn.commit()
    row = conn.execute(
        """SELECT j.*, c.name as company_name FROM jobs j
           JOIN companies c ON c.id = j.company_id WHERE j.id = ?""",
        (job_id,),
    ).fetchone()
    conn.close()
    return dict(row)


@app.put("/api/jobs/{job_id}", response_model=JobOut)
def update_job(job_id: int, job: JobUpdate):
    conn = get_db()
    existing = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Job not found")

    updates = {k: v for k, v in job.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "status" in updates:
        updates["status_updated_at"] = datetime.utcnow().isoformat()
        if updates["status"] == "applied" and not existing["applied_date"]:
            updates["applied_date"] = datetime.utcnow().isoformat()

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [job_id]

    conn.execute(f"UPDATE jobs SET {set_clause} WHERE id = ?", values)
    conn.commit()

    row = conn.execute(
        """SELECT j.*, c.name as company_name FROM jobs j
           JOIN companies c ON c.id = j.company_id WHERE j.id = ?""",
        (job_id,),
    ).fetchone()
    conn.close()
    return dict(row)


@app.delete("/api/jobs/{job_id}", status_code=204)
def delete_job(job_id: int):
    conn = get_db()
    cur = conn.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Job not found")


# ── Contact Endpoints ────────────────────────────────────────────────────────

@app.get("/api/contacts", response_model=list[ContactOut])
def list_contacts(
    company_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
):
    conn = get_db()
    query = """
        SELECT ct.*, c.name as company_name
        FROM contacts ct
        JOIN companies c ON c.id = ct.company_id
        WHERE 1=1
    """
    params = []

    if company_id:
        query += " AND ct.company_id = ?"
        params.append(company_id)
    if search:
        query += " AND (LOWER(ct.name) LIKE LOWER(?) OR LOWER(ct.title) LIKE LOWER(?) OR LOWER(c.name) LIKE LOWER(?))"
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

    query += " ORDER BY ct.created_at DESC"

    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/contacts", response_model=ContactOut, status_code=201)
def create_contact(contact: ContactCreate):
    conn = get_db()
    company = conn.execute("SELECT id, name FROM companies WHERE id = ?", (contact.company_id,)).fetchone()
    if not company:
        conn.close()
        raise HTTPException(status_code=404, detail="Company not found")

    cur = conn.execute(
        """INSERT INTO contacts (company_id, name, title, linkedin_url, email, phone)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (contact.company_id, contact.name.strip(), contact.title,
         contact.linkedin_url, contact.email, contact.phone),
    )
    conn.commit()
    row = conn.execute(
        """SELECT ct.*, c.name as company_name FROM contacts ct
           JOIN companies c ON c.id = ct.company_id WHERE ct.id = ?""",
        (cur.lastrowid,),
    ).fetchone()
    conn.close()
    return dict(row)


@app.put("/api/contacts/{contact_id}", response_model=ContactOut)
def update_contact(contact_id: int, contact: ContactUpdate):
    conn = get_db()
    existing = conn.execute("SELECT * FROM contacts WHERE id = ?", (contact_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Contact not found")

    updates = {k: v for k, v in contact.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [contact_id]

    conn.execute(f"UPDATE contacts SET {set_clause} WHERE id = ?", values)
    conn.commit()

    row = conn.execute(
        """SELECT ct.*, c.name as company_name FROM contacts ct
           JOIN companies c ON c.id = ct.company_id WHERE ct.id = ?""",
        (contact_id,),
    ).fetchone()
    conn.close()
    return dict(row)


@app.delete("/api/contacts/{contact_id}", status_code=204)
def delete_contact(contact_id: int):
    conn = get_db()
    cur = conn.execute("DELETE FROM contacts WHERE id = ?", (contact_id,))
    conn.commit()
    conn.close()
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Contact not found")


# ── Analytics Endpoint ───────────────────────────────────────────────────────

@app.get("/api/analytics")
def get_analytics():
    conn = get_db()

    # Pipeline counts
    pipeline = {}
    for row in conn.execute("SELECT status, COUNT(*) as cnt FROM jobs GROUP BY status"):
        pipeline[row["status"]] = row["cnt"]

    # By company
    by_company = []
    for row in conn.execute("""
        SELECT c.name, c.id,
               COUNT(j.id) as total,
               SUM(CASE WHEN j.status = 'applied' THEN 1 ELSE 0 END) as applied,
               SUM(CASE WHEN j.status = 'interviewing' THEN 1 ELSE 0 END) as interviewing,
               SUM(CASE WHEN j.status = 'offer' THEN 1 ELSE 0 END) as offers,
               SUM(CASE WHEN j.status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM companies c
        LEFT JOIN jobs j ON j.company_id = c.id
        GROUP BY c.id
        HAVING total > 0
        ORDER BY total DESC
    """):
        by_company.append(dict(row))

    # By role type
    by_role = []
    for row in conn.execute("""
        SELECT role_type, COUNT(*) as total,
               SUM(CASE WHEN status IN ('applied', 'interviewing', 'offer') THEN 1 ELSE 0 END) as active
        FROM jobs GROUP BY role_type ORDER BY total DESC
    """):
        by_role.append(dict(row))

    # Weekly activity (jobs added per week, last 8 weeks)
    weekly = []
    for row in conn.execute("""
        SELECT strftime('%Y-W%W', date_added) as week,
               COUNT(*) as added,
               SUM(CASE WHEN status != 'saved' THEN 1 ELSE 0 END) as acted_on
        FROM jobs
        WHERE date_added >= datetime('now', '-56 days')
        GROUP BY week
        ORDER BY week
    """):
        weekly.append(dict(row))

    # Conversion funnel
    total = conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]
    applied = conn.execute("SELECT COUNT(*) FROM jobs WHERE status IN ('applied', 'interviewing', 'offer', 'rejected')").fetchone()[0]
    interviewing = conn.execute("SELECT COUNT(*) FROM jobs WHERE status IN ('interviewing', 'offer')").fetchone()[0]
    offers = conn.execute("SELECT COUNT(*) FROM jobs WHERE status = 'offer'").fetchone()[0]

    funnel = {
        "saved": total,
        "applied": applied,
        "interviewing": interviewing,
        "offers": offers,
        "conversion_rate": round((applied / total * 100), 1) if total > 0 else 0,
        "interview_rate": round((interviewing / applied * 100), 1) if applied > 0 else 0,
        "offer_rate": round((offers / interviewing * 100), 1) if interviewing > 0 else 0,
    }

    # Stale jobs (saved for 7+ days, not acted on)
    stale = []
    for row in conn.execute("""
        SELECT j.id, j.title, c.name as company_name, j.date_added,
               CAST(julianday('now') - julianday(j.date_added) AS INTEGER) as days_stale
        FROM jobs j
        JOIN companies c ON c.id = j.company_id
        WHERE j.status = 'saved'
        AND julianday('now') - julianday(j.date_added) >= 7
        ORDER BY j.date_added ASC
        LIMIT 10
    """):
        stale.append(dict(row))

    conn.close()

    return {
        "pipeline": pipeline,
        "by_company": by_company,
        "by_role": by_role,
        "weekly": weekly,
        "funnel": funnel,
        "stale_jobs": stale,
        "total_companies": len(by_company),
        "total_jobs": total,
    }
