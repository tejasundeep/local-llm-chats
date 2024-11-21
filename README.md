# Local LLM Chat Interface

A minimalist and user-friendly chat interface for interacting with your local Large Language Models (LLMs). Built with Next.js, this application makes it simple to have conversations with AI models running on your machine.

## 🎯 Key Features

- **Simple Chat Interface**
  - Clean, distraction-free design
  - Easy-to-use message input
  - Clear conversation history
  - Multiple chat sessions support

- **Local LLM Support**
  - Direct integration with local AI models
  - No internet connection required
  - Fast response times
  - Complete privacy - all data stays local
  - Model Format: Llama-3.2-1B-Instruct-Q8_0.gguf

- **Developer-Friendly**
  - Markdown support for formatted text
  - Code syntax highlighting
  - One-click code copying
  - Export chat history for reference

## 🛠 Tech Stack

- **Frontend**: Next.js with React
- **Styling**: React Bootstrap & CSS Modules
- **Features**:
  - markdown-it for text formatting
  - highlight.js for code blocks
  - React state hooks for chat management
  - Local storage for chat persistence

## 🚀 Getting Started

1. **Setup**
   ```bash
   git clone [your-repository-url]
   cd local-llm-chats
   npm install
   ```

2. **Configuration**
   - Set up your local LLM endpoint in `.env`
   ```env
   LLM_ENDPOINT=your_local_endpoint
   ```

3. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## 📂 Project Structure

```
local-llm-chats/
├── src/
│   ├── pages/         # Next.js pages and API routes
│   ├── styles/        # CSS modules for styling
│   ├── hooks/         # Custom React hooks for chat
│   └── utils/         # Helper functions
└── public/            # Static assets
```

## 💡 Usage

1. Start your local LLM server
2. Launch the chat interface
3. Begin chatting with your AI model
4. Use markdown for formatting
5. Export conversations as needed

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Bootstrap](https://react-bootstrap.github.io/)
- [Markdown Guide](https://www.markdownguide.org/)

## 📄 License

MIT License - feel free to use and modify as needed.
