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
    print("--- Iniciando processamento com OpenAI ---")
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    if not text.strip():
        print("Texto vazio, cancelando processamento")
        return None

    prompt = f"""
    Você é um assistente especializado em extrair dados de comprovantes de PIX brasileiros.
    Extraia as seguintes informações do texto abaixo e retorne APENAS um JSON válido.
    
    Campos necessários:
    - amount (float): O valor da transação.
    - description (string): O nome da pessoa/empresa (quem enviou ou recebeu).
    - date (string): A data no formato ISO (YYYY-MM-DD).
    - type (string): 'income' se for um recebimento/crédito, 'expense' se for um pagamento/transferência/envio.

    Se não conseguir encontrar algum campo, use null.
    
    TEXTO DO COMPROVANTE:
    ---
    {text}
    ---
    """

    try:
        print("Enviando requisição para OpenAI (gpt-4o-mini)...")
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Você é um extrator de dados JSON preciso."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        print(f"Sucesso! Dados extraídos: {result}")
        return result
    except Exception as e:
        print(f"Erro ao processar texto com OpenAI: {e}")
        return None
