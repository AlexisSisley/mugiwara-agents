"""Root URL configuration for Mugiwara Dashboard v2."""
from django.urls import path, include

urlpatterns = [
    path('', include('agents.urls')),
    path('orchestrator/', include('orchestrator.urls')),
    path('pipelines/', include('pipelines.urls')),
    path('projects/', include('projects.urls')),
    path('reports/', include('reports.urls')),
]
