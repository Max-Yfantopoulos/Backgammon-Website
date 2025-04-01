# Backgammon Website

A web-based Backgammon game where users can play against an AI or another player. This project is built using **React** for the frontend and **Flask** for the backend, with a focus on providing a seamless and interactive gaming experience.

---

## Table of Contents
- [About the Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Project](#running-the-project)
- [Project Structure](#project-structure)
- [Future Improvements](#future-improvements)
- [License](#license)
- [Acknowledgments](#Acknowledgments)

---

## About the Project

This project is a web-based implementation of the classic board game **Backgammon**. It allows users to:
- Play against an AI opponent.
- Play multiplayer games with another user.
- View the current game state, including dice rolls, player turns, and checker positions.

The backend handles the game logic and state management, while the frontend provides an interactive user interface.

---

## Features

- 🎲 **Play Against AI**: Challenge an AI opponent with built-in game logic.
- 👥 **Multiplayer Mode**: Play with another user in real-time.
- 📊 **Game State Management**: View the current game state, including dice rolls, player turns, and checker positions.
- 🔄 **Undo/Redo Moves**: Easily undo or redo moves during gameplay.
- 🎨 **Responsive Design**: Optimized for desktop and mobile devices.

---

## Tech Stack

### Frontend:
- **React**: For building the user interface.
- **React Router**: For navigation between pages.
- **Vite**: For fast development and build tooling.

### Backend:
- **Flask**: For handling API requests and game logic.
- **Flask-CORS**: For enabling cross-origin requests.

### Other Tools:
- **TypeScript**: For type safety in the frontend.
- **ESLint**: For code linting and quality.
- **Vite Proxy**: For routing API calls to the backend during development.

---

## Getting Started

### Prerequisites
Make sure you have the following installed:
- **Node.js** (v16 or later)
- **Python** (v3.8 or later)
- **npm** or **yarn**

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/backgammon-website.git
   cd backgammon-website
   
2. Install frontend dependencies:
   cd client
   npm install

3. Install backend dependencies:
   cd ../flask-server
   pip install -r requirements.txt

## Running the Project

### Start the Backend

1. Navigate to the backend directory:
   cd flask-server
2. Run the Flask server:
   flask run --port=5001

### Start the Frontend:

1. Navigate to the frontend directory:
   cd client
2. Run the Vite development server:
   npm run dev
3. Open your browser and navigate to:
   http://localhost:5174

## How to Run the Game

### 1. Start the Backend and Frontend:

- Follow the steps in the Running the Project section to start both the backend and frontend servers.
  
### 2. Navigate to the Game:

-Open your browser and go to http://localhost:5174.

### 3. Choose a Game Mode:

- Play Against AI: Enter your name in the input field and click the "Play AI" button.
  
- Multiplayer Mode: Enter both player names and click the "Play Multiplayer" button.
  
### 4. Gameplay:

- Roll the dice to start your turn.
  
- Click on a checker to move it according to the dice roll.
  
- Use the undo/redo buttons to adjust your moves if needed.
  
- The game will automatically switch turns between players or between you and the AI.
  
### 5. Winning the Game:

- The game ends when one player successfully moves all their checkers off the board.

## Project Structure

Backgammon-Website/
├── client/                # Frontend code
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── styles/        # CSS files
│   │   ├── App.tsx        # Main app component
│   │   ├── main.tsx       # Entry point for React
│   └── vite.config.ts     # Vite configuration
├── flask-server/          # Backend code
│   ├── server.py          # Flask server
│   ├── OOP_Backgammon.py  # Game logic
│   └── requirements.txt   # Python dependencies
└── [README.md](http://_vscodecontentref_/2)

## Future Improvements

- Add real-time multiplayer functionality using WebSockets.
  
- Improve AI logic for more challenging gameplay.

- Add animations for dice rolls and checker movements.
  
- Implement user authentication and game history tracking.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgments

- Inspired by the classic board game Backgammon.

- Special thanks to the creators of React and Flask for their amazing tools.
