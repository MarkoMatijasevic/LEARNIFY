
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Document, DocumentCategory, DocumentTest, TestAttempt
from .serializers import (
    DocumentSerializer, 
    DocumentUploadSerializer, 
    DocumentCategorySerializer,
    DocumentTestSerializer,
    TestAttemptSerializer,
    TestGenerateRequestSerializer,
    TestSubmissionSerializer
)
from .services import TestGenerationService
import os
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class DocumentUploadView(APIView):
    """Handle document upload"""
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = DocumentUploadSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            # Save document with user
            document = serializer.save()
            
            # Return serialized document
            response_serializer = DocumentSerializer(document)
            return Response({
                'message': 'Document uploaded successfully',
                'document': response_serializer.data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DocumentListView(APIView):
    """List user's documents"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        documents = Document.objects.filter(user=request.user).order_by('-created_at')
        serializer = DocumentSerializer(documents, many=True)
        return Response({
            'documents': serializer.data,
            'count': documents.count()
        })


class DocumentDetailView(APIView):
    """Get, update, delete specific document"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, document_id):
        document = get_object_or_404(Document, id=document_id, user=request.user)
        serializer = DocumentSerializer(document)
        return Response(serializer.data)
    
    def delete(self, request, document_id):
        document = get_object_or_404(Document, id=document_id, user=request.user)
        
        # Delete physical file
        if document.file and os.path.exists(document.file.path):
            os.remove(document.file.path)
        
        document.delete()
        return Response({'message': 'Document deleted successfully'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def document_categories(request):
    """Get all document categories"""
    categories = DocumentCategory.objects.all()
    serializer = DocumentCategorySerializer(categories, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def document_stats(request):
    """Get user's document statistics"""
    user_docs = Document.objects.filter(user=request.user)
    
    return Response({
        'total_documents': user_docs.count(),
        'ready_documents': user_docs.filter(status='ready').count(),
        'processing_documents': user_docs.filter(status='processing').count(),
        'total_size_bytes': sum(doc.file_size or 0 for doc in user_docs),
        'categories_used': user_docs.filter(category__isnull=False).values_list('category__name', flat=True).distinct().count(),
        'total_pages': sum(doc.page_count or 0 for doc in user_docs),
        'total_words': sum(doc.word_count or 0 for doc in user_docs),
    })


# ============================================================================
# TEST GENERATION VIEWS (NEW)
# ============================================================================

class TestGenerateView(APIView):
    """
    Generate a new 20-question practice test from a document.
    
    POST /api/documents/tests/generate/
    Body: {"document_id": "uuid"}
    Returns: DocumentTest object with generated questions
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        # Validate request
        serializer = TestGenerateRequestSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if not serializer.is_valid():
            return Response(
                {'error': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        document_id = serializer.validated_data['document_id']
        
        try:
            # Get document
            document = get_object_or_404(
                Document,
                id=document_id,
                user=request.user
            )
            
            logger.info(f"📝 User {request.user.id} generating test for document {document.id}")
            
            # Initialize test generation service
            test_service = TestGenerationService()
            
            # Generate test
            test = test_service.generate_test(document, request.user)
            
            # Serialize and return
            response_serializer = DocumentTestSerializer(test)
            
            logger.info(f"✅ Test {test.id} generated successfully")
            
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )
            
        except ValueError as e:
            logger.error(f"❌ Test generation validation error: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"❌ Test generation failed: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to generate test. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TestDetailView(APIView):
    """
    Get details of a specific test.
    
    GET /api/documents/tests/{test_id}/
    Returns: DocumentTest object with all questions
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, test_id):
        # Get test (ensure user has access to the document)
        test = get_object_or_404(
            DocumentTest,
            id=test_id,
            document__user=request.user
        )
        
        serializer = DocumentTestSerializer(test)
        return Response(serializer.data)
    
    def delete(self, request, test_id):
        """Delete a test"""
        test = get_object_or_404(
            DocumentTest,
            id=test_id,
            created_by=request.user
        )
        
        test.delete()
        return Response(
            {'message': 'Test deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )


class TestSubmitView(APIView):
    """
    Submit test answers and get results.
    
    POST /api/documents/tests/{test_id}/submit/
    Body: {
        "answers": {"1": "A", "2": "B", ...},
        "time_taken_seconds": 900
    }
    Returns: TestAttempt object with results and grading
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, test_id):
        # Get test
        test = get_object_or_404(
            DocumentTest,
            id=test_id,
            document__user=request.user
        )
        
        # Check if test is ready
        if not test.is_ready:
            return Response(
                {'error': 'Test is not ready yet. Please wait for generation to complete.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate submission
        serializer = TestSubmissionSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        answers = serializer.validated_data['answers']
        time_taken_seconds = serializer.validated_data.get('time_taken_seconds')
        
        try:
            logger.info(f"📤 User {request.user.id} submitting test {test.id}")
            
            # Create test attempt
            attempt = TestAttempt.objects.create(
                test=test,
                user=request.user,
                answers=answers,
                time_taken_seconds=time_taken_seconds
            )
            
            # Calculate results (done automatically in model's save method)
            attempt.refresh_from_db()
            
            # Serialize and return results
            response_serializer = TestAttemptSerializer(attempt)
            
            logger.info(
                f"✅ Test attempt {attempt.id} completed: "
                f"Score {attempt.score}%, Grade {attempt.grade}, "
                f"Passed: {attempt.passed}"
            )
            
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"❌ Test submission failed: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to submit test. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TestAttemptListView(APIView):
    """
    Get all test attempts for the current user.
    
    GET /api/documents/tests/attempts/
    Returns: List of all user's test attempts
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        attempts = TestAttempt.objects.filter(
            user=request.user
        ).select_related('test', 'test__document').order_by('-completed_at')
        
        serializer = TestAttemptSerializer(attempts, many=True)
        
        return Response({
            'attempts': serializer.data,
            'count': attempts.count()
        })


class TestAttemptDetailView(APIView):
    """
    Get details of a specific test attempt.
    
    GET /api/documents/tests/attempts/{attempt_id}/
    Returns: TestAttempt object with full results and review
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, attempt_id):
        attempt = get_object_or_404(
            TestAttempt,
            id=attempt_id,
            user=request.user
        )
        
        serializer = TestAttemptSerializer(attempt)
        return Response(serializer.data)


class DocumentTestAttemptsView(APIView):
    """
    Get all test attempts for a specific document.
    
    GET /api/documents/{document_id}/test-attempts/
    Returns: List of test attempts for this document
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, document_id):
        # Verify user owns the document
        document = get_object_or_404(
            Document,
            id=document_id,
            user=request.user
        )
        
        # Get all test attempts for tests related to this document
        attempts = TestAttempt.objects.filter(
            test__document=document,
            user=request.user
        ).select_related('test').order_by('-completed_at')
        
        serializer = TestAttemptSerializer(attempts, many=True)
        
        return Response({
            'document_id': str(document.id),
            'document_title': document.title,
            'attempts': serializer.data,
            'count': attempts.count()
        })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def test_stats(request):
    """
    Get user's test statistics.
    
    GET /api/documents/tests/stats/
    Returns: Overall test performance statistics
    """
    user_attempts = TestAttempt.objects.filter(user=request.user)
    
    if not user_attempts.exists():
        return Response({
            'total_tests_taken': 0,
            'average_score': 0,
            'pass_rate': 0,
            'total_questions_answered': 0,
            'total_correct_answers': 0,
            'grade_distribution': {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0},
            'best_score': 0,
            'worst_score': 0,
        })
    
    # Calculate statistics
    total_tests = user_attempts.count()
    passed_tests = user_attempts.filter(passed=True).count()
    
    # Grade distribution
    grade_dist = {
        'A': user_attempts.filter(grade='A').count(),
        'B': user_attempts.filter(grade='B').count(),
        'C': user_attempts.filter(grade='C').count(),
        'D': user_attempts.filter(grade='D').count(),
        'F': user_attempts.filter(grade='F').count(),
    }
    
    # Calculate totals
    total_correct = sum(attempt.correct_count for attempt in user_attempts)
    total_questions = sum(attempt.correct_count + attempt.incorrect_count for attempt in user_attempts)
    
    # Calculate average score
    scores = [attempt.score for attempt in user_attempts]
    average_score = sum(scores) / len(scores) if scores else 0
    
    return Response({
        'total_tests_taken': total_tests,
        'tests_passed': passed_tests,
        'tests_failed': total_tests - passed_tests,
        'pass_rate': round((passed_tests / total_tests * 100), 1) if total_tests > 0 else 0,
        'average_score': round(average_score, 1),
        'best_score': max(scores) if scores else 0,
        'worst_score': min(scores) if scores else 0,
        'total_questions_answered': total_questions,
        'total_correct_answers': total_correct,
        'accuracy_rate': round((total_correct / total_questions * 100), 1) if total_questions > 0 else 0,
        'grade_distribution': grade_dist,
    })
