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
- 🌍 **Internationalization**: Supports English and Portuguese (auto-detected)
- 📝 **PRP-Ready Output**: Compatible with PRPs-agentic-eng workflow
- 🐳 **Docker Support**: Run locally or in containers
- 🔄 **MCP Protocol**: Integrates with Claude Code and other MCP clients
- ⚡ **Deterministic**: Same input produces consistent outputs

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
    "includeAcceptanceCriteria": true
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
│   │   ├── base.ts
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