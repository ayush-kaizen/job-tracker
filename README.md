# JobTracker — Personal Job Opportunity Tracker

A clean, minimal web app to track job opportunities across multiple companies in one place. Built for MBA students and job seekers who are tired of checking 50 different career pages.

## What It Does

- **Add companies** with links to their career pages
- **Log job opportunities** with title, location, role type, salary, and direct link
- **Filter & search** by company, role type, location, or keyword
- **Notion-style table** UI — clean, fast, and scannable

## Tech Stack

| Layer    | Tech                     |
|----------|--------------------------|
| Backend  | Python, FastAPI, SQLite  |
| Frontend | React 18, Vite, Tailwind |
| Deploy   | Railway (API) + Vercel (UI) |

---

## Local Development

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Start the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be live at `http://localhost:8000`. You can explore the auto-generated docs at `http://localhost:8000/docs`.

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be live at `http://localhost:3000`. Vite automatically proxies `/api` requests to the backend at port 8000.

---

## Deployment

### Backend → Railway

1. Create a free account at [railway.app](https://railway.app)
2. Click **"New Project" → "Deploy from GitHub Repo"**
3. Connect your GitHub repo and select the `backend` directory as root
4. Railway auto-detects Python and deploys. The `railway.toml` and `Procfile` are already configured.
5. Once deployed, copy your backend URL (e.g., `https://job-tracker-api.up.railway.app`)

**Important:** SQLite works fine on Railway for personal use. For heavier usage, you can switch to Railway's PostgreSQL add-on later.

### Frontend → Vercel

1. Create a free account at [vercel.com](https://vercel.com)
2. Click **"New Project" → import your GitHub repo**
3. Set the **Root Directory** to `frontend`
4. Add an environment variable:
   - Key: `VITE_API_URL`
   - Value: your Railway backend URL (e.g., `https://job-tracker-api.up.railway.app`)
5. Deploy. Vercel handles the build automatically.

The `vercel.json` file rewrites `/api/*` requests to your Railway backend so everything works seamlessly.

---

## API Reference

All endpoints are prefixed with `/api`.

### Companies

| Method | Endpoint              | Description          |
|--------|-----------------------|----------------------|
| GET    | `/api/companies`      | List all companies   |
| POST   | `/api/companies`      | Add a company        |
| DELETE | `/api/companies/:id`  | Delete a company     |

### Jobs

| Method | Endpoint         | Description                     |
|--------|------------------|---------------------------------|
| GET    | `/api/jobs`      | List jobs (supports query filters) |
| POST   | `/api/jobs`      | Add a job                       |
| PUT    | `/api/jobs/:id`  | Update a job                    |
| DELETE | `/api/jobs/:id`  | Delete a job                    |

**Query filters for GET /api/jobs:**
- `company_id` — filter by company
- `role_type` — filter by type (full-time, internship, contract, part-time, other)
- `location` — partial match on location
- `search` — search in job title or company name

### Stats

| Method | Endpoint      | Description               |
|--------|---------------|---------------------------|
| GET    | `/api/stats`  | Dashboard statistics      |

---

## Project Structure

```
job-tracker/
├── backend/
│   ├── main.py              # FastAPI app (all routes + DB)
│   ├── requirements.txt     # Python dependencies
│   ├── railway.toml         # Railway deploy config
│   └── Procfile             # Process command
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main dashboard component
│   │   ├── api.js           # API client helper
│   │   ├── main.jsx         # React entry point
│   │   └── index.css        # Tailwind styles
│   ├── index.html           # HTML entry
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── vercel.json          # Vercel deploy config
│   └── .env.example
├── .gitignore
└── README.md
```

---

## Future Ideas

- Application status tracking (saved → applied → interviewing → offer/rejected)
- Notes/comments per job
- CSV export for tracking in spreadsheets
- Browser extension to add jobs with one click from career pages
- Email notifications for new listings (if auto-scraping is added later)
