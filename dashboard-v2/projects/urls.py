from django.urls import path
from . import views

urlpatterns = [
    path('', views.project_list, name='project_list'),
    path('<str:project_name>/', views.project_page, name='project_page'),
    path('<str:project_name>/drawer/', views.project_detail, name='project_detail'),
    path('<str:project_name>/file/', views.project_file, name='project_file'),
    path('<str:project_name>/open/', views.project_open, name='project_open'),
    path('<str:project_name>/open-yolo/', views.project_open_yolo, name='project_open_yolo'),
    path('<str:project_name>/run-agent/', views.project_run_agent, name='project_run_agent'),
    path('<str:project_name>/explore/', views.project_explore, name='project_explore'),
]
