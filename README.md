# PentaForge MCP Server

A Model Context Protocol (MCP) server that orchestrates structured roundtable discussions among 5 expert personas to generate PRP-ready specifications for software development.

## What is PentaForge?

PentaForge transforms a simple programming need into a comprehensive, actionable specification through an automated roundtable discussion. It simulates a complete agile team meeting where:

- A **Key User** describes pain points and acceptance criteria
- A **Business Analyst** defines requirements and constraints  
- A **Product Owner** prioritizes features and sets success metrics
- A **Scrum Master** coordinates delivery and manages risks
- A **Solutions Architect** designs the technical implementation

The result is two markdown documents ready for use with [PRPs-agentic-eng](https://github.com/Wirasm/PRPs-agentic-eng):
- `DISCUSSION.md`: Full transcript of the roundtable discussion
- `REQUEST.md`: Official demand specification with PRP-ready artifacts

## Features

- 🎭 **5 Expert Personas**: Each with unique perspectives and objectives
- 🧠 **AI-Powered Discussions**: Dynamic, contextual responses using OpenAI, Anthropic, or local models
- 🌍 **Internationalization**: Supports English and Portuguese (auto-detected)
- 📝 **PRP-Ready Output**: Compatible with PRPs-agentic-eng workflow
- 🐳 **Docker Support**: Run locally or in containers
- 🔄 **MCP Protocol**: Integrates with Claude Code and other MCP clients
- 🛡️ **Reliable Fallback**: Automatic hardcoded responses when AI is unavailable
- ⚙️ **Multi-Provider Support**: Configurable AI backends with environment variables

## Installation

### Local Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pentaforge.git
cd pentaforge

# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Run the server
npm start
# or
node dist/server.js
```

### Docker Installation

```bash
# Build the Docker image
docker build -t pentaforge:latest .

# Run with volume mapping for output persistence
docker run -i --rm -v $(pwd)/PRPs/inputs:/app/PRPs/inputs pentaforge:latest
```

#### Windows PowerShell
```powershell
docker run -i --rm -v ${PWD}/PRPs/inputs:/app/PRPs/inputs pentaforge:latest
```

## AI Configuration

PentaForge personas are powered by AI to generate dynamic, contextual responses. The system supports multiple AI providers with automatic fallback to ensure reliability.

### Supported AI Providers

- **OpenAI** (GPT models) - `gpt-4o-mini`, `gpt-4`, `gpt-3.5-turbo`
- **Anthropic** (Claude models) - `claude-3-haiku-20240307`, `claude-3-sonnet-20240229`
- **Ollama** (Local models) - `mistral:latest`, `deepseek-coder:latest`, `llama3.2:3b`, etc.

### Environment Variables

Configure AI providers using these environment variables:

```bash
# AI Provider Configuration
AI_PROVIDER=ollama                    # 'openai', 'anthropic', or 'ollama'
AI_API_KEY=your_api_key              # Required for OpenAI/Anthropic
AI_BASE_URL=http://localhost:11434   # Custom endpoint (optional)
AI_MODEL=mistral:latest              # Default model name (can be overridden per call)
AI_TEMPERATURE=0.7                   # Response creativity (0-1)
AI_MAX_TOKENS=500                    # Response length limit
```

### Default Models by Provider

- **OpenAI**: `gpt-4o-mini` (fast, cost-effective)
- **Anthropic**: `claude-3-haiku-20240307` (efficient, reliable)
- **Ollama**: `mistral:latest` (local, privacy-focused)

### Per-Call Model Override

You can specify a different model for individual roundtable calls, useful when you have multiple Ollama models:

```json
{
  "prompt": "Create a REST API for user management",
  "model": "deepseek-coder:latest",
  "dryRun": true
}
```

This overrides the default model for that specific discussion.

### Using with Docker

Pass environment variables to Docker:

```bash
# Using OpenAI
docker run -i --rm \
  -e AI_PROVIDER=openai \
  -e AI_API_KEY=your_openai_key \
  -e AI_MODEL=gpt-4o-mini \
  -v $(pwd)/PRPs/inputs:/app/PRPs/inputs \
  pentaforge:latest

# Using Anthropic
docker run -i --rm \
  -e AI_PROVIDER=anthropic \
  -e AI_API_KEY=your_anthropic_key \
  -e AI_MODEL=claude-3-haiku-20240307 \
  -v $(pwd)/PRPs/inputs:/app/PRPs/inputs \
  pentaforge:latest

# Using local Ollama (default)
docker run -i --rm \
  -e AI_PROVIDER=ollama \
  -e AI_BASE_URL=http://host.docker.internal:11434 \
  -v $(pwd)/PRPs/inputs:/app/PRPs/inputs \
  pentaforge:latest
```

### Fallback Behavior

When AI providers are unavailable or fail:
- ✅ Personas automatically use hardcoded responses
- ✅ System continues to function normally  
- ✅ No interruption to workflow
- ✅ Quality specifications still generated

This ensures PentaForge is always reliable, whether you have AI configured or not.

### Setting up Ollama (Local AI)

To use local AI models with Ollama:

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Download models
ollama pull mistral:latest        # General purpose model (~4GB)
ollama pull deepseek-coder:latest # Code-focused model (~1GB)

# Verify it's running
ollama list

# PentaForge will connect automatically
```

## Claude Code Registration

Register PentaForge with Claude Code to use it as an MCP tool:

### macOS/Linux
```bash
claude mcp add pentaforge -- docker run -i --rm -v ${PWD}/PRPs/inputs:/app/PRPs/inputs pentaforge:latest
```

### Windows PowerShell
```powershell
claude mcp add pentaforge -- docker run -i --rm -v ${PWD}/PRPs/inputs:/app/PRPs/inputs pentaforge:latest
```

### Local Node.js (without Docker)
```bash
claude mcp add pentaforge -- node /path/to/pentaforge/dist/server.js
```

## Usage

Once registered with Claude Code, you can invoke the `run_roundtable` tool:

```json
{
  "tool": "run_roundtable",
  "arguments": {
    "prompt": "In my Todo app, items are lost on refresh. I need data persistence across sessions.",
    "outputDir": "./PRPs/inputs",
    "language": "en",
    "tone": "professional",
    "includeAcceptanceCriteria": true,
    "model": "deepseek-coder:latest"
  }
}
```

### Parameters

- **prompt** (required): The programming demand or problem statement
- **outputDir** (optional): Directory for output files (default: `./PRPs/inputs`)
- **language** (optional): Output language - "en" or "pt-BR" (auto-detected from prompt)
- **tone** (optional): Discussion tone (default: "professional")
- **includeAcceptanceCriteria** (optional): Include Gherkin scenarios (default: true)
- **dryRun** (optional): Print to stdout without writing files (default: false)
- **model** (optional): Override AI model for this call (e.g., `mistral:latest`, `deepseek-coder:latest`)

## Example Output

### DISCUSSION.md Structure
```markdown
# Roundtable Discussion

**Timestamp:** 2024-01-15T143022Z
**Input Prompt:** In my Todo app, items are lost on refresh...

## Participants
| Name | Role | Objectives |
|------|------|------------|
| Alex Chen | Key User | Describe pain points; Define acceptance criteria |
| Sarah Mitchell | Business Analyst | Analyze requirements; Identify constraints |
...

## Discussion Transcript
### Round 1
**Sarah Mitchell** (Business Analyst):
> Analyzing the requirement: "In my Todo app, items are lost..."...

### Round 2
...

## Decisions & Rationale
1. Use IndexedDB with Dexie.js for local persistence
2. Implement auto-save every 2 seconds
...
```

### REQUEST.md Structure
```markdown
# Demand Specification

## Problem Statement
In my Todo app, items are lost on refresh. I need data persistence...

## Current vs Desired Behavior
...

## Functional Requirements
1. System shall auto-save data every 2 seconds after changes
2. System shall use IndexedDB for local storage
...

## PRP-Ready Artifacts
### Suggested PRP Commands
/prp-base-create PRPs/REQUEST_2024-01-15T143022Z.md
/prp-create-planning PRPs/<base-file>
/prp-create-tasks PRPs/<planning-file>
/prp-execute-tasks PRPs/<tasks-file>
```

## PRP Integration Workflow

After generating the specification with PentaForge:

1. **Create base PRP document**:
   ```bash
   /prp-base-create PRPs/REQUEST_<timestamp>.md
   ```

2. **Generate planning document**:
   ```bash
   /prp-create-planning PRPs/<base-file-from-step-1>
   ```

3. **Create task breakdown**:
   ```bash
   /prp-create-tasks PRPs/<planning-file-from-step-2>
   ```

4. **Execute implementation**:
   ```bash
   /prp-execute-tasks PRPs/<tasks-file-from-step-3>
   ```

## Docker Configuration

### Environment Variables

- `TZ`: Timezone (default: `UTC`)
- `LANG`: Language locale (default: `en_US.UTF-8`)
- `LOG_LEVEL`: Logging level - DEBUG, INFO, WARN, ERROR (default: `INFO`)
- `PENTAFORGE_OUTPUT_DIR`: Override output directory (default: `/app/PRPs/inputs`)

### Volume Permissions

The Docker container runs as a non-root user (UID 1001). If you encounter permission issues:

#### Linux
```bash
# Run with host user ID
docker run -i --rm --user $(id -u):$(id -g) \
  -v $(pwd)/PRPs/inputs:/app/PRPs/inputs \
  pentaforge:latest
```

#### macOS/Windows
Permissions are typically handled automatically.

### Docker Compose

Use the provided `docker-compose.yml` for easier management:

```bash
# Build and run
docker-compose up

# Run in background
docker-compose up -d

# Stop
docker-compose down
```

## Development

### Scripts

- `npm run build` - Compile TypeScript
- `npm start` - Run the server
- `npm run dev` - Run with ts-node (development)
- `npm test` - Run unit tests
- `npm run lint` - Run ESLint
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run Docker container

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test personas.test.ts
```

### Project Structure

```
pentaforge/
├── src/
│   ├── server.ts              # MCP server entry point
│   ├── tools/
│   │   └── roundtable.ts       # Main tool implementation
│   ├── personas/               # Expert persona classes
│   │   ├── base.ts            # Base persona interface
│   │   ├── aiPersona.ts       # AI-powered persona base class
│   │   ├── KeyUser.ts
│   │   ├── BusinessAnalyst.ts
│   │   ├── ProductOwner.ts
│   │   ├── ScrumMaster.ts
│   │   └── SolutionsArchitect.ts
│   ├── engine/
│   │   └── discussion.ts       # Orchestration logic
│   ├── writers/                # Markdown generators
│   │   ├── discussionWriter.ts
│   │   └── requestWriter.ts
│   └── lib/                    # Utilities
│       ├── aiService.ts       # Multi-provider AI integration
│       ├── clock.ts
│       ├── id.ts
│       ├── i18n.ts
│       ├── fs.ts
│       └── log.ts
├── tests/                      # Unit tests
├── Dockerfile                  # Container definition
├── docker-compose.yml          # Compose configuration
└── package.json               # Node.js configuration
```

## Troubleshooting

### Issue: "Permission denied" when writing files
**Solution**: Ensure the output directory exists and has write permissions. On Linux, use `--user $(id -u):$(id -g)` flag.

### Issue: "Cannot find module" errors
**Solution**: Run `npm install` and `npm run build` before starting the server.

### Issue: Docker build fails
**Solution**: Ensure Docker Desktop is running and you have Node.js 20+ specified in package.json.

### Issue: MCP tool not appearing in Claude Code
**Solution**: Restart Claude Code after registration. Check logs with `claude mcp list`.

### Issue: AI responses are generic/hardcoded
**Solution**: Check your AI configuration:
- Verify `AI_PROVIDER` is set correctly (`openai`, `anthropic`, or `ollama`)
- Ensure `AI_API_KEY` is valid for OpenAI/Anthropic
- For Ollama, verify it's running: `curl http://localhost:11434/api/tags`
- Check logs for AI service errors: `LOG_LEVEL=DEBUG npm start`

### Issue: "Ollama API error: Not Found"
**Solution**: 
- Install Ollama: `curl -fsSL https://ollama.ai/install.sh | sh`
- Download models: `ollama pull mistral:latest` and/or `ollama pull deepseek-coder:latest`
- Verify models exist: `ollama list`
- Check Ollama is running: `ollama serve` (if not auto-started)
- If using custom model, specify it in the `model` parameter or set `AI_MODEL` environment variable

### Issue: OpenAI/Anthropic API errors
**Solution**:
- Verify API key is correct and has sufficient credits
- Check model name is valid (e.g., `gpt-4o-mini`, `claude-3-haiku-20240307`)
- Monitor rate limits in provider dashboard
- PentaForge will fallback to hardcoded responses automatically

## License

MIT License - See LICENSE file for details.

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Consult the PRP documentation at https://github.com/Wirasm/PRPs-agentic-eng