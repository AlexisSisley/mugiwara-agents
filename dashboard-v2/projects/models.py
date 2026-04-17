"""DB-backed cache for filesystem-scanned projects.

The Project model mirrors `scanner.ProjectInfo` so views can query the index
instantly via the ORM instead of re-running `scan_projects()` (filesystem walk
+ git subprocesses) on every request.
"""
from django.db import models


class Project(models.Model):
    name = models.CharField(max_length=200, unique=True, db_index=True)
    path = models.CharField(max_length=500)
    stack = models.CharField(max_length=50, db_index=True, blank=True)
    category = models.CharField(max_length=20, db_index=True, default='pro')

    branch = models.CharField(max_length=100, blank=True)
    last_commit = models.TextField(blank=True)
    last_commit_date = models.CharField(max_length=40, blank=True)
    is_dirty = models.BooleanField(default=False, db_index=True)
    has_git = models.BooleanField(default=False, db_index=True)
    has_remote = models.BooleanField(default=False)
    has_mugiwara = models.BooleanField(default=False, db_index=True)
    commits_ahead = models.IntegerField(default=0)
    commits_behind = models.IntegerField(default=0)

    invocations = models.IntegerField(default=0)
    last_used = models.DateTimeField(null=True, blank=True)
    claude_session_count = models.IntegerField(default=0)

    docs = models.JSONField(default=list)         # list[str]
    doc_files = models.JSONField(default=list)    # list[dict] - serialized DocFile

    scanned_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects'
        ordering = ['-invocations', 'name']
        indexes = [
            models.Index(fields=['category', 'stack']),
            models.Index(fields=['has_git', 'is_dirty']),
        ]

    def __str__(self) -> str:
        return self.name
