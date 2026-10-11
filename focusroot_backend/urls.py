from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from django.views.static import serve

from focusroot_app import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/csrf/", views.csrf_token, name="csrf-token"),
    path("api/", include("focusroot_app.urls")),
    path("", views.frontend, name="frontend"),
]

# These exact asset routes keep the current flat frontend files usable with
# `runserver`. For deployment, move them into staticfiles storage and collect them.
if settings.DEBUG:
    for asset_name in ("style.css", "script.js", "logo.png"):
        urlpatterns.append(
            path(
                asset_name,
                serve,
                {"path": asset_name, "document_root": settings.BASE_DIR},
                name=f"frontend-{asset_name.replace('.', '-')}",
            )
        )
