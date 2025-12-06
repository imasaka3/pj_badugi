# Badugi Web App

## Overview
This is a single-player Badugi Poker web application built with Phaser and TypeScript.
You play against 6 CPU opponents in a Ring Game format.

## Features
- **Game Rules**: Badugi (4-card lowball), Fixed Limit Betting, 5-bet cap.
- **Multiplayer Simulation**: 1 Human vs 6 CPU opponents.
- **Tournament Mode**: Blinds increase over time (configurable via `src/assets/blinds.tsv`).
- **CPU AI**: Implements strategy for Pre-draw, Draw, and Betting phases.
- **Hand History**: Detailed logs with round-by-round actions.
- **Architecture**: Vite + Phaser + TypeScript.

## How to Run

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Start the development server**:
    ```bash
    npm run dev
    ```

## How to Play
1.  **Start Game**: Click "START GAME" on the main menu.
2.  **Betting Phase**: Fold, Check/Call, or Bet/Raise within 30 seconds.
3.  **Draw Phase**: Select cards to discard and click "Draw", or "Stand Pat" to keep your hand.
4.  **Showdown**: Lowest Badugi hand wins.

## Configuration
- **Blinds**: Edit `src/assets/blinds.tsv` to adjust blind levels and duration.
