"""
Django management command: ingest hook data from stdin.
Usage: python manage.py ingest_hook invocation|session
"""
import json
import sys

from django.core.management.base import BaseCommand

from core.hook_writer import ingest_invocation, ingest_session


class Command(BaseCommand):
    help = 'Ingest hook data (invocation or session) from stdin JSON'

    def add_arguments(self, parser):
        parser.add_argument(
            'record_type',
            choices=['invocation', 'session'],
            help='Type of record to ingest',
        )

    def handle(self, *args, **options):
        record_type = options['record_type']

        raw = sys.stdin.read()
        if not raw.strip():
            self.stderr.write('No input on stdin\n')
            return

        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            self.stderr.write(f'Invalid JSON: {e}\n')
            return

        if record_type == 'invocation':
            ingest_invocation(data)
            self.stdout.write(self.style.SUCCESS('Invocation ingested'))
        elif record_type == 'session':
            ingest_session(data)
            self.stdout.write(self.style.SUCCESS('Session ingested'))
