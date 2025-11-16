# backend/apps/chat/serializers.py
from rest_framework import serializers
from .models import Conversation, Message, AIModel
from apps.documents.models import Document

class AIModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIModel
        fields = ['id', 'name', 'provider', 'description', 'max_tokens']

class MessageSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S', read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 'content', 'role', 'tokens_used', 
            'created_at', 'is_edited', 'rating'
        ]

class DocumentForChatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'title', 'file_type', 'file_size']

class ConversationSerializer(serializers.ModelSerializer):
    ai_model = AIModelSerializer(read_only=True)
    documents = DocumentForChatSerializer(many=True, read_only=True)
    created_at = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S', read_only=True)
    updated_at = serializers.DateTimeField(format='%Y-%m-%d %H:%M:%S', read_only=True)
    last_message = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'title', 'ai_model', 'documents', 'total_messages', 
            'total_tokens', 'created_at', 'updated_at', 'last_message'
        ]
    
    def get_last_message(self, obj):
        last_message = obj.messages.order_by('-created_at').first()
        if last_message:
            return {
                'content': last_message.content[:100] + ('...' if len(last_message.content) > 100 else ''),
                'role': last_message.role,
                'created_at': last_message.created_at.strftime('%Y-%m-%d %H:%M:%S')
            }
        return None

class ConversationCreateSerializer(serializers.ModelSerializer):
    ai_model_id = serializers.IntegerField(required=False)
    document_ids = serializers.ListField(
        child=serializers.UUIDField(), 
        required=False, 
        allow_empty=True
    )
    
    class Meta:
        model = Conversation
        fields = ['title', 'ai_model_id', 'document_ids']
    
    def validate_ai_model_id(self, value):
        if value:
            try:
                AIModel.objects.get(id=value, is_active=True)
            except AIModel.DoesNotExist:
                raise serializers.ValidationError("Invalid AI model selected")
        return value
    
    def validate_document_ids(self, value):
        if value:
            user = self.context['request'].user
            existing_documents = Document.objects.filter(
                id__in=value, 
                user=user
            ).count()
            
            if existing_documents != len(value):
                raise serializers.ValidationError("One or more documents don't exist or don't belong to you")
        
        return value
    
    def create(self, validated_data):
        ai_model_id = validated_data.pop('ai_model_id', None)
        validated_data.pop('document_ids', None)  # Handle separately in view
        
        if ai_model_id:
            validated_data['ai_model'] = AIModel.objects.get(id=ai_model_id)
        else:
            # Use default active model
            default_model = AIModel.objects.filter(is_active=True).first()
            if default_model:
                validated_data['ai_model'] = default_model
        
        return super().create(validated_data)

class MessageCreateSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=10000)
    
    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError("Message content cannot be empty")
        return value.strip()