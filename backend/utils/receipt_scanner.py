import os
import json
import base64
from typing import Optional, Dict
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def encode_image(image_path: str) -> str:
    """Encodes an image file to base64 string."""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def parse_receipt_image(image_path: str) -> Optional[Dict]:
    """Parses a credit card receipt image using OpenAI Vision."""
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    base64_image = encode_image(image_path)

    prompt = """
    Você é um assistente especializado em extrair dados de comprovantes de cartões de débito/crédito brasileiros.
    Analise a imagem do comprovante e extraia as seguintes informações no formato JSON:
    
    Campos necessários:
    - amount (float): O valor total da transação.
    - description (string): O nome do estabelecimento/loja.
    - date (string): A data no formato ISO (YYYY-MM-DD).
    - installments (int): O número de parcelas (se for à vista, use 1).
    - card_last_digits (string): Os últimos 4 dígitos do cartão (ex: "1234"). Se não encontrar, use null.
    - type (string): 'expense'.
    
    Retorne APENAS o JSON válido.
    """

    try:
        print(f"--- Iniciando análise de imagem com OpenAI Vision ---")
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            },
                        },
                    ],
                }
            ],
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        print(f"Sucesso! Dados extraídos da imagem: {result}")
        return result
    except Exception as e:
        print(f"Erro ao processar imagem com OpenAI: {e}")
        return None
