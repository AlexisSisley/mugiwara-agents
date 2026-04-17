"""Scan filesystem and upsert projects into the DB cache.

Heavy operation: walks ~/Documents/Projet + EXTRA_PROJECT_DIRS, runs git
subprocesses for each project, scans docs. Run from the management command
or via the rescan endpoint. The web request path should NOT call this.
"""
import time
from dataclasses import asdict

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count, Max

from core.category_detector import detect_category
from core.models import Invocation
from projects.models import Project
from projects.scanner import scan_projects


class Command(BaseCommand):
    help = "Scan filesystem for projects and refresh the DB cache."

    def handle(self, *args, **options):
        start = time.perf_counter()

        infos = scan_projects()

        # One query for invocation stats keyed by project name.
        stats = {
            row['project']: row
            for row in Invocation.objects.exclude(project='')
            .values('project')
            .annotate(count=Count('id'), last_used=Max('timestamp'))
        }

        scanned_names = set()
        with transaction.atomic():
            for info in infos:
                db_stats = stats.get(info.name, {})
                category = detect_category(project=info.name, cwd=info.path)
                # DocFile dataclass -> dict for JSONField storage.
                doc_files_serialized = [asdict(d) for d in (info.doc_files or [])]

                Project.objects.update_or_create(
                    name=info.name,
                    defaults={
                        'path': info.path,
                        'stack': info.stack or '',
                        'category': category,
                        'branch': info.branch or '',
                        'last_commit': info.last_commit or '',
                        'last_commit_date': info.last_commit_date or '',
                        'is_dirty': info.is_dirty,
                        'has_git': info.has_git,
                        'has_remote': info.has_remote,
                        'has_mugiwara': info.has_mugiwara,
                        'commits_ahead': info.commits_ahead,
                        'commits_behind': info.commits_behind,
                        'invocations': db_stats.get('count', 0),
                        'last_used': db_stats.get('last_used'),
                        'claude_session_count': info.claude_session_count,
                        'docs': list(info.docs or []),
                        'doc_files': doc_files_serialized,
                    },
                )
                scanned_names.add(info.name)

            # Drop projects that disappeared from disk.
            stale = Project.objects.exclude(name__in=scanned_names)
            stale_count = stale.count()
            stale.delete()

        elapsed = time.perf_counter() - start
        self.stdout.write(self.style.SUCCESS(
            f"Scanned {len(infos)} projects in {elapsed:.2f}s "
            f"(removed {stale_count} stale)."
        ))
