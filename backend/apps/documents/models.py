"""
Learnify AI - Documents App Models
Handles file uploads, processing, and content extraction
"""
import os
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import FileExtensionValidator
from django.utils.translation import gettext_lazy as _

User = get_user_model()

def document_upload_path(instance, filename):
    """Generate upload path for documents"""
    # Create path: documents/user_id/document_id/filename
    ext = filename.split('.')[-1].lower()
    new_filename = f"{instance.id}.{ext}"
    return f"documents/{instance.user.id}/{instance.id}/{new_filename}"

class DocumentCategory(models.Model):
    """Categories for organizing documents"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default="#EF4444")  # Hex color for UI
    icon = models.CharField(max_length=50, default="document")  # Icon name
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = "Document Categories"
        ordering = ['name']
        app_label = 'documents'
        
    def __str__(self):
        return self.name

class Document(models.Model):
    """Main document model for uploaded files"""
    
    STATUS_CHOICES = [
        ('uploading', _('Uploading')),
        ('processing', _('Processing')),
        ('ready', _('Ready')),
        ('error', _('Error')),
    ]
    
    FILE_TYPE_CHOICES = [
        ('pdf', 'PDF'),
        ('docx', 'Word Document'),
        ('pptx', 'PowerPoint'),
        ('txt', 'Text File'),
    ]
    
    # Primary fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # File fields
    file = models.FileField(
        upload_to=document_upload_path,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'docx', 'pptx', 'txt'])]
    )
    original_filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)  # Size in bytes
    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES)
    
    # Content fields
    extracted_text = models.TextField(blank=True)  # Full text content
    text_preview = models.TextField(blank=True, max_length=500)  # First 500 chars
    page_count = models.PositiveIntegerField(default=0)
    word_count = models.PositiveIntegerField(default=0)
    
    # Organization fields
    category = models.ForeignKey(
        DocumentCategory, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='documents'
    )
    tags = models.CharField(max_length=500, blank=True, help_text="Comma-separated tags")
    
    # Status and metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploading')
    processing_error = models.TextField(blank=True)
    
    # AI analysis fields
    ai_summary = models.TextField(blank=True)
    ai_key_topics = models.JSONField(default=list)  # List of extracted topics
    ai_difficulty_level = models.CharField(max_length=20, blank=True)  # beginner, intermediate, advanced
    ai_subject_area = models.CharField(max_length=100, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_accessed = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        app_label = 'documents'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['file_type']),
        ]
        
    def __str__(self):
        return f"{self.title} ({self.user.email})"
        
    @property
    def file_size_mb(self):
        """Return file size in MB"""
        return round(self.file_size / (1024 * 1024), 2)
        
    @property
    def is_ready(self):
        """Check if document is ready for AI interaction"""
        return self.status == 'ready' and self.extracted_text
        
    @property
    def tags_list(self):
        """Return tags as a list"""
        return [tag.strip() for tag in self.tags.split(',') if tag.strip()]
        
    def delete_file(self):
        """Delete the physical file from storage"""
        if self.file and os.path.isfile(self.file.path):
            os.remove(self.file.path)
            
    def delete(self, *args, **kwargs):
        """Override delete to remove file from storage"""
        self.delete_file()
        super().delete(*args, **kwargs)

class DocumentProcessingLog(models.Model):
    """Log processing steps for debugging"""
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='processing_logs')
    step = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=[
        ('started', 'Started'),
        ('success', 'Success'),
        ('error', 'Error'),
    ])
    message = models.TextField(blank=True)
    duration_seconds = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        app_label = 'documents'
        
    def __str__(self):
        return f"{self.document.title} - {self.step} ({self.status})"

class DocumentShare(models.Model):
    """Share documents with other users"""
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='shares')
    shared_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shared_documents')
    shared_with = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_documents')
    
    PERMISSION_CHOICES = [
        ('view', 'View Only'),
        ('chat', 'View and Chat'),
    ]
    
    permission = models.CharField(max_length=10, choices=PERMISSION_CHOICES, default='view')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['document', 'shared_with']
        ordering = ['-created_at']
        app_label = 'documents'
        
    def __str__(self):
        return f"{self.document.title} shared with {self.shared_with.email}"
