# Inventory & Order Management System

[![Docker Hub](https://img.shields.io/badge/Docker-Hub-blue?logo=docker)](https://hub.docker.com/r/sonu2026/inventory-backend)

A full-stack application for managing inventory and customer orders.

## Tech Stack

- **Backend:** FastAPI (Python 3.12), PostgreSQL, SQLAlchemy
- **Frontend:** React 19, Vite, TypeScript, React Router
- **Infrastructure:** Docker, Docker Compose

## Local Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate     # Windows
source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Docker

```bash
# Pull the backend image from Docker Hub
docker pull sonu2026/inventory-backend:latest

# Build and start all services
docker compose up --build

# Run in detached mode
docker compose up -d --build

# Stop all services
docker compose down

# Remove volumes (resets DB data)
docker compose down -v
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
