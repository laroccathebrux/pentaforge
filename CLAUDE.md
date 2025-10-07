# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Purpose

PentaForge is an MCP (Model Context Protocol) server that orchestrates structured roundtable discussions among 8 expert personas to generate PRP-ready specifications. It transforms simple programming demands into comprehensive, actionable specifications compatible with PRPs-agentic-eng.

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

# Suppress JSON-RPC protocol logs (optional - for cleaner output)
docker run -e SUPPRESS_MCP_LOGS=true -i --rm -v $(pwd)/PRPs/inputs:/app/PRPs/inputs pentaforge:latest
```

## Architecture Overview

### MCP Server Structure
The server uses stdio transport for communication with MCP clients like Claude Code. It exposes a single tool `run_roundtable` that accepts a prompt and orchestrates the discussion.

### Persona System
Eight expert personas simulate a comprehensive product team meeting:
- **BusinessAnalyst**: Defines requirements and constraints
- **KeyUser**: Provides user perspective and acceptance criteria
- **ProductOwner**: Sets priorities and success metrics
- **ScrumMaster**: Coordinates delivery and manages risks
- **SolutionsArchitect**: Designs technical implementation
- **UXUIDesigner**: Focuses on user experience and interface design
- **SupportRepresentative**: Brings customer success and operational insights
- **BusinessStakeholder**: Evaluates market positioning and ROI
- **AIModerator**: Evaluates consensus and guides discussion resolution (dynamic rounds only)

Each persona extends `AIPersona` (from `src/personas/aiPersona.ts`) which provides AI-powered responses using configurable LLM providers. When AI fails, personas automatically fallback to hardcoded responses ensuring system reliability.

**Enhanced Prompt Engineering (v2.0)**: Each persona now includes detailed, structured instructions that guide the AI to:
- Analyze SPECIFIC requirements (not generic best practices)
- Reference CONCRETE details from the prompt and project context
- Provide QUANTIFIED metrics and measurable outcomes
- Use structured analysis frameworks (6-point checklists for each role)
- Avoid generic statements and focus on actionable, specific recommendations
- Build on previous discussion contributions with concrete additions

**Consensus-Building Instructions (v2.1)**: Personas now explicitly work toward team consensus:
- **Primary goal**: Achieve team alignment and agreement
- **Agree first**: Acknowledge valid points from other participants before adding perspective
- **Converge**: Identify common ground and build upon areas of agreement
- **Cite others**: Reference specific proposals from other roles when agreeing
- **Compromise**: Propose constructive alternatives that incorporate others' ideas
- **Signal progress**: Use explicit phrases like "I agree with [Role]'s approach..."

This enhancement ensures discussions converge toward consensus instead of repeating divergent viewpoints across all rounds.

### Discussion Engine
`src/engine/discussion.ts` orchestrates discussions using either fixed 3-round mode (default) or dynamic consensus-driven rounds. The system supports two modes:

**Fixed Rounds (Default)**: Traditional 3-round structure with predetermined turn orders for backward compatibility.

**Dynamic Rounds (New)**: AI-driven adaptive system that continues until consensus is reached:
- **Consensus Evaluation**: `src/engine/consensusEvaluator.ts` analyzes agreement levels using AI
- **Dynamic Strategy**: `src/engine/dynamicRoundStrategy.ts` generates adaptive persona ordering
- **Termination Logic**: Discussions end when consensus threshold (85%) is reached or max rounds hit
- **Token Optimization**: Progressive context summarization prevents token explosion

### Output Generation
Three markdown writers in `src/writers/`:
- `discussionWriter.ts`: Creates full transcript with participant details, decisions, and consensus metrics
- `prdWriter.ts`: **NEW** - Generates industry-standard Product Requirements Documents (PRDs) with comprehensive sections
- `requestWriter.ts`: Legacy PRP-ready specification format (now secondary to PRD)

**PRD Format (Default)**: Industry-standard Product Requirements Document with 7 comprehensive sections:
1. **Overview/Goal**: Problem statement, objectives, business context
2. **Scope**: What's included/excluded, constraints, dependencies  
3. **Functional Requirements**: Detailed requirements with priorities and acceptance criteria
4. **Non-Functional Requirements**: Performance, security, scalability, usability
5. **User Journey**: Step-by-step user workflows and interactions
6. **Acceptance Criteria**: Testable Given-When-Then scenarios
7. **Stakeholders**: Roles, responsibilities, influence mapping

All writers automatically include consensus data when dynamic rounds are used, providing transparency into the decision-making process and agreement levels achieved.

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
- `outputFormat`: **NEW** - 'PRD' (default) or 'REQUEST' for legacy format
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

**NEW: Interactive Issue Resolution Parameters**
- `unresolvedIssuesFile`: Path to resolved UNRESOLVED_ISSUES.md file for final generation
- `unresolvedIssuesThreshold`: Threshold for unresolved issues before switching to interactive mode (default: 1)

**Example with PRD Output (Default):**
```json
{
  "prompt": "Add user authentication to my app",
  "outputFormat": "PRD",
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

**Example with Legacy REQUEST Output:**
```json
{
  "prompt": "Add user authentication to my app", 
  "outputFormat": "REQUEST",
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

**Example with Issue Resolution:**
```json
{
  "prompt": "Design authentication system",
  "unresolvedIssuesFile": "./PRPs/inputs/UNRESOLVED_ISSUES_20240822T143022Z.md",
  "dryRun": true
}
```

### Interactive Issue Resolution Workflow

**IMPORTANT**: PRD generation follows the exact same workflow as the previous REQUEST.md system.

When discussions conclude with unresolved issues, PentaForge generates an interactive UNRESOLVED_ISSUES.md file instead of an incomplete PRD.md (or REQUEST.md). This workflow allows users to provide input on contested points:

**Phase 1: Issue Detection**
- System detects when `finalConsensus.unresolvedIssues.length >= unresolvedIssuesThreshold`
- Generates UNRESOLVED_ISSUES.md with persona positions and voting options
- Each issue includes options for each persona's position, "No strong preference", and "Custom"

**Phase 2: User Resolution**  
- User reviews generated file and marks preferences using checkboxes
- Can select existing persona positions or provide custom solutions
- Must resolve all issues before proceeding

**Phase 3: Final Generation**
- User re-runs PentaForge with `unresolvedIssuesFile` parameter  
- System generates final PRD.md (or REQUEST.md) using user's resolved preferences
- No additional persona discussion needed
- **Critical**: PRD is only generated after all issues are resolved, maintaining workflow integrity

**File Format Example:**
```markdown
## Issue 1: Authentication Method Selection

### SolutionsArchitect Position
- [ ] Use OAuth 2.0 with external providers only
**Reasoning:** Reduces development complexity and maintenance overhead

### BusinessStakeholder Position  
- [ ] Implement custom JWT-based authentication
**Reasoning:** Provides full control and can integrate with existing systems

### Additional Options
- [x] **Custom** - I have my own preference (describe below)

**Custom Resolution:**
Use OAuth 2.0 as primary with JWT fallback for internal services
```

### File System Operations
All file operations use atomic writes through `src/lib/fs.ts` to prevent corruption. Files are timestamped with format `YYYY-MM-DDTHHMMSSZ`.

**Interactive Issue Files:**
- UNRESOLVED_ISSUES.md files are generated with timestamp format `UNRESOLVED_ISSUES_YYYY-MM-DDTHHMMSSZ.md`
- Files include voting checkboxes and require exactly one selection per issue
- Support both Portuguese and English based on original discussion language
- Custom input validation ensures complete resolution before regeneration

**⚠️ CRITICAL WORKFLOW (Latest):**
- **PRD replaces REQUEST.md as the default output format**
- PRD follows identical workflow to REQUEST.md: only generates when no unresolved issues remain
- Fixed consensus routing logic that prevented resolution workflow triggering when unresolved issues were present
- System correctly generates UNRESOLVED_ISSUES.md when `finalConsensus.unresolvedIssues.length >= threshold`
- Resolution workflow triggers based on final metrics only, not consensus history
- **Both PRD and REQUEST formats respect the unresolved issues workflow equally**

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
4. Add to persona array in `src/engine/discussion.ts` (currently 8 personas)
5. Update round orders in `executeFixedRounds()` for all personas
6. Update dynamic round strategy indices in `src/engine/dynamicRoundStrategy.ts`
7. Add tests in `tests/personas.test.ts`

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

## Recent Improvements

### v2.1 - Consensus-Building Instructions (Latest)
**Problem**: Discussions were reaching maximum rounds without achieving consensus. Personas were providing divergent viewpoints in every round instead of converging toward agreement.

**Root Cause Analysis**:
1. Personas had no explicit instructions to seek consensus
2. No guidance to acknowledge and build on others' contributions
3. Missing objective to converge opinions rather than just state perspectives
4. No prompts to identify areas of agreement or propose compromises

**Solution**: Added comprehensive consensus-building instructions to persona prompts:

**System-Level Changes** (`aiPersona.ts`):
- Added "CONSENSUS-BUILDING INSTRUCTIONS" section to both English and Portuguese system prompts
- Defined "PRIMARY GOAL" as achieving team consensus and alignment
- Provided 7 specific consensus tactics (agree first, converge, cite, compromise, avoid repetition, signal agreement)
- Updated discussion guidelines to mandate consensus demonstration after round 1

**Context-Level Changes**:
- Enhanced previousTurns prompt with explicit "GOAL: SEEK CONSENSUS" header
- Added 5-point checklist for consensus-oriented responses
- Instructions to cite specific participants when agreeing
- Guidance to propose alternatives that reconcile different perspectives
- Focus on demonstrating progress toward consensus in each response

**Expected Impact**:
- ✅ Discussions converge faster (fewer rounds needed)
- ✅ Explicit agreement statements between personas
- ✅ Building on previous ideas instead of repeating viewpoints
- ✅ Constructive compromises when disagreements exist
- ✅ Consensus threshold reached before maxRounds limit

**Files Modified**:
- `src/personas/aiPersona.ts` - Added consensus-building instructions to system and context prompts
- `CLAUDE.md` - Documentation updated with v2.1 improvements

---

### v2.0 - Enhanced Persona Relevance
**Problem**: Discussions were generating generic, non-specific responses that didn't address the actual requirements.

**Solution**: Completely restructured persona prompts with:
1. **Critical Instructions Section**: Explicit guidance to avoid generic statements
2. **Structured Analysis Frameworks**: 6-point checklists specific to each role
3. **Concrete Examples**: "AVOID this / PREFER that" patterns for each persona
4. **Quantification Requirements**: Force personas to provide numbers, metrics, and measurable outcomes
5. **Context Integration**: Instructions to reference project context and specific technologies mentioned

**Impact**: Personas now provide:
- Specific technical recommendations instead of "use best practices"
- Quantified metrics instead of vague statements
- Concrete examples relevant to the prompt
- Analysis that builds on previous discussion points

**Files Modified**:
- `src/personas/aiPersona.ts`: Enhanced base system prompt with relevance instructions
- `src/personas/BusinessAnalyst.ts`: Added functional/non-functional requirements framework
- `src/personas/SolutionsArchitect.ts`: Added architecture and tech stack analysis framework
- `src/personas/ProductOwner.ts`: Added value proposition and ROI framework
- `src/personas/KeyUser.ts`: Added pain points and user workflow framework
- `src/personas/UXUIDesigner.ts`: Added UI components and interaction framework
- `src/personas/ScrumMaster.ts`: Added delivery planning and risk framework
- `src/personas/BusinessStakeholder.ts`: Added business analysis and ROI framework
- `src/personas/SupportRepresentative.ts`: Added support impact analysis framework

## Troubleshooting

### Interactive Issue Resolution

**Problem**: UNRESOLVED_ISSUES.md generated but I want REQUEST.md anyway  
**Solution**: Set `unresolvedIssuesThreshold` to a high value (e.g., 999) to disable interactive mode

**Problem**: "Invalid selections" error when using resolved file  
**Solution**: Ensure exactly one checkbox is marked [x] for each issue. Check for:
- Multiple selections: `- [x]` and `- [x]` on same issue
- No selections: All checkboxes still `- [ ]`
- Missing custom input: Selected "Custom" but no description provided

**Problem**: File format not recognized  
**Solution**: Ensure the UNRESOLVED_ISSUES.md file hasn't been modified outside the checkbox selections and custom input areas

**Problem**: Consensus threshold too low/high  
**Solution**: Adjust `consensusThreshold` in `consensusConfig`:
- Lower (70-80): More permissive, fewer unresolved issues
- Higher (90-95): Stricter consensus requirement, more unresolved issues

**Problem**: Too many issues generated  
**Solution**: Increase `conflictTolerance` in `consensusConfig` or use fewer personas in complex discussions

### Dynamic Rounds Issues

**Problem**: Discussion taking too long  
**Solution**: Reduce `maxRounds` or increase `consensusThreshold` for faster termination

**Problem**: AI consensus evaluation failing  
**Solution**: Check AI service configuration. System will fall back to rule-based evaluation automatically

**Problem**: Moderator causing infinite loops  
**Solution**: Set `moderatorEnabled: false` in `consensusConfig` to disable AI moderator

### General Troubleshooting

**Problem**: Files not generated  
**Solution**: Check directory permissions and ensure `outputDir` path is valid and writable

**Problem**: Non-English output despite English input  
**Solution**: Explicitly set `language: "en"` parameter to override auto-detection

**Problem**: AI responses too short/long  
**Solution**: Adjust `AI_MAX_TOKENS` environment variable (default: 500)

## PRP Integration

**PRD Format (Default)**: Generated PRDs are industry-standard documents that can be used directly with development teams or converted to PRP workflows.

**REQUEST Format (Legacy)**: The generated `REQUEST.md` includes specific PRP commands at the bottom for https://github.com/Wirasm/PRPs-agentic-eng workflow:

1. `/prp-base-create` - Creates base document from REQUEST.md
2. `/prp-create-planning` - Generates planning from base  
3. `/prp-create-tasks` - Creates task breakdown
4. `/prp-execute-tasks` - Implements the solution

**Migration Note**: PRD format is now the recommended output as it follows industry standards and provides more comprehensive requirements documentation.