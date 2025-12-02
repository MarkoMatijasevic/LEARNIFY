from django.urls import path
from . import views

app_name = 'documents'

urlpatterns = [
    # ========================================================================
    # DOCUMENT MANAGEMENT
    # ========================================================================
    
    # List all user's documents
    path('', views.DocumentListView.as_view(), name='document_list'),
    
    # Upload new document
    path('upload/', views.DocumentUploadView.as_view(), name='document_upload'),
    
    # Get/delete specific document
    path('<uuid:document_id>/', views.DocumentDetailView.as_view(), name='document_detail'),
    
    # Get document categories
    path('categories/', views.document_categories, name='document_categories'),
    
    # Get document statistics
    path('stats/', views.document_stats, name='document_stats'),
    
    # ========================================================================
    # TEST GENERATION & MANAGEMENT (NEW)
    # ========================================================================
    
    # Generate a new test from a document
    path('tests/generate/', views.TestGenerateView.as_view(), name='test_generate'),
    
    # Get/delete specific test
    path('tests/<uuid:test_id>/', views.TestDetailView.as_view(), name='test_detail'),
    
    # Submit test answers and get results
    path('tests/<uuid:test_id>/submit/', views.TestSubmitView.as_view(), name='test_submit'),
    
    # Get all user's test attempts
    path('tests/attempts/', views.TestAttemptListView.as_view(), name='test_attempts_list'),
    
    # Get specific test attempt details
    path('tests/attempts/<uuid:attempt_id>/', views.TestAttemptDetailView.as_view(), name='test_attempt_detail'),
    
    # Get test statistics
    path('tests/stats/', views.test_stats, name='test_stats'),
    
    # Get all test attempts for a specific document
    path('<uuid:document_id>/test-attempts/', views.DocumentTestAttemptsView.as_view(), name='document_test_attempts'),
]