"""
Django settings for Mugiwara Dashboard v2.

Local-only dashboard — no auth, no CSRF, minimal middleware.
"""
import os
from pathlib import Path

# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent  # mugiwara-agents root

# Mugiwara home directory (where SQLite DB lives)
MUGIWARA_HOME = Path(os.environ.get('MUGIWARA_HOME', Path.home() / '.mugiwara'))

# SECURITY — local tool only, not exposed to internet
SECRET_KEY = 'mugiwara-dashboard-v2-local-only-not-for-production'
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# Application definition
INSTALLED_APPS = [
    'django.contrib.staticfiles',
    'core',
    'agents',
    'orchestrator',
    'pipelines',
    'projects',
    'reports',
]

# Minimal middleware — no auth, no CSRF, no sessions (local tool)
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.template.context_processors.static',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database — reuse existing Mugiwara SQLite DB
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': MUGIWARA_HOME / 'mugiwara.db',
    }
}

# Static files
STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Internationalization
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Europe/Paris'
USE_I18N = False
USE_TZ = True
