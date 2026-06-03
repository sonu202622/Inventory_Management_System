# Inventory & Order Management System

A full-stack inventory and order management application with authentication, product management, customer management, and order tracking.

## Links

- **Frontend:** https://frontend-pi-seven-87.vercel.app
- **Backend API:** https://inventoryanagementsystem.onrender.com
- **API Docs:** https://inventoryanagementsystem.onrender.com/docs

## Tech Stack

- **Backend:** FastAPI (Python 3.11), SQLAlchemy, SQLite / PostgreSQL
- **Frontend:** React 19, Vite, JavaScript, React Router, Tailwind CSS, Axios
- **Infrastructure:** Docker, Docker Compose
- **Deployment:** Render (backend), Vercel (frontend)

## Features

- User authentication (register / login / JWT)
- Product CRUD with stock tracking
- Customer management
- Order creation with line items
- Dashboard with summary stats
- CORS support for cross-origin requests

## Local Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker & Docker Compose (optional)

### Using Docker (recommended)

```bash
# Clone and enter the project
cd inventory-system

# Create .env from example
cp .env.example .env

# Build and start all services
docker compose up --build

# Or run in background
docker compose up -d --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Without Docker

#### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate    # Windows
source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173 (Vite default).

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | SQLite (`data.db`) |
| `SECRET_KEY` | JWT signing secret | `your-super-secret-key-change-in-production` |
| `ACCESS_TOKEN_EXPIRE_HOURS` | JWT expiry in hours | `24` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `*` |
| `VITE_API_URL` | Backend URL for frontend | `http://localhost:8000` |

When `DATABASE_URL` is not set, the app falls back to SQLite (`data.db`) automatically.

## Deployment

### Backend (Render)

The backend auto-deploys from the `master` branch via Docker. Push to GitHub and Render builds from `backend/Dockerfile`.

### Frontend (Vercel)

The frontend deploys from the `frontend/` directory. Set `VITE_API_URL` to the Render backend URL in the Vercel project environment variables.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login (form data) |
| GET | `/auth/me` | Get current user |
| GET/POST | `/products/` | List / create products |
| GET/PUT/DELETE | `/products/{id}` | Single product CRUD |
| GET/POST | `/customers/` | List / create customers |
| GET/PUT/DELETE | `/customers/{id}` | Single customer CRUD |
| GET/POST | `/orders/` | List / create orders |
| GET | `/orders/{id}` | Get order details |
| GET | `/dashboard/` | Dashboard summary |

Full interactive docs at `/docs` when the backend is running.
