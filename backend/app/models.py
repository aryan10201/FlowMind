from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .db import Base
import datetime

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    document_metadata = Column(Text, nullable=True)

class Workflow(Base):
    __tablename__ = "workflows"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    definition = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ChatLog(Base):
    __tablename__ = "chat_logs"
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=True)
    user_query = Column(Text)
    response = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
