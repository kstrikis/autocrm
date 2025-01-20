# Coding Standards

```typescript
{
  "standards": {
    "typescript": {
      "required": true,
      "returnTypes": "explicit",
      "noFloatingPromises": true,
      "namingConventions": {
        "default": ["camelCase", "PascalCase"],
        "variables": ["camelCase", "PascalCase", "UPPER_CASE"],
        "types": ["PascalCase"],
        "enums": ["UPPER_CASE"],
        "dbFields": ["snake_case"]
      }
    },
    "logging": {
      "required": true,
      "excludeSmallFunctions": true,
      "smallFunctionThreshold": 3,
      "methodEntry": {
        "format": "logMethodEntry('methodName', { args })",
        "required": true
      },
      "methodExit": {
        "format": "logMethodExit('methodName', { result })",
        "required": true
      },
      "errors": {
        "format": "logError(error instanceof Error ? error : new Error('Message'), 'context')",
        "required": true
      },
      "excludedPatterns": [
        "^(get|set)[A-Z].*$",
        "^handle(Change|Click|Submit|Delete)$",
        "^on[A-Z].*$",
        "^render[A-Z].*$",
        "^use[A-Z].*$",
        "^(map|filter|reduce)[A-Z].*$",
        "^(format|transform|validate|compute|parse)[A-Z].*$",
        "^(serialize|normalize|denormalize)[A-Z].*$",
        "^(to|from|is|has|should|can|will|did)[A-Z].*$",
        "^component.*$",
        "^anonymous$"
      ]
    },
    "testing": {
      "cypress": {
        "required": true,
        "types": ["component", "e2e"],
        "electronLogging": true
      }
    },
    "git": {
      "commitMessages": {
        "format": "single-line",
        "type": "conventional"
      }
    },
    "dependencies": {
      "packageManager": "npm",
      "versionStrategy": "latest",
      "typescript": "required",
      "javascript": "forbidden"
    }
  }
}
```
# Development Process

## Development Philosophy

### AI-First Development
- Optimize code organization for AI readability
- Maintain comprehensive logging for AI debugging
- Structure components for AI maintenance
- Focus on clear patterns over excessive abstraction

### Code Quality
- Strict TypeScript usage
- Comprehensive test coverage
- Automated linting and formatting
- Clear documentation standards

## Development Workflow

### 1. Feature Planning
- Define feature requirements
- Create technical specification
- Identify AI integration points
- Plan test coverage

### 2. Development
- Write failing tests first
- Implement feature code
- Add comprehensive logging
- Document as you code

### 3. Code Review
- Automated checks must pass
- Review logging implementation
- Verify test coverage
- Check documentation updates

### 4. Testing
- Run automated tests
- Perform manual testing
- Verify AI interactions
- Test edge cases

### 5. Deployment
- Stage changes
- Run integration tests
- Deploy to production
- Monitor for issues

## Coding Standards

### TypeScript
- Use strict mode
- Define explicit types
- Avoid `any` type
- Document complex types

### React Components
- Use functional components
- Implement proper error boundaries
- Follow React hooks rules
- Document prop types

### Logging
- Use structured logging
- Include relevant context
- Log appropriate levels
- Track method entry/exit

### Testing
- Write unit tests
- Include integration tests
- Test AI interactions
- Document test cases

## Git Workflow

### Branches
- main: Production code
- develop: Integration branch
- feature/*: New features
- fix/*: Bug fixes

### Commits
- Use clear, single-line messages
- Reference issue numbers
- Keep commits focused
- Follow conventional commits

### Pull Requests
- Include description
- Link related issues
- Update documentation
- Add test coverage

## Documentation

### Code Documentation
- Document complex logic
- Explain AI interactions
- Include usage examples
- Keep docs updated

### API Documentation
- Document endpoints
- Include request/response examples
- Note authentication requirements
- Document error responses

### README Updates
- Keep features current
- Update installation steps
- Document configuration
- Note breaking changes

## Tools and Environment

### Development Tools
- VS Code or Cursor
- ESLint configuration
- Prettier setup
- Git hooks

### Environment Setup
- Node.js LTS
- npm (not yarn)
- Supabase CLI
- Environment variables

## CI/CD Pipeline

### Continuous Integration
- Run automated tests
- Check code coverage
- Verify build process
- Lint code

### Continuous Deployment
- Automated staging deploys
- Production deployment approval
- Rollback capability
- Deployment logging

## Monitoring and Maintenance

### Application Monitoring
- Error tracking
- Performance metrics
- User analytics
- AI performance

### Maintenance
- Regular dependency updates
- Security patches
- Performance optimization
- Documentation reviews

## Security Practices

### Code Security
- No secrets in code
- Secure API handling
- Input validation
- Output sanitization

### Data Security
- Encryption at rest
- Secure transmission
- Access control
- Audit logging

## Performance Guidelines

### Frontend
- Optimize bundle size
- Implement lazy loading
- Use proper caching
- Monitor render performance

### Backend
- Optimize database queries
- Cache where appropriate
- Handle rate limiting
- Monitor response times

## AI Integration Guidelines

### LLM Integration
- Document prompt engineering
- Handle rate limits
- Implement fallbacks
- Monitor token usage

### Vector Store
- Optimize embeddings
- Monitor similarity thresholds
- Implement caching
- Handle updates

## Error Handling

### Frontend Errors
- Implement error boundaries
- Show user-friendly messages
- Log detailed errors
- Handle offline states

### Backend Errors
- Use proper status codes
- Implement retry logic
- Log error context
- Monitor error rates
