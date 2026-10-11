from django.urls import path

from . import views

urlpatterns = [
    path("auth/signup/", views.signup, name="api-signup"),
    path("auth/login/", views.login_view, name="api-login"),
    path("auth/logout/", views.logout_view, name="api-logout"),
    path("profile/", views.profile, name="api-profile"),
    path("tasks/", views.tasks, name="api-tasks"),
    path("tasks/<int:task_id>/", views.task_detail, name="api-task-detail"),
    path("sessions/", views.focus_sessions, name="api-focus-sessions"),
    path("summary/", views.summary, name="api-summary"),
    path("import/local/", views.import_browser_data, name="api-import-local"),
]
