"""
Learnify AI - User Serializers
Handles user authentication and profile data serialization
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from users.models import User

class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'learning_goals',
            'preferred_study_time', 'email_notifications'
        ]

    def validate_email(self, value):
        """Validate email uniqueness"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        """Validate password confirmation"""
        password = attrs.get('password')
        password_confirm = attrs.pop('password_confirm', None)
        
        if password != password_confirm:
            raise serializers.ValidationError("Passwords do not match.")
        
        # Validate password strength
        try:
            validate_password(password)
        except ValidationError as e:
            raise serializers.ValidationError({'password': e.messages})
        
        return attrs

    def create(self, validated_data):
        """Create new user"""
        validated_data.pop('password_confirm', None)
        user = User.objects.create_user(**validated_data)
        return user

class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        """Validate user credentials"""
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = authenticate(
                request=self.context.get('request'),
                username=email,
                password=password
            )
            
            if not user:
                raise serializers.ValidationError(
                    "Unable to log in with provided credentials."
                )
            
            if not user.is_active:
                raise serializers.ValidationError(
                    "User account is disabled."
                )
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError(
                "Must include email and password."
            )

class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile management"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    total_documents = serializers.SerializerMethodField()
    total_conversations = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'profile_picture', 'bio', 'learning_goals', 'preferred_study_time',
            'last_activity', 'total_study_time', 'materials_uploaded',
            'email_notifications', 'is_premium', 'created_at',
            'total_documents', 'total_conversations'
        ]
        read_only_fields = [
            'id', 'email', 'last_activity', 'total_study_time', 
            'materials_uploaded', 'created_at'
        ]

    def get_total_documents(self, obj):
        """Get total number of documents uploaded by user"""
        return getattr(obj, 'documents', obj.documents).count() if hasattr(obj, 'documents') else 0

    def get_total_conversations(self, obj):
        """Get total number of conversations by user"""
        return getattr(obj, 'conversations', obj.conversations).count() if hasattr(obj, 'conversations') else 0

class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile"""
    
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'profile_picture', 'bio',
            'learning_goals', 'preferred_study_time', 'email_notifications'
        ]

    def validate_preferred_study_time(self, value):
        """Validate study time is reasonable"""
        if value < 5 or value > 300:
            raise serializers.ValidationError(
                "Study time must be between 5 and 300 minutes."
            )
        return value

class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change"""
    current_password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )

    def validate_current_password(self, value):
        """Validate current password"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        """Validate new password confirmation"""
        new_password = attrs.get('new_password')
        new_password_confirm = attrs.get('new_password_confirm')
        
        if new_password != new_password_confirm:
            raise serializers.ValidationError("New passwords do not match.")
        
        # Validate password strength
        try:
            validate_password(new_password, user=self.context['request'].user)
        except ValidationError as e:
            raise serializers.ValidationError({'new_password': e.messages})
        
        return attrs

    def save(self):
        """Save new password"""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user

class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for dashboard statistics"""
    total_documents = serializers.IntegerField()
    total_conversations = serializers.IntegerField()
    total_study_time_hours = serializers.FloatField()
    documents_this_week = serializers.IntegerField()
    conversations_this_week = serializers.IntegerField()
    study_streak_days = serializers.IntegerField()
    favorite_study_time = serializers.CharField()
    learning_progress = serializers.DictField()