# backend/apps/chat/models.py
import uuid
from django.db import models
from django.conf import settings
from apps.documents.models import Document

class AIModel(models.Model):
    """Model to store AI model configurations"""
    name = models.CharField(max_length=100)
    provider = models.CharField(max_length=50)  # e.g., 'Google', 'OpenAI'
    model_identifier = models.CharField(max_length=100)  # e.g., 'gemini-1.5-flash'
    description = models.TextField(blank=True)
    max_tokens = models.IntegerField(default=1000000)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chat_ai_models'
        
    def __str__(self):
        return f"{self.name} ({self.provider})"

class Conversation(models.Model):
    """Model to store chat conversations"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='conversations')
    title = models.CharField(max_length=255)
    ai_model = models.ForeignKey(AIModel, on_delete=models.SET_NULL, null=True, blank=True)
    documents = models.ManyToManyField(Document, blank=True, related_name='conversations')
    total_messages = models.IntegerField(default=0)
    total_tokens = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chat_conversations'
        ordering = ['-updated_at']
        
    def __str__(self):
        return f"{self.title} - {self.user.email}"

class Message(models.Model):
    """Model to store individual messages in conversations"""
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    content = models.TextField()
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    tokens_used = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    is_edited = models.BooleanField(default=False)
    rating = models.IntegerField(null=True, blank=True)  # User can rate AI responses
    
    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']
        
    def __str__(self):
        return f"{self.role}: {self.content[:50]}..."

class StudySession(models.Model):
    """Model to track study sessions using AI chat"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='study_sessions')
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='study_sessions')
    session_name = models.CharField(max_length=255)
    duration_minutes = models.IntegerField(default=0)
    questions_asked = models.IntegerField(default=0)
    topics_covered = models.JSONField(default=list, blank=True)
    session_notes = models.TextField(blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'chat_study_sessions'
        ordering = ['-started_at']
        
    def __str__(self):
        return f"{self.session_name} - {self.user.email}"