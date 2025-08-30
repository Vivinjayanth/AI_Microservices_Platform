# AI Microservices with Flowise + LangChain

A collection of modular AI microservices built with Python, FastAPI, and LangChain for text summarization, document Q&A, and dynamic learning path suggestions.

## 🚀 Features

- **Text Summarization**: Intelligent text summarization with customizable styles and lengths
- **Document Q&A**: Upload documents and ask questions using vector embeddings and retrieval
- **Learning Path Generation**: AI-powered personalized learning path recommendations
- **Multi-LLM Support**: Compatible with OpenAI, OpenRouter, and Ollama
- **FastAPI Framework**: High-performance async REST API with automatic documentation
- **File Upload Support**: Process PDF, DOCX, TXT, and MD files
- **Batch Processing**: Handle multiple requests efficiently
- **Interactive Documentation**: Swagger UI and ReDoc integration

## 📋 Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Testing](#testing)
- [Frontend Interface](#frontend-interface)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🛠 Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-github-repo-url>
   cd "AI Microservices with Flowise + LangChain"
   ```

2. **Create virtual environment (recommended)**
   ```bash
   python -m venv ai-microservices-env
   # On Windows:
   ai-microservices-env\Scripts\activate
   # Or use PowerShell:
   ai-microservices-env\Scripts\Activate.ps1
   # On macOS/Linux:
   source ai-microservices-env/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

5. **Start the server**
   ```bash
   # Option 1: Using Python directly
   python main.py
   
   # Option 2: Using uvicorn directly (recommended)
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   
   # Option 3: Using virtual environment directly
   ai-microservices-env\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8000
   ```

6. **Access the application**
   - **Main Interface**: `http://localhost:8000` or `http://127.0.0.1:8000`
   - **API Documentation**: `http://localhost:8000/docs`
   - **Health Check**: `http://localhost:8000/health`

   ⚠️ **Important**: Use `localhost:8000` or `127.0.0.1:8000` in your browser, NOT `0.0.0.0:8000`

### Quick Verification
To verify everything is working:
1. Check that the server started with the message "🚀 AI Microservices with Flowise + LangChain starting up..."
2. Open `http://localhost:8000` - you should see the frontend interface
3. Click on the "Text Summarization" tab and test the service
4. Run the test script: `python test_api.py`

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=8000
DEBUG=true

# OpenAI API (recommended)
OPENAI_API_KEY=your_openai_api_key_here

# OpenRouter API (alternative)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Ollama Configuration (for local models)
OLLAMA_BASE_URL=http://localhost:11434

# File Configuration
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_PATH=./uploads

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:8000,http://localhost:3000,http://127.0.0.1:8000
```

### LLM Provider Setup

#### Option 1: OpenAI (Recommended)
1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Add `OPENAI_API_KEY=your_key_here` to your `.env` file

#### Option 2: OpenRouter
1. Get an API key from [OpenRouter](https://openrouter.ai/keys)
2. Add `OPENROUTER_API_KEY=your_key_here` to your `.env` file

#### Option 3: Ollama (Local Models)
1. Install [Ollama](https://ollama.ai/)
2. Pull a model: `ollama pull llama2`
3. Ensure Ollama is running on the default port (11434)

## 📡 API Endpoints

### Health Check
- **GET** `/health` - Check service status

### Text Summarization

#### Summarize Text
- **POST** `/api/summarize`
- **Body:**
  ```json
  {
    "text": "Your text to summarize...",
    "options": {
      "maxLength": 300,
      "style": "concise",  
      "language": "english"
    }
  }
  ```

#### Batch Summarization
- **POST** `/api/summarize/batch`
- **Body:**
  ```json
  {
    "texts": ["Text 1...", "Text 2...", "Text 3..."],
    "options": {
      "maxLength": 200,
      "style": "bullet"
    }
  }
  ```

### Document Q&A

#### Upload Document
- **POST** `/api/documents/upload`
- **Form Data:**
  - `document`: File (PDF, DOCX, TXT, MD)
  - `collectionName`: String (optional, defaults to "default")

#### Ask Question
- **POST** `/api/documents/ask`
- **Body:**
  ```json
  {
    "question": "What is the main topic of this document?",
    "collectionName": "my-collection",
    "options": {
      "topK": 4,
      "includeMetadata": true
    }
  }
  ```

#### Search Documents
- **GET** `/api/documents/search?query=search_term&collectionName=my-collection&limit=5`

#### List Collections
- **GET** `/api/documents/collections`

#### Delete Collection
- **DELETE** `/api/documents/collections/{collectionName}`

### Learning Path Generation

#### Generate Learning Path
- **POST** `/api/learning-path/generate`
- **Body:**
  ```json
  {
    "goal": "Learn full-stack web development",
    "currentSkills": ["HTML", "CSS", "basic JavaScript"],
    "experience": "beginner",
    "timeCommitment": "15 hours/week",
    "learningStyle": "hands-on",
    "interests": ["web design", "user experience"]
  }
  ```

#### Get Popular Paths
- **GET** `/api/learning-path/popular`

#### Update Progress
- **PUT** `/api/learning-path/progress`
- **Body:**
  ```json
  {
    "pathId": "path_abc123",
    "milestoneId": "milestone_xyz789",
    "completed": true
  }
  ```

## 🔧 Usage Examples

### Text Summarization Example

```bash
curl -X POST http://localhost:8000/api/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Artificial intelligence (AI) is intelligence demonstrated by machines, in contrast to the natural intelligence displayed by humans and animals. Leading AI textbooks define the field as the study of intelligent agents...",
    "options": {
      "maxLength": 100,
      "style": "concise"
    }
  }'
```

### Document Q&A Example

```bash
# Upload a document
curl -X POST http://localhost:8000/api/documents/upload \
  -F "document=@/path/to/your/document.pdf" \
  -F "collection_name=research-papers"

# Ask a question
curl -X POST http://localhost:8000/api/documents/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the key findings?",
    "collection_name": "research-papers"
  }'
```

### Learning Path Example

```bash
curl -X POST http://localhost:8000/api/learning-path/generate \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Learn machine learning",
    "current_skills": ["Python", "Statistics"],
    "experience": "intermediate",
    "time_commitment": "20 hours/week",
    "learning_style": "mixed"
  }'
```

## 🧪 Testing

### Using FastAPI Documentation
1. Start the server: `python main.py`
2. Open your browser to `http://localhost:8000/docs` for Swagger UI
3. Or visit `http://localhost:8000/redoc` for ReDoc documentation
4. Test all endpoints interactively

### Using Postman
1. Import the Postman collection from `docs/AI_Microservices_API.postman_collection.json`
2. Update the `baseUrl` variable to `http://localhost:8000`
3. Test all endpoints using the pre-configured requests

### Using cURL
Test the health endpoint:
```bash
curl http://localhost:8000/health
```

### Using the Test Script
Run the included test script to verify all endpoints:
```bash
# Make sure the server is running first
python test_api.py
```

### Running Unit Tests
```bash
pytest tests/
```

## 🎨 Frontend Interface

A simple web interface is available in the `frontend` directory for easy interaction with the microservices.

### Features
- Text summarization interface
- Document upload and Q&A interface  
- Learning path generation form
- Real-time API testing

### Accessing the Frontend
The frontend is automatically served by the FastAPI server:

1. **Start the server**: `uvicorn main:app --host 127.0.0.1 --port 8000`
2. **Open browser**: Navigate to `http://localhost:8000`
3. **Use the interface**: Click through the tabs to test each service

### Alternative Frontend Serving
You can also serve the frontend separately:
```bash
cd frontend
# Serve with a simple HTTP server:
python -m http.server 8080
# Navigate to http://localhost:8080
```

## 📁 Project Structure

```
AI Microservices with Flowise + LangChain/
├── README.md
├── main.py                     # FastAPI server entry point
├── test_api.py                 # API testing script
├── requirements.txt            # Python dependencies
├── .env                        # Environment variables (create from template)
├── .gitignore                  # Git ignore file
├── ai-microservices-env/       # Virtual environment (auto-created)
├── app/                        # Main application package
│   ├── __init__.py
│   ├── config.py               # Configuration settings
│   ├── models/                 # Pydantic models
│   │   ├── __init__.py
│   │   └── schemas.py          # API request/response models
│   ├── services/               # Microservices
│   │   ├── __init__.py
│   │   ├── summarization.py    # Text summarization service
│   │   ├── document_qa.py      # Document Q&A service
│   │   └── learning_path.py    # Learning path service
│   └── utils/                  # Utility functions
│       ├── __init__.py
│       └── helpers.py          # Helper functions
├── frontend/                   # Web interface (served by FastAPI)
│   ├── index.html
│   ├── style.css
│   └── script.js
├── docs/                       # Documentation and collections
│   └── AI_Microservices_API.postman_collection.json
├── tests/                      # Unit tests
├── uploads/                    # Uploaded documents (auto-created)
├── vector_store/              # Vector embeddings storage (auto-created)
└── chroma_db/                 # ChromaDB persistence (auto-created)
```

## 🚀 Deployment

### Local Development
```bash
python main.py
# Or with auto-reload:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker (Optional)
```bash
# Build and run with Docker
docker build -t ai-microservices .
docker run -p 8000:8000 --env-file .env ai-microservices
```

### Environment-Specific Configurations

#### Development
- Enable auto-reload with uvicorn
- Debug mode enabled
- Relaxed CORS settings
- Mock LLM services for testing

#### Production
- Multiple workers with uvicorn
- Production-grade error handling
- Optimized vector storage
- Rate limiting (can be added)

## 🛡️ Security Features

- **FastAPI Security**: Built-in security features
- **CORS**: Configurable cross-origin requests
- **File Validation**: Type and size restrictions
- **Input Validation**: Pydantic model validation
- **Error Handling**: Secure error responses

## 🔧 Troubleshooting

### Common Issues

1. **"No API key provided" warnings**
   - The system will use mock responses for demonstration
   - Add a valid API key to `.env` for full functionality

2. **File upload errors**
   - Check file size limits (default: 10MB)
   - Ensure file type is supported (PDF, DOCX, TXT, MD)

3. **Port already in use**
   - Change the PORT in `.env` file
   - Kill existing processes: `netstat -ano | findstr :8000`

4. **Module not found errors**
   - Run `pip install -r requirements.txt` to ensure all dependencies are installed
   - Check Python version compatibility (3.8+)
   - Activate virtual environment if using one

5. **Import errors**
   - Ensure you're in the correct directory
   - Check PYTHONPATH includes the project root

6. **"ERR_ADDRESS_INVALID" in browser**
   - Don't use `0.0.0.0:8000` in your browser
   - Use `http://localhost:8000` or `http://127.0.0.1:8000` instead
   - The `0.0.0.0` address is only for server binding, not browser access

7. **Virtual environment issues**
   - Make sure to activate the virtual environment before running commands
   - On Windows: `ai-microservices-env\Scripts\activate`
   - Install dependencies inside the virtual environment

### Performance Tips

- Use batch endpoints for multiple operations
- Implement caching for frequently accessed data
- Monitor memory usage with large documents
- Use streaming for very large text processing

## 📊 Monitoring and Logging

- Health check endpoint: `/health`
- Request logging with Morgan
- Error tracking with structured logging
- Performance metrics available

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

### Development Guidelines

- Follow ESLint configuration
- Write unit tests for new features
- Update documentation for API changes
- Use semantic commit messages

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Vivin Jayanth A M**

## 🙏 Acknowledgments

- [LangChain](https://js.langchain.com/) - LLM application framework
- [Flowise](https://flowiseai.com/) - Low-code LLM apps builder
- [OpenAI](https://openai.com/) - AI model provider
- [OpenRouter](https://openrouter.ai/) - LLM API aggregator

## 📞 Support

For questions or issues:
1. Check the troubleshooting section
2. Review the API documentation
3. Open an issue on GitHub
4. Contact the author

---

**Happy coding! 🎉**
