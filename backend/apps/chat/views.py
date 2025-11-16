# backend/apps/chat/views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import Conversation, Message, AIModel
from .serializers import ConversationSerializer, MessageSerializer, ConversationCreateSerializer
from .services import GeminiService
from apps.documents.models import Document
import logging

logger = logging.getLogger(__name__)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def conversations_view(request):
    """List user conversations or create new conversation"""
    
    if request.method == 'GET':
        conversations = Conversation.objects.filter(user=request.user).order_by('-updated_at')
        serializer = ConversationSerializer(conversations, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        try:
            # Log incoming request data
            logger.info(f"Creating conversation for user {request.user.id}")
            logger.info(f"Request data: {request.data}")
            
            # Get the data safely
            title = request.data.get('title', '').strip()
            document_ids = request.data.get('document_ids', [])
            
            if not title:
                return Response(
                    {'error': 'Conversation title is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"Title: {title}")
            logger.info(f"Document IDs: {document_ids}")
            
            with transaction.atomic():
                # Create conversation using the serializer
                conversation_data = {
                    'title': title,
                    'user': request.user
                }
                
                # Get AI model
                ai_model = AIModel.objects.filter(is_active=True).first()
                if ai_model:
                    conversation_data['ai_model'] = ai_model
                
                # Create conversation directly
                conversation = Conversation.objects.create(**conversation_data)
                logger.info(f"Created conversation {conversation.id}")
                
                # Handle document linking if document_ids provided
                if document_ids and len(document_ids) > 0:
                    logger.info(f"Linking {len(document_ids)} documents to conversation")
                    
                    # Validate and get documents
                    documents = Document.objects.filter(
                        id__in=document_ids, 
                        user=request.user,
                        status='ready'
                    )
                    
                    logger.info(f"Found {documents.count()} valid documents")
                    
                    # Verify documents have content
                    ready_docs = []
                    for doc in documents:
                        if doc.extracted_text and doc.extracted_text.strip():
                            ready_docs.append(doc)
                            logger.info(f"✓ Document {doc.id} ({doc.title}) has {len(doc.extracted_text)} characters")
                        else:
                            logger.warning(f"✗ Document {doc.id} ({doc.title}) has no extracted text - status: {doc.status}")
                    
                    if ready_docs:
                        conversation.documents.set(ready_docs)
                        logger.info(f"Successfully linked {len(ready_docs)} documents to conversation {conversation.id}")
                    else:
                        logger.warning(f"No documents with content found for conversation {conversation.id}")
                
                # Serialize response
                response_serializer = ConversationSerializer(conversation)
                logger.info(f"Successfully created conversation {conversation.id} with {conversation.documents.count()} documents")
                
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Error creating conversation: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to create conversation: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def conversation_detail_view(request, conversation_id):
    """Get conversation details or delete conversation"""
    
    conversation = get_object_or_404(
        Conversation, 
        id=conversation_id, 
        user=request.user
    )
    
    if request.method == 'GET':
        serializer = ConversationSerializer(conversation)
        return Response(serializer.data)
    
    elif request.method == 'DELETE':
        conversation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def messages_view(request, conversation_id):
    """List messages in conversation or send new message to AI"""
    
    conversation = get_object_or_404(
        Conversation, 
        id=conversation_id, 
        user=request.user
    )
    
    if request.method == 'GET':
        messages = Message.objects.filter(conversation=conversation).order_by('created_at')
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        user_message_content = request.data.get('content', '').strip()
        
        if not user_message_content:
            return Response(
                {'error': 'Message content cannot be empty'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Save user message
                user_message = Message.objects.create(
                    conversation=conversation,
                    content=user_message_content,
                    role='user'
                )
                
                # Get AI model for conversation
                ai_model = conversation.ai_model or AIModel.objects.filter(is_active=True).first()
                if not ai_model:
                    return Response(
                        {'error': 'No AI model available'}, 
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                
                # Initialize Gemini service
                gemini_service = GeminiService(ai_model)
                
                # Get document context with enhanced debugging
                document_context = ""
                linked_documents = conversation.documents.all()
                
                logger.info(f"Processing message for conversation {conversation.id} with {linked_documents.count()} linked documents")
                
                if linked_documents.exists():
                    document_texts = []
                    
                    for document in linked_documents:
                        # Refresh document from database to ensure we have latest data
                        document.refresh_from_db()
                        
                        logger.info(f"Processing document {document.id} ({document.title}):")
                        logger.info(f"  - Status: {document.status}")
                        logger.info(f"  - File type: {document.file_type}")
                        logger.info(f"  - File size: {document.file_size} bytes")
                        logger.info(f"  - Extracted text length: {len(document.extracted_text) if document.extracted_text else 0}")
                        logger.info(f"  - Word count: {document.word_count}")
                        logger.info(f"  - Page count: {document.page_count}")
                        
                        # Check if document has usable content
                        if document.extracted_text and document.extracted_text.strip():
                            # Prepare comprehensive document context
                            doc_info = f"""
=== DOCUMENT: {document.title} ===
File Type: {document.file_type.upper()}
Original Filename: {document.original_filename}
File Size: {document.file_size} bytes
Pages/Slides: {document.page_count or 'Unknown'}
Word Count: {document.word_count or 'Unknown'}
Status: {document.status}
Upload Date: {document.created_at.strftime('%Y-%m-%d %H:%M')}

DOCUMENT CONTENT:
{document.extracted_text}

=== END DOCUMENT: {document.title} ===
"""
                            document_texts.append(doc_info)
                            logger.info(f"✓ Added document context for '{document.title}': {len(document.extracted_text)} characters")
                        else:
                            logger.warning(f"✗ Document '{document.title}' has no extracted text:")
                            logger.warning(f"  - extracted_text is None: {document.extracted_text is None}")
                            logger.warning(f"  - extracted_text is empty: {not bool(document.extracted_text and document.extracted_text.strip())}")
                            logger.warning(f"  - document status: {document.status}")
                    
                    if document_texts:
                        document_context = f"""
You are an AI assistant helping a user understand and work with their uploaded documents. 
The user has uploaded the following document(s) and wants to discuss them:

{chr(10).join(document_texts)}

Please reference these documents when answering the user's questions. You can quote directly from the documents, 
summarize their content, answer questions about them, and help the user understand the material.
"""
                        logger.info(f"✓ Prepared document context: {len(document_context)} total characters for {len(document_texts)} documents")
                    else:
                        logger.error(f"✗ No usable document content found among {linked_documents.count()} linked documents")
                        # Add a note about the issue
                        document_context = f"""
Note: This conversation is linked to {linked_documents.count()} document(s), but none of them have readable content available. 
The documents may still be processing or there may have been an issue during upload. You should let the user know about this.

Linked documents:
{chr(10).join([f"- {doc.title} ({doc.file_type}, {doc.status})" for doc in linked_documents])}
"""
                else:
                    logger.info("No documents linked to this conversation")
                
                # Get conversation history
                previous_messages = Message.objects.filter(
                    conversation=conversation
                ).exclude(
                    id=user_message.id
                ).order_by('created_at')
                
                conversation_history = []
                for msg in previous_messages:
                    conversation_history.append({
                        'role': msg.role,
                        'content': msg.content
                    })
                
                logger.info(f"Sending to AI: message + {len(document_context)} char context + {len(conversation_history)} history messages")
                
                # Generate AI response with document context
                ai_response = gemini_service.generate_response(
                    message=user_message_content,
                    document_context=document_context,
                    conversation_history=conversation_history
                )
                
                # Save AI message
                ai_message = Message.objects.create(
                    conversation=conversation,
                    content=ai_response['content'],
                    role='assistant',
                    tokens_used=ai_response.get('tokens_used', 0)
                )
                
                # Update conversation statistics
                conversation.total_messages += 2  # User + AI messages
                conversation.total_tokens += ai_response.get('tokens_used', 0)
                conversation.save(update_fields=['total_messages', 'total_tokens', 'updated_at'])
                
                logger.info(f"✓ Successfully processed message exchange for conversation {conversation.id}")
                
                # Return both messages
                messages_data = MessageSerializer([user_message, ai_message], many=True).data
                return Response({
                    'messages': messages_data,
                    'conversation': ConversationSerializer(conversation).data
                })
                
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to process message. Please try again.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_documents_for_chat(request):
    """Get user's ready documents that can be used in chat"""
    documents = Document.objects.filter(
        user=request.user, 
        status='ready'  # Only include documents that have been processed
    ).order_by('-created_at')
    
    documents_data = []
    for doc in documents:
        # Check if document actually has content
        has_content = bool(doc.extracted_text and doc.extracted_text.strip())
        content_length = len(doc.extracted_text) if doc.extracted_text else 0
        
        logger.debug(f"Document {doc.title}: has_content={has_content}, length={content_length}")
        
        documents_data.append({
            'id': str(doc.id),
            'title': doc.title,
            'file_type': doc.file_type,
            'file_size': doc.file_size,
            'created_at': doc.created_at,
            'word_count': doc.word_count,
            'page_count': doc.page_count,
            'has_content': has_content,
            'content_length': content_length,
            'status': doc.status
        })
    
    logger.info(f"Returning {len(documents_data)} documents for chat selection")
    return Response({'documents': documents_data})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_models_view(request):
    """Get available AI models"""
    models = AIModel.objects.filter(is_active=True).order_by('name')
    
    models_data = []
    for model in models:
        models_data.append({
            'id': model.id,
            'name': model.name,
            'provider': model.provider,
            'description': model.description,
            'max_tokens': model.max_tokens
        })
    
    return Response({'models': models_data})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_document_content(request, document_id):
    """Debug endpoint to check document content (remove in production)"""
    try:
        document = get_object_or_404(Document, id=document_id, user=request.user)
        
        return Response({
            'document_id': str(document.id),
            'title': document.title,
            'status': document.status,
            'file_type': document.file_type,
            'file_size': document.file_size,
            'has_extracted_text': bool(document.extracted_text),
            'extracted_text_length': len(document.extracted_text) if document.extracted_text else 0,
            'word_count': document.word_count,
            'page_count': document.page_count,
            'text_preview': document.extracted_text[:500] if document.extracted_text else None,
            'created_at': document.created_at,
            'updated_at': document.updated_at
        })
    except Exception as e:
        logger.error(f"Debug endpoint error: {e}")
        return Response({'error': str(e)}, status=500)