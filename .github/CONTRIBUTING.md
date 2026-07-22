# Contributing to Hive

First of all, thank you for your interest in contributing to Hive! ❤️

Hive is an open-source local development environment focused on simplicity, performance, and developer experience.

## Getting Started

1. Fork the repository.
2. Create a new branch from `main`.

```bash
git checkout -b feature/your-feature-name
```

3. Make your changes.
4. Commit using a clear commit message.

Example:

```text
feat: add Node.js runtime manager
fix: resolve runtime detection on Windows
docs: update installation guide
```

5. Push your branch.

```bash
git push origin feature/your-feature-name
```

6. Open a Pull Request.

---

# Development

## Requirements

- Rust (latest stable)
- Bun
- Node.js
- Git

## Install

```bash
bun install
```

Run the application:

```bash
bun run tauri dev
```

---

# Code Style

- Keep functions small and readable.
- Prefer descriptive variable names.
- Avoid unnecessary dependencies.
- Follow the existing project structure.
- Use TypeScript strict typing whenever possible.
- Format code before committing.

---

# Pull Requests

A good Pull Request should:

- solve a single problem
- include a clear description
- reference related issues
- include screenshots for UI changes
- pass all checks

---

# Reporting Bugs

Please use the Bug Report issue template and include:

- Operating System
- Hive version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Logs (if available)

---

# Feature Requests

Before opening a feature request:

- Search existing issues.
- Explain the problem you're trying to solve.
- Describe your proposed solution.
- Include screenshots or mockups if applicable.

---

# Documentation

Documentation improvements are always welcome.

Examples:

- README improvements
- Installation guides
- Runtime documentation
- Docker guides
- Tutorials

---

# Community

Please be respectful and constructive.

We welcome contributors of all experience levels.

Happy coding! 🐝