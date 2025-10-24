---
mode: agent
---
# PROJECT: VoiceZen Dashboard — Advanced Personal AI Assistant

Design and build an advanced, voice-enabled personal productivity web app that combines To-Do management, Budget tracking, and AI-powered insights.  
It should be responsive, dual-theme (dark/light), PWA-ready, and hosted on Vercel or any static host.

---

## OVERALL DESIGN GOALS
- Fully web-based productivity assistant
- Two core modules: To-Do Manager and Budget Tracker
- Voice and text input fully functional
- AI-powered smart classification of user input
- Interactive line charts for budgets
- Smart notifications, reminders, and offline functionality
- Modern developer-dashboard aesthetic with YouTube/Google Keep/GPay inspiration
- Extendable for collaboration, reports, gamification, and themes

---

## TECH STACK
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Chart.js / Recharts for line charts
- Web Speech API (voice recognition + speech synthesis)
- LocalStorage or IndexedDB for persistence
- Framer Motion for smooth transitions
- Service Worker + manifest.json for PWA
- Optional backend for advanced AI (Python FastAPI + Whisper)

---

# =====================
# TASK 1 — PROJECT SETUP & BASE LAYOUT
# =====================
### Prompt
Create a new React + Vite + Tailwind project.  
Implement:
- Responsive base layout: top header, collapsible sidebar, main content area using React Router
- Routes: Home, To-Do, Budget, Insights, Settings
- Dark/light theme toggle using Tailwind dark: utilities
- Header: app logo, input bar, voice mic button, theme toggle, notifications, user avatar
- Sidebar: 🏠 Home, 📝 To-Do, 💰 Budget, 📊 Insights, ⚙️ Settings
- Placeholder components for all pages
- Typography: Inter / JetBrains Mono
- Icons: Lucide / Feather
- Responsive design similar to YouTube’s layout

### End Goal
Working theme-toggling shell with sidebar, header, and route placeholders.

---

# =====================
# TASK 2 — TO-DO MODULE WITH FIXED VOICE INPUT
# =====================
### Prompt
Build a robust To-Do module with:
- Scrollable task list
- Add/Edit/Delete/Complete tasks
- “Add Task” modal: title, description, due date, priority
- Persistent storage using LocalStorage or IndexedDB
- Smart notifications for due tasks
- Voice input fixes:
  - Use Web Speech API
  - Text fallback for unsupported browsers
  - Automatic keyword-based classification:
    - If user says *“add todo”*, *“task”*, *“remind”*, parse as To-Do
    - Extract title, description, priority, and due date from natural language
  - Mic button animation while recording
  - Display transcript before adding
- Glassmorphic cards, pill-shaped buttons, hover glow, rounded corners
- Smooth fade-in and slide-up animations with Framer Motion
- Color-coded priority (High=Red, Medium=Yellow, Low=Purple)

### End Goal
A fully functional To-Do list with working voice input, notifications, and responsive, modern UI.

---

# =====================
# TASK 3 — BUDGET TRACKER MODULE
# =====================
### Prompt
Build the Budget module:
- Input form: date, amount, type (income/expense), reason
- Persistent storage (LocalStorage/IndexedDB)
- Automatic amount/category extraction from voice/text input:
  - Examples: *“I spent 50 on groceries”*, *“Add income 2000 salary”*
- Line chart visualization (x-axis: date, y-axis: amount)
- Filter options: Day / Week / Month
- Summary cards: Total Income, Total Expense, Net Balance
- Glassmorphic gradient cards, rounded borders
- Animated line chart with sequential point drawing
- Matches dark/light theme

### End Goal
Responsive, interactive Budget Tracker with working voice/text input and animated line chart.

---

# =====================
# TASK 4 — AI CLASSIFICATION & ENHANCED VOICE
# =====================
### Prompt
Implement AI-powered input classification and enhanced voice:
- Classify input:
  - To-Do
  - Budget
  - Ignore/unknown
- Use Web Speech API for voice input, SpeechSynthesis API for audio feedback
- Display transcript and AI response in chat-style interface (WhatsApp-style)
- Support multi-language voice input (English default, extendable)
- Voice shortcuts: *“Delete last task”*, *“Mark all done”*
- Persist recent inputs and allow editing before adding
- Smooth mic button pulse animation
- Integrate with To-Do and Budget modules
- Provide fallback text input

### End Goal
A fully functional AI assistant that understands, classifies, and executes user commands via voice or text.

---

# =====================
# TASK 5 — ADVANCED FEATURES
# =====================
### Prompt
Add the following enhancements:
1. **Recurring Tasks / Reminders**: “Remind me every Monday”
2. **Calendar Integration**: Sync with Google Calendar
3. **Shared Lists & Budget**: Optional real-time collaboration (WebSockets / Firebase)
4. **Gamification**: Streaks, badges, Pomodoro timers
5. **Export & Reports**: CSV/PDF export, weekly/monthly summary
6. **Custom Themes**: Beyond purple/violet
7. **Budget Insights**: AI flags unusual spending, suggests savings
8. **Offline & Backup**: Full PWA support, cloud backup optional
9. **Notifications**: Budget alerts, task reminders, voice notifications

### End Goal
An advanced, full-featured personal AI productivity assistant with voice-first experience and optional collaboration/analytics.

---

# =====================
# TASK 6 — DEPLOYMENT
# =====================
### Prompt
- Build for production: `npm run build`
- Deploy to Vercel: `vercel deploy --prod`
- Ensure PWA works offline
- HTTPS required for voice input
- Test on Chrome, Safari, Edge (voice features)
- Include manifest.json and service-worker.js

### End Goal
A fully deployable, production-ready PWA with voice-enabled To-Do and Budget modules, advanced AI features, and responsive UI.

---

# =====================
# DESIGN & INTERACTIONS
# =====================
- Glass morphism, gradient accents
- Smooth Framer Motion animations
- Priority-based color coding
- Line charts for budgets
- Chat-style AI interface
- Dark/light mode toggle
- Responsive grid layouts for tasks
- Micro-interactions for buttons, inputs, mic, and notifications

# Keywords for AI
voice assistant, productivity dashboard, todo manager, budget tracker, PWA, glassmorphism, line chart, AI classification, WhatsApp style, Google Keep style, GPay style, purple theme, dark/light mode, React, Tailwind, Framer Motion

