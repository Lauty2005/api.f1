from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

# 1. IMPORTS CORRECTOS
from app.core.database import get_db
# Importamos directamente la clase Driver desde el archivo driver.py
from app.models.driver import Driver 
from app.schemas.driver import DriverResponse, DriverCreate

print("--- CARGANDO EL ARCHIVO DRIVERS CORRECTO ---")

router = APIRouter()

# GET (Lista)
@router.get("/", response_model=List[DriverResponse])
def read_drivers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Driver).offset(skip).limit(limit).all()

# POST (Crear)
@router.post("/", response_model=DriverResponse)
def create_driver(driver: DriverCreate, db: Session = Depends(get_db)):
    db_driver = Driver(**driver.dict())
    db.add(db_driver)
    db.commit()
    db.refresh(db_driver)
    return db_driver

# DELETE (Eliminar) - EL NUEVO CÓDIGO
@router.delete("/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_driver(driver_id: int, db: Session = Depends(get_db)):
    # Usamos 'Driver' directamente (ya no 'models.Driver')
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    
    if driver is None:
        raise HTTPException(status_code=404, detail="Piloto no encontrado")
    
    db.delete(driver)
    db.commit()
    
    return None

# --- PUT (Actualizar) ---
@router.put("/{driver_id}", response_model=DriverResponse)
def update_driver(driver_id: int, driver_update: DriverCreate, db: Session = Depends(get_db)):
    """Actualiza los datos de un piloto existente"""
    
    # 1. Buscar el piloto en la BD
    db_driver = db.query(Driver).filter(Driver.id == driver_id).first()
    
    # 2. Si no existe, error 404
    if db_driver is None:
        raise HTTPException(status_code=404, detail="Piloto no encontrado")
    
    # 3. Actualizar campos (Iteramos sobre los datos nuevos)
    # Excluimos campos que no se deben tocar (si los hubiera)
    for key, value in driver_update.dict().items():
        setattr(db_driver, key, value)
    
    # 4. Guardar cambios
    db.commit()
    db.refresh(db_driver)
    
    return db_driver