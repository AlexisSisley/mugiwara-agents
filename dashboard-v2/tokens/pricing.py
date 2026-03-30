# tokens/pricing.py
"""Claude API pricing table and cost calculation."""
import logging

logger = logging.getLogger(__name__)

# Rates in USD per 1M tokens
PRICING = {
    'claude-opus-4-6': {
        'input': 15.0,
        'output': 75.0,
        'cache_creation': 18.75,    # 125% of input
        'cache_read': 1.50,         # 10% of input
    },
    'claude-sonnet-4-5': {
        'input': 3.0,
        'output': 15.0,
        'cache_creation': 3.75,
        'cache_read': 0.30,
    },
    'claude-haiku-3-5': {
        'input': 0.80,
        'output': 4.0,
        'cache_creation': 1.0,
        'cache_read': 0.08,
    },
}

DEFAULT_TIER = 'claude-sonnet-4-5'


def get_rates(model_name: str) -> dict:
    """Get pricing rates for a model. Falls back to DEFAULT_TIER for unknown models."""
    rates = PRICING.get(model_name)
    if rates is None:
        logger.warning('Unknown model %r, using default tier %s', model_name, DEFAULT_TIER)
        rates = PRICING[DEFAULT_TIER]
    return rates


def calculate_cost(
    model_name: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    cache_creation_tokens: int = 0,
    cache_read_tokens: int = 0,
) -> float:
    """Calculate cost in USD for a single message."""
    rates = get_rates(model_name)
    cost = (
        input_tokens * rates['input']
        + output_tokens * rates['output']
        + cache_creation_tokens * rates['cache_creation']
        + cache_read_tokens * rates['cache_read']
    ) / 1_000_000
    return cost
