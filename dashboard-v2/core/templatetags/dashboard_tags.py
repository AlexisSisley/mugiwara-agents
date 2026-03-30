"""
Custom template tags and filters for Mugiwara Dashboard v2.
"""
import json
from datetime import datetime, timezone

from django import template
from django.utils.safestring import mark_safe

register = template.Library()


@register.filter
def timeago(value):
    """
    Convert a datetime to a human-readable relative time string.
    Example: "2 hours ago", "3 days ago", "just now"
    """
    if not value:
        return ''
    now = datetime.now(timezone.utc)
    if not value.tzinfo:
        # Assume UTC if naive
        value = value.replace(tzinfo=timezone.utc)
    diff = now - value
    seconds = int(diff.total_seconds())

    if seconds < 60:
        return 'just now'
    minutes = seconds // 60
    if minutes < 60:
        return f'{minutes}m ago'
    hours = minutes // 60
    if hours < 24:
        return f'{hours}h ago'
    days = hours // 24
    if days < 30:
        return f'{days}d ago'
    months = days // 30
    if months < 12:
        return f'{months}mo ago'
    years = days // 365
    return f'{years}y ago'


@register.filter
def badge_class(value):
    """
    Map a value to a neon-badge CSS modifier class.
    Handles confidence levels, agent types, and statuses.
    """
    value_lower = str(value).lower().strip()
    mapping = {
        # Confidence
        'haute': 'haute',
        'high': 'haute',
        'moyenne': 'moyenne',
        'medium': 'moyenne',
        'basse': 'basse',
        'low': 'basse',
        # Agent types
        'subagent': 'subagent',
        'skill': 'skill',
        'pipeline': 'pipeline',
        'alias': 'neutral',
        'agent': 'subagent',
        # Status
        'success': 'success',
        'succes': 'success',
        'error': 'error',
        'echec': 'error',
        'fail': 'error',
        'en-cours': 'moyenne',
        'in-progress': 'moyenne',
    }
    return mapping.get(value_lower, 'neutral')


@register.filter
def json_data(value):
    """
    Serialize a Python object to a JSON string safe for embedding in HTML/JS.
    """
    try:
        return mark_safe(json.dumps(value, default=str))
    except (TypeError, ValueError):
        return '[]'


@register.filter
def format_number(value):
    """
    Format a number with thousands separator.
    Example: 1247 → "1,247"
    """
    try:
        return f'{int(value):,}'
    except (TypeError, ValueError):
        return str(value)


@register.filter
def truncate_id(value, length=12):
    """Truncate a session/ID string to given length with ellipsis."""
    s = str(value)
    if len(s) > length:
        return s[:length] + '...'
    return s


@register.filter
def format_duration(ms):
    """Format milliseconds to human-readable duration."""
    try:
        ms = int(ms)
    except (TypeError, ValueError):
        return '-'
    if ms <= 0:
        return '-'
    seconds = ms // 1000
    if seconds < 60:
        return f'{seconds}s'
    minutes = seconds // 60
    if minutes < 60:
        return f'{minutes}min'
    hours = minutes // 60
    remaining = minutes % 60
    return f'{hours}h{remaining:02d}'


@register.simple_tag
def neon_glow(color='purple'):
    """
    Return an inline style for a neon glow effect.
    Colors: purple, pink, green, red, yellow.
    """
    glows = {
        'purple': '0 0 20px rgba(139, 92, 246, 0.3)',
        'pink': '0 0 20px rgba(236, 72, 153, 0.3)',
        'green': '0 0 20px rgba(16, 185, 129, 0.3)',
        'red': '0 0 20px rgba(239, 68, 68, 0.3)',
        'yellow': '0 0 20px rgba(245, 158, 11, 0.3)',
    }
    return mark_safe(f'box-shadow: {glows.get(color, glows["purple"])}')
