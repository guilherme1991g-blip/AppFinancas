import os
import json
from pypdf import PdfReader
from openai import OpenAI
from typing import Optional, Dict

def extract_text_from_pdf(file_path: str) -> str:
    """Extracts all text from a PDF file."""
    try:
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return ""

def parse_pix_text(text: str) -> Optional[Dict]:
    """Parses PIX receipt text using OpenAI GPT-4o-mini."""
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    if not text.strip():
        return None

    prompt = f"""
    Você é um assistente especializado em extrair dados de comprovantes de PIX brasileiros.
    Extraia as seguintes informações do texto abaixo e retorne APENAS um JSON válido.
    
    Campos necessários:
    - amount (float): O valor da transação.
    - description (string): O nome do destinatário ou a descrição do pagamento.
    - date (string): A data no formato ISO (YYYY-MM-DD).
    - type (string): Sempre 'expense'.

    Se não conseguir encontrar algum campo, use null.
    
    TEXTO DO COMPROVANTE:
    ---
    {text}
    ---
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Você é um extrator de dados JSON preciso."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        return result
    except Exception as e:
        print(f"Error parsing PIX text with OpenAI: {e}")
        return None
