import json
from datetime import timedelta
from functools import wraps

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db.models import Sum
from django.http import Http404, JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from .models import BrowserDataImport, FocusSession, Task

User = get_user_model()


def _json_body(request):
    try:
        body = json.loads(request.body or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None, JsonResponse({"error": "Request body must be valid JSON."}, status=400)
    if not isinstance(body, dict):
        return None, JsonResponse({"error": "Request body must be a JSON object."}, status=400)
    return body, None


def _authenticated(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Please log in to continue."}, status=401)
        return view(request, *args, **kwargs)

    return wrapped


def _user_data(user):
    return {
        "id": user.pk,
        "name": user.first_name or user.username,
        "email": user.email,
    }


def _task_data(task):
    return {
        "id": task.pk,
        "name": task.name,
        "subject": task.subject,
        "priority": task.priority,
        "date": task.date.isoformat(),
        "done": task.done,
        "completedDate": task.completed_date.isoformat() if task.completed_date else None,
    }


def _session_data(session):
    return {
        "id": session.pk,
        "taskId": session.task_id,
        "duration": session.duration,
        "status": session.status,
        "plant": session.plant,
        "date": session.date.isoformat(),
        "week": session.week_start.isoformat(),
    }


def _parse_date(value):
    if not isinstance(value, str):
        return None
    try:
        return timezone.datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


@ensure_csrf_cookie
@require_GET
def csrf_token(request):
    return JsonResponse({"csrfToken": get_token(request)})


@ensure_csrf_cookie
@require_GET
def frontend(request):
    return render(request, "index.html")


@require_POST
def signup(request):
    body, error = _json_body(request)
    if error:
        return error

    name = str(body.get("name", "")).strip()
    email = str(body.get("email", "")).strip().lower()
    password = body.get("password", "")

    if not name or not email or not isinstance(password, str):
        return JsonResponse({"error": "Name, email, and password are required."}, status=400)
    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"error": "Enter a valid email address."}, status=400)
    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse({"error": "An account with this email already exists."}, status=409)

    user = User(username=email, email=email, first_name=name)
    try:
        validate_password(password, user=user)
    except ValidationError as exc:
        return JsonResponse({"error": " ".join(exc.messages)}, status=400)

    user.set_password(password)
    user.save()
    return JsonResponse({"user": _user_data(user)}, status=201)


@require_POST
def login_view(request):
    body, error = _json_body(request)
    if error:
        return error

    email = str(body.get("email", "")).strip().lower()
    password = body.get("password", "")
    if not email or not isinstance(password, str):
        return JsonResponse({"error": "Email and password are required."}, status=400)

    user = authenticate(request, username=email, password=password)
    if user is None:
        return JsonResponse({"error": "Email or password is incorrect."}, status=401)

    login(request, user)
    return JsonResponse({"user": _user_data(user), "csrfToken": get_token(request)})


@require_POST
@_authenticated
def logout_view(request):
    logout(request)
    return JsonResponse({"ok": True, "csrfToken": get_token(request)})


@require_http_methods(["GET", "PATCH"])
@_authenticated
def profile(request):
    if request.method == "GET":
        return JsonResponse(_user_data(request.user))

    body, error = _json_body(request)
    if error:
        return error
    name = str(body.get("name", "")).strip()
    email = str(body.get("email", "")).strip().lower()
    if not name or not email:
        return JsonResponse({"error": "Name and email are required."}, status=400)
    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"error": "Enter a valid email address."}, status=400)
    if User.objects.filter(email__iexact=email).exclude(pk=request.user.pk).exists():
        return JsonResponse({"error": "An account with this email already exists."}, status=409)

    request.user.first_name = name
    request.user.email = email
    request.user.username = email
    request.user.save(update_fields=["first_name", "email", "username"])
    return JsonResponse(_user_data(request.user))


@require_http_methods(["GET", "POST"])
@_authenticated
def tasks(request):
    if request.method == "GET":
        return JsonResponse({"tasks": [_task_data(task) for task in Task.objects.filter(owner=request.user)]})

    body, error = _json_body(request)
    if error:
        return error
    name = str(body.get("name", "")).strip()
    date = _parse_date(body.get("date"))
    priority = body.get("priority", Task.Priority.MEDIUM)
    subject = str(body.get("subject", "General")).strip() or "General"
    if not name or not date:
        return JsonResponse({"error": "Task name and a valid due date are required."}, status=400)
    if priority not in Task.Priority.values:
        return JsonResponse({"error": "Choose a valid task priority."}, status=400)

    task = Task.objects.create(
        owner=request.user,
        name=name,
        subject=subject,
        priority=priority,
        date=date,
    )
    return JsonResponse(_task_data(task), status=201)


@require_http_methods(["PATCH", "DELETE"])
@_authenticated
def task_detail(request, task_id):
    try:
        task = Task.objects.get(pk=task_id, owner=request.user)
    except Task.DoesNotExist as exc:
        raise Http404 from exc

    if request.method == "DELETE":
        task.delete()
        return JsonResponse({"ok": True})

    body, error = _json_body(request)
    if error:
        return error
    if "name" in body:
        name = str(body["name"]).strip()
        if not name:
            return JsonResponse({"error": "Task name cannot be blank."}, status=400)
        task.name = name
    if "subject" in body:
        task.subject = str(body["subject"]).strip() or "General"
    if "priority" in body:
        if body["priority"] not in Task.Priority.values:
            return JsonResponse({"error": "Choose a valid task priority."}, status=400)
        task.priority = body["priority"]
    if "date" in body:
        date = _parse_date(body["date"])
        if not date:
            return JsonResponse({"error": "Enter a valid due date."}, status=400)
        task.date = date
    if "done" in body:
        if not isinstance(body["done"], bool):
            return JsonResponse({"error": "Task completion must be true or false."}, status=400)
        task.done = body["done"]
        completed_date = _parse_date(body.get("completedDate")) if body["done"] else None
        task.completed_date = completed_date or (timezone.localdate() if task.done else None)
    elif "completedDate" in body:
        task.completed_date = _parse_date(body["completedDate"])
    task.save()
    return JsonResponse(_task_data(task))


@require_http_methods(["GET", "POST"])
@_authenticated
def focus_sessions(request):
    if request.method == "GET":
        sessions = FocusSession.objects.filter(owner=request.user).select_related("task")
        return JsonResponse({"sessions": [_session_data(session) for session in sessions]})

    body, error = _json_body(request)
    if error:
        return error
    try:
        duration = int(body.get("duration", 0))
        task_id = int(body.get("taskId", 0))
    except (TypeError, ValueError):
        return JsonResponse({"error": "A valid task and session duration are required."}, status=400)
    status = body.get("status")
    if duration < 1 or duration > 180:
        return JsonResponse({"error": "Session duration must be between 1 and 180 minutes."}, status=400)
    if status not in FocusSession.Status.values:
        return JsonResponse({"error": "Session status must be completed or forfeited."}, status=400)
    try:
        task = Task.objects.get(pk=task_id, owner=request.user)
    except Task.DoesNotExist:
        return JsonResponse({"error": "That task could not be found."}, status=404)

    today = timezone.localdate()
    week_start = today - timedelta(days=today.weekday())
    plant = "🥀" if status == FocusSession.Status.FORFEITED else "🌱"
    if status == FocusSession.Status.COMPLETED:
        if duration >= 60:
            plant = "🌳"
        elif duration >= 45:
            plant = "🌻"
        elif duration >= 25:
            plant = "🌿"

    session = FocusSession.objects.create(
        owner=request.user,
        task=task,
        duration=duration,
        status=status,
        plant=plant,
        date=today,
        week_start=week_start,
    )
    if status == FocusSession.Status.COMPLETED:
        task.done = True
        task.completed_date = today
        task.save(update_fields=["done", "completed_date", "updated_at"])

    return JsonResponse(
        {"session": _session_data(session), "task": _task_data(task)},
        status=201,
    )


@require_GET
@_authenticated
def summary(request):
    completed_tasks = Task.objects.filter(owner=request.user, done=True).count()
    focus_minutes = (
        FocusSession.objects.filter(owner=request.user, status=FocusSession.Status.COMPLETED)
        .aggregate(total=Sum("duration"))["total"]
        or 0
    )
    xp = completed_tasks * 10 + focus_minutes
    return JsonResponse(
        {
            "completedTasks": completed_tasks,
            "focusMinutes": focus_minutes,
            "xp": xp,
            "level": xp // 100 + 1,
            "xpToNextLevel": 100 - (xp % 100),
        }
    )


@require_POST
@_authenticated
def import_browser_data(request):
    body, error = _json_body(request)
    if error:
        return error
    if BrowserDataImport.objects.filter(owner=request.user).exists():
        return JsonResponse({"alreadyImported": True, "tasks": 0, "sessions": 0})
    source_tasks = body.get("tasks", [])
    source_sessions = body.get("sessions", [])
    if not isinstance(source_tasks, list) or not isinstance(source_sessions, list):
        return JsonResponse({"error": "Tasks and sessions must be lists."}, status=400)
    if len(source_tasks) > 1000 or len(source_sessions) > 5000:
        return JsonResponse({"error": "The browser data contains too many records."}, status=400)

    task_by_old_id = {}
    try:
        with transaction.atomic():
            for item in source_tasks:
                if not isinstance(item, dict):
                    raise ValueError("Invalid task record.")
                name = str(item.get("name", "")).strip()
                date = _parse_date(item.get("date"))
                priority = item.get("priority", Task.Priority.MEDIUM)
                completed_date = _parse_date(item.get("completedDate"))
                if not name or len(name) > 200 or not date or priority not in Task.Priority.values:
                    raise ValueError("A saved task has invalid details.")
                task = Task.objects.create(
                    owner=request.user,
                    name=name,
                    subject=str(item.get("subject", "General")).strip()[:120] or "General",
                    priority=priority,
                    date=date,
                    done=bool(item.get("done", False)),
                    completed_date=completed_date,
                )
                if task.done and not task.completed_date:
                    task.completed_date = date
                    task.save(update_fields=["completed_date"])
                task_by_old_id[str(item.get("id"))] = task

            session_count = 0
            for item in source_sessions:
                if not isinstance(item, dict):
                    raise ValueError("Invalid focus session record.")
                try:
                    duration = int(item.get("duration", 0))
                except (ValueError, TypeError):
                    raise ValueError("A saved focus session has an invalid duration.") from None
                status = item.get("status")
                date = _parse_date(item.get("date")) or timezone.localdate()
                week_start = date - timedelta(days=date.weekday())
                if not 1 <= duration <= 180 or status not in FocusSession.Status.values:
                    raise ValueError("A saved focus session has invalid details.")
                old_task_id = item.get("taskId")
                related_task = task_by_old_id.get(str(old_task_id))
                FocusSession.objects.create(
                    owner=request.user,
                    task=related_task,
                    duration=duration,
                    status=status,
                    plant=str(item.get("plant", "🌱"))[:8],
                    date=date,
                    week_start=week_start,
                )
                session_count += 1
            BrowserDataImport.objects.create(
                owner=request.user,
                task_count=len(task_by_old_id),
                session_count=session_count,
            )
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    return JsonResponse({"alreadyImported": False, "tasks": len(task_by_old_id), "sessions": session_count}, status=201)


def csrf_failure(request, reason=""):
    return JsonResponse({"error": "The security token expired. Refresh and try again."}, status=403)
