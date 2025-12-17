import os
import shutil
import uuid
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Date, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from typing import List, Optional
from datetime import date

# Obtener la ruta exacta donde está este archivo main.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Definir la carpeta de imágenes usando la ruta absoluta
STATIC_DIR = os.path.join(BASE_DIR, "static")
IMAGEDIR = os.path.join(STATIC_DIR, "images")

# Crear las carpetas si no existen (Recursivo para asegurar)
os.makedirs(IMAGEDIR, exist_ok=True)

# --- CONFIGURACIÓN BASE DE DATOS ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./f1_database.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- CONSTANTES ---
POINTS_RACE = {1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1}
POINTS_SPRINT = {1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1}

# --- MODELOS DB ---
class DriverDB(Base):
    __tablename__ = "drivers"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    team = Column(String)
    country = Column(String)
    number = Column(Integer)
    birth_date = Column(Date)

class ConstructorDB(Base):
    __tablename__ = "constructors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    principal = Column(String)
    base_country = Column(String)
    image_url = Column(String) # URL o Ruta Local

class CircuitDB(Base):
    __tablename__ = "circuits"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    country = Column(String)
    length_km = Column(Float)
    laps = Column(Integer)
    race_time = Column(String)
    qualifying_time = Column(String)
    sprint_time = Column(String)
    sprint_qualifying_time = Column(String)
    fp1_time = Column(String)
    fp2_time = Column(String)
    fp3_time = Column(String)
    image_url = Column(String) # URL o Ruta Local

class ResultDB(Base):
    __tablename__ = "results"
    id = Column(Integer, primary_key=True, index=True)
    circuit_id = Column(Integer, ForeignKey("circuits.id"))
    driver_id = Column(Integer, ForeignKey("drivers.id"))
    position = Column(Integer)
    race_type = Column(String)
    points = Column(Integer)
    driver = relationship("DriverDB")
    circuit = relationship("CircuitDB")

Base.metadata.create_all(bind=engine)

# --- SCHEMAS ---
class DriverResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    team: str
    country: str
    number: int
    birth_date: date
    class Config: from_attributes = True

class ConstructorResponse(BaseModel):
    id: int
    name: str
    principal: str
    base_country: str
    image_url: str
    class Config: from_attributes = True

class CircuitResponse(BaseModel):
    id: int
    name: str
    country: str
    length_km: float
    laps: int
    race_time: str
    qualifying_time: str
    sprint_time: Optional[str] = "N/A"
    sprint_qualifying_time: Optional[str] = "N/A"
    fp1_time: Optional[str] = "N/A"
    fp2_time: Optional[str] = "N/A"
    fp3_time: Optional[str] = "N/A"
    image_url: str
    class Config: from_attributes = True

class ResultCreate(BaseModel):
    circuit_id: int
    driver_id: int
    position: int
    race_type: str

class ResultResponse(BaseModel):
    id: int
    position: int
    race_type: str
    points: int
    driver: DriverResponse
    circuit: CircuitResponse
    class Config: from_attributes = True

# --- APP ---
app = FastAPI(title="F1 API Elite")
app.mount("/static", StaticFiles(directory="static"), name="static")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal(); 
    try: yield db; 
    finally: db.close()

def save_upload_file(upload_file: UploadFile) -> str:
    if not upload_file or not upload_file.filename:
        return None
    
    try:
        # Generar nombre único
        filename = f"{uuid.uuid4()}_{upload_file.filename}"
        
        # Ruta completa del archivo en el disco
        file_path = os.path.join(IMAGEDIR, filename)
        
        # Guardar
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
            
        # Retornar la URL relativa para el navegador
        return f"/static/images/{filename}"
        
    except Exception as e:
        print(f"❌ ERROR AL GUARDAR IMAGEN: {e}")
        return None

# ... después de crear la 'app' ...

# 1. Servir la página principal
@app.get("/")
def read_root():
    return FileResponse("index.html")

# 2. Servir los estilos CSS
@app.get("/style.css")
def read_css():
    return FileResponse("style.css")

# 3. Servir el JavaScript
@app.get("/app.js")
def read_js():
    return FileResponse("app.js")

# ... luego siguen tus endpoints de la API (/api/drivers, etc) ...

# --- ENDPOINTS ---
@app.get("/api/drivers", response_model=List[DriverResponse])
def get_drivers(db: Session = Depends(get_db)): return db.query(DriverDB).all()
@app.post("/api/drivers", response_model=DriverResponse)
def create_driver(
    first_name: str = Form(...), last_name: str = Form(...),
    team: str = Form(...), country: str = Form(...),
    number: int = Form(...), birth_date: date = Form(...),
    db: Session = Depends(get_db)
):
    x = DriverDB(first_name=first_name, last_name=last_name, team=team, country=country, number=number, birth_date=birth_date)
    db.add(x); db.commit(); db.refresh(x); return x
@app.delete("/api/drivers/{id}", status_code=204)
def delete_driver(id: int, db: Session = Depends(get_db)):
    x=db.query(DriverDB).filter(DriverDB.id==id).first(); 
    if x: db.delete(x); db.commit()

@app.get("/api/constructors", response_model=List[ConstructorResponse])
def get_constructors(db: Session = Depends(get_db)): return db.query(ConstructorDB).all()
@app.post("/api/constructors", response_model=ConstructorResponse)
def create_constructor(
    name: str = Form(...), principal: str = Form(...),
    base_country: str = Form(...), image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    url = save_upload_file(image)
    x = ConstructorDB(name=name, principal=principal, base_country=base_country, image_url=url)
    db.add(x); db.commit(); db.refresh(x); return x
@app.delete("/api/constructors/{id}", status_code=204)
def delete_constructor(id: int, db: Session = Depends(get_db)):
    x=db.query(ConstructorDB).filter(ConstructorDB.id==id).first(); 
    if x: db.delete(x); db.commit()

@app.get("/api/circuits", response_model=List[CircuitResponse])
def get_circuits(db: Session = Depends(get_db)): return db.query(CircuitDB).all()
@app.post("/api/circuits", response_model=CircuitResponse)
def create_circuit(
    name: str = Form(...), country: str = Form(...),
    length_km: float = Form(...), laps: int = Form(...),
    race_time: str = Form(...), qualifying_time: str = Form(...),
    sprint_time: Optional[str] = Form("N/A"),
    sprint_qualifying_time: Optional[str] = Form("N/A"),
    fp1_time: Optional[str] = Form("N/A"),
    fp2_time: Optional[str] = Form("N/A"),
    fp3_time: Optional[str] = Form("N/A"),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    url = save_upload_file(image)
    x = CircuitDB(
        name=name, country=country, length_km=length_km, laps=laps,
        race_time=race_time, qualifying_time=qualifying_time,
        sprint_time=sprint_time, sprint_qualifying_time=sprint_qualifying_time,
        fp1_time=fp1_time, fp2_time=fp2_time, fp3_time=fp3_time,
        image_url=url
    )
    db.add(x); db.commit(); db.refresh(x); return x
@app.delete("/api/circuits/{id}", status_code=204)
def delete_circuit(id: int, db: Session = Depends(get_db)):
    x=db.query(CircuitDB).filter(CircuitDB.id==id).first(); 
    if x: db.delete(x); db.commit()

@app.get("/api/results", response_model=List[ResultResponse])
def get_results(db: Session = Depends(get_db)):
    return db.query(ResultDB).order_by(ResultDB.circuit_id, ResultDB.race_type, ResultDB.position).all()
@app.post("/api/results", response_model=ResultResponse)
def create_result(r: ResultCreate, db: Session = Depends(get_db)):
    points = POINTS_SPRINT.get(r.position, 0) if r.race_type == "Sprint" else POINTS_RACE.get(r.position, 0)
    db_result = ResultDB(circuit_id=r.circuit_id, driver_id=r.driver_id, position=r.position, race_type=r.race_type, points=points)
    db.add(db_result); db.commit(); db.refresh(db_result)
    return db_result
@app.delete("/api/results/{id}", status_code=204)
def delete_result(id: int, db: Session = Depends(get_db)):
    x=db.query(ResultDB).filter(ResultDB.id==id).first(); 
    if x: db.delete(x); db.commit()

# --- SEED (Usa URLs externas para probar rápido, pero el sistema acepta locales) ---
@app.post("/api/seed")
def seed_data(db: Session = Depends(get_db)):
    if db.query(ConstructorDB).count() == 0:
        db.add_all([
            ConstructorDB(name="Red Bull Racing", principal="Christian Horner", base_country="UK", image_url="https://upload.wikimedia.org/wikipedia/en/c/c4/Red_Bull_Racing_logo.svg"),
            ConstructorDB(name="Ferrari", principal="Fred Vasseur", base_country="Italy", image_url="https://upload.wikimedia.org/wikipedia/de/c/c0/Scuderia_Ferrari_Logo.svg")
        ])
    if db.query(DriverDB).count() == 0:
        db.add_all([
            DriverDB(first_name="Max", last_name="Verstappen", team="Red Bull Racing", country="Netherlands", number=1, birth_date=date(1997, 9, 30))
        ])
    if db.query(CircuitDB).count() == 0:
        db.add_all([
            CircuitDB(name="Monza", country="Italy", length_km=5.793, laps=53, race_time="15:00", qualifying_time="16:00", sprint_time="N/A", sprint_qualifying_time="N/A", fp1_time="13:30", fp2_time="17:00", fp3_time="12:30", image_url="https://upload.wikimedia.org/wikipedia/commons/b/b8/Monza_track_map.svg")
        ])
    db.commit()
    return {"message": "Datos de prueba insertados"}

# --- AGREGA ESTO EN main.py ---

@app.get("/api/results/driver/{driver_id}", response_model=List[ResultResponse])
def get_driver_results(driver_id: int, db: Session = Depends(get_db)):
    return db.query(ResultDB).filter(ResultDB.driver_id == driver_id).all()