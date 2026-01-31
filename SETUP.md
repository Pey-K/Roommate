# Development Environment Setup

This guide will help you set up your development environment for Cordia on Windows, macOS, and Linux.

## Prerequisites

All platforms require:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Rust** (latest stable) - [Install Rust](https://www.rust-lang.org/tools/install)
- **Git** - [Download Git](https://git-scm.com/downloads)

## Windows Setup

### Required: Visual C++ Build Tools

Tauri applications on Windows require the Microsoft Visual C++ Build Tools.

### Option 1: Install Visual Studio Build Tools (Recommended)

1. Download [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
2. Run the installer
3. Select **"Desktop development with C++"** workload
4. Click **Install**
5. Wait for installation to complete (may take several minutes)

### Option 2: Install Visual Studio Community

If you prefer a full IDE:

1. Download [Visual Studio Community](https://visualstudio.microsoft.com/downloads/)
2. During installation, select **"Desktop development with C++"** workload
3. Complete the installation

### Verify Installation

After installing, verify everything works:

```powershell
# Check Rust
rustc --version
rustup show

# Check Node.js
node --version
npm --version

# Try building
npm install
npm run tauri dev
```

### Common Issues

#### Git's link.exe Conflict

**Problem:** If you see linker errors mentioning "extra operand", Git's `link.exe` is being used instead of MSVC's linker.

**Solution:** The provided `build.ps1` script temporarily removes Git's bin directory from PATH during compilation. Use it if needed:

```powershell
.\build.ps1
```

#### PATH Not Updated

**Problem:** Rust can't find the Visual Studio tools.

**Solution:** Restart your terminal/PowerShell after installing Visual Studio Build Tools. The installer should update your PATH automatically.

## macOS Setup

### Install Xcode Command Line Tools

```bash
xcode-select --install
```

### Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Install Node.js

Using Homebrew (recommended):
```bash
brew install node
```

Or download from [nodejs.org](https://nodejs.org/)

### Verify Installation

```bash
# Check Rust
rustc --version

# Check Node.js
node --version
npm --version

# Try building
npm install
npm run tauri dev
```

## Linux Setup

### Ubuntu/Debian

```bash
# Install dependencies
sudo apt update
sudo apt install -y curl build-essential libssl-dev pkg-config libgtk-3-dev libwebkit2gtk-4.0-dev

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Node.js (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Fedora

```bash
# Install dependencies
sudo dnf install -y curl gcc gcc-c++ openssl-devel pkg-config gtk3-devel webkit2gtk3-devel

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Node.js
sudo dnf install -y nodejs npm
```

### Arch Linux

```bash
# Install dependencies
sudo pacman -S curl base-devel openssl pkg-config gtk3 webkit2gtk

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Node.js
sudo pacman -S nodejs npm
```

### Verify Installation

```bash
# Check Rust
rustc --version

# Check Node.js
node --version
npm --version

# Try building
npm install
npm run tauri dev
```

## Docker Setup (For Signaling Server)

The signaling server requires Docker. Install Docker Desktop for your platform:

- **Windows:** [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- **macOS:** [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
- **Linux:** [Docker Engine](https://docs.docker.com/engine/install/)

After installing Docker, verify it works:

```bash
docker --version
docker-compose --version
```

## Next Steps

Once your environment is set up:

1. **Clone the repository** (if you haven't already)
2. **Follow the [QUICKSTART.md](QUICKSTART.md)** guide to get running
3. **Read [CONTRIBUTING.md](CONTRIBUTING.md)** for development guidelines

## Troubleshooting

### Build Fails on Windows

- Make sure Visual Studio Build Tools are installed
- Restart your terminal after installation
- Try running `rustup update` to ensure Rust is up to date

### Build Fails on Linux

- Make sure all GTK and WebKit dependencies are installed
- On Ubuntu/Debian, you may need `libayatana-appindicator3-dev` for system tray support
- Check that your system is up to date: `sudo apt update && sudo apt upgrade`

### Node Modules Issues

If you encounter issues with node_modules:

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Rust Toolchain Issues

If Rust commands fail:

```bash
# Update Rust
rustup update

# Check toolchain
rustup show
```

## Getting Help

If you're still having issues:1. Check the [Tauri documentation](https://tauri.app/v1/guides/getting-started/prerequisites)
2. Review [QUICKSTART.md](QUICKSTART.md) troubleshooting section
3. Open an issue on GitHub with:
   - Your operating system and version
   - Error messages (full output)
   - Steps you've already tried
