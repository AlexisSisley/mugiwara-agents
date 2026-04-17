"""Token usage tracking — one row per Claude assistant message with token data."""
from django.db import models


class TokenUsage(models.Model):
    """Tracks token consumption per assistant message from Claude Code sessions."""

    # Identity (idempotency key)
    message_id = models.CharField(max_length=100, unique=True)
    session_id = models.CharField(max_length=100, db_index=True)

    # Dimensions
    timestamp = models.DateTimeField(db_index=True)
    model = models.CharField(max_length=50)
    project = models.CharField(max_length=200, db_index=True)

    # Subagent tracking
    is_subagent = models.BooleanField(default=False, db_index=True)
    parent_session_id = models.CharField(
        max_length=100, blank=True, default='', db_index=True,
    )

    # Machine identification (prepares multi-PC)
    machine = models.CharField(max_length=100, blank=True, default='')

    # Token metrics
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    cache_creation_tokens = models.IntegerField(default=0)
    cache_read_tokens = models.IntegerField(default=0)

    # Computed cost (USD)
    cost = models.FloatField(default=0.0)

    class Meta:
        db_table = 'token_usage'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['project', 'timestamp'], name='idx_token_proj_ts'),
            models.Index(fields=['model', 'timestamp'], name='idx_token_model_ts'),
            models.Index(fields=['is_subagent'], name='idx_token_subagent'),
            models.Index(fields=['parent_session_id'], name='idx_token_parent_sess'),
        ]

    def __str__(self):
        return f'{self.model} @ {self.timestamp} — ${self.cost:.4f}'

    @property
    def total_tokens(self):
        return (self.input_tokens + self.output_tokens
                + self.cache_creation_tokens + self.cache_read_tokens)


class TokenLimit(models.Model):
    """Singleton configuration for token usage limits and personal alerts."""

    plan_name = models.CharField(max_length=50, default='Pro Team')
    limit_5h_tokens = models.BigIntegerField(default=0)
    limit_weekly_tokens = models.BigIntegerField(default=0)
    alert_5h_tokens = models.BigIntegerField(null=True, blank=True)
    alert_weekly_tokens = models.BigIntegerField(null=True, blank=True)
    alert_5h_cost = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
    )
    alert_weekly_cost = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'token_limit'
        verbose_name = 'Token Limit Configuration'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_instance(cls):
        """Return the singleton, creating it with defaults if needed."""
        from django.conf import settings
        defaults = getattr(settings, 'TOKEN_LIMITS_DEFAULTS', {})
        obj, _ = cls.objects.get_or_create(pk=1, defaults=defaults)
        return obj

    def __str__(self):
        return f'{self.plan_name} limits'
