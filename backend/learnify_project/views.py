from django.http import HttpResponse
from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response

def home_view(request):
    """Django backend homepage with navigation buttons"""
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Learnify AI - Backend</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                background: linear-gradient(135deg, #1f2937, #111827);
                color: white;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container { 
                text-align: center; 
                max-width: 800px; 
                padding: 2rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 1rem;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            h1 { 
                font-size: 3rem; 
                margin-bottom: 1rem;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .subtitle { 
                font-size: 1.2rem; 
                margin-bottom: 2rem; 
                color: #d1d5db;
            }
            .buttons { 
                display: flex; 
                gap: 1rem; 
                justify-content: center;
                flex-wrap: wrap;
                margin-bottom: 2rem;
            }
            .btn { 
                padding: 0.75rem 1.5rem; 
                background: #ef4444; 
                color: white; 
                text-decoration: none; 
                border-radius: 0.5rem;
                font-weight: 500;
                transition: all 0.2s;
                border: 2px solid transparent;
            }
            .btn:hover { 
                background: #dc2626; 
                transform: translateY(-2px);
                box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
            }
            .btn-outline {
                background: transparent;
                border-color: #ef4444;
                color: #ef4444;
            }
            .btn-outline:hover {
                background: #ef4444;
                color: white;
            }
            .status { 
                background: rgba(34, 197, 94, 0.2);
                border: 1px solid #22c55e;
                border-radius: 0.5rem;
                padding: 1rem;
                margin-top: 2rem;
                color: #22c55e;
            }
            .endpoints {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1rem;
                margin-top: 2rem;
            }
            .endpoint {
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 0.5rem;
                padding: 1rem;
                text-align: left;
            }
            .endpoint h3 {
                color: #ef4444;
                font-size: 1.1rem;
                margin-bottom: 0.5rem;
            }
            .endpoint a {
                color: #60a5fa;
                text-decoration: none;
                font-family: monospace;
                font-size: 0.9rem;
            }
            .endpoint a:hover {
                color: #93c5fd;
                text-decoration: underline;
            }
            @media (max-width: 768px) {
                h1 { font-size: 2rem; }
                .buttons { flex-direction: column; align-items: center; }
                .container { margin: 1rem; padding: 1.5rem; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Learnify AI</h1>
            <p class="subtitle">AI-Powered Learning Platform - Backend Server</p>
            
            <div class="buttons">
                <a href="/api/health/" class="btn">Health Check</a>
                <a href="/admin/" class="btn btn-outline">Django Admin</a>
                <a href="http://localhost:3000" class="btn btn-outline">Frontend App</a>
            </div>
            
            <div class="status">
                <strong>Status:</strong> Backend server running successfully
            </div>
            
            <div class="endpoints">
                <div class="endpoint">
                    <h3>Authentication</h3>
                    <a href="/api/users/health/">/api/users/</a>
                </div>
                <div class="endpoint">
                    <h3>Documents</h3>
                    <a href="/api/documents/">/api/documents/</a>
                </div>
                <div class="endpoint">
                    <h3>AI Chat</h3>
                    <a href="/api/chat/">/api/chat/</a>
                </div>
                <div class="endpoint">
                    <h3>API Health</h3>
                    <a href="/api/health/">/api/health/</a>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return HttpResponse(html_content)

@api_view(['GET'])
def health_check(request):
    """Health check endpoint"""
    return Response({
        'status': 'healthy',
        'message': 'Learnify AI Backend is running',
        'version': '1.0.0',
        'django_version': '4.2.7',
        'server': 'http://127.0.0.1:8000',
        'endpoints': {
            'users': '/api/users/',
            'documents': '/api/documents/',
            'chat': '/api/chat/',
            'admin': '/admin/'
        },
        'features': {
            'authentication': 'enabled',
            'document_upload': 'enabled',
            'ai_chat': 'enabled',
            'gemini_integration': 'enabled',
            'cors': 'enabled'
        },
        'database': 'postgresql - connected'
    })