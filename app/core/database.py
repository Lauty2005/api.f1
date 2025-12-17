from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# URL de conexión (SQLite)
SQLALCHEMY_DATABASE_URL = "sqlite:///./f1_database.db"

# 1. Crear el motor de la base de datos
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 2. Configurar la sesión
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Base para los modelos
Base = declarative_base()

# --- AQUÍ ESTABA EL ERROR: FALTABA ESTA FUNCIÓN ---
def get_db():
    """
    Dependencia que crea una nueva sesión de DB para cada petición
    y la cierra al terminar.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()