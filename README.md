# 🐝 Hive

### Cross-platform local development environment for modern web applications

![Hive Logo](https://raw.githubusercontent.com/LaraPire/hive-art/main/Hive-Logo.png)

---

## ✨ About

**Hive** is a lightweight, powerful desktop application that streamlines local web development. No more complex configurations or juggling different tools.

Add any project — Laravel, Next.js, React, Node.js — and Hive gives you a clean `your-project.test` domain instantly. Built for speed and simplicity.

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (latest stable)
- [Bun](https://bun.sh/) (recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/LaraPire/hive-app
cd hive-app

# Install dependencies
bun install

# Run in development mode
cargo tauri dev

# Build for production
cargo tauri build
```

---

## 📁 Project Structure

```
hive-app/
├── src/               # React frontend (TypeScript + Tailwind)
├── src-tauri/         # Rust backend
│   ├── src/           # Tauri commands
│   ├── icons/         # App icons
│   └── Cargo.toml     # Rust dependencies
└── package.json       # Frontend deps
```

---

## 🛠️ Built With

- **Frontend**: React 19, TypeScript, Tailwind CSS, Shadcn/ui
- **Icons**: Solar Icons
- **Backend**: Rust, Tauri
- **Bundler**: Vite

---

## 🎨 Brand

- **Colors**: Amber + Zinc + Blue
- **Logo**: Hexagonal honeycomb with minimalist bee icon
- **Fonts**: Inter (UI), JetBrains Mono (code)

---

## 👤 Creator

**Arshia Mohammadi**  
GitHub: [@itashia](https://github.com/itashia)

---

## 🏢 Organization

This project is part of [LaraPire](https://github.com/LaraPire/) — crafting modern developer tools.

---

## 🤝 Contributing

Issues and pull requests welcome.  
Start a discussion on [GitHub](https://github.com/LaraPire/hive-app).

---

**🐝 Built for developers who value clean, efficient tools.**
