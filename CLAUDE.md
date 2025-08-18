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
docker run -i --rm -v $(pwd)/PRPs/inputs:/app/PRPs/inputs pentaforge:latest
```

## Architecture Overview

### MCP Server Structure
The server uses stdio transport for communication with MCP clients like Claude Code. It exposes a single tool `run_roundtable` that accepts a prompt and orchestrates the discussion.

### Persona System
Five expert personas simulate an agile team meeting:
- **KeyUser**: Provides user perspective and acceptance criteria
- **BusinessAnalyst**: Defines requirements and constraints
- **ProductOwner**: Sets priorities and success metrics
- **ScrumMaster**: Coordinates delivery and manages risks
- **SolutionsArchitect**: Designs technical implementation

Each persona inherits from `src/personas/base.ts` and implements `generateResponse()` with context awareness.

### Discussion Engine
`src/engine/discussion.ts` orchestrates 3 rounds of discussion with specific turn orders. It manages state, extracts decisions, and generates next steps based on the collective discussion.

### Output Generation
Two markdown writers in `src/writers/`:
- `discussionWriter.ts`: Creates full transcript with participant details and decisions
- `requestWriter.ts`: Generates PRP-ready specification with all required artifacts

### Internationalization
Auto-detects Portuguese vs English from input prompt. All personas and outputs adapt language accordingly.

## Key Integration Points

### MCP Tool Interface
The `run_roundtable` tool in `src/tools/roundtable.ts` is the main entry point. It accepts:
- `prompt` (required): The problem statement
- `outputDir`: Where to write files (default: `./PRPs/inputs`)
- `language`: Output language (auto-detected)
- `dryRun`: Print to stdout without writing files

### File System Operations
All file operations use atomic writes through `src/lib/fs.ts` to prevent corruption. Files are timestamped with format `YYYY-MM-DDTHHMMSSZ`.

### Docker Considerations
- Runs as non-root user (UID 1001)
- Default output directory: `/app/PRPs/inputs`
- Volume mapping required for persistence
- Uses stdio, no ports exposed

## Testing Strategy

Tests are in `tests/` directory using Jest:
- `personas.test.ts`: Tests each persona's response generation
- `roundtable.test.ts`: Tests the complete roundtable execution

Mock filesystem operations when testing to avoid actual file writes.

## Common Modifications

### Adding a New Persona
1. Create new class in `src/personas/` extending `base.ts`
2. Implement `generateResponse()` with language support
3. Add to persona array in `src/engine/discussion.ts`
4. Update round orders if needed
5. Add tests in `tests/personas.test.ts`

### Modifying Output Format
1. Edit `src/writers/discussionWriter.ts` or `requestWriter.ts`
2. Ensure both English and Portuguese versions are updated
3. Test with both `language: "en"` and `language: "pt-BR"`

### Changing Discussion Flow
1. Modify `orchestrateDiscussion()` in `src/engine/discussion.ts`
2. Adjust `roundOrder` array for turn sequences
3. Update `extractDecisions()` and `extractNextSteps()` logic

## Debugging

Enable debug logging:
```bash
LOG_LEVEL=DEBUG npm start
```

Test dry run mode to see outputs without file writes:
```json
{
  "prompt": "Test prompt",
  "dryRun": true
}
```

## PRP Integration

The generated `REQUEST.md` includes specific PRP commands at the bottom. These are designed to work with https://github.com/Wirasm/PRPs-agentic-eng workflow:

1. `/prp-base-create` - Creates base document from REQUEST.md
2. `/prp-create-planning` - Generates planning from base
3. `/prp-create-tasks` - Creates task breakdown
4. `/prp-execute-tasks` - Implements the solution