import sys
import os

print("\n🔍 --- INICIANDO DIAGNÓSTICO ---")

try:
    # Intenta importar el archivo de rutas (el que da problemas)
    from app.routers.api_v1.endpoints import drivers
    print("✅ Archivo 'drivers.py' encontrado y cargado correctamente.")
except Exception as e:
    print(f"❌ ERROR CRÍTICO importando drivers:\n   ---> {e}")

try:
    # Intenta importar el main
    from app.main import app
    print("✅ Archivo 'main.py' encontrado y cargado correctamente.")
except Exception as e:
    print(f"❌ ERROR CRÍTICO importando main:\n   ---> {e}")

print("---------------------------------\n")