from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    base = Column(String)
    
    # Relación inversa
    drivers = relationship("Driver", back_populates="team")

class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True)
    last_name = Column(String, index=True)
    number = Column(Integer, unique=True)
    country = Column(String)
    team_id = Column(Integer, ForeignKey("teams.id"))

    # Relación
    team = relationship("Team", back_populates="drivers")