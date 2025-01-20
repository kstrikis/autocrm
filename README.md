# AutoCRM

AutoCRM is a modern, AI-powered Customer Relationship Management platform that minimizes human workload in customer support while enhancing the customer experience. By leveraging generative AI and existing help resources, AutoCRM delivers an interactive support experience with minimal human involvement.

## Features

- AI-powered ticket resolution
- Real-time ticket management with Supabase
- Modern, responsive UI with React and Tailwind CSS
- Automated routing and prioritization
- Enterprise-grade authentication with Supabase Auth
- Component-driven development with shadcn
- Comprehensive logging and monitoring
- Full test coverage with Cypress

## Tech Stack

### Frontend
- React with TypeScript
- Vite for fast builds and development
- Tailwind CSS for styling
- shadcn for UI components

### Backend & Infrastructure
- Supabase for database, auth, and real-time features
- Supabase Edge Functions for backend logic
- AWS Amplify for deployment and hosting
- Vector store for RAG-based knowledge management

### Quality & Testing
- ESLint with custom rules for code quality
- Cypress for component and E2E testing
- Custom browser-based logging system
- Strict TypeScript configuration

## Project Structure

```
/
├── docs/                    # Project documentation
│   ├── ARCHITECTURE.md     # System architecture
│   ├── FEATURES.md         # Feature specifications
│   ├── PROCESS.md         # Development processes
│   └── TECH-STACK.md      # Detailed tech stack info
├── src/
│   ├── components/         # React components
│   ├── lib/               # Shared utilities
│   ├── pages/             # Page components
│   ├── styles/            # Global styles
│   └── types/             # TypeScript types
├── cypress/
│   ├── component/         # Component tests
│   └── e2e/              # End-to-end tests
└── eslint-rules/          # Custom ESLint rules
```

## Technical Decisions

1. **TypeScript First**: Strict TypeScript configuration for better type safety and developer experience.

2. **Custom Logging**: Browser-optimized logging system with:
   - Color-coded log levels
   - Method entry/exit tracing
   - Structured metadata
   - Environment-aware logging

3. **Code Quality**:
   - Custom ESLint rules for enforcing logging
   - Strict naming conventions
   - Automated testing requirements
   - Comprehensive documentation

4. **Testing Strategy**:
   - Component tests with Cypress
   - E2E tests for critical paths
   - Automated test runs in CI/CD

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/kstrikis/autocrm.git
   cd autocrm
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase configuration
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Run tests:
   ```bash
   npm test                 # All tests
   npm run cypress:open     # Interactive mode
   npm run cypress:run      # Headless mode
   ```

## Documentation

Comprehensive documentation is available in the `/docs` directory:

- `ARCHITECTURE.md` - System design and architecture
- `FEATURES.md` - Feature specifications and roadmap
- `PROCESS.md` - Development processes and guidelines
- `TECH-STACK.md` - Detailed technology stack information

## Contributing

1. Follow our coding standards (see `/docs/PROCESS.md`)
2. Write tests for new features
3. Update documentation as needed
4. Submit pull requests with clear descriptions

## License

This project is licensed under the MIT License - see the LICENSE file for details.