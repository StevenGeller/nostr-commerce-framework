# Contributing to Nostr Commerce Framework

We love your input! We want to make contributing to the Nostr Commerce Framework as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Pull Request Process

1. Update the README.md with details of changes to the interface, if applicable
2. Update the API.md with any new or modified API endpoints
3. The PR will be merged once you have the sign-off of two other developers
4. If you haven't already, complete the Contributor License Agreement ("CLA")

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using GitHub's [issue tracker](https://github.com/stevengeller/nostr-commerce-framework/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/stevengeller/nostr-commerce-framework/issues/new); it's that easy!

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/stevengeller/nostr-commerce-framework.git
   cd nostr-commerce-framework
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Run tests:
   ```bash
   npm test
   ```

5. Start development:
   ```bash
   npm run dev
   ```

## Testing

We use Jest for testing. Run the test suite with:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific tests
npm test -- -t "Commerce Module"
```

### Integration Tests

For integration tests involving Bitcoin and Lightning Network:

1. Set up local nodes (or use regtest)
2. Configure connection details in `.env`
3. Run integration tests:
   ```bash
   npm run test:integration
   ```

## Code Style

- We use ESLint and Prettier for code formatting
- TypeScript for type safety
- Follow the existing code style

Run linting:
```bash
npm run lint
```

Fix linting issues:
```bash
npm run lint:fix
```

## Documentation

- Update documentation as you make changes
- Use JSDoc comments for functions and classes
- Keep the API.md file up to date
- Add examples for new features

## Commit Messages

Format: `<type>(<scope>): <subject>`

Example: `feat(commerce): add Lightning Network support`

Types:
- feat: A new feature
- fix: A bug fix
- docs: Documentation only changes
- style: Changes that do not affect the meaning of the code
- refactor: A code change that neither fixes a bug nor adds a feature
- test: Adding missing tests or correcting existing tests
- chore: Changes to the build process or auxiliary tools

## License

By contributing, you agree that your contributions will be licensed under its MIT License.

## Questions?

Contact the maintainers:
- Email: support@stevengeller.com
- GitHub Discussions: [nostr-commerce-framework/discussions](https://github.com/stevengeller/nostr-commerce-framework/discussions)