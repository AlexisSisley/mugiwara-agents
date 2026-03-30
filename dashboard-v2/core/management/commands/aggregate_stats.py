"""
Django management command: aggregate daily stats.
Usage: python manage.py aggregate_stats [--date 2026-03-27]
"""
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db.models import Count

from core.models import Invocation, Session, DailyStats


class Command(BaseCommand):
    help = 'Aggregate daily stats for invocations and sessions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            default='',
            help='Specific date to aggregate (YYYY-MM-DD). Default: last 7 days.',
        )

    def handle(self, *args, **options):
        date_str = options['date']

        if date_str:
            try:
                dates = [date.fromisoformat(date_str)]
            except ValueError:
                self.stderr.write(f'Invalid date: {date_str}\n')
                return
        else:
            today = date.today()
            dates = [today - timedelta(days=i) for i in range(7)]

        for dt in dates:
            self._aggregate_date(dt)

        self.stdout.write(self.style.SUCCESS(
            f'Aggregated stats for {len(dates)} date(s)'
        ))

    def _aggregate_date(self, dt):
        inv_qs = Invocation.objects.filter(timestamp__date=dt)
        sess_qs = Session.objects.filter(timestamp__date=dt)

        total_inv = inv_qs.count()
        total_sess = sess_qs.count()
        unique_agents = inv_qs.values('agent').distinct().count()
        unique_projects = inv_qs.exclude(project='').values('project').distinct().count()

        top = inv_qs.values('agent').annotate(c=Count('id')).order_by('-c').first()
        top_agent = top['agent'] if top else ''

        top_proj = (
            inv_qs.exclude(project='')
            .values('project').annotate(c=Count('id'))
            .order_by('-c').first()
        )
        top_project = top_proj['project'] if top_proj else ''

        DailyStats.objects.update_or_create(
            date=dt,
            defaults={
                'total_invocations': total_inv,
                'total_sessions': total_sess,
                'unique_agents': unique_agents,
                'unique_projects': unique_projects,
                'top_agent': top_agent,
                'top_project': top_project,
            },
        )
