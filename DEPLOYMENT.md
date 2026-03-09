# 🚀 Deployment & Publishing Guide: Social Downloader App

This guide outlines exactly how to take your local "Snag" app and publish it as a real application on the **Apple App Store** and **Google Play Store**.

---

## 🏛️ Deployment Architecture
Since your app requires `yt-dlp` (a Python-based binary) to download videos, you cannot run everything on the user's phone. You need a **Client-Server** setup:

1.  **The Backend (API):** Hosted on a Linux VPS (Virtual Private Server). This runs your Express server and `yt-dlp`.
2.  **The Mobile App:** A "wrapper" built using **Capacitor**. It displays your React frontend and communicates with your hosted API.

---

## 1️⃣ Hosting the Backend (The "Engine")
You need a server that allows running binaries (`yt-dlp`). Standard "Static Hosting" (like Vercel or Netlify) will **not** work for the backend.

### Recommended Providers:
*   **Railway.app** (Easiest)
*   **DigitalOcean** (Basic $6 Droplet)
*   **Hetzner** / **AWS EC2**

### Your `Dockerfile` Breakdown:
I have created a `Dockerfile` in the `/server` folder. Here's why it's critical for production:
*   **`FROM node:20-slim`**: Uses a lightweight Node base image.
*   **`RUN apt-get update && apt-get install -y python3 ffmpeg`**: This is the most important part. It installs **Python** (to run the yt-dlp engine) and **FFmpeg** (to merge high-quality 4K video with audio streams).
*   **`EXPOSE 3001`**: Tells the host which port to listen on.

### Steps to Deploy Backend (e.g., Railway):
1.  **Create a New Repo:** Push **only** the contents of your `/server` folder to a new GitHub repo.
2.  **Deploy on Railway:**
    *   Click `+ New Project` > `Deploy from GitHub repo`.
    *   Select your server repo.
    *   Railway will automatically see the `Dockerfile` and build your machine with all the tools (Python/FFmpeg) installed.
    *   **Settings:** Go to Variables and add `PORT=3001`.
3.  **Update Frontend API URL:**
    *   Once deployed, Railway will give you a domain (e.g., `https://api.yourdownloader.up.railway.app`).
    *   Go to `src/app/hooks/useDownloader.ts` and update the fetch calls:
        ```typescript
        // From this:
        const res = await fetch(`/api/meta?url=...`);
        // To this (Production API):
        const API_BASE = "https://api.yourdownloader.up.railway.app";
        const res = await fetch(`${API_BASE}/api/meta?url=...`);
        ```

---

## 2️⃣ Converting to Mobile (Capacitor)
To turn your Vite project into an Android/iOS app, we use **Capacitor**.

### Setup Steps:
1.  **Install Capacitor:**
    ```bash
    npm install @capacitor/core @capacitor/cli
    npx cap init
    ```
2.  **Install Platforms:**
    ```bash
    npm install @capacitor/android @capacitor/ios
    npx cap add android
    npx cap add ios
    ```
3.  **Build and Sync:**
    ```bash
    npm run build
    npx cap copy
    ```
4.  **Native File Saving:** 
    *   To save videos "locally on mobile" as requested, you must install the Filesystem and Media plugins:
    ```bash
    npm install @capacitor/filesystem @capacitor/device
    ```
    *   *Note: I can help you update `useDownloader.ts` to use these native APIs when the app detects it is running on mobile.*

---

## 3️⃣ Publishing to Google Play Store (Android)
### Requirements:
*   **Google Play Console Account:** $25 one-time fee.
*   **Assets:** Icon (512x512), Feature Graphic (1024x500), and Screenshots.

### Steps:
1.  **Configure Android Studio:** Open the `android` folder in Android Studio.
2.  **Generate Signed Bundle (AAB):** 
    *   `Build > Generate Signed Bundle / APK`.
    *   Create a Keystore file (Keep this safe!).
3.  **Upload to Play Console:**
    *   Create a new App.
    *   Complete the "App Content" declaration (Privacy policy, age rating).
    *   Upload the `.aab` file to "Production".

---

## 4️⃣ Publishing to Apple App Store (iOS)
### Requirements:
*   **Apple Developer Program:** $99/year.
*   **Mac Computer:** Required to run Xcode.

### Steps:
1.  **Configure Xcode:** Open the `ios` folder in Xcode.
2.  **Set Bundle ID:** Ensure your identifier (e.g., `com.yourname.snag`) matches your developer portal.
3.  **Icons & Launch Screen:** Set these in `Assets.xcassets`.
4.  **Archive:** 
    *   Select "Any iOS Device".
    *   `Product > Archive`.
    *   Click "Distribute App" to upload to App Store Connect.
5.  **App Store Connect:** Fill in description, keywords, and submit for review.

---

## ⚠️ Critical Compliance (Avoid Rejection!)
Social Media Downloaders are "High Risk" for App Stores. Follow these rules to avoid getting banned:

1.  **Privacy Policy:** You **must** have a public URL for your privacy policy.
2.  **YouTube Terms:** Avoid mentioning "YouTube Downloader" in the app title. Use generic terms like "Video Snagger" or "Social Media Saver".
3.  **User Data:** Ensure you explain that the app is for downloading own content or copyright-free content.
4.  **CORS:** Ensure your backend server has `cors` configured to allow your mobile app's origin (usually `capacitor://localhost` or `http://localhost`).

---

## 🛠️ Next Steps?
1.  **Host your API first.** Do you have a hosting provider in mind?
2.  **Native Save Logic.** Should I update your code to support the `@capacitor/filesystem` for real mobile saving?
