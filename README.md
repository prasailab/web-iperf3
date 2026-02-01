# Web-based iPerf3 Tool

A modern, simple web application for running network performance tests using **iperf3**. This tool is now **Publicly Available** and provides a clean, easy-to-use web interface to run connection speed tests, measure latency (delay), and calculate network tuning parameters (Bandwidth-Delay Product).

---

## Overview

This project is an Open Source tool designed to make network testing easy. It uses a popular command-line tool called `iperf3` but wraps it in a professional website. Whether you are a network engineer, a system administrator, or just checking your connection, you can use this tool to functionality test your network speed without needing to type complex commands in a terminal.

### Why use Web iPerf3 Tool?
- **Universal Accessibility**: Run tests from any device (phone, laptop, tablet) using just a web browser.
- **Easy Integration**: It is small and easy to add to your existing tools.
- **Ready for Everyone**: Simple to set up and use.

### Key Features

- **Public & Private Server Support**: 
  - Select from a list of popular public servers.
  - Connect to your own private server by entering its IP address.
- **Real-time Results**:
  - See the test results update live on your screen as the test runs.
- **Advanced Test Configuration**: 
  - Switch between **TCP** (standard speed test) and **UDP** (for testing data loss and jitter).
  - Support for **Reverse Mode** (Server sending data to you) and **Bidirectional** testing.
  - Control how long the test runs and how much data is sent.
- **Network Tuning Calculator**: 
  - Calculate "Bandwidth-Delay Product" (BDP) to optimize your network settings for high speed.
  - Built-in Ping tool to measure the delay to a server.
- **Premium Design**: 
  - A modern, dark-mode optimized interface that looks professional.
- **Docker Support**: 
  - Easily run the application using Docker containers.

---

## Tech Stack

This project is built using modern web technologies:

- **Frontend (The User Interface)**:
  - **React**: A library for building user interfaces.
  - **TypeScript**: A strongly typed version of JavaScript for better code quality.
  - **Tailwind CSS**: A tool for styling the website.
  - **Lucide Icons**: A clean icon set.

- **Backend (The Server logic)**:
  - **Node.js**: A runtime for executing JavaScript on the server.
  - **Express**: A web framework for Node.js.
  - **Zod**: A tool for validating data.

- **Core Tools**:
  - **iperf3**: The underlying tool used for network speed testing.
  - **ping**: A utility to test connectivity and latency.

---

## Installation Guide (Cross-Platform)

The application requires `iperf3` to be installed on the machine where the **backend** is running.

### 1. Prerequisites (iPerf3 Installation)

- **Windows**: Install using `winget install ar51an.iPerf3` or download from iperf.fr.
- **macOS**: Install using `brew install iperf3`.
- **Linux (Debian/Ubuntu)**: Install using `sudo apt update && sudo apt install iperf3 iputils-ping`.
- **Linux (RHEL/CentOS)**: Install using `sudo yum install iperf3`.

### 2. Standard Setup

1.  **Download the Code**:
    Clone the repository using git:
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
    The app will be accessible at `http://localhost:3000`.

### 3. Docker Setup (Recommended)

Docker handles all the setup automatically. This is the easiest way to run the tool.

```bash
docker-compose up --build
```

### 4. Troubleshooting

**Windows: npm execution error**
If you see an error like `cannot be loaded because running scripts is disabled on this system` when running `npm install`, you need to allow local scripts to run.
Open PowerShell and run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Then try running `npm install` again.

---

## iPerf3 Usage Guide

This application uses iPerf3 to run tests. Here is a simple explanation of the settings you can change:

### Settings Explained

- **Port**: The communication channel the server is listening on. Default is `5201`.
- **UDP Mode**: Switches from standard data transfer (TCP) to a mode used for streaming (UDP). Use this to check for data loss.
- **Bandwidth**: When using UDP, you must set a target speed (e.g., `10M` for 10 Megabits/sec).
- **Reverse Mode**: By default, you send data to the server (Upload). Reverse mode makes the server send data to you (Download).
- **Parallel Streams**: Opens multiple connections at once. This helps achieve higher speeds on very fast networks (like 10Gbps).
- **Time**: How long the test runs in seconds. Default is `10`.

### Best Practices

1.  **TCP vs UDP**: Use TCP to check your maximum speed. Use UDP to check connection quality/stability.
2.  **Reverse Mode**: Always test both upload (default) and download (Reverse) speeds, as they are often different.
3.  **Parallel Streams**: If your speed result is lower than expected on a fast connection, try increasing the streams to 4 or 8.

---

## Usage Instructions

### Running a Test
1.  **Server Selection**: Choose **Public** to pick a server from the list, or **Private** to type in an IP address.
2.  **Configuration**: Select your options (Protocol, streams, duration).
3.  **Run**: Click the **Start** button. The results will appear on the screen.

### Network Tuning (BDP)
1.  Enter the server address in the BDP Calculator section.
2.  Click **Measure RTT** to check the delay.
3.  Enter your link speed (e.g., 1000 for 1Gbps).
4.  The tool will tell you the best **TCP Window Size** setting to use for full speed.

---

## Contributing & Integration

Since this project is **Public**, contributions are welcome! 

### How to Integrate
- **As a Standalone Service**: Run the Docker container on your network for users to test their speed.
- **Embedded in Your App**: You can use the backend API to run tests from your own custom applications.
- **Microservice**: Use the BDP calculator as a utility for your own scripts.

### How to Contribute
1.  **Fork** the repository (Make your own copy).
2.  **Create a branch** for your new feature.
3.  **Commit your changes**.
4.  **Push** your changes to your copy.
5.  **Open a Pull Request** to share your changes with us.

---

## License & Attribution

- **Copyright**: (c) 2026 Prasath Suthagar @Praslab.com.
- **License**: MIT License - Free to use, modify, and distribute!
- **References**: Inspired by the community at `iperf.fr`.

---

*Found a bug? Feel free to report it on the GitHub repository.*
