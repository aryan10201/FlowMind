# 🧠 FlowMind - AI-Powered No-Code Workflow Builder

<div align="center">

![FlowMind Logo](https://img.shields.io/badge/FlowMind-AI%20Workflow%20Builder-blue?style=for-the-badge&logo=robot&logoColor=white)

**Build intelligent AI workflows with drag-and-drop simplicity**

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

[🚀 Live Demo](#-live-demo) • [📖 Documentation](#-documentation) • [🛠️ Installation](#️-installation) • [🎯 Features](#-features)

</div>

---

## 🌟 Overview

**FlowMind** is a cutting-edge, no-code platform that empowers users to create sophisticated AI-powered workflows through an intuitive drag-and-drop interface. Whether you're a business analyst, developer, or AI enthusiast, FlowMind makes it easy to build complex automation pipelines without writing a single line of code.

### 🎯 Key Highlights

- **🎨 Visual Workflow Designer**: Intuitive drag-and-drop interface with React Flow
- **🤖 Multi-LLM Support**: OpenAI GPT, Google Gemini, and Grok integration
- **📚 Knowledge Base Management**: PDF document processing with vector embeddings
- **🔍 Web Search Integration**: Real-time web search capabilities
- **⚡ Real-time Streaming**: Live execution feedback via WebSocket connections
- **💾 Workflow Persistence**: Save, load, and manage complex workflows
- **🐳 Docker Ready**: Complete containerization for easy deployment

---

## 🎯 Features

### 🧩 **Workflow Components**

| Component | Description | Capabilities |
|-----------|-------------|--------------|
| **🔵 User Query** | Input interface for user questions | Query validation, input sanitization |
| **🟢 Knowledge Base** | Document processing and retrieval | PDF parsing, vector embeddings, semantic search |
| **🟡 Web Search** | Real-time web information gathering | SERP API integration, result filtering |
| **🟣 LLM Engine** | AI model orchestration | Multi-provider support, streaming responses |
| **⚫ Output** | Result presentation and formatting | Chat interface, response formatting |

### 🏗️ **Technical Architecture**

#### **Frontend Stack**
- **React 18** with modern hooks and functional components
- **Vite** for lightning-fast development and building
- **Tailwind CSS** for responsive, utility-first styling
- **React Flow** for advanced node-based workflow visualization
- **Lucide React** for consistent, beautiful icons
- **Axios** for robust HTTP client functionality

#### **Backend Stack**
- **FastAPI** with automatic API documentation and validation
- **PostgreSQL** for reliable data persistence
- **ChromaDB** for vector storage and similarity search
- **SQLAlchemy** with Alembic for database migrations
- **WebSocket** support for real-time communication
- **Pydantic** for data validation and serialization

#### **AI & ML Integration**
- **OpenAI GPT** models for text generation and analysis
- **Google Gemini** for alternative AI capabilities
- **Grok** integration for diverse AI model access
- **Vector Embeddings** for semantic document search
- **Text Chunking** for optimal document processing

---

## 🚀 Live Demo

Experience FlowMind in action:

- **Frontend**: [http://localhost:5173](http://localhost:5173) (Development)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🛠️ Installation

### Prerequisites

- **Docker** and **Docker Compose**
- **Node.js** 18+ (for development)
- **Python** 3.11+ (for development)
- **PostgreSQL** 15+ (if running locally)

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/flowmind.git
   cd flowmind
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. **Launch the application**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Development Setup

#### Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

---

## 📖 Documentation

### 🏗️ **Architecture Overview**

FlowMind follows a modern microservices architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │   FastAPI Backend │    │   PostgreSQL    │
│                 │    │                 │    │                 │
│ • Workflow UI   │◄──►│ • REST API      │◄──►│ • Workflow Data │
│ • Node Editor   │    │ • WebSocket     │    │ • Chat History  │
│ • Real-time UI  │    │ • AI Integration│    │ • User Sessions │
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

### 🔧 **API Endpoints**

#### Workflow Management
- `POST /api/workflows` - Create new workflow
- `GET /api/workflows` - List all workflows
- `GET /api/workflows/{id}` - Get specific workflow
- `PUT /api/workflows/{id}` - Update workflow
- `DELETE /api/workflows/{id}` - Delete workflow

#### Workflow Execution
- `POST /api/workflows/{id}/execute` - Execute workflow
- `GET /api/workflows/{id}/logs` - Get execution logs

#### Document Management
- `POST /api/upload` - Upload PDF documents
- `GET /api/documents` - List uploaded documents

#### WebSocket
- `WS /ws/{session_id}` - Real-time execution updates

### 🧩 **Workflow Components Deep Dive**

#### **User Query Node**
- **Purpose**: Entry point for user interactions
- **Configuration**: Query validation rules, input formatting
- **Outputs**: Structured query data for downstream processing

#### **Knowledge Base Node**
- **Purpose**: Document processing and semantic search
- **Features**: 
  - PDF text extraction and chunking
  - Vector embedding generation
  - Semantic similarity search
  - Multi-provider embedding support
- **Configuration**: Embedding model, chunk size, similarity threshold

#### **Web Search Node**
- **Purpose**: Real-time web information gathering
- **Features**:
  - SERP API integration
  - Result filtering and ranking
  - Query optimization
- **Configuration**: Search provider, result count, filtering criteria

#### **LLM Engine Node**
- **Purpose**: AI model orchestration and response generation
- **Features**:
  - Multi-provider support (OpenAI, Gemini, Grok)
  - Streaming responses
  - Temperature and token control
  - System prompt customization
- **Configuration**: Model selection, API keys, generation parameters

#### **Output Node**
- **Purpose**: Result presentation and user interaction
- **Features**:
  - Chat interface
  - Response formatting
  - Error handling
- **Configuration**: Display format, error messages

---

## 🎨 **Screenshots**

### Workflow Designer
![Workflow Designer](https://via.placeholder.com/800x400/4F46E5/FFFFFF?text=Workflow+Designer+Interface)

### Component Configuration
![Component Configuration](https://via.placeholder.com/800x400/10B981/FFFFFF?text=Component+Configuration+Panel)

### Real-time Execution
![Real-time Execution](https://via.placeholder.com/800x400/F59E0B/FFFFFF?text=Real-time+Execution+View)

---

## 🚀 **Getting Started**

### Creating Your First Workflow

1. **Launch FlowMind** and click "Create New Stack"
2. **Add Components** by dragging from the sidebar:
   - Start with a **User Query** node
   - Add a **Knowledge Base** node for document search
   - Include an **LLM Engine** for AI processing
   - Finish with an **Output** node
3. **Connect Components** by dragging from output handles to input handles
4. **Configure Each Node**:
   - Set up API keys for external services
   - Customize prompts and parameters
   - Define input/output mappings
5. **Test Your Workflow** using the built-in chat interface
6. **Save Your Workflow** for future use

### Example Use Cases

- **📚 Document Q&A**: Upload PDFs and ask questions about their content
- **🔍 Research Assistant**: Combine web search with AI analysis
- **💬 Customer Support**: Create intelligent chatbots with knowledge bases
- **📊 Data Analysis**: Process and analyze documents with AI insights
- **🎯 Content Generation**: Generate content based on specific requirements

---

## 🔧 **Configuration**

### Environment Variables

```bash
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=genai
POSTGRES_PORT=5432

# Backend Configuration
BACKEND_PORT=8000
OPENAI_API_KEY=your_openai_api_key

# Frontend Configuration
FRONTEND_PORT=80

# ChromaDB Configuration
CHROMA_COLLECTION=kb_collection
```

### Docker Configuration

FlowMind includes comprehensive Docker support:

- **Development**: Hot reload for both frontend and backend
- **Production**: Optimized builds with nginx serving
- **Database**: PostgreSQL with persistent volumes
- **Vector Store**: ChromaDB with data persistence

---

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- **React Flow** for the amazing workflow visualization
- **FastAPI** for the robust backend framework
- **OpenAI** for the powerful AI models
- **ChromaDB** for vector storage capabilities
- **Tailwind CSS** for the beautiful UI components

---

## 📞 **Support**

- **Documentation**: [Full Documentation](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/flowmind/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/flowmind/discussions)
- **Email**: support@flowmind.ai

---

<div align="center">

**Built with ❤️ by the FlowMind Team**

[⭐ Star this repo](https://github.com/yourusername/flowmind) • [🐛 Report Bug](https://github.com/yourusername/flowmind/issues) • [💡 Request Feature](https://github.com/yourusername/flowmind/issues)

</div>
