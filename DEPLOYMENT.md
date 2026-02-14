# Deployment Guide

This guide explains how to deploy the Game application for free using **Render** (Backend) and **Vercel** (Frontend).

## 1. Backend Deployment (Render)

We will use Render's free tier for the Python FastAPI backend.

1.  **Push your code to GitHub.** Ensure your project is in a GitHub repository.
2.  **Sign up/Login to [Render](https://render.com/).**
3.  **Click "New +"** and select **"Web Service"**.
4.  **Connect your GitHub repository.**
5.  **Configure the service:**
    *   **Name:** `my-game-backend` (or similar)
    *   **Root Directory:** `backend` (Important! This tells Render where the Python code is)
    *   **Runtime:** `Python 3`
    *   **Build Command:** `pip install -r requirements.txt`
    *   **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 10000`
    *   **Instance Type:** `Free`
6.  **Click "Create Web Service".**
7.  **Wait for deployment.** Once finished, copy the **onrender.com URL** (e.g., `https://my-game-backend.onrender.com`). You will need this for the frontend.

## 2. Frontend Deployment (Vercel)

We will use Vercel's free tier for the React frontend.

1.  **Sign up/Login to [Vercel](https://vercel.com/).**
2.  **Click "Add New..."** and select **"Project"**.
3.  **Import your GitHub repository.**
4.  **Configure the project:**
    *   **Framework Preset:** `Vite` (should be auto-detected)
    *   **Root Directory:** `frontend` (Important! Click "Edit" next to Root Directory and select `frontend`)
    *   **Environment Variables:**
        *   `VITE_API_URL`: Paste your Render Backend URL (e.g., `https://my-game-backend.onrender.com`) **WITHOUT** the trailing slash.
        *   `VITE_WS_URL`: Paste your Render Backend URL but replace `https://` with `wss://` (e.g., `wss://my-game-backend.onrender.com`).
5.  **Click "Deploy".**
6.  **Visit your site!**

## Troubleshooting

-   **Backend sleeping:** On the free tier, Render spins down the service after inactivity. The first request might take 50+ seconds.
-   **CORS Errors:** If you see CORS errors in the browser console, ensure the backend allows the frontend URL. Currently, `main.py` is set to allow all origins (`allow_origins=["*"]`), which is fine for development/testing but should be restricted for production ideally.
