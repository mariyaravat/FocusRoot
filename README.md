# FocusRoot
FocusRoot is a student productivity website that makes studying more fun and less boring. It helps students manage tasks, stay focused with a timer, and track progress through XP and levels. With every focus session, they can grow their own virtual garden and build better study habits, one task at a time.

## Features

- Add, edit, delete and manage daily tasks
- Focus timer to improve productivity
- Virtual garden that grows with focus sessions and gives dead plant if session forfieted
- XP points and level progression
- Weekly productivity tracking with graphs
- Editable user profile
- Login and signup interface
- Django session authentication and SQLite-backed account data

## Tech Stack

- HTML
- CSS
- JavaScript
- Django
- SQLite
- Browser localStorage for the optional legacy import

## Run FocusRoot locally

The backend uses Django's built-in authentication and SQLite. On Windows, double-click `run_focusroot.bat`. It creates a virtual environment if needed, installs dependencies, applies database migrations, starts Django, and opens the app in your browser. Keep the server terminal open while using FocusRoot.

To set it up manually from PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver
```

Then open `http://127.0.0.1:8000/`. Django serves the existing `index.html` and API from one origin, so session cookies and CSRF protection work without a separate CORS setup. Opening `index.html` directly from File Explorer cannot start the Django backend; use the launcher to open the working app.

### API routes

- `GET /api/csrf/` — obtain a CSRF token
- `POST /api/auth/signup/`, `POST /api/auth/login/`, `POST /api/auth/logout/`
- `GET/PATCH /api/profile/`
- `GET/POST /api/tasks/`, `PATCH/DELETE /api/tasks/<id>/`
- `GET/POST /api/sessions/`
- `GET /api/summary/`
- `POST /api/import/local/` — one-time import of tasks and focus sessions from this browser

Tasks and focus sessions are scoped to the signed-in user. Completed tasks award 10 XP and completed focus sessions award XP equal to their duration. Forfeited sessions do not award XP.

The frontend uses Django for accounts, profile changes, tasks, and focus sessions. On login, it offers a one-time import of existing browser tasks and sessions; accepting or declining leaves the original `localStorage` data untouched. Local browser passwords are never imported. The current settings are for local development. Set a private `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=false`, and production `DJANGO_ALLOWED_HOSTS` before deployment.
