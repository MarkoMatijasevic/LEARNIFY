from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .views import home_view, health_check

@api_view(['GET'])
def api_health(request):
    """Main API health check endpoint"""
    return Response({
        'status': 'healthy', 
        'message': 'Learnify API is running',
        'version': '1.0.0',
        'endpoints': {
            'admin': '/admin/',
            'api': '/api/',
            'users': '/api/users/',
            'documents': '/api/documents/',
            'chat': '/api/chat/',
            'health': '/api/health/'
        }
    })

urlpatterns = [
    # Admin interface
    path('admin/', admin.site.urls),
    
    # Root path - Django backend home
    path('', home_view, name='home'),
    
    # API health checks
    path('api/health/', api_health, name='api_health'),
    path('health/', health_check, name='main_health'),
    
    # API endpoints
    path('api/users/', include('apps.users.urls')),
    path('api/documents/', include('apps.documents.urls')),
    path('api/chat/', include('apps.chat.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)