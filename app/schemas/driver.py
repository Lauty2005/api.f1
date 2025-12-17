from pydantic import BaseModel
from typing import Optional

# Base para atributos compartidos
class DriverBase(BaseModel):
    first_name: str
    last_name: str
    number: int
    country: str

# Schema para crear un piloto (entrada)
class DriverCreate(DriverBase):
    team_id: int

# Schema para leer un piloto (salida - incluye ID)
class DriverResponse(DriverBase):
    id: int
    team_id: Optional[int] = None

    class Config:
        from_attributes = True # Permite leer desde el modelo ORM