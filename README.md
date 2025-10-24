# 🎤 VoiceZen Dashboard

<div align="center">

**A Beautiful AI-Powered Voice Assistant for Personal Productivity**

[![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-FF6B6B?style=flat-square)](https://web.dev/progressive-web-apps/)

*Transform your productivity with the power of voice - inspired by WhatsApp's UX, Google Keep's organization, and GPay's elegance*

[ Documentation](#features) • [🛠️ Setup](#quick-start) • [🚀 Deploy](#deployment-options)

</div>

---

## ✨ What Makes VoiceZen Special?

VoiceZen Dashboard is a cutting-edge **voice-enabled productivity suite** that combines the best UX patterns from your favorite apps:

- 🟢 **WhatsApp-inspired voice recording** with smooth animations and chat-style transcripts
- 📝 **Google Keep-style todo management** with masonry grid layouts and color coding
- 💳 **GPay-inspired financial tracking** with clean cards and beautiful gradients
- 🌟 **Modern purple/violet theme** reminiscent of Twitter's elegant design
- 🤖 **AI-powered input classification** that automatically categorizes your voice commands

## 🎯 Key Features

### 🎤 Advanced Voice Recognition
- **Real-time speech-to-text** with Web Speech API
- **Smart AI classification** automatically sorts voice input into todos or budget items
- **WhatsApp-style chat interface** for voice transcripts and AI responses
- **Fallback text input** for browsers without voice support
- **Voice synthesis feedback** confirms your actions

### 📋 Intelligent Todo Management
- **Google Keep-inspired masonry grid** with responsive columns
- **Priority-based color coding** (High=Red, Medium=Yellow, Low=Purple)
- **Smart task extraction** from natural language voice input
- **Due date tracking** with overdue notifications
- **Smooth animations** and hover effects

### 💰 Beautiful Budget Tracking
- **GPay-style financial cards** with gradient backgrounds
- **Automatic expense categorization** from voice commands
- **Interactive charts** showing income vs expenses over time
- **Smart amount extraction** from speech ("I spent 50 dollars on groceries")
- **Visual balance indicators** with color-coded status

### 🎨 Stunning Design System
- **Purple/Violet gradient theme** throughout the interface
- **Glass morphism effects** with backdrop blur
- **Responsive layouts** that work perfectly on all devices
- **Micro-interactions** and smooth transitions everywhere
- **Dark/Light mode** with automatic theme switching

### 🚀 Progressive Web App (PWA)
- **Installable** on desktop and mobile devices
- **Offline functionality** with service worker caching
- **Push notifications** for task reminders
- **Native app-like experience** with full-screen mode

## 🖼️ Screenshots

### 🏠 Home Dashboard
Beautiful hero section with gradient text and quick stats cards

### 🎤 Voice Input Modal
WhatsApp-style voice recording with chat bubbles and AI responses

### 📝 Todo Management
Google Keep-inspired masonry grid with color-coded priority cards

### 💳 Budget Overview
GPay-style financial cards with gradients and interactive charts

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern browser with Web Speech API support (Chrome, Safari, Edge)

### Installation

```bash
# Clone the repository
git clone https://github.com/Mithrajith/voice-zen-dash.git

# Navigate to project directory
cd voice-zen-dash

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

### 🛠️ Development Commands

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint for code quality
```

## 📱 Usage Examples

### Voice Commands for Todos
- *"Add buy groceries to my todo list"*
- *"High priority: finish project presentation"*
- *"Remind me to call mom tomorrow"*

### Voice Commands for Budget
- *"I spent 25 dollars on lunch"*
- *"Add income 1500 from salary"*
- *"Expense 200 for utilities"*

### Natural Language Processing
The AI automatically extracts:
- **Task titles and descriptions** from voice input
- **Priority levels** (high, medium, low)
- **Amounts and categories** for expenses
- **Due dates** from relative time expressions

## 🏗️ Tech Stack

### Frontend
- **⚡ Vite** - Lightning-fast build tool and dev server
- **⚛️ React 18** - Modern React with hooks and concurrent features
- **📘 TypeScript** - Type-safe development with excellent IntelliSense
- **🎨 Tailwind CSS** - Utility-first CSS framework with custom design system
- **🧩 shadcn/ui** - High-quality, accessible component library
- **🎭 Framer Motion** - Smooth, performant animations and transitions

### Voice & AI
- **🎤 Web Speech API** - Native browser speech recognition and synthesis
- **🤖 Custom AI Classifier** - Intelligent categorization of voice inputs
- **🔊 Audio Processing** - Real-time voice feedback and confirmation

### State Management & Storage
- **📦 React State** - Efficient local state management with hooks
- **💾 localStorage** - Persistent data storage across sessions
- **🔄 Custom Hooks** - Reusable logic for voice, theme, and notifications

### PWA Features
- **📱 Service Worker** - Offline functionality and caching
- **🔔 Web Notifications** - Native push notifications for reminders
- **📲 Web App Manifest** - Installable PWA with native app experience

## 🎨 Design Philosophy

VoiceZen follows a **multi-app inspired design approach**:

### 🟢 WhatsApp Voice UX
- Floating voice recording with pulsing animations
- Chat bubble-style transcript display
- Smooth transitions and micro-interactions

### 📝 Google Keep Organization
- Masonry grid layout for natural content flow
- Color-coded categorization system
- Sticky note aesthetic with hover effects

### 💳 GPay Financial Interface
- Clean, gradient-based card designs
- Professional typography and spacing
- Color-coded financial status indicators

### 🌜 Twitter-Style Aesthetics
- Modern purple/violet color palette
- Glass morphism and backdrop effects
- Consistent elevation and shadow system

## 🚀 Deployment Options

### 🌐 Vercel (Recommended)
1. Push your code to GitHub
2. Connect your GitHub repo to [Vercel](https://vercel.com)
3. Your app is live instantly with automatic deployments!

### 🔧 Manual Deployment

```bash
# Build for production
npm run build

# Deploy to your preferred platform
# - Vercel: vercel --prod
# - Netlify: netlify deploy --prod --dir=dist
# - GitHub Pages: Use gh-pages package
```

### 🏠 Self-Hosting

```bash
# Build and serve locally
npm run build
npm run preview

# Or use any static file server
npx serve dist
```

## 📈 Browser Compatibility

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| Voice Recognition | ✅ | ✅ | ❌ | ✅ |
| Voice Synthesis | ✅ | ✅ | ✅ | ✅ |
| PWA Features | ✅ | ✅ | ✅ | ✅ |
| Responsive Design | ✅ | ✅ | ✅ | ✅ |

*Note: Voice recognition requires HTTPS in production*

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** with proper TypeScript types
4. **Add tests** if applicable
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to the branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### 🧪 Development Guidelines
- Follow the existing TypeScript patterns
- Use semantic commit messages
- Ensure responsive design works on all devices
- Test voice features in supported browsers
- Maintain the purple/violet design theme

## 📋 Roadmap

### 🎯 Upcoming Features
- [ ] **Multi-language voice support** (Spanish, French, etc.)
- [ ] **Team collaboration** with shared todo lists
- [ ] **Advanced budget analytics** with spending insights
- [ ] **Calendar integration** for task scheduling
- [ ] **Export functionality** (PDF, CSV)
- [ ] **Voice shortcuts** for power users
- [ ] **Custom themes** beyond purple/violet

### 🔮 Future Vision
- **AI-powered insights** for productivity patterns
- **Cross-platform mobile apps** (React Native)
- **Integration with popular services** (Google Calendar, Notion)
- **Advanced voice commands** with context awareness

## 🐛 Troubleshooting

### Voice Recognition Not Working?
- Ensure you're using HTTPS (required for Web Speech API)
- Check microphone permissions in browser settings
- Try Chrome or Safari for best compatibility
- Use the text input fallback if voice isn't available

### PWA Installation Issues?
- Clear browser cache and reload
- Ensure service worker is registered
- Check manifest.json is accessible
- Try incognito mode to test fresh install

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙌 Acknowledgments

- **shadcn/ui** for beautiful, accessible components
- **Tailwind CSS** for the utility-first styling approach
- **Framer Motion** for smooth animations
- **React Team** for the incredible framework
- **Web Speech API** for enabling voice functionality

---

<div align="center">

**Made with ❤️ by Mithrajith**

*Transform your productivity with the power of voice*

[⭐ Star this repo](https://github.com/Mithrajith/voice-zen-dash) • [🐛 Report Bug](https://github.com/Mithrajith/voice-zen-dash/issues) • [💡 Request Feature](https://github.com/Mithrajith/voice-zen-dash/issues)

</div>
