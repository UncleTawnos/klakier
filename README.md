# Klakier - the XML Prompt Generator

A modern web-based tool for generating structured XML-formatted prompts with configurable AI agents. Build complex, multi-agent prompts through an intuitive form interface with real-time syntax-highlighted preview.

## Features

- **Multiple AI Agents** - Choose from 7 pre-configured specialized agents (Architect, Debugger, Quality Reviewer, etc.)
- **Real-time XML Generation** - See your prompt update instantly as you type
- **Syntax Highlighting** - Beautiful XML output with line numbers and Prism highlighting
- **Smart Parsing** - Automatically splits requirements and tasks by paragraphs
- **One-click Copy** - Copy generated XML directly to clipboard
- **Fully Configurable** - Customize agents via external JSON configuration
- **Docker Ready** - Production-ready containerization with Nginx

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/klakier.git
cd klakier

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3456`

### Docker

```bash
# Using Docker Compose
docker-compose up

# Or build manually
docker build -t klakier .
docker run -p 3456:80 klakier
```

## Usage

1. **Select an Agent** - Choose the AI agent type from the dropdown
2. **Add Context** (optional) - Provide background information
3. **Define Requirements** - Enter requirements separated by blank lines
4. **Describe Tasks** - Enter tasks separated by blank lines
5. **Copy Output** - Click the copy button to get your XML prompt

### Example Output

```xml
<agent>use architect</agent>
<requirements>
  <requirement>Design a scalable authentication system</requirement>
  <requirement>Support OAuth 2.0 and JWT tokens</requirement>
</requirements>
<context>Building a microservices-based e-commerce platform</context>
<tasks>
  <task>Create system architecture diagram</task>
  <task>Write ADR for authentication approach</task>
</tasks>
```

## Available Agents

| Agent | Description |
|-------|-------------|
| **General Purpose** | Complex, multi-step tasks and research |
| **Architect** | Code analysis, solution design, ADRs |
| **Quality Reviewer** | Security, performance, and data loss analysis |
| **Debugger** | Issue diagnosis and root cause analysis |
| **Refactoring Specialist** | Safe code transformation and design patterns |
| **Explore** | Codebase exploration and file searching |
| **Plan** | Implementation step planning |

## Project Structure

```
klakier/
├── src/
│   ├── components/          # React components
│   ├── services/            # Business logic
│   ├── types/               # TypeScript interfaces
│   ├── utils/               # Utility functions
│   └── styles/              # CSS styles
├── public/
│   └── config/
│       └── agents.json      # Agent configuration
├── docker/
│   └── nginx.conf           # Nginx configuration
├── Dockerfile               # Multi-stage Docker build
└── docker-compose.yml       # Docker Compose config
```

## Configuration

### Custom Agents

Modify `public/config/agents.json` to customize available agents:

```json
{
  "agents": [
    {
      "id": "custom-agent",
      "name": "Custom Agent",
      "description": "Description of what this agent does",
      "xmlTag": "agent",
      "attributes": {},
      "defaultContext": ""
    }
  ]
}
```

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Prism React Renderer** - Syntax highlighting
- **Docker + Nginx** - Production deployment

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

This project was fully generated with [Claude Code](https://claude.ai/claude-code).

- [Prism React Renderer](https://github.com/FormidableLabs/prism-react-renderer) for syntax highlighting
- [Vite](https://vitejs.dev/) for the blazing fast build tool
