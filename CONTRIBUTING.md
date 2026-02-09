# Contributing to OpenCode Pollinations Plugin

Thank you for your interest in contributing! 🌸

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Setup
```bash
# Clone the repository
git clone https://github.com/fkom13/opencode-pollinations-plugin.git
cd opencode-pollinations-plugin

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## 📁 Project Structure

```
opencode-pollinations-plugin/
├── src/                    # TypeScript source files
│   ├── index.ts           # Plugin entry point
│   └── server/            # Core logic
│       ├── proxy.ts       # Request routing & Safety Net
│       ├── commands.ts    # CLI commands (/pollinations)
│       ├── config.ts      # Configuration management
│       ├── quota.ts       # Usage tracking
│       └── generate-config.ts  # Model discovery
├── dist/                   # Compiled JavaScript (generated)
├── scripts/               # Development & testing scripts
│   ├── test-suite.cjs    # Main test suite (npm test)
│   ├── dev.sh            # Development launcher
│   └── run-standalone.js # Test without OpenCode
├── bin/                   # Installation scripts
├── docs/                  # Technical documentation
└── _archs/               # Archived/legacy code
```

## 🧪 Testing

### Run the test suite
```bash
npm test
```

The test suite validates:
- ✅ Package configuration
- ✅ Build output integrity
- ✅ Configuration module
- ✅ Model discovery API
- ✅ Proxy module exports
- ✅ Commands handling

### Manual testing
```bash
# Start a standalone proxy for debugging
node scripts/run-standalone.js

# Run validation scripts
./scripts/final-validation.sh
```

## 📝 Code Guidelines

### TypeScript
- Use strict typing
- Export functions and types explicitly
- Document complex logic with comments

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add new feature
fix: resolve bug
docs: update documentation
chore: maintenance tasks
refactor: code restructuring
test: add/update tests
```

### Pull Request Process
1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit with descriptive message
6. Push and create a Pull Request

## 🏗️ Architecture Overview

### Safety Net System
The plugin never blocks users. If an API call fails due to quota/auth issues:
1. Automatically falls back to free models
2. Notifies the user transparently
3. Continues the workflow

### Mode System
- **manual**: User controls model selection
- **alwaysfree**: Only free models
- **pro**: Enterprise models with fallback

### Configuration Hierarchy
Priority (highest to lowest):
1. `~/.pollinations/config.json`
2. `~/.local/share/opencode/auth.json`
3. `~/.config/opencode/opencode.json`

## 🐛 Reporting Issues

Please use [GitHub Issues](https://github.com/fkom13/opencode-pollinations-plugin/issues) with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- OpenCode version
- Plugin version (`npm list opencode-pollinations-plugin`)

## 💬 Contact

- **GitHub Issues**: For bugs and feature requests
- **Pull Requests**: For code contributions

---

*Made with 💜 by the Pollinations community*
