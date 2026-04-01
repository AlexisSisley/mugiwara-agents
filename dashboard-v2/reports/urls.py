from django.urls import path
from . import views

urlpatterns = [
    path('', views.report_list, name='report_list'),
    path('generate/', views.report_generate, name='report_generate'),
    path('<int:pk>/', views.report_detail, name='report_detail'),
    path('<int:pk>/detail/', views.report_detail_page, name='report_detail_page'),
    path('<int:pk>/sessions/', views.report_sessions, name='report_sessions'),
    path('<int:pk>/email-html/', views.report_email_html, name='report_email_html'),
]
