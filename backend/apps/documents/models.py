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

# ============================================================================
# TEST GENERATION MODELS (NEW)
# ============================================================================

class DocumentTest(models.Model):
    """
    AI-generated practice tests from document content.
    Always generates 20 random questions per test.
    """
    
    STATUS_CHOICES = [
        ('generating', _('Generating')),
        ('ready', _('Ready')),
        ('error', _('Error')),
    ]
    
    # Primary fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='tests')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tests')
    
    # Test configuration
    title = models.CharField(max_length=255)
    question_count = models.PositiveIntegerField(default=20)  # Always 20 questions
    
    # Test content (AI-generated)
    questions = models.JSONField(default=list)  # List of question objects
    # Question format: {
    #   "id": 1,
    #   "question": "What is photosynthesis?",
    #   "options": {
    #     "A": "Process of...",
    #     "B": "Another option...",
    #     "C": "Third option..."
    #   },
    #   "correct_answer": "A",
    #   "explanation": "Photosynthesis is..."
    # }
    
    # Status and metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='generating')
    generation_error = models.TextField(blank=True)
    generation_time_seconds = models.FloatField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        app_label = 'documents'
        indexes = [
            models.Index(fields=['document', 'created_by']),
            models.Index(fields=['created_by', 'created_at']),
        ]
        
    def __str__(self):
        return f"{self.title} - {self.question_count} questions"
        
    @property
    def is_ready(self):
        """Check if test is ready to be taken"""
        return self.status == 'ready' and len(self.questions) == self.question_count
        
    @property
    def attempt_count(self):
        """Count how many times this test has been attempted"""
        return self.attempts.count()


class TestAttempt(models.Model):
    """
    User attempt/submission of a practice test.
    Tracks answers, score, grade, and detailed results.
    """
    
    GRADE_CHOICES = [
        ('A', 'A - Excellent (90-100%)'),
        ('B', 'B - Good (80-89%)'),
        ('C', 'C - Average (70-79%)'),
        ('D', 'D - Passing (60-69%)'),
        ('F', 'F - Fail (Below 60%)'),
    ]
    
    # Primary fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test = models.ForeignKey(DocumentTest, on_delete=models.CASCADE, related_name='attempts')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='test_attempts')
    
    # User answers
    answers = models.JSONField(default=dict)  # {question_id: selected_answer}
    # Format: {"1": "A", "2": "C", "3": "B", ...}
    
    # Results
    score = models.FloatField(default=0.0)  # Percentage (0-100)
    grade = models.CharField(max_length=1, choices=GRADE_CHOICES, default='F')
    passed = models.BooleanField(default=False)  # True if score >= 60%
    correct_count = models.PositiveIntegerField(default=0)
    incorrect_count = models.PositiveIntegerField(default=0)
    
    # Detailed results (for review screen)
    results_detail = models.JSONField(default=list)
    # Format: [
    #   {
    #     "question_id": 1,
    #     "question": "What is...",
    #     "user_answer": "A",
    #     "correct_answer": "B",
    #     "is_correct": False,
    #     "explanation": "The correct answer is B because..."
    #   },
    #   ...
    # ]
    
    # Timing
    time_taken_seconds = models.PositiveIntegerField(null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-completed_at']
        app_label = 'documents'
        indexes = [
            models.Index(fields=['user', 'completed_at']),
            models.Index(fields=['test', 'user']),
        ]
        
    def __str__(self):
        return f"{self.user.email} - {self.test.title} ({self.grade})"
        
    @property
    def time_taken_formatted(self):
        """Return formatted time taken (e.g., '15 minutes')"""
        if not self.time_taken_seconds:
            return "N/A"
        
        minutes = self.time_taken_seconds // 60
        seconds = self.time_taken_seconds % 60
        
        if minutes > 0:
            return f"{minutes} min {seconds} sec"
        return f"{seconds} sec"
        
    @property
    def score_percentage(self):
        """Return score as formatted percentage string"""
        return f"{self.score:.1f}%"
        
    def calculate_grade(self):
        """Calculate letter grade based on score"""
        if self.score >= 90:
            return 'A'
        elif self.score >= 80:
            return 'B'
        elif self.score >= 70:
            return 'C'
        elif self.score >= 60:
            return 'D'
        else:
            return 'F'
            
    def calculate_results(self):
        """
        Calculate score, grade, and detailed results from user answers.
        Called after test submission.
        """
        if not self.test.is_ready or not self.answers:
            return
            
        total_questions = len(self.test.questions)
        correct = 0
        results = []
        
        for question in self.test.questions:
            q_id = str(question['id'])
            user_answer = self.answers.get(q_id, '')
            correct_answer = question['correct_answer']
            is_correct = user_answer == correct_answer
            
            if is_correct:
                correct += 1
                
            results.append({
                'question_id': question['id'],
                'question': question['question'],
                'options': question['options'],
                'user_answer': user_answer,
                'correct_answer': correct_answer,
                'is_correct': is_correct,
                'explanation': question.get('explanation', '')
            })
        
        # Calculate score and grade
        self.correct_count = correct
        self.incorrect_count = total_questions - correct
        self.score = (correct / total_questions * 100) if total_questions > 0 else 0
        self.grade = self.calculate_grade()
        self.passed = self.score >= 60.0
        self.results_detail = results
        
    def save(self, *args, **kwargs):
        """Override save to auto-calculate results if answers provided"""
        if self.answers and not self.results_detail:
            self.calculate_results()
        super().save(*args, **kwargs)

