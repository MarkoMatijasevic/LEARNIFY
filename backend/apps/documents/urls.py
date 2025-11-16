from django.urls import path
from . import views

app_name = 'documents'

urlpatterns = [
    # Document management
    path('', views.DocumentListView.as_view(), name='document_list'),
    path('upload/', views.DocumentUploadView.as_view(), name='document_upload'),
    path('<uuid:document_id>/', views.DocumentDetailView.as_view(), name='document_detail'),
    
    # Categories and stats
    path('categories/', views.document_categories, name='document_categories'),
    path('stats/', views.document_stats, name='document_stats'),
]