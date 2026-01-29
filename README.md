# Web-based iPerf3 Tool

A modern, full-stack web application for running network performance tests using **iperf3**. This tool provides a clean web interface to run TCP/UDP throughput tests against public or private servers, measure Round-Trip Time (RTT), and calculate Bandwidth-Delay Product (BDP) for TCP tuning.

![Screen Shot](https://via.placeholder.com/800x450.png?text=Web+iPerf3+Interface)

## Features

- **Public & Private Servers**: 
  - Choose from a built-in list of public iPerf3 servers (data from iperf.fr).
  - Connect to any private server by hostname and port.
- **Test Configuration**: 
  - TCP & UDP protocol support.
  - Configurable duration, parallel streams, and target bitrate (UDP).
  - Reverse mode support.
- **BDP Calculator**: 
  - Integrated tool to calculate Bandwidth-Delay Product and recommended TCP Receive Window sizes based on RFC 6349.
  - integrated Ping tool to measure RTT.
- **Modern UI**: Built with React, TypeScript, and Tailwind CSS.
- **Container Ready**: Includes Dockerfile for easy deployment.

## Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Core Tools**: `iperf3`, `ping`

## Prerequisites

- **Node.js v18+** (if running without Docker)
- **iperf3** installed and available in system PATH.
  - **Linux**: `apt install iperf3` (Debian/Ubuntu) or `yum install iperf3` (RHEL/CentOS)
  - **Windows**: Download from [iperf.fr](https://iperf.fr/iperf-download.php) and add to PATH.
  - **macOS**: `brew install iperf3`
- **ping**
  - **Linux**: `iputils-ping` (usually installed)
  - **Windows**: Built-in `ping.exe`
  - **macOS**: Built-in `ping`

## Quick Start (Docker)

The easiest way to run the application is using Docker. This ensures all dependencies are packaged correctly.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/prasailab/web-iperf3.git
    cd web-iperf3
    ```

2.  **Build and Run**:
    ```bash
    docker-compose up --build
    ```

3.  **Access the App**:
    Open your browser and navigate to `http://localhost:3000`.

## Manual Setup (Development)

If you prefer to run locally for development:

### Backend
1.  Navigate to `backend`:
    ```bash
    cd backend
    npm install
    ```
2.  Start the server (default port 3000):
    ```bash
    npm run dev
    ```

### Frontend
1.  Navigate to `frontend`:
    ```bash
    cd frontend
    npm install
    ```
2.  Start the dev server (default port 5173):
    ```bash
    npm run dev
    ```
    *Note: The frontend is configured to proxy `/api` requests to `localhost:3000`.*

## Usage Guide

### Running a Speed Test
1.  **Select Server**: Toggle between "Public Server List" and "Private Server".
    - **Public**: Choose a server from the dropdown. Note the location and speed limits.
    - **Private**: Enter the IP/Hostname and Port of your iperf3 server. Ensure `iperf3 -s` is running on that server.
2.  **Configure**:
    - **Protocol**: TCP for standard throughput, UDP for packet loss/jitter.
    - **Direction**: "Upload" tests your upload speed. "Download" (Reverse) tests your download speed.
    - **Streams**: Use multiple streams (e.g., 4-8) to saturate high-bandwidth links.
3.  **Run**: Click "Start iPerf3 Test". Results map will be displayed below.

### BDP Calculator & TCP Tuning
The BDP Calculator helps you tune TCP performance for high-speed, high-latency links (Long Fat Networks).

1.  **Measure RTT**: Enter a host (or use the selected server) and click "Measure RTT".
2.  **Enter Bandwidth**: Input the known bottleneck bandwidth (e.g., your link speed).
3.  **Calculate**: The tool applies **RFC 6349** formulas:
    - **BDP (bits)** = Bandwidth (bps) × RTT (sec)
    - **TCP Window (Bytes)** = BDP / 8
    - **Theoretical Max Throughput** = Window / RTT

Use the calculated "Recv Window" to tune your system's TCP buffer sizes (`net.ipv4.tcp_rmem` / `tcp_wmem`).

## Extending the Public Server List
The public server list is stored in `backend/src/data/publicServers.ts`. 
To add more servers, edit this file and rebuild the backend. 
Always verify server availability on [iperf.fr](https://iperf.fr/iperf-servers.php).

## License

Copyright (c) 2026 Prasath Suthagar @Praslab.com.

Licensed under the MIT License. See [LICENSE](LICENSE) file for details.
