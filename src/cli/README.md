# 🐝 Hive CLI

Command-line interface for managing PHP and Node.js runtimes.

## Installation

Hive CLI is automatically installed with Hive Desktop.

## Usage

```bash
hive install php 8.4     # Install PHP 8.4
hive install node 20      # Install Node.js 20
hive list php             # List installed PHP versions
hive list node            # List installed Node.js versions
hive use php 8.3          # Switch default PHP to 8.3
hive uninstall php 8.1    # Remove PHP 8.1
hive status               # Show current runtime status
```

## Commands

| Command | Description |
|---------|-------------|
| `install <type> <version>` | Install PHP or Node.js runtime |
| `list <type>` | List installed versions |
| `use <type> <version>` | Switch default version |
| `uninstall <type> <version>` | Remove runtime |
| `status` | Show current status |

## Examples

```bash
# Install PHP 8.4
hive install php 8.4

# Install Node.js 20 LTS
hive install node 20

# Switch to PHP 8.3
hive use php 8.3

# See what's installed
hive status
```
