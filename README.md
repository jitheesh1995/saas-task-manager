# Multi-Tenant SaaS Task Manager  
**Production-Oriented Backend Project**

A multi-tenant task management platform built with Django and Django REST Framework.  
Designed to demonstrate tenant isolation, role-based access control, and scalable backend architecture.

## Core Features

- Organization-based multi-tenancy  
- Role-Based Access Control (Owner, Admin, Member, Viewer)  
- JWT authentication  
- Tenant-aware projects and tasks APIs  
- Service-layer driven backend design  

## Tech Stack

**Backend:** Django, Django REST Framework  
**Auth:** SimpleJWT  
**Frontend:** Lightweight HTML/CSS/JS client  
**Database:** SQLite (dev) — PostgreSQL recommended for production  

## Local Development Setup

The backend API and frontend client run on separate ports.

git clone (https://github.com/jitheesh1995/saas-task-manager.git)

```bash(terminal):
cd saas-task-manager

python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

## Run Frontend Client

The project includes a lightweight frontend that consumes the backend API.

### Start the frontend server

```bash(terminal):

cd frontend
python -m http.server 5500

View the frontend

Open your browser: http://127.0.0.1:5500


