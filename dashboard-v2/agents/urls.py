from django.urls import path
from . import views

urlpatterns = [
    path('', views.overview, name='overview'),
    path('crew/', views.crew_list, name='crew_list'),
    path('crew/<str:agent_name>/', views.crew_detail_partial, name='crew_detail'),
    path('partials/activity-feed/', views.activity_feed_partial, name='activity_feed_partial'),
]
