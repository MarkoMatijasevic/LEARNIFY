"""
Learnify AI - Test Generation Service
Uses Google Gemini AI to generate practice tests from document content
"""
import os
import json
import time
import logging
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from django.conf import settings
from .models import Document, DocumentTest

logger = logging.getLogger(__name__)


class TestGenerationService:
    """
    Service for generating AI-powered practice tests from documents.
    Uses Google Gemini to create 20 random multiple-choice questions.
    """
    
    def __init__(self):
        """Initialize the Gemini AI client"""
        # Get API key from Django settings (which reads from .env via decouple)
        api_key = settings.GEMINI_API_KEY
        
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured in settings")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        logger.info("✅ TestGenerationService initialized with Gemini 2.5 Flash")
    
    def generate_test(self, document: Document, user) -> DocumentTest:
        """
        Generate a 20-question test from document content.
        
        Args:
            document: Document object containing the text to generate questions from
            user: User object who is creating the test
            
        Returns:
            DocumentTest object with generated questions
            
        Raises:
            ValueError: If document has no text or is not ready
            Exception: If AI generation fails
        """
        # Validate document
        if not document.is_ready:
            raise ValueError("Document is not ready for test generation")
        
        if not document.extracted_text or len(document.extracted_text.strip()) < 100:
            raise ValueError("Document does not have enough text content for test generation")
        
        # Create test object
        test = DocumentTest.objects.create(
            document=document,
            created_by=user,
            title=f"Practice Test - {document.title}",
            question_count=20,
            status='generating'
        )
        
        logger.info(f"📝 Generating test {test.id} for document {document.id}")
        start_time = time.time()
        
        try:
            # Generate questions using Gemini
            questions = self._generate_questions_with_gemini(document.extracted_text)
            
            # Validate we got 20 questions
            if len(questions) != 20:
                raise ValueError(f"Expected 20 questions, got {len(questions)}")
            
            # Save questions to test
            test.questions = questions
            test.status = 'ready'
            test.generation_time_seconds = time.time() - start_time
            test.save()
            
            logger.info(f"✅ Test {test.id} generated successfully in {test.generation_time_seconds:.2f}s")
            return test
            
        except Exception as e:
            logger.error(f"❌ Test generation failed for test {test.id}: {str(e)}")
            test.status = 'error'
            test.generation_error = str(e)
            test.save()
            raise
    
    def _generate_questions_with_gemini(self, document_text: str) -> List[Dict[str, Any]]:
        """
        Use Gemini AI to generate 20 multiple-choice questions.
        
        Args:
            document_text: The full text content of the document
            
        Returns:
            List of 20 question dictionaries
        """
        # Truncate text if too long (Gemini has token limits)
        max_chars = 30000  # ~7500 tokens
        if len(document_text) > max_chars:
            logger.warning(f"Document text too long ({len(document_text)} chars), truncating to {max_chars}")
            document_text = document_text[:max_chars] + "..."
        
        # Create the prompt
        prompt = self._create_test_generation_prompt(document_text)
        
        # Call Gemini API
        logger.info("🤖 Calling Gemini API to generate questions...")
        response = self.model.generate_content(prompt)
        
        # Parse response
        questions = self._parse_gemini_response(response.text)
        
        return questions
    
    def _create_test_generation_prompt(self, document_text: str) -> str:
        """
        Create a detailed prompt for Gemini to generate test questions.
        
        Args:
            document_text: The document content
            
        Returns:
            Formatted prompt string
        """
        prompt = f"""You are an expert educational assessment creator. Your task is to generate a practice test based on the following document content.

DOCUMENT CONTENT:
{document_text}

INSTRUCTIONS:
Generate exactly 20 multiple-choice questions based on the document content above. Each question should:
1. Test important concepts, facts, or ideas from the document
2. Have exactly 3 answer options labeled A, B, and C
3. Have only ONE correct answer
4. Include a detailed explanation of why the correct answer is right
5. Be clear, unambiguous, and appropriate for studying
6. Cover different parts of the document (ensure variety)
7. Range from basic recall to deeper understanding

CRITICAL: You must respond with ONLY valid JSON. Do not include any text before or after the JSON. Do not use markdown code blocks.

OUTPUT FORMAT (respond with this exact JSON structure):
[
  {{
    "id": 1,
    "question": "What is the main topic of the document?",
    "options": {{
      "A": "First option text",
      "B": "Second option text",
      "C": "Third option text"
    }},
    "correct_answer": "A",
    "explanation": "Detailed explanation of why A is correct and why B and C are incorrect."
  }},
  {{
    "id": 2,
    "question": "Second question text here?",
    "options": {{
      "A": "First option",
      "B": "Second option",
      "C": "Third option"
    }},
    "correct_answer": "B",
    "explanation": "Explanation for question 2."
  }}
  ... (continue for all 20 questions)
]

IMPORTANT RULES:
- Generate EXACTLY 20 questions (no more, no less)
- Each question MUST have exactly 3 options (A, B, C)
- Each question MUST have exactly one correct answer
- IDs must be numbered 1 through 20
- Respond with ONLY the JSON array, nothing else
- Do NOT wrap the JSON in markdown code blocks
- Do NOT include any explanatory text before or after the JSON
- Ensure the JSON is valid and properly formatted

Generate the 20 questions now:"""
        
        return prompt
    
    def _parse_gemini_response(self, response_text: str) -> List[Dict[str, Any]]:
        """
        Parse Gemini's JSON response into question objects.
        
        Args:
            response_text: Raw text response from Gemini
            
        Returns:
            List of 20 question dictionaries
            
        Raises:
            ValueError: If response is not valid JSON or doesn't have 20 questions
        """
        # Clean up response (remove markdown code blocks if present)
        cleaned_text = response_text.strip()
        
        # Remove markdown code blocks if present
        if cleaned_text.startswith('```json'):
            cleaned_text = cleaned_text[7:]  # Remove ```json
        elif cleaned_text.startswith('```'):
            cleaned_text = cleaned_text[3:]   # Remove ```
        
        if cleaned_text.endswith('```'):
            cleaned_text = cleaned_text[:-3]  # Remove trailing ```
        
        cleaned_text = cleaned_text.strip()
        
        # Parse JSON
        try:
            questions = json.loads(cleaned_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            logger.error(f"Response text: {response_text[:500]}...")
            raise ValueError(f"Invalid JSON response from AI: {str(e)}")
        
        # Validate structure
        if not isinstance(questions, list):
            raise ValueError("Response must be a JSON array of questions")
        
        if len(questions) != 20:
            raise ValueError(f"Expected 20 questions, got {len(questions)}")
        
        # Validate each question
        for i, q in enumerate(questions, 1):
            self._validate_question(q, i)
        
        logger.info(f"✅ Successfully parsed {len(questions)} questions from Gemini response")
        return questions
    
    def _validate_question(self, question: Dict[str, Any], expected_id: int) -> None:
        """
        Validate a single question has the required structure.
        
        Args:
            question: Question dictionary to validate
            expected_id: Expected question ID
            
        Raises:
            ValueError: If question structure is invalid
        """
        required_fields = ['id', 'question', 'options', 'correct_answer', 'explanation']
        
        # Check all required fields exist
        for field in required_fields:
            if field not in question:
                raise ValueError(f"Question {expected_id} missing required field: {field}")
        
        # Validate ID
        if question['id'] != expected_id:
            raise ValueError(f"Question ID mismatch: expected {expected_id}, got {question['id']}")
        
        # Validate options
        options = question['options']
        if not isinstance(options, dict):
            raise ValueError(f"Question {expected_id}: options must be a dictionary")
        
        required_options = ['A', 'B', 'C']
        for opt in required_options:
            if opt not in options:
                raise ValueError(f"Question {expected_id}: missing option {opt}")
            if not isinstance(options[opt], str) or not options[opt].strip():
                raise ValueError(f"Question {expected_id}: option {opt} must be a non-empty string")
        
        # Validate correct answer
        if question['correct_answer'] not in ['A', 'B', 'C']:
            raise ValueError(f"Question {expected_id}: correct_answer must be A, B, or C")
        
        # Validate question text
        if not isinstance(question['question'], str) or not question['question'].strip():
            raise ValueError(f"Question {expected_id}: question text must be a non-empty string")
        
        # Validate explanation
        if not isinstance(question['explanation'], str) or not question['explanation'].strip():
            raise ValueError(f"Question {expected_id}: explanation must be a non-empty string")