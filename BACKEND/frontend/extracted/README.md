# PhantomShieldX - Advanced Cybersecurity Platform

PhantomShieldX is a high-performance security dashboard designed to detect, analyze, and mitigate threats in real-time.

## 💣 Killer Feature: Local Heuristic Engine

Unlike standard platforms that rely solely on external APIs, PhantomShieldX features a **Local Heuristic Engine** built directly into the client. This engine provides an immediate layer of defense before any data even leaves your machine.

### Key Detection Capabilities:
- **Magic Byte Detection**: We analyze binary file headers (Magic Bytes) to identify the *actual* file type. Even if an attacker renames `malware.exe` to `vacation.jpg`, our system will detect the executable signature and flag it.
- **Extension Analysis**: Immediate flagging of dangerous extensions like `.exe`, `.bat`, `.ps1`, and `.vbs`.
- **Filename Heuristics**: Detects suspicious naming patterns, double extensions (e.g., `invoice.pdf.exe`), and urgent social engineering keywords.
- **Abnormal Size Analysis**: Flags files that deviate significantly from expected sizes for their claimed type.

## 🚀 Local Setup

To run PhantomShieldX on your local machine:

1. **Clone the repository** and navigate to the project directory.
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   - Copy `.env.example` to `.env`.
   - Add your **Gemini API Key** to the `GEMINI_API_KEY` variable. You can get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey).
4. **Start the development server**:
   ```bash
   npm run dev
   ```
5. **Open your browser** at `http://localhost:3000`.

## 🤖 AI Insights Chat
The platform includes **PhantomAI**, a specialized cybersecurity assistant powered by Gemini. It can help you analyze logs, explain threat signatures, and provide expert security advice.
