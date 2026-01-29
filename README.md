# Web-based iPerf3 Tool

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Build](https://img.shields.io/badge/build-docker--ready-orange.svg)

A modern, full-stack web application for running network performance tests using **iperf3**. This tool provides a clean, responsive web interface to run TCP/UDP throughput tests against public or private servers, measure Round-Trip Time (RTT), and calculate Bandwidth-Delay Product (BDP) for network tuning.

---

## 🚀 Overview

This package simplifies network testing by wrapping the powerful `iperf3` command-line utility in a professional web-based dashboard. It is designed for network engineers, sysadmins, and developers who need to perform quick throughput audits without diving into the terminal on every client machine.

### Key Features

- **🌐 Public & Private Server Support**: 
  - Integrated dropdown for popular public iPerf3 servers (data sourced from iperf.fr).
  - Manual connection to any private server endpoint.
- **⚡ Real-time Streaming**:
  - Live progress updates using chunked transfer encoding (the output updates line-by-line as the test runs).
- **🛠️ Advanced Test Configuration**: 
  - Switch between **TCP** (reliability) and **UDP** (jitter/packet loss).
  - Support for **Reverse Mode** (Server -> Client) and **Bidirectional** testing.
  - Granular control over duration, parallel streams, and target bitrate.
- **📏 BDP Calculator & Tuning**: 
  - Calculate **Bandwidth-Delay Product** and recommended TCP Receive Window sizes based on **RFC 6349**.
  - Built-in Ping tool to accurately measure RTT before calculating.
- **🎨 Premium UI**: 
  - Dark-mode optimized dashboard built with React, TypeScript, and Tailwind CSS.
- **🐳 Containerized**: 
  - Fully Docker-ready for consistent cross-platform deployment.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, Zod (Validation).
- **Core Native Tools**: `iperf3`, `ping` (iputils).

---

## 📦 Installation Guide (Cross-Platform)

The application depends on `iperf3` being installed on the system where the **backend** is running.

### 1. Prerequisites (iPerf3 Installation)

| Platform | Command / Download |
| :--- | :--- |
| **Windows** | `winget install ar51an.iPerf3` or download from [iperf.fr](https://iperf.fr/iperf-download.php#windows) |
| **macOS** | `brew install iperf3` |
| **Linux (Debian/Ubuntu)** | `sudo apt update && sudo apt install iperf3 iputils-ping` |
| **Linux (RHEL/CentOS)** | `sudo yum install iperf3` |

### 2. Standard Setup (Node.js)

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/prasailab/web-iperf3.git
    cd web-iperf3
    ```

2.  **Install & Build Backend**:
    ```bash
    cd backend
    npm install
    npm run build
    ```

3.  **Install & Build Frontend**:
    ```bash
    cd ../frontend
    npm install
    npm run build
    ```

4.  **Start the Application**:
    ```bash
    cd ../backend
    npm start
    ```
    *The app will be accessible at `http://localhost:3000`.*

### 3. Docker Setup (Recommended)

Docker handles all dependencies (Node, iperf3, ping) automatically.

```bash
docker-compose up --build
```

---

## 📖 iPerf3 Usage Guide

This application exposes core iPerf3 functionality. For a deeper dive into the command-line flags, refer to the [official iperf.fr documentation](https://iperf.fr/iperf-doc.php).

### Common Flags Explained

- **`-p` (Port)**: The port the server is listening on. Default is `5201`.
- **`-u` (UDP)**: Swaps from standard TCP to UDP testing. Useful for measuring packet loss and jitter.
- **`-b` (Bandwidth)**: Crucial for UDP. Unlike TCP, UDP is not "self-throttling". You must specify a target bitrate (e.g., `10M` for 10Mbits/sec).
- **`-R` (Reverse)**: By default, the client sends data to the server (Upload). Reverse mode makes the server send data to the client (Download).
- **`-P` (Parallel)**: Opens multiple simultaneous connections. This is often necessary to saturate high-speed links (e.g., 10Gbps).
- **`-t` (Time)**: Duration of the test in seconds. Default is `10`.

### Best Practices

1.  **TCP vs UDP**: Use TCP to check real-world throughput. Use UDP to check for network stability (jitter/loss) at a specific speed.
2.  **Reverse Mode**: Always test both directions. ISP speeds are often asymmetrical.
3.  **Parallel Streams**: If you aren't seeing the speeds you expect on a high-speed link, try increasing streams to 4 or 8.

---

## 🎛️ Usage Instructions

### Running a Test
1.  **Server Selection**: Toggle between **Public** (select from list) or **Private** (enter IP).
2.  **Configuration**: Choose your protocol and direction. If testing high-speed fiber, use multiple streams.
3.  **Run**: Click **Start iPerf3 Test**. The live output will appear in the results panel.

### BDP Calculation
1.  Enter the hostname in the BDP Calculator section.
2.  Click **Measure RTT** to get a real-time ping result.
3.  Enter your "Bottleneck Bandwidth" (e.g., 1000 for 1Gbps).
4.  The tool will automatically calculate the required **TCP Window Size** to maximize that specific link.

---

## 📄 License & Attribution

- **Copyright**: (c) 2026 Prasath Suthagar @Praslab.com.
- **License**: MIT License.
- **References**: Inspired by the community at [iperf.fr](https://iperf.fr).

---

*Found a bug or want to contribute? Feel free to open a PR on the GitHub repository.*
