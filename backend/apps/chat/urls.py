# backend/apps/chat/urls.py
from django.urls import path
from . import views

app_name = 'chat'

urlpatterns = [
    # Conversations
    path('conversations/', views.conversations_view, name='conversations'),
    path('conversations/<uuid:conversation_id>/', views.conversation_detail_view, name='conversation-detail'),
    
    # Messages
    path('conversations/<uuid:conversation_id>/messages/', views.messages_view, name='messages'),
    
    # Utility endpoints
    path('documents/', views.user_documents_for_chat, name='user-documents'),
    path('ai-models/', views.ai_models_view, name='ai-models'),
]