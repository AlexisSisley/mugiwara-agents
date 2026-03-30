# tokens/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.token_index, name='token_index'),
    path('costs/', views.tab_costs, name='token_tab_costs'),
    path('technical/', views.tab_technical, name='token_tab_technical'),
    path('sessions/', views.tab_sessions, name='token_tab_sessions'),
    path('sessions/<str:session_id>/', views.session_detail, name='token_session_detail'),
    path('refresh/', views.refresh_tokens, name='token_refresh'),
    path('project-summary/<str:project_name>/', views.project_summary, name='token_project_summary'),
]
