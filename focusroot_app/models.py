from django.conf import settings
from django.db import models


class Task(models.Model):
    class Priority(models.TextChoices):
        LOW = "Low", "Low"
        MEDIUM = "Medium", "Medium"
        HIGH = "High", "High"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="focusroot_tasks",
    )
    name = models.CharField(max_length=200)
    subject = models.CharField(max_length=120, blank=True, default="General")
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    date = models.DateField()
    done = models.BooleanField(default=False)
    completed_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("date", "created_at")
        indexes = [models.Index(fields=("owner", "date", "done"))]

    def __str__(self):
        return f"{self.name} ({self.owner})"


class FocusSession(models.Model):
    class Status(models.TextChoices):
        COMPLETED = "completed", "Completed"
        FORFEITED = "forfeited", "Forfeited"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="focusroot_sessions",
    )
    task = models.ForeignKey(
        Task,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="focus_sessions",
    )
    duration = models.PositiveSmallIntegerField()
    status = models.CharField(max_length=12, choices=Status.choices)
    plant = models.CharField(max_length=8)
    date = models.DateField()
    week_start = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("owner", "status", "date"))]

    def __str__(self):
        return f"{self.duration} minute {self.status} session ({self.owner})"


class BrowserDataImport(models.Model):
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="focusroot_browser_import",
    )
    imported_at = models.DateTimeField(auto_now_add=True)
    task_count = models.PositiveIntegerField(default=0)
    session_count = models.PositiveIntegerField(default=0)
