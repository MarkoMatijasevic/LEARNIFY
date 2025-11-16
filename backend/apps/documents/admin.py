from django.contrib import admin
from .models import Document, DocumentCategory, DocumentShare, DocumentProcessingLog

@admin.register(DocumentCategory)
class DocumentCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'color', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'description']
    ordering = ['name']

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'file_type', 'status', 'file_size_mb', 'created_at']
    list_filter = ['status', 'file_type', 'created_at', 'category']
    search_fields = ['title', 'user__email', 'original_filename']
    readonly_fields = ['id', 'file_size', 'extracted_text', 'text_preview', 'page_count', 'word_count', 'created_at', 'updated_at']
    raw_id_fields = ['user', 'category']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('user', 'title', 'description', 'category', 'tags')
        }),
        ('File Info', {
            'fields': ('file', 'original_filename', 'file_size', 'file_type')
        }),
        ('Processing', {
            'fields': ('status', 'processing_error', 'extracted_text', 'text_preview', 'page_count', 'word_count')
        }),
        ('AI Analysis', {
            'fields': ('ai_summary', 'ai_key_topics', 'ai_difficulty_level', 'ai_subject_area'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_accessed'),
            'classes': ('collapse',)
        })
    )

@admin.register(DocumentShare)
class DocumentShareAdmin(admin.ModelAdmin):
    list_display = ['document', 'shared_by', 'shared_with', 'permission', 'created_at']
    list_filter = ['permission', 'created_at']
    search_fields = ['document__title', 'shared_by__email', 'shared_with__email']
    raw_id_fields = ['document', 'shared_by', 'shared_with']
    ordering = ['-created_at']

@admin.register(DocumentProcessingLog)
class DocumentProcessingLogAdmin(admin.ModelAdmin):
    list_display = ['document', 'step', 'status', 'duration_seconds', 'created_at']
    list_filter = ['status', 'step', 'created_at']
    search_fields = ['document__title', 'step', 'message']
    readonly_fields = ['created_at']
    raw_id_fields = ['document']
    ordering = ['-created_at']