# 🧠 FlowMind - No-Code AI Workflow Builder

<div align="center">

![FlowMind Logo](https://img.shields.io/badge/FlowMind-No--Code%20AI%20Workflow%20Builder-blue?style=for-the-badge&logo=robot&logoColor=white)

**Build intelligent AI workflows with drag-and-drop simplicity**

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6B6B?style=flat&logo=chromadb&logoColor=white)](https://www.trychroma.com/)

[🚀 Live Demo](https://flow-mind-beige.vercel.app/) • [📖 API Docs](https://flowmind-ikfc.onrender.com/docs#/) • [🛠️ Installation](#️-installation)

</div>

---

## 🌟 Overview

**FlowMind** is a full-stack No-Code/Low-Code web application that enables users to visually create and interact with intelligent AI workflows. Built as a Full-Stack Engineering Internship project, it allows users to configure a flow of components that handle user input, extract knowledge from documents, interact with language models, and return answers through a chat interface.

### 🎯 Key Features

- **🎨 Visual Workflow Designer**: Drag-and-drop interface using React Flow
- **🤖 Multi-LLM Support**: OpenAI GPT, Google Gemini, and Grok integration
- **📚 Document Processing**: PDF text extraction with PyMuPDF and vector embeddings
- **🔍 Web Search Integration**: SERP API and Brave Search capabilities
- **⚡ Real-time Execution**: Live streaming via WebSocket connections
- **💾 Workflow Persistence**: Save, load, and manage workflows in PostgreSQL

---

## 🧩 Core Components

### **Required Workflow Components**

| Component | Purpose | Features |
|-----------|---------|----------|
| **🔵 User Query** | Entry point for user interactions | Query validation, input sanitization |
| **🟢 Knowledge Base** | Document processing and retrieval | PDF parsing with PyMuPDF, OpenAI/Gemini embeddings, ChromaDB storage |
| **🟣 LLM Engine** | AI model orchestration | OpenAI GPT, Gemini, Grok support with streaming responses |
| **⚫ Output** | Result presentation | Chat interface with follow-up questions |

### **Optional Components**
- **🟡 Web Search**: SERP API and Brave Search integration for real-time information

## 🏗️ Tech Stack

### **Frontend**
- **React.js** with modern hooks and functional components
- **React Flow** for drag-and-drop workflow visualization
- **Tailwind CSS** for responsive UI design
- **Vite** for fast development and building

### **Backend**
- **FastAPI** with automatic API documentation
- **PostgreSQL** for workflow and chat data persistence
- **ChromaDB** for vector storage and similarity search
- **WebSocket** for real-time execution updates

### **AI & ML**
- **OpenAI GPT** and **Gemini** for text generation
- **OpenAI Embeddings** and **Gemini Embeddings** for document processing
- **PyMuPDF** for PDF text extraction

---

## 🚀 Live Demo

**Experience FlowMind in action:**

- **🌐 Live Application**: [https://flow-mind-beige.vercel.app/](https://flow-mind-beige.vercel.app/)
- **📖 API Documentation**: [https://flowmind-ikfc.onrender.com/docs#/](https://flowmind-ikfc.onrender.com/docs#/)

**Try it out:**
1. Visit the live application
2. Create a new workflow by dragging components
3. Configure your API keys in the LLM Engine node
4. Upload a PDF to the Knowledge Base node
5. Test your workflow with real queries!

---

## 🛠️ Installation

### Prerequisites
- **Node.js** 18+
- **Python** 3.11+
- **PostgreSQL** 15+

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/flowmind.git
   cd flowmind
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

---

## 🏗️ Architecture

### **System Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │   FastAPI Backend │    │   PostgreSQL    │
│                 │    │                 │    │                 │
│ • Workflow UI   │◄──►│ • REST API      │◄──►│ • Workflow Data │
│ • Drag & Drop   │    │ • WebSocket     │    │ • Chat History  │
│ • Real-time UI  │    │ • AI Integration│    │ • Document Meta │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   ChromaDB      │
                       │                 │
                       │ • Vector Store  │
                       │ • Embeddings    │
                       │ • Similarity    │
                       └─────────────────┘
```

### **Workflow Execution Flow**
1. **User Query** → Input validation and sanitization
2. **Knowledge Base** → PDF processing, embedding generation, similarity search
3. **LLM Engine** → AI processing with context from knowledge base
4. **Output** → Response formatting and chat interface

### **Key API Endpoints**
- `POST /api/workflows` - Create workflow
- `POST /api/workflows/{id}/execute` - Execute workflow
- `POST /api/upload` - Upload PDF documents
- `WS /ws/{session_id}` - Real-time execution updates

---

## 🚀 Getting Started

### **Creating Your First Workflow**

1. **Visit the live application**: [https://flow-mind-beige.vercel.app/](https://flow-mind-beige.vercel.app/)
2. **Drag components** from the sidebar to the canvas
3. **Connect components** in logical order: User Query → Knowledge Base → LLM Engine → Output
4. **Configure each node** with your API keys and settings
5. **Test your workflow** using the chat interface

### **Example Use Cases**
- **📚 Document Q&A**: Upload PDFs and ask questions about their content
- **🔍 Research Assistant**: Combine web search with AI analysis
- **💬 Customer Support**: Create intelligent chatbots with knowledge bases

---

## 📋 Assignment Deliverables

### ✅ **Completed Requirements**
- **Full source code** (frontend + backend) with clear component structure
- **README** with setup and run instructions
- **Modular design** with separate frontend and backend components
- **Live deployment** with working demo
- **Architecture diagram** showing system components

### **Core Features Implemented**
- **Visual Workflow Builder** using React Flow with drag-and-drop functionality
- **Component Library Panel** with all four required components
- **Workspace Panel** with zoom, pan, and snap-to-grid support
- **Component Configuration Panel** with dynamic configuration options
- **Real-time Execution** with WebSocket streaming and progress indicators
- **Workflow Persistence** with PostgreSQL database storage
- **Chat Interface** with follow-up question support

### **Technical Implementation**
- **Frontend**: React.js with modern hooks and functional components
- **Backend**: FastAPI with automatic API documentation
- **Database**: PostgreSQL for workflow and chat data persistence
- **Vector Store**: ChromaDB for document embeddings and similarity search
- **AI Integration**: OpenAI GPT, Gemini, and Grok support
- **Document Processing**: PyMuPDF for PDF text extraction
- **Web Search**: SERP API and Brave Search integration

---

## 🎯 **Project Highlights**

- **No-Code Interface**: Users can build complex AI workflows without programming
- **Multi-LLM Support**: Flexible AI model selection (OpenAI, Gemini, Grok)
- **Document Intelligence**: PDF processing with vector embeddings for semantic search
- **Real-time Execution**: Live streaming of workflow execution with progress updates
- **Production Ready**: Deployed and accessible with comprehensive error handling

---

<div align="center">

**Built for Full-Stack Engineering Internship Assignment**

[🚀 Live Demo](https://flow-mind-beige.vercel.app/) • [📖 API Docs](https://flowmind-ikfc.onrender.com/docs#/) • [💻 Source Code](https://github.com/yourusername/flowmind)

</div>
