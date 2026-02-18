# Intern Hunter AI (InternScrapper)

A powerful Chrome Extension designed to streamline the internship application process by scraping LinkedIn profiles and generating personalized connection messages using Google's Gemini AI.

## 🚀 Features

*   **Smart Profile Scraping**: Automatically extracts key details from LinkedIn profiles:
    *   Name
    *   Role
    *   Company
*   **AI-Powered Drafting**: Generates three distinct message styles using **Google Gemini 1.5 Flash**:
    *   **Casual**: Friendly and brief, great for peers or startups.
    *   **Semi-Formal**: Professional yet warm, suitable for most connections.
    *   **Formal**: Respectful and concise, ideal for senior recruiters or executives.
*   **Safety & Compliance**: Includes robust error handling and respects LinkedIn's message character limits (under 300 chars).
*   **Google Sheets Integration**: Automatically sends scraped profile data to a Google Sheet via a webhook for tracking applications.
*   **Copy-to-Clipboard**: One-click copying for generated messages.

## 🛠️ Tech Stack

*   **Frontend**: HTML, CSS, JavaScript (Vanilla)
*   **AI Model**: Google Gemini 1.5 Flash (via API)
*   **Backend/Integration**: Google Apps Script (for Google Sheets Webhook)
*   **Platform**: Chrome Extension (Manifest V3)

## 📦 Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/Abhyx03/LinkedIn-Scrapper.git
    cd LinkedIn-Scrapper
    ```

1.  **Open Chrome Extensions**
    *   Open Google Chrome and navigate to `chrome://extensions/`.
    *   Toggle **Developer mode** in the top right corner.

2.  **Load Unpacked Extension**
    *   Click the **Load unpacked** button.
    *   Select the `InternScrapper` directory where you cloned/downloaded this project.

## ⚙️ Configuration

Before using the extension, ensure your API keys and Webhook URL are configured in `popup.js`.

1.  **Gemini API Key**
    *   Get your API key from [Google AI Studio](https://aistudio.google.com/).
    *   Open `popup.js` and locate the `GEMINI_API_KEY` constant (usually at the top).
    *   Replace `YOUR_GEMINI_API_KEY` with your actual key:
        ```javascript
        const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
        ```

2.  **Google Sheets Webhook (Optional)**
    *   Create a Google Sheet and attach a Google Apps Script.
    *   Deploy the script as a Web App (execute as "Me", access "Anyone").
    *   Copy the Web app URL.
    *   Open `popup.js` and replace the `WEBHOOK_URL` constant:
        ```javascript
        const WEBHOOK_URL = "YOUR_WEBHOOK_URL"; 
        ```

## 📖 Usage

1.  Navigate to any **LinkedIn Profile** page (e.g., `https://www.linkedin.com/in/username/`).
2.  Click the **Intern Hunter AI** extension icon in your toolbar.
3.  Click the **"Scrape Profile"** button. The extension will automatically extract the user's name, role, and company.
4.  Once scraping is complete (indicated by a success message), the **"Generate AI Drafts"** button will become active.
5.  Click **"Generate AI Drafts"**.
6.  The AI will generate three message variations (Casual, Semi-Formal, Formal).
7.  **Click on any message box** to copy it to your clipboard.
8.  Paste the message into your LinkedIn connection request!

## 📂 Project Structure

```
InternScrapper/
├── manifest.json      # Extension configuration and permissions
├── popup.html         # Extension popup UI structure
├── popup.js           # Main logic (Scraping + Gemini AI integration)
├── test_api.js        # validatity check script for Gemini models
└── README.md          # Project documentation
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open-source and available under the MIT License.
