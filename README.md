<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1pnQAM70LLs5aig8cSjF1j-qBNLoIYVLy

## Run Locally

**Prerequisites:** Node.js (v18+)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
   *(Note: This application runs completely client-side in your browser. No Gemini API key or external API calls are required for normal use.)*

## Run with Docker

1. Start container:
   ```bash
   docker compose up -d
   ```
2. Open `http://localhost:8080` in your browser.
