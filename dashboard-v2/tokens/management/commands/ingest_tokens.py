"""
Management command to ingest token usage data from Claude Code sessions.

Usage:
    python manage.py ingest_tokens          # Full scan
    python manage.py ingest_tokens --recent  # Last 7 days only
"""
from django.core.management.base import BaseCommand

from tokens.models import TokenUsage
from tokens.parser import scan_all_sessions


class Command(BaseCommand):
    help = 'Ingest token usage data from Claude Code JSONL sessions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--recent',
            action='store_true',
            help='Only scan files modified in the last 7 days',
        )

    def handle(self, *args, **options):
        recent_days = 7 if options['recent'] else None

        self.stdout.write(
            f'Scanning Claude sessions'
            f'{" (last 7 days)" if recent_days else " (all)"}...'
        )

        records = scan_all_sessions(recent_days=recent_days)
        self.stdout.write(f'Found {len(records)} token records')

        if not records:
            self.stdout.write(self.style.WARNING('No records to ingest'))
            return

        # Build model instances
        instances = [TokenUsage(**r) for r in records]

        # Bulk create with idempotency (ignore duplicates on message_id)
        created = TokenUsage.objects.bulk_create(
            instances,
            batch_size=500,
            ignore_conflicts=True,
        )

        self.stdout.write(self.style.SUCCESS(
            f'Ingested {len(created)} new records '
            f'({len(records) - len(created)} duplicates skipped)'
        ))
