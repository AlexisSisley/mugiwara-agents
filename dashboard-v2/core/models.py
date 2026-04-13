"""
Mugiwara Dashboard v2 — Django ORM models.

Maps exactly to the existing SQLite schema in ~/.mugiwara/mugiwara.db.
Tables: invocations, sessions, memory, daily_stats, weekly_reports.
"""
from django.db import models


class Invocation(models.Model):
    """Agent/skill invocation record — mirrors agents.jsonl entries."""
    timestamp = models.DateTimeField(db_index=True)
    event = models.CharField(max_length=50, default='agent_invocation')
    agent = models.CharField(max_length=100, db_index=True)
    tool = models.CharField(max_length=100, blank=True, default='')
    args_preview = models.TextField(blank=True, default='')
    output_summary = models.TextField(blank=True, default='')
    session_id = models.CharField(max_length=100, db_index=True, blank=True, default='')
    is_pipeline = models.BooleanField(default=False)
    trigger_file = models.TextField(blank=True, default='')
    exit_code = models.IntegerField(null=True, blank=True)
    summary = models.TextField(blank=True, default='')
    reason = models.TextField(blank=True, default='')
    pipeline_detected = models.TextField(blank=True, default='')
    project = models.CharField(max_length=200, db_index=True, blank=True, default='')
    category = models.CharField(max_length=20, db_index=True, blank=True, default='pro')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'invocations'
        unique_together = [('timestamp', 'session_id', 'event', 'agent')]
        indexes = [
            models.Index(fields=['project'], name='idx_inv_project'),
            models.Index(fields=['category'], name='idx_inv_category'),
        ]
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.agent} @ {self.timestamp}'


class Session(models.Model):
    """Session lifecycle record — mirrors sessions.jsonl entries."""
    timestamp = models.DateTimeField(db_index=True)
    event = models.CharField(max_length=50, default='session_start')
    session_id = models.CharField(max_length=100, unique=True, db_index=True)
    reason = models.TextField(blank=True, default='')
    project = models.CharField(max_length=200, blank=True, default='')
    category = models.CharField(max_length=20, blank=True, default='pro')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sessions'
        ordering = ['-timestamp']

    def __str__(self):
        return f'Session {self.session_id[:12]}...'


class Memory(models.Model):
    """One Piece routing decision memory — contextual memory entries."""
    date = models.DateField(db_index=True)
    demande = models.TextField(blank=True, default='')
    route = models.CharField(max_length=100, blank=True, default='')
    route_agent = models.CharField(max_length=100, blank=True, default='')
    confiance = models.CharField(max_length=20, blank=True, default='moyenne')
    sujet = models.TextField(blank=True, default='')
    projet = models.CharField(max_length=200, blank=True, default='')
    resultat = models.CharField(max_length=50, blank=True, default='en-cours')
    resultat_detail = models.TextField(blank=True, default='')
    contexte = models.TextField(blank=True, default='')
    category = models.CharField(max_length=20, blank=True, default='pro')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'memory'
        indexes = [
            models.Index(fields=['date'], name='idx_mem_date'),
            models.Index(fields=['category'], name='idx_mem_category'),
        ]
        ordering = ['-date']

    def __str__(self):
        return f'{self.route_agent}: {self.demande[:50]}'


class DailyStats(models.Model):
    """Pre-aggregated daily statistics for sparklines and heatmaps."""
    date = models.DateField(primary_key=True)
    total_invocations = models.IntegerField(default=0)
    total_sessions = models.IntegerField(default=0)
    unique_agents = models.IntegerField(default=0)
    unique_projects = models.IntegerField(default=0)
    top_agent = models.CharField(max_length=100, blank=True, default='')
    top_project = models.CharField(max_length=200, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'daily_stats'
        ordering = ['-date']

    def __str__(self):
        return f'{self.date}: {self.total_invocations} invocations'


class WeeklyReport(models.Model):
    """Weekly report metadata — tracks generated report files."""
    week_start = models.DateField(unique=True)
    week_end = models.DateField()
    generated_at = models.DateTimeField(null=True, blank=True)
    html_path = models.CharField(max_length=500, blank=True, default='')
    email_html_path = models.CharField(max_length=500, blank=True, default='')
    draft_id = models.CharField(max_length=100, blank=True, default='')
    status = models.CharField(max_length=50, default='generated')

    class Meta:
        db_table = 'weekly_reports'
        ordering = ['-week_start']

    def __str__(self):
        return f'Report {self.week_start} ({self.status})'


class CustomReport(models.Model):
    """User-defined date-range report (coexists with WeeklyReport)."""
    start_date = models.DateField()
    end_date = models.DateField()
    label = models.CharField(max_length=120, blank=True, default='')
    preset = models.CharField(max_length=30, blank=True, default='')
    generated_at = models.DateTimeField(null=True, blank=True)
    html_path = models.CharField(max_length=500, blank=True, default='')
    email_html_path = models.CharField(max_length=500, blank=True, default='')
    status = models.CharField(max_length=50, default='generated')

    class Meta:
        db_table = 'custom_reports'
        ordering = ['-generated_at', '-start_date']
        indexes = [models.Index(fields=['start_date', 'end_date'])]

    def __str__(self):
        return f'CustomReport {self.start_date}..{self.end_date} ({self.status})'
