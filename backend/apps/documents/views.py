from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Document, DocumentCategory
from .serializers import DocumentSerializer, DocumentUploadSerializer, DocumentCategorySerializer
import os
from django.conf import settings

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