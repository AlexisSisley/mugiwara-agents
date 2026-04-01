"""
Generate realistic demo data for the Mugiwara Dashboard.

Usage:
    python manage.py seeddata          # Seed if DB is empty
    python manage.py seeddata --force  # Wipe and re-seed
"""
import random
import uuid
from datetime import date, datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Invocation, Session, Memory, DailyStats, WeeklyReport
from tokens.models import TokenUsage
from tokens.pricing import calculate_cost

# ── Constants ──────────────────────────────────────────────────

AGENTS = [
    ('Explore', 40), ('general-purpose', 20), ('Plan', 15),
    ('one_piece', 10), ('sanji-ts', 8), ('franky', 6),
    ('chopper', 5), ('nami', 5), ('robin', 4), ('zorro', 3),
    ('usopp', 3), ('brook', 2),
]

PROJECTS = [
    ('webapp-ecommerce', 'pro'),
    ('api-reservation', 'pro'),
    ('flutter-mobile', 'pro'),
    ('mugiwara-agents', 'perso'),
    ('formation-devops', 'poc'),
]

MODELS = [
    ('claude-opus-4-6', 0.15),
    ('claude-sonnet-4-5', 0.70),
    ('claude-haiku-3-5', 0.15),
]

PROMPTS = [
    "Refactor the authentication middleware to support JWT refresh tokens",
    "Fix the NullPointerException in the payment service when processing refunds",
    "Add pagination to the product listing API endpoint",
    "Configure a GitHub Actions CI/CD pipeline with Docker build and deploy",
    "Create unit tests for the OrderService class",
    "Optimize the SQL query for the dashboard analytics view",
    "Implement a WebSocket handler for real-time notifications",
    "Debug the CORS issue when calling the API from the mobile app",
    "Add Swagger/OpenAPI documentation to all REST endpoints",
    "Migrate the legacy cron jobs to a Celery task queue",
    "Set up Prometheus monitoring and Grafana dashboards",
    "Implement rate limiting on the public API endpoints",
    "Add i18n support for French and English locales",
    "Create a data migration script for the new user schema",
    "Build a file upload service with S3 integration",
    "Implement the search feature using Elasticsearch",
    "Add Redis caching for the product catalog endpoint",
    "Fix the memory leak in the WebSocket connection pool",
    "Create a rollback strategy for the database migration",
    "Design the architecture for the notification microservice",
]

SUBJECTS = [
    "Refactoring authentification JWT",
    "Debug service de paiement",
    "Pagination API produits",
    "Pipeline CI/CD GitHub Actions",
    "Tests unitaires OrderService",
    "Optimisation requetes SQL analytics",
    "WebSocket notifications temps reel",
    "Resolution probleme CORS mobile",
    "Documentation OpenAPI/Swagger",
    "Migration cron vers Celery",
    "Monitoring Prometheus/Grafana",
    "Rate limiting API publique",
    "Internationalisation FR/EN",
    "Migration schema utilisateurs",
    "Service upload fichiers S3",
]

CONFIANCE_LEVELS = ['haute', 'haute', 'haute', 'moyenne', 'moyenne', 'basse']
RESULTATS = ['succes', 'succes', 'succes', 'succes', 'en-cours', 'echec']


class Command(BaseCommand):
    help = 'Generate realistic demo data for the dashboard'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force', action='store_true',
            help='Wipe existing data before seeding',
        )

    def handle(self, *args, **options):
        rng = random.Random(42)  # Fixed seed for reproducibility

        # Check existing data
        has_data = (
            Invocation.objects.exists()
            or Session.objects.exists()
            or TokenUsage.objects.exists()
        )

        if has_data and not options['force']:
            self.stderr.write(self.style.WARNING(
                'Database already has data. Use --force to wipe and re-seed.'
            ))
            return

        if options['force']:
            self.stdout.write('Wiping existing data...')
            TokenUsage.objects.all().delete()
            Invocation.objects.all().delete()
            Session.objects.all().delete()
            Memory.objects.all().delete()
            DailyStats.objects.all().delete()
            WeeklyReport.objects.all().delete()

        # ── Generate 3 weeks of data ──────────────────────────

        today = date.today()
        # Start on Monday 3 weeks ago
        start_monday = today - timedelta(days=today.weekday() + 21)

        sessions_created = 0
        invocations_created = 0
        tokens_created = 0
        memories_created = 0

        all_sessions = []
        all_invocations = []
        all_token_usages = []
        all_memories = []

        for week_offset in range(3):
            week_monday = start_monday + timedelta(weeks=week_offset)

            # ~20 sessions per week
            num_sessions = rng.randint(16, 24)

            for _ in range(num_sessions):
                # Pick a random day in the week (Mon-Fri mostly, some weekends)
                day_offset = rng.choices(
                    range(7), weights=[20, 20, 20, 20, 20, 5, 5]
                )[0]
                sess_date = week_monday + timedelta(days=day_offset)
                hour = rng.randint(8, 19)
                minute = rng.randint(0, 59)
                sess_ts = timezone.make_aware(
                    datetime(sess_date.year, sess_date.month, sess_date.day,
                             hour, minute, rng.randint(0, 59))
                )

                project_name, project_cat = rng.choice(PROJECTS)
                session_id = f'sess-{uuid.uuid4().hex[:12]}'

                all_sessions.append(Session(
                    timestamp=sess_ts,
                    event='session_start',
                    session_id=session_id,
                    reason=rng.choice(PROMPTS)[:80],
                    project=project_name,
                    category=project_cat,
                ))

                # 2-5 invocations per session
                num_invocations = rng.randint(2, 5)
                agent_weights = [w for _, w in AGENTS]

                for inv_idx in range(num_invocations):
                    inv_ts = sess_ts + timedelta(minutes=rng.randint(1, 30) * (inv_idx + 1))
                    agent_name = rng.choices(
                        [a for a, _ in AGENTS], weights=agent_weights
                    )[0]
                    prompt = rng.choice(PROMPTS)

                    all_invocations.append(Invocation(
                        timestamp=inv_ts,
                        event='agent_invocation',
                        agent=agent_name,
                        tool='',
                        args_preview=prompt,
                        output_summary=f'Completed {agent_name} task successfully',
                        session_id=session_id,
                        is_pipeline=rng.random() < 0.1,
                        project=project_name,
                        category=project_cat,
                        exit_code=0 if rng.random() < 0.95 else 1,
                    ))

                # 4-10 token usage messages per session
                num_messages = rng.randint(4, 10)
                model_name = rng.choices(
                    [m for m, _ in MODELS],
                    weights=[w for _, w in MODELS],
                )[0]

                for msg_idx in range(num_messages):
                    msg_ts = sess_ts + timedelta(
                        seconds=rng.randint(30, 120) * (msg_idx + 1)
                    )
                    input_tok = rng.randint(500, 8000)
                    output_tok = rng.randint(200, 4000)
                    cache_creation = rng.randint(0, 2000) if rng.random() < 0.3 else 0
                    cache_read = rng.randint(500, 15000) if rng.random() < 0.6 else 0

                    cost = calculate_cost(
                        model_name, input_tok, output_tok,
                        cache_creation, cache_read,
                    )

                    all_token_usages.append(TokenUsage(
                        message_id=f'msg-{uuid.uuid4().hex[:16]}',
                        session_id=session_id,
                        timestamp=msg_ts,
                        model=model_name,
                        project=project_name,
                        input_tokens=input_tok,
                        output_tokens=output_tok,
                        cache_creation_tokens=cache_creation,
                        cache_read_tokens=cache_read,
                        cost=cost,
                    ))

            # ~10 memory entries per week
            num_memories = rng.randint(8, 12)
            for _ in range(num_memories):
                day_offset = rng.randint(0, 6)
                mem_date = week_monday + timedelta(days=day_offset)
                project_name, project_cat = rng.choice(PROJECTS)
                agent_name = rng.choices(
                    [a for a, _ in AGENTS], weights=[w for _, w in AGENTS]
                )[0]

                all_memories.append(Memory(
                    date=mem_date,
                    demande=rng.choice(PROMPTS),
                    route=agent_name,
                    route_agent=agent_name,
                    confiance=rng.choice(CONFIANCE_LEVELS),
                    sujet=rng.choice(SUBJECTS),
                    projet=project_name,
                    resultat=rng.choice(RESULTATS),
                    resultat_detail='Task completed within session context',
                    contexte='Demo seed data',
                    category=project_cat,
                ))

        # ── Bulk create ───────────────────────────────────────

        Session.objects.bulk_create(all_sessions, batch_size=500)
        sessions_created = len(all_sessions)

        Invocation.objects.bulk_create(
            all_invocations, batch_size=500, ignore_conflicts=True,
        )
        invocations_created = len(all_invocations)

        TokenUsage.objects.bulk_create(
            all_token_usages, batch_size=500, ignore_conflicts=True,
        )
        tokens_created = len(all_token_usages)

        Memory.objects.bulk_create(
            all_memories, batch_size=500, ignore_conflicts=True,
        )
        memories_created = len(all_memories)

        # ── DailyStats ────────────────────────────────────────

        daily_stats_created = 0
        for day_offset in range(21):
            d = start_monday + timedelta(days=day_offset)
            day_invocations = Invocation.objects.filter(
                timestamp__date=d
            )
            day_sessions = Session.objects.filter(timestamp__date=d)

            total_inv = day_invocations.count()
            total_sess = day_sessions.count()
            if total_inv == 0 and total_sess == 0:
                continue

            from django.db.models import Count
            top = (
                day_invocations.values('agent')
                .annotate(c=Count('id'))
                .order_by('-c')
                .first()
            )
            top_proj = (
                day_invocations.exclude(project='')
                .values('project')
                .annotate(c=Count('id'))
                .order_by('-c')
                .first()
            )

            DailyStats.objects.update_or_create(
                date=d,
                defaults={
                    'total_invocations': total_inv,
                    'total_sessions': total_sess,
                    'unique_agents': day_invocations.values('agent').distinct().count(),
                    'unique_projects': day_invocations.values('project').distinct().count(),
                    'top_agent': top['agent'] if top else '',
                    'top_project': top_proj['project'] if top_proj else '',
                },
            )
            daily_stats_created += 1

        # ── WeeklyReports ─────────────────────────────────────

        for week_offset in range(3):
            week_monday = start_monday + timedelta(weeks=week_offset)
            week_sunday = week_monday + timedelta(days=6)
            WeeklyReport.objects.update_or_create(
                week_start=week_monday,
                defaults={
                    'week_end': week_sunday,
                    'generated_at': timezone.now(),
                    'html_path': '',
                    'email_html_path': '',
                    'status': 'generated',
                },
            )

        # ── Summary ───────────────────────────────────────────

        self.stdout.write(self.style.SUCCESS(
            f'\nDemo data seeded successfully!\n'
            f'  Sessions:      {sessions_created}\n'
            f'  Invocations:   {invocations_created}\n'
            f'  Token messages: {tokens_created}\n'
            f'  Memory entries: {memories_created}\n'
            f'  Daily stats:   {daily_stats_created}\n'
            f'  Weekly reports: 3\n'
        ))
