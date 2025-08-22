# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Purpose

PentaForge is an MCP (Model Context Protocol) server that orchestrates structured roundtable discussions among 5 expert personas to generate PRP-ready specifications. It transforms simple programming demands into comprehensive, actionable specifications compatible with PRPs-agentic-eng.

## Build and Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Run the MCP server locally
npm start
# or
node dist/server.js

# Development mode with TypeScript hot reload
npm run dev

# Run unit tests
npm test

# Run specific test
npm test personas.test.ts

# Lint TypeScript code
npm run lint

# Docker commands
docker build -t pentaforge:latest .

# For MCP clients (like Claude Code) - automatic networking
docker run -i --rm -v $(pwd)/PRPs/inputs:/app/PRPs/inputs pentaforge:latest

# For local development with Ollama, use host networking
docker run --network host -i --rm -v $(pwd)/PRPs/inputs:/app/PRPs/inputs pentaforge:latest

# Or override AI service configuration
docker run -e AI_PROVIDER=openai -e AI_API_KEY=your_key -i --rm -v $(pwd)/PRPs/inputs:/app/PRPs/inputs pentaforge:latest
```

## Architecture Overview

### MCP Server Structure
The server uses stdio transport for communication with MCP clients like Claude Code. It exposes a single tool `run_roundtable` that accepts a prompt and orchestrates the discussion.

### Persona System
Six expert personas simulate an agile team meeting:
- **KeyUser**: Provides user perspective and acceptance criteria
- **BusinessAnalyst**: Defines requirements and constraints
- **ProductOwner**: Sets priorities and success metrics
- **ScrumMaster**: Coordinates delivery and manages risks
- **SolutionsArchitect**: Designs technical implementation
- **AIModerator**: Evaluates consensus and guides discussion resolution (dynamic rounds only)

Each persona extends `AIPersona` (from `src/personas/aiPersona.ts`) which provides AI-powered responses using configurable LLM providers. When AI fails, personas automatically fallback to hardcoded responses ensuring system reliability.

### Discussion Engine
`src/engine/discussion.ts` orchestrates discussions using either fixed 3-round mode (default) or dynamic consensus-driven rounds. The system supports two modes:

**Fixed Rounds (Default)**: Traditional 3-round structure with predetermined turn orders for backward compatibility.

**Dynamic Rounds (New)**: AI-driven adaptive system that continues until consensus is reached:
- **Consensus Evaluation**: `src/engine/consensusEvaluator.ts` analyzes agreement levels using AI
- **Dynamic Strategy**: `src/engine/dynamicRoundStrategy.ts` generates adaptive persona ordering
- **Termination Logic**: Discussions end when consensus threshold (85%) is reached or max rounds hit
- **Token Optimization**: Progressive context summarization prevents token explosion

### Output Generation
Two markdown writers in `src/writers/`:
- `discussionWriter.ts`: Creates full transcript with participant details, decisions, and consensus metrics
- `requestWriter.ts`: Generates PRP-ready specification with consensus summary and enhanced quality indicators

Both writers automatically include consensus data when dynamic rounds are used, providing transparency into the decision-making process and agreement levels achieved.

### Internationalization
Auto-detects Portuguese vs English from input prompt. All personas and outputs adapt language accordingly.

## Key Integration Points

### Project Context Integration
PentaForge supports project context in two ways:

**Option 1: MCP Client Context (Recommended)**
- Claude Code can provide project context via `claudeMd` and `docsContext` parameters
- More reliable than file system access from Docker containers
- Allows Claude Code to intelligently select relevant documentation

**Option 2: Local File Reading (Fallback)**
- Attempts to read `CLAUDE.md` and `docs/` directory from container's working directory
- Used when no context parameters are provided
- Less reliable in containerized environments

### MCP Tool Interface
The `run_roundtable` tool in `src/tools/roundtable.ts` is the main entry point. It accepts:
- `prompt` (required): The problem statement
- `outputDir`: Where to write files (default: `./PRPs/inputs`)
- `language`: Output language (auto-detected)
- `dryRun`: Print to stdout without writing files
- `model`: AI model to use (e.g., `mistral:latest`, `deepseek-coder:latest` for Ollama)
- `claudeMd`: Content of CLAUDE.md file from the project (optional)
- `docsContext`: Array of documentation files from docs/ directory (optional)

**NEW: Dynamic Rounds Parameters**
- `dynamicRounds`: Enable AI-driven consensus evaluation (default: false)
- `consensusConfig`: Configuration for dynamic behavior:
  - `minRounds`: Minimum rounds before consensus evaluation (default: 2)
  - `maxRounds`: Maximum rounds to prevent infinite discussions (default: 10)
  - `consensusThreshold`: Required agreement percentage (default: 85)
  - `conflictTolerance`: Maximum unresolved conflicts (default: 15)
  - `moderatorEnabled`: Include AI moderator rounds (default: true)

**Example with Context (Fixed Rounds):**
```json
{
  "prompt": "Add user authentication to my app",
  "claudeMd": "# My Project\n\nThis is a React app with Express backend...",
  "docsContext": [
    {
      "path": "docs/api.md",
      "content": "# API Documentation\n\nEndpoints:\n- GET /api/users..."
    }
  ],
  "dryRun": true
}
```

**Example with Dynamic Rounds:**
```json
{
  "prompt": "Design a complex microservices authentication system",
  "dynamicRounds": true,
  "consensusConfig": {
    "minRounds": 3,
    "maxRounds": 8,
    "consensusThreshold": 90,
    "moderatorEnabled": true
  },
  "dryRun": true
}
```

### File System Operations
All file operations use atomic writes through `src/lib/fs.ts` to prevent corruption. Files are timestamped with format `YYYY-MM-DDTHHMMSSZ`.

### Docker Considerations
- Runs as non-root user (UID 1001)
- Default output directory: `/app/PRPs/inputs`
- Volume mapping required for persistence
- Uses stdio, no ports exposed
- **Automatic Docker networking**: Detects containerized environment and uses `host.docker.internal:11434` for Ollama
- Falls back to hardcoded responses if AI service unavailable
- For MCP clients like Claude Code, networking is automatically handled

## AI Configuration

### Supported LLM Providers
PentaForge supports multiple AI providers for persona responses:
- **OpenAI** (GPT models) 
- **Anthropic** (Claude models)
- **Ollama** (Local models)

### Environment Variables
```bash
# AI Provider Configuration
AI_PROVIDER=ollama          # 'openai', 'anthropic', or 'ollama'
AI_API_KEY=your_api_key     # Required for OpenAI/Anthropic
AI_BASE_URL=http://localhost:11434  # Custom endpoint (optional)
AI_MODEL=mistral:latest     # Default model name (can be overridden per call)
AI_TEMPERATURE=0.7          # Response creativity (0-1)
AI_MAX_TOKENS=500           # Response length limit
```

### Default Models
- **OpenAI**: `gpt-4o-mini`
- **Anthropic**: `claude-3-haiku-20240307` 
- **Ollama**: `mistral:latest`

### Model Selection
You can override the default model on a per-call basis using the `model` parameter:

```json
{
  "prompt": "Create a todo application",
  "model": "deepseek-coder:latest",
  "dryRun": true
}
```

This is especially useful for Ollama where you can choose between different models you have installed locally.

### Fallback Behavior
When AI providers are unavailable or the specified model doesn't exist, personas automatically use hardcoded responses to ensure system reliability. Debug logs will clearly show when fallback responses are being used versus real AI responses.

## Testing Strategy

Tests are in `tests/` directory using Jest:
- `personas.test.ts`: Tests each persona's response generation
- `roundtable.test.ts`: Tests the complete roundtable execution

Mock filesystem operations when testing to avoid actual file writes.

## Common Modifications

### Adding a New Persona
1. Create new class in `src/personas/` extending `AIPersona`
2. Implement `getPersonaSpecificInstructions()` with bilingual AI prompts
3. Implement `generateFallbackResponse()` for when AI fails
4. Add to persona array in `src/engine/discussion.ts`
5. Update round orders if needed
6. Add tests in `tests/personas.test.ts`

### Modifying Output Format
1. Edit `src/writers/discussionWriter.ts` or `requestWriter.ts`
2. Ensure both English and Portuguese versions are updated
3. Test with both `language: "en"` and `language: "pt-BR"`

### Changing Discussion Flow
1. Modify `orchestrateDiscussion()` in `src/engine/discussion.ts`
2. Adjust `roundOrder` array for turn sequences
3. Update `extractDecisions()` and `extractNextSteps()` logic

## Debugging

### Debug Logging Features

PentaForge includes comprehensive debug logging to help you see whether AI is being used or fallback responses:

Enable debug logging:
```bash
LOG_LEVEL=DEBUG npm start
```

### What Debug Logs Show

**Project Context Loading:**
- **📂 Current working directory**: Shows where PentaForge is reading files from
- **🔎 Checking for CLAUDE.md**: Shows exact path being checked
- **✅ CLAUDE.md found**: Confirms file was loaded with character count
- **🔎 Checking for docs/ directory**: Shows docs directory path being scanned
- **📄 Loaded doc file**: Lists each documentation file found with size
- **📖 Project context summary**: Summary of all context loaded
- **📊 Context stats**: Final count of CLAUDE.md + docs files

**AI Service Operations:**
- **🧠 AI Service Configuration**: Shows provider, model, API key status at startup
- **🤖 Persona attempting AI response**: When each persona tries to use AI
- **✅ AI response generated successfully**: When AI responds with word count
- **🚨 AI persona failed, using fallback**: When AI fails and fallback is used
- **🔄 Switching to hardcoded fallback**: Explicit fallback activation
- **📝 Fallback response generated**: Fallback response with word count
- **⚡ AI Service response timing**: Response time and character count
- **📊 Token Usage**: Prompt/completion/total token counts (when available)

### Docker Debug Mode

To enable debug logging in Docker:

```bash
# Build with debug logging enabled
docker build -t pentaforge:debug --build-arg LOG_LEVEL=DEBUG .

# Or run existing image with debug logging
docker run -e LOG_LEVEL=DEBUG -i --rm -v $(pwd)/PRPs/inputs:/app/PRPs/inputs pentaforge:latest
```

### Testing AI vs Fallback

Test dry run mode to see outputs without file writes:
```json
{
  "prompt": "Test prompt",
  "dryRun": true
}
```

When AI is **working**: You'll see `🤖`, `✅`, and `⚡` emojis showing successful AI responses.
When using **fallback**: You'll see `🚨`, `🔄`, and `📝` emojis showing hardcoded responses are being used.

## PRP Integration

The generated `REQUEST.md` includes specific PRP commands at the bottom. These are designed to work with https://github.com/Wirasm/PRPs-agentic-eng workflow:

1. `/prp-base-create` - Creates base document from REQUEST.md
2. `/prp-create-planning` - Generates planning from base
3. `/prp-create-tasks` - Creates task breakdown
4. `/prp-execute-tasks` - Implements the solution