from django.contrib import admin

from .models import FocusSession, Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "date", "priority", "done")
    list_filter = ("done", "priority", "date")
    search_fields = ("name", "subject", "owner__username", "owner__email")


@admin.register(FocusSession)
class FocusSessionAdmin(admin.ModelAdmin):
    list_display = ("owner", "task", "duration", "status", "date")
    list_filter = ("status", "date")
    search_fields = ("owner__username", "owner__email", "task__name")
