"""
Learnify AI - User Views
API endpoints for authentication and user management
"""
from datetime import timedelta, datetime
from django.utils import timezone
from django.contrib.auth import login, logout
from django.db.models import Count, Q
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from users.models import User
from users.serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer, 
    UserProfileSerializer,
    UserUpdateSerializer,
    PasswordChangeSerializer,
    DashboardStatsSerializer
)

class UserRegistrationView(APIView):
    """Register a new user"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            # Update last activity
            user.last_activity = timezone.now()
            user.save(update_fields=['last_activity'])
            
            return Response({
                'message': 'User registered successfully',
                'user': UserProfileSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserLoginView(APIView):
    """Login user"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            
            # Update last activity
            user.last_activity = timezone.now()
            user.save(update_fields=['last_activity'])
            
            return Response({
                'message': 'Login successful',
                'user': UserProfileSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserLogoutView(APIView):
    """Logout user by blacklisting refresh token"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
                
            return Response({
                'message': 'Successfully logged out'
            }, status=status.HTTP_200_OK)
        
        except TokenError:
            return Response({
                'error': 'Invalid token'
            }, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(APIView):
    """Get user profile"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

class UserUpdateView(APIView):
    """Update user profile"""
    permission_classes = [permissions.IsAuthenticated]
    
    def put(self, request):
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'message': 'Profile updated successfully',
                'user': UserProfileSerializer(user).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordChangeView(APIView):
    """Change user password"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Password changed successfully'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DashboardStatsView(APIView):
    """Get user dashboard statistics"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        
        # Calculate basic stats
        total_documents = 0
        total_conversations = 0
        documents_this_week = 0
        conversations_this_week = 0
        
        # Try to get document and conversation counts (will be 0 until models are created)
        try:
            total_documents = user.documents.count()
            documents_this_week = user.documents.filter(created_at__gte=week_ago).count()
        except AttributeError:
            # Documents model doesn't exist yet
            pass
        
        try:
            total_conversations = user.conversations.count()
            conversations_this_week = user.conversations.filter(created_at__gte=week_ago).count()
        except AttributeError:
            # Conversations model doesn't exist yet
            pass
        
        # Study time in hours
        total_study_time_hours = round(user.total_study_time / 60, 1)
        
        # Calculate study streak (simplified - consecutive days of activity)
        study_streak_days = self._calculate_study_streak(user)
        
        # Favorite study time (based on when user is most active)
        favorite_study_time = self._get_favorite_study_time(user)
        
        # Learning progress (placeholder for now)
        learning_progress = {
            'documents_processed': total_documents,
            'study_hours_completed': total_study_time_hours,
            'learning_goals_set': bool(user.learning_goals),
            'profile_completion': self._calculate_profile_completion(user)
        }
        
        stats_data = {
            'total_documents': total_documents,
            'total_conversations': total_conversations,
            'total_study_time_hours': total_study_time_hours,
            'documents_this_week': documents_this_week,
            'conversations_this_week': conversations_this_week,
            'study_streak_days': study_streak_days,
            'favorite_study_time': favorite_study_time,
            'learning_progress': learning_progress
        }
        
        serializer = DashboardStatsSerializer(stats_data)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def _calculate_study_streak(self, user):
        """Calculate consecutive days of study activity"""
        # Simplified calculation - days since last activity
        if user.last_activity:
            days_since_activity = (timezone.now() - user.last_activity).days
            return max(0, 7 - days_since_activity)  # Max 7 day streak for now
        return 0
    
    def _get_favorite_study_time(self, user):
        """Get user's preferred study time"""
        hour = timezone.now().hour
        if 6 <= hour < 12:
            return "Morning"
        elif 12 <= hour < 17:
            return "Afternoon"
        elif 17 <= hour < 21:
            return "Evening"
        else:
            return "Night"
    
    def _calculate_profile_completion(self, user):
        """Calculate profile completion percentage"""
        fields_to_check = [
            user.first_name,
            user.last_name,
            user.bio,
            user.learning_goals,
            user.profile_picture
        ]
        completed_fields = sum(1 for field in fields_to_check if field)
        return round((completed_fields / len(fields_to_check)) * 100)

class CustomTokenRefreshView(TokenRefreshView):
    """Custom token refresh view with additional user data"""
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            # Add user data to response
            try:
                refresh_token = request.data.get('refresh')
                if refresh_token:
                    refresh = RefreshToken(refresh_token)
                    user_id = refresh.payload.get('user_id')
                    if user_id:
                        user = User.objects.get(id=user_id)
                        response.data['user'] = UserProfileSerializer(user).data
            except (TokenError, User.DoesNotExist):
                pass
                
        return response

# Google OAuth placeholder view
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def google_oauth_callback(request):
    """Handle Google OAuth callback (placeholder)"""
    return Response({
        'message': 'Google OAuth not implemented yet',
        'error': 'Please use regular email/password authentication for now'
    }, status=status.HTTP_501_NOT_IMPLEMENTED)

# Health check for user service
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def user_health_check(request):
    """Health check for user service"""
    return Response({
        'status': 'healthy',
        'service': 'users',
        'total_users': User.objects.count(),
        'active_users_today': User.objects.filter(
            last_activity__date=timezone.now().date()
        ).count()
    }, status=status.HTTP_200_OK)