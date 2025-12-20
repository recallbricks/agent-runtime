# Contributing to RecallBricks Agent Runtime

Thank you for your interest in contributing to RecallBricks! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Python 3.8+ (for Python SDK development)
- Git

### Setup Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/agent-runtime.git
   cd agent-runtime
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Run tests:
   ```bash
   npm test
   ```

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions or updates

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or updates
- `chore`: Build process or auxiliary tool changes

Examples:
```
feat(core): add streaming support to LLMAdapter

fix(identity): correct validation pattern for base model references

docs(api): update ChatResponse interface documentation

test(config): add tests for environment variable parsing
```

## Code Standards

### TypeScript

- Use TypeScript strict mode
- Provide type annotations for public APIs
- Use interfaces over types where appropriate
- Avoid `any` types (use `unknown` if necessary)
- Document complex logic with comments

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check linting
npm run lint

# Format code
npm run format
```

Configuration is provided in `.eslintrc.js` and `.prettierrc`.

### Testing

All new features and bug fixes must include tests:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

Test coverage requirements:
- Overall: 80%+
- Functions: 80%+
- Lines: 80%+
- Branches: 80%+

### Documentation

- Update documentation for all public API changes
- Include JSDoc comments for all exported functions and classes
- Update README.md if adding new features
- Add examples for new functionality

## Pull Request Process

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes:**
   - Write code
   - Add tests
   - Update documentation

3. **Verify everything works:**
   ```bash
   npm run build
   npm test
   npm run lint
   ```

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

5. **Push to your fork:**
   ```bash
   git push origin feature/my-new-feature
   ```

6. **Create a Pull Request:**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

### Pull Request Guidelines

- **Title:** Use conventional commit format
- **Description:** Clearly explain what and why
- **Link Issues:** Reference related issues (e.g., "Closes #123")
- **Tests:** All tests must pass
- **Documentation:** Update relevant docs
- **Review:** Address all review comments

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] No new warnings

## Related Issues
Closes #(issue number)

## Screenshots (if applicable)
```

## Project Structure

```
recallbricks-agent-runtime/
├── src/
│   ├── core/              # Core runtime components
│   ├── adapters/          # Integration adapters
│   ├── types/             # TypeScript type definitions
│   └── config/            # Configuration system
├── tests/                 # Test suite
├── examples/              # Example implementations
├── docs/                  # Documentation
└── dist/                  # Build output
```

## Adding New Features

### Core Components

When adding new core components:

1. Create implementation in `src/core/`
2. Export from `src/index.ts`
3. Add comprehensive tests in `tests/`
4. Document in API reference
5. Add example usage

### Adapters

When adding new adapters:

1. Create adapter directory in `src/adapters/`
2. Implement adapter interface
3. Add example in `examples/`
4. Document setup and usage
5. Update README

### LLM Providers

When adding new LLM providers:

1. Update `LLMProvider` type in `src/types/index.ts`
2. Add provider support in `LLMAdapter.ts`
3. Add default model configuration
4. Update configuration validation
5. Add tests for provider
6. Document provider setup

## Testing Guidelines

### Unit Tests

- Test individual functions and methods
- Mock external dependencies
- Cover edge cases and error conditions

Example:
```typescript
describe('IdentityValidator', () => {
  it('should detect Claude references', () => {
    const validator = new IdentityValidator(config);
    const result = validator.validate("I'm Claude");
    expect(result.isValid).toBe(false);
  });
});
```

### Integration Tests

- Test component interactions
- Use test fixtures for external services
- Test error handling

### End-to-End Tests

- Test complete workflows
- Use real or mock API endpoints
- Verify expected behavior

## Documentation

### Code Documentation

Use JSDoc for all exported functions and classes:

```typescript
/**
 * Send a chat message and get a contextual response
 *
 * @param message - The user's message
 * @param conversationHistory - Optional conversation history
 * @returns Chat response with metadata
 * @throws {LLMError} If LLM request fails
 *
 * @example
 * ```typescript
 * const response = await runtime.chat('Hello!');
 * console.log(response.response);
 * ```
 */
async chat(message: string): Promise<ChatResponse> {
  // Implementation
}
```

### Markdown Documentation

- Use clear headings and structure
- Include code examples
- Link related documentation
- Keep examples up to date

## Reporting Issues

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs. actual behavior
- Environment details (Node version, OS, etc.)
- Error messages and stack traces
- Minimal reproduction code

### Feature Requests

Include:
- Clear description of the feature
- Use cases and motivation
- Proposed API design (if applicable)
- Alternatives considered

## Code Review

All submissions require review. Reviewers will check:

- Code quality and style
- Test coverage
- Documentation completeness
- Performance implications
- Breaking changes
- Security considerations

## Release Process

Releases follow [Semantic Versioning](https://semver.org/):

- **MAJOR:** Breaking changes
- **MINOR:** New features (backward compatible)
- **PATCH:** Bug fixes (backward compatible)

## Community

- **GitHub Issues:** Bug reports and feature requests
- **GitHub Discussions:** Questions and general discussion
- **Email:** support@recallbricks.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

If you have questions about contributing, feel free to:
- Open a GitHub discussion
- Email support@recallbricks.com
- Review existing issues and PRs

Thank you for contributing to RecallBricks!
