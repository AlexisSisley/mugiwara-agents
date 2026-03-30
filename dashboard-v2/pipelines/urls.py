from django.urls import path
from . import views

urlpatterns = [
    path('', views.pipeline_list, name='pipeline_list'),
    path('steps/<str:session_id>/', views.pipeline_steps_partial, name='pipeline_steps'),
]
