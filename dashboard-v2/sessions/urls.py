# sessions/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.session_list, name='session_list'),
    path('<str:session_id>/resume/', views.session_resume, name='session_resume'),
]
