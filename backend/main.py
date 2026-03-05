"""
Job Opportunity Tracker — FastAPI Backend
PostgreSQL-backed API for tracking job opportunities across multiple companies.
With application pipeline, contacts CRM, and analytics.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import psycopg2
import psycopg2.extras
import os

# ── Database Setup ───────────────────────────────────────────────────────────

DATABASE_URL = os.environ.get("DATABASE_URL", "")


def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    return conn


def dict_rows(cursor):
    """Convert cursor results to list of dicts."""
    columns = [desc[0] for desc in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def dict_row(cursor):
    """Convert single cursor result to dict."""
    columns = [desc[0] for desc in cursor.description]
    row = cursor.fetchone()
    if row is None:
        return None
    return dict(zip(columns, row))


def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS companies (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            career_page_url TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            location TEXT,
            role_type TEXT CHECK(role_type IN ('full-time', 'internship', 'contract', 'part-time', 'other')),
            salary_range TEXT,
            job_url TEXT,
            date_posted DATE,
            date_added TIMESTAMP DEFAULT NOW(),
            status TEXT NOT NULL DEFAULT 'saved' CHECK(status IN ('saved', 'applied', 'interviewing', 'offer', 'rejected')),
            status_updated_at TIMESTAMP DEFAULT NOW(),
            applied_date TIMESTAMP,
            notes TEXT
        );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_jobs_role_type ON jobs(role_type);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS contacts (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            title TEXT,
            linkedin_url TEXT,
            email TEXT,
            phone TEXT,
            notes TEXT,
            last_contacted TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);")

    # Migrations: add new columns if they don't exist
    for migration in [
        "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS notes TEXT",
        "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes TEXT",
        "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_contacted TIMESTAMP",
    ]:
        try:
            cur.execute(migration)
        except Exception:
            conn.rollback()

    conn.commit()
    cur.close()
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
    notes: Optional[str] = None


class JobUpdate(BaseModel):
    title: Optional[str] = None
    location: Optional[str] = None
    role_type: Optional[str] = None
    salary_range: Optional[str] = None
    job_url: Optional[str] = None
    date_posted: Optional[str] = None
    company_id: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


class ContactCreate(BaseModel):
    company_id: int
    name: str = Field(..., min_length=1, max_length=200)
    title: Optional[str] = None
    linkedin_url: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    last_contacted: Optional[str] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    linkedin_url: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company_id: Optional[int] = None
    notes: Optional[str] = None
    last_contacted: Optional[str] = None


class ContactOut(BaseModel):
    id: int
    company_id: int
    company_name: str
    name: str
    title: Optional[str]
    linkedin_url: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    notes: Optional[str]
    last_contacted: Optional[str]
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
    notes: Optional[str]


# ── Helper to stringify timestamps ───────────────────────────────────────────

def stringify_row(row_dict):
    """Convert datetime/date objects to strings for JSON serialization."""
    if row_dict is None:
        return None
    result = {}
    for k, v in row_dict.items():
        if isinstance(v, datetime):
            result[k] = v.isoformat()
        elif hasattr(v, 'isoformat'):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result


def stringify_rows(rows):
    return [stringify_row(r) for r in rows]


# ── FastAPI App ──────────────────────────────────────────────────────────────

app = FastAPI(title="Job Opportunity Tracker", version="3.0.0")

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
    cur = conn.cursor()
    cur.execute("""
        SELECT c.*, COUNT(j.id) as job_count
        FROM companies c
        LEFT JOIN jobs j ON j.company_id = c.id
        GROUP BY c.id
        ORDER BY c.name
    """)
    rows = stringify_rows(dict_rows(cur))
    cur.close()
    conn.close()
    return rows


@app.post("/api/companies", response_model=CompanyOut, status_code=201)
def create_company(company: CompanyCreate):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO companies (name, career_page_url) VALUES (%s, %s) RETURNING id",
            (company.name.strip(), company.career_page_url),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.execute("SELECT *, 0 as job_count FROM companies WHERE id = %s", (new_id,))
        row = stringify_row(dict_row(cur))
        return row
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail="Company already exists")
    finally:
        cur.close()
        conn.close()


@app.delete("/api/companies/{company_id}", status_code=204)
def delete_company(company_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM companies WHERE id = %s", (company_id,))
    deleted = cur.rowcount
    conn.commit()
    cur.close()
    conn.close()
    if deleted == 0:
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
    cur = conn.cursor()
    query = """
        SELECT j.*, c.name as company_name
        FROM jobs j
        JOIN companies c ON c.id = j.company_id
        WHERE 1=1
    """
    params = []

    if company_id:
        query += " AND j.company_id = %s"
        params.append(company_id)
    if role_type:
        query += " AND j.role_type = %s"
        params.append(role_type)
    if location:
        query += " AND LOWER(j.location) LIKE LOWER(%s)"
        params.append(f"%{location}%")
    if search:
        query += " AND (LOWER(j.title) LIKE LOWER(%s) OR LOWER(c.name) LIKE LOWER(%s))"
        params.extend([f"%{search}%", f"%{search}%"])
    if status:
        query += " AND j.status = %s"
        params.append(status)

    query += " ORDER BY j.date_added DESC"

    cur.execute(query, params)
    rows = stringify_rows(dict_rows(cur))
    cur.close()
    conn.close()
    return rows


@app.post("/api/jobs", response_model=JobOut, status_code=201)
def create_job(job: JobCreate):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM companies WHERE id = %s", (job.company_id,))
    if cur.fetchone() is None:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Company not found")

    status = job.status if job.status in VALID_STATUSES else "saved"
    now = datetime.utcnow()
    applied_date = now if status == "applied" else None

    cur.execute(
        """INSERT INTO jobs (company_id, title, location, role_type, salary_range, job_url, date_posted, status, status_updated_at, applied_date, notes)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
        (job.company_id, job.title.strip(), job.location, job.role_type,
         job.salary_range, job.job_url, job.date_posted, status, now, applied_date, job.notes),
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.execute(
        """SELECT j.*, c.name as company_name FROM jobs j
           JOIN companies c ON c.id = j.company_id WHERE j.id = %s""",
        (new_id,),
    )
    row = stringify_row(dict_row(cur))
    cur.close()
    conn.close()
    return row


@app.patch("/api/jobs/{job_id}/status", response_model=JobOut)
def update_job_status(job_id: int, body: StatusUpdate):
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM jobs WHERE id = %s", (job_id,))
    existing = dict_row(cur)
    if not existing:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Job not found")

    now = datetime.utcnow()
    applied_date = now if body.status == "applied" and not existing["applied_date"] else existing["applied_date"]

    cur.execute(
        "UPDATE jobs SET status = %s, status_updated_at = %s, applied_date = %s WHERE id = %s",
        (body.status, now, applied_date, job_id),
    )
    conn.commit()
    cur.execute(
        """SELECT j.*, c.name as company_name FROM jobs j
           JOIN companies c ON c.id = j.company_id WHERE j.id = %s""",
        (job_id,),
    )
    row = stringify_row(dict_row(cur))
    cur.close()
    conn.close()
    return row


@app.put("/api/jobs/{job_id}", response_model=JobOut)
def update_job(job_id: int, job: JobUpdate):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM jobs WHERE id = %s", (job_id,))
    existing = dict_row(cur)
    if not existing:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Job not found")

    updates = {k: v for k, v in job.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    if "status" in updates:
        updates["status_updated_at"] = datetime.utcnow()
        if updates["status"] == "applied" and not existing["applied_date"]:
            updates["applied_date"] = datetime.utcnow()

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [job_id]

    cur.execute(f"UPDATE jobs SET {set_clause} WHERE id = %s", values)
    conn.commit()

    cur.execute(
        """SELECT j.*, c.name as company_name FROM jobs j
           JOIN companies c ON c.id = j.company_id WHERE j.id = %s""",
        (job_id,),
    )
    row = stringify_row(dict_row(cur))
    cur.close()
    conn.close()
    return row


@app.delete("/api/jobs/{job_id}", status_code=204)
def delete_job(job_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM jobs WHERE id = %s", (job_id,))
    deleted = cur.rowcount
    conn.commit()
    cur.close()
    conn.close()
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Job not found")


# ── Contact Endpoints ────────────────────────────────────────────────────────

@app.get("/api/contacts", response_model=list[ContactOut])
def list_contacts(
    company_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
):
    conn = get_db()
    cur = conn.cursor()
    query = """
        SELECT ct.*, c.name as company_name
        FROM contacts ct
        JOIN companies c ON c.id = ct.company_id
        WHERE 1=1
    """
    params = []

    if company_id:
        query += " AND ct.company_id = %s"
        params.append(company_id)
    if search:
        query += " AND (LOWER(ct.name) LIKE LOWER(%s) OR LOWER(ct.title) LIKE LOWER(%s) OR LOWER(c.name) LIKE LOWER(%s))"
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

    query += " ORDER BY ct.created_at DESC"

    cur.execute(query, params)
    rows = stringify_rows(dict_rows(cur))
    cur.close()
    conn.close()
    return rows


@app.post("/api/contacts", response_model=ContactOut, status_code=201)
def create_contact(contact: ContactCreate):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM companies WHERE id = %s", (contact.company_id,))
    if cur.fetchone() is None:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Company not found")

    cur.execute(
        """INSERT INTO contacts (company_id, name, title, linkedin_url, email, phone, notes, last_contacted)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
        (contact.company_id, contact.name.strip(), contact.title,
         contact.linkedin_url, contact.email, contact.phone, contact.notes, contact.last_contacted),
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.execute(
        """SELECT ct.*, c.name as company_name FROM contacts ct
           JOIN companies c ON c.id = ct.company_id WHERE ct.id = %s""",
        (new_id,),
    )
    row = stringify_row(dict_row(cur))
    cur.close()
    conn.close()
    return row


@app.put("/api/contacts/{contact_id}", response_model=ContactOut)
def update_contact(contact_id: int, contact: ContactUpdate):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM contacts WHERE id = %s", (contact_id,))
    existing = dict_row(cur)
    if not existing:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Contact not found")

    updates = {k: v for k, v in contact.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [contact_id]

    cur.execute(f"UPDATE contacts SET {set_clause} WHERE id = %s", values)
    conn.commit()

    cur.execute(
        """SELECT ct.*, c.name as company_name FROM contacts ct
           JOIN companies c ON c.id = ct.company_id WHERE ct.id = %s""",
        (contact_id,),
    )
    row = stringify_row(dict_row(cur))
    cur.close()
    conn.close()
    return row


@app.delete("/api/contacts/{contact_id}", status_code=204)
def delete_contact(contact_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM contacts WHERE id = %s", (contact_id,))
    deleted = cur.rowcount
    conn.commit()
    cur.close()
    conn.close()
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Contact not found")


# ── Analytics Endpoint ───────────────────────────────────────────────────────

@app.get("/api/analytics")
def get_analytics():
    conn = get_db()
    cur = conn.cursor()

    # Pipeline counts
    pipeline = {}
    cur.execute("SELECT status, COUNT(*) as cnt FROM jobs GROUP BY status")
    for row in cur.fetchall():
        pipeline[row[0]] = row[1]

    # By company
    by_company = []
    cur.execute("""
        SELECT c.name, c.id,
               COUNT(j.id) as total,
               SUM(CASE WHEN j.status = 'applied' THEN 1 ELSE 0 END) as applied,
               SUM(CASE WHEN j.status = 'interviewing' THEN 1 ELSE 0 END) as interviewing,
               SUM(CASE WHEN j.status = 'offer' THEN 1 ELSE 0 END) as offers,
               SUM(CASE WHEN j.status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM companies c
        LEFT JOIN jobs j ON j.company_id = c.id
        GROUP BY c.id, c.name
        HAVING COUNT(j.id) > 0
        ORDER BY COUNT(j.id) DESC
    """)
    for row in dict_rows(cur):
        by_company.append(row)

    # By role type
    by_role = []
    cur.execute("""
        SELECT role_type, COUNT(*) as total,
               SUM(CASE WHEN status IN ('applied', 'interviewing', 'offer') THEN 1 ELSE 0 END) as active
        FROM jobs GROUP BY role_type ORDER BY COUNT(*) DESC
    """)
    for row in dict_rows(cur):
        by_role.append(row)

    # Weekly activity (jobs added per week, last 8 weeks)
    weekly = []
    cur.execute("""
        SELECT TO_CHAR(date_added, 'IYYY-"W"IW') as week,
               COUNT(*) as added,
               SUM(CASE WHEN status != 'saved' THEN 1 ELSE 0 END) as acted_on
        FROM jobs
        WHERE date_added >= NOW() - INTERVAL '56 days'
        GROUP BY week
        ORDER BY week
    """)
    for row in dict_rows(cur):
        weekly.append(row)

    # Conversion funnel
    cur.execute("SELECT COUNT(*) FROM jobs")
    total = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM jobs WHERE status IN ('applied', 'interviewing', 'offer', 'rejected')")
    applied = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM jobs WHERE status IN ('interviewing', 'offer')")
    interviewing = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM jobs WHERE status = 'offer'")
    offers = cur.fetchone()[0]

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
    cur.execute("""
        SELECT j.id, j.title, c.name as company_name, j.date_added,
               EXTRACT(DAY FROM NOW() - j.date_added)::INTEGER as days_stale
        FROM jobs j
        JOIN companies c ON c.id = j.company_id
        WHERE j.status = 'saved'
        AND j.date_added <= NOW() - INTERVAL '7 days'
        ORDER BY j.date_added ASC
        LIMIT 10
    """)
    for row in dict_rows(cur):
        row = stringify_row(row)
        stale.append(row)

    # Stale contacts (not contacted in 14+ days, or never contacted)
    stale_contacts = []
    cur.execute("""
        SELECT ct.id, ct.name, ct.title, c.name as company_name, ct.last_contacted,
               CASE
                   WHEN ct.last_contacted IS NULL THEN -1
                   ELSE EXTRACT(DAY FROM NOW() - ct.last_contacted)::INTEGER
               END as days_since_contact
        FROM contacts ct
        JOIN companies c ON c.id = ct.company_id
        WHERE ct.last_contacted IS NULL
           OR ct.last_contacted <= NOW() - INTERVAL '14 days'
        ORDER BY ct.last_contacted ASC NULLS FIRST
        LIMIT 10
    """)
    for row in dict_rows(cur):
        row = stringify_row(row)
        stale_contacts.append(row)

    cur.close()
    conn.close()

    return {
        "pipeline": pipeline,
        "by_company": by_company,
        "by_role": by_role,
        "weekly": weekly,
        "funnel": funnel,
        "stale_jobs": stale,
        "stale_contacts": stale_contacts,
        "total_companies": len(by_company),
        "total_jobs": total,
    }
