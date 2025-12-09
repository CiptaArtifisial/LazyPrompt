
# Lazy Prompter ☕

An intelligent AI prompt assistant designed to help artists and enthusiasts craft perfect, detailed prompts for image generation with ease. This app features a minimalist dark UI, a 3D composition simulator, and is powered by the Google Gemini API.

![Lazy Prompter Screenshot](https://i.imgur.com/your-screenshot.png) <!-- Replace with a real screenshot URL -->

## ✨ Key Features

-   **Intuitive Prompt Builder**: A guided, multi-step form to build prompts from core ideas to fine-grained details.
-   **Gemini-Powered Enrichment**:
    -   **Idea Expansion**: Automatically enrich a simple subject into a vivid scene description.
    -   **Prompt Polishing**: Elevate a generated prompt into an artistic, detailed masterpiece in both English and Indonesian.
-   **3D Composition Simulator**: A real-time Three.js viewport to visually adjust camera angles, distance, and perspective, which translates directly into prompt keywords (e.g., "Wide Shot", "Low Angle").
-   **Dual-Mode Interface**:
    -   **Creation Mode**: Build a new prompt from scratch.
    -   **Renovation Mode**: Craft prompts specifically for inpainting, generative fill, or vary region tasks.
-   **Advanced Parameters**: Full support for Midjourney parameters like `--ar`, `--s`, `--c`, and `--niji`.
-   **Presets & History**: Save your favorite prompt styles as presets and access a history of your previously copied prompts.
-   **Minimalist Dark UI**: An elegant, distraction-free interface built with Tailwind CSS.

## 💻 Tech Stack

-   **Framework**: Angular (v20+, Standalone Components, Signals)
-   **AI**: Google Gemini API (`gemini-2.5-flash`) via `@google/genai`
-   **Styling**: Tailwind CSS
-   **3D Rendering**: Three.js
-   **State Management**: Angular Signals
-   **Build**: Zoneless Angular Application

## 🚀 Getting Started

This is a self-contained web applet. To run it, you need an environment that can serve the `index.html` and inject the `API_KEY` environment variable.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/lazy-prompter.git
    cd lazy-prompter
    ```

2.  **Set up Environment Variable:**
    Ensure that `process.env.API_KEY` is available in your execution context with a valid Google Gemini API key.

3.  **Serve the application:**
    Use a local web server to serve the `index.html` file.

---

*This project was created with the help of an AI assistant.*
