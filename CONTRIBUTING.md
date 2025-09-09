# Contributing to Revali

We love your input! We want to make contributing to Revali as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

### Development Setup

```bash
git clone https://github.com/cerebralatlas/revali.git
cd revali
pnpm install

# Development
pnpm run dev

# Build
pnpm run build

# Test
pnpm run test
pnpm run test:coverage    # Run tests with coverage report
pnpm run test:ui         # Run tests with UI

# Type checking
pnpm run type-check

# Linting
pnpm run lint
pnpm run lint:fix

# Formatting
pnpm run format
pnpm run format:check
```

### Code Quality

- Write TypeScript with strict typing
- Follow the existing code style (enforced by ESLint + Prettier)
- Write comprehensive tests for new features
- Ensure all tests pass before submitting
- Update documentation as needed

### Versioning

We use [Changesets](https://github.com/changesets/changesets) for version management:

1. When making changes, run `pnpm changeset` to create a changeset file
2. Describe your changes in the generated file
3. Choose appropriate version bump (patch/minor/major)
4. Include the changeset file in your PR

### Testing

- Write unit tests in `tests/core/` for core functionality
- Write integration tests in `tests/integration/` for end-to-end scenarios
- Aim for high test coverage
- Use descriptive test names and organize tests logically

### Bug Reports

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/cerebralatlas/revali/issues/new).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

### License

By contributing, you agree that your contributions will be licensed under the MIT License.

### References

This document was adapted from the open-source contribution guidelines for [Facebook's Draft](https://github.com/facebook/draft-js/blob/a9316a723f9e918afde44dea68b5f9f39b7d9b00/CONTRIBUTING.md).
