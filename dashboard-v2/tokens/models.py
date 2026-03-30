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
        ]

    def __str__(self):
        return f'{self.model} @ {self.timestamp} — ${self.cost:.4f}'

    @property
    def total_tokens(self):
        return (self.input_tokens + self.output_tokens
                + self.cache_creation_tokens + self.cache_read_tokens)
