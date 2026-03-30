from django.urls import path
from . import views

urlpatterns = [
    path('', views.orchestrator_index, name='orchestrator_index'),
    path('decision/<int:pk>/', views.decision_detail, name='decision_detail'),
]
