# CPU Scheduling Algorithm Simulator

A modern, interactive Operating Systems practical dashboard that simulates CPU scheduling algorithms. The project uses a C++ engine for backend calculations and a React dashboard for visualization.

## Architecture

- **Backend:** C++ REST API using the [Crow](https://crowcpp.org/) framework
- **Frontend:** React, Vite, Tailwind CSS, Lucide React icons
- **Communication:** JSON over HTTP

## Implemented Algorithms

- First Come First Serve (FCFS)
- Shortest Job First (SJF)
- Shortest Remaining Time Next (SRTN)
- Round Robin (RR)

---

## 1. Running the C++ Backend

The backend engine performs the CPU scheduling logic and exposes it over a REST API (`http://localhost:8080/api/schedule`).

### Prerequisites
- A C++ compiler (g++ from MinGW or `cl` from MSVC).

### Build & Run (Windows)
1. Navigate to the `backend` folder:
   ```cmd
   cd backend
   ```
2. Run the provided build script:
   ```cmd
   build.bat
   ```
3. Once compiled, start the server:
   ```cmd
   server.exe
   ```
*(Note: If you run this on Linux/macOS, simply run: `g++ -O3 main.cpp -o server -lpthread` and then `./server`)*

---

## 2. Running the React Frontend

The frontend gives you a visually stunning dashboard to define processes, view the Gantt chart, and see CT, TAT, WT, and RT metrics.

### Prerequisites
- Node.js installed on your machine.

### Build & Run
1. Navigate to the `frontend` folder:
   ```cmd
   cd frontend
   ```
2. Install dependencies (if you haven't already):
   ```cmd
   npm install
   ```
3. Start the Vite development server:
   ```cmd
   npm run dev
   ```
4. Open the displayed local URL (usually `http://localhost:5173`) in your browser.

> **Note:** If the C++ backend is not running, the frontend will automatically use a mock API (FCFS only) to demonstrate the UI so you can still present the dashboard visually!
