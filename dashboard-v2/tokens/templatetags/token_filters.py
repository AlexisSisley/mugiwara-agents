import json

from django import template
from django.utils.safestring import mark_safe

register = template.Library()


@register.filter
def to_json(value):
    """Convert Python object to JSON string for use in data attributes."""
    return mark_safe(json.dumps(value))

@register.filter
def format_cost(value):
    """Format a float cost as $X.XX."""
    if value is None:
        return '$0.00'
    return f'${value:,.2f}'

@register.filter
def format_tokens(value):
    """Format token count with K/M suffix."""
    if value is None or value == 0:
        return '0'
    if value >= 1_000_000:
        return f'{value / 1_000_000:.1f}M'
    if value >= 1_000:
        return f'{value / 1_000:.1f}K'
    return str(value)

@register.filter
def format_pct(value):
    """Format a percentage value."""
    if value is None:
        return '0%'
    return f'{value:.0f}%'
