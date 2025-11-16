"""
Learnify AI - User URLs
API routes for authentication and user management
"""
from django.urls import path
from users.views import (
    UserRegistrationView,
    UserLoginView,
    UserLogoutView,
    UserProfileView,
    UserUpdateView,
    PasswordChangeView,
    DashboardStatsView,
    CustomTokenRefreshView,
    google_oauth_callback,
    user_health_check,
)

app_name = 'users'

urlpatterns = [
    # Health check
    path('health/', user_health_check, name='user_health'),
    
    # Authentication endpoints
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('logout/', UserLogoutView.as_view(), name='logout'),
    
    # Token management
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    
    # Profile management
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('profile/update/', UserUpdateView.as_view(), name='profile_update'),
    path('password/change/', PasswordChangeView.as_view(), name='password_change'),
    
    # Dashboard
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    
    # OAuth (placeholder)
    path('oauth/google/', google_oauth_callback, name='google_oauth'),
]