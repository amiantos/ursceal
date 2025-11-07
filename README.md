# Novel Writer - AI-Powered Story Tool

A browser-based novel writing application that uses DeepSeek's reasoning model and Tavern character cards to help write stories.

## Features

- **Character Card Support**: Import Tavern-compatible PNG character cards (V2/V3 format)
- **Character Image Persistence**: Character images are stored as base64 and persist across sessions
- **Template Placeholders**: Automatic replacement of `{{user}}`, `{{char}}`, and `{{character}}` with actual names
- **Persona System**: Define your own character/narrator perspective
- **AI Generation**: Multiple generation modes (continue story, character response, custom prompt)
- **Reasoning Display**: Toggle to see the model's thinking process
- **Document Management**: Auto-save, manual save/load, export to text
- **Local Storage**: All data persists in browser localStorage

## Getting Started

1. Open `index.html` in a modern web browser
2. Click the settings button (⋮) and enter your DeepSeek API key
3. Import a Tavern character card (PNG format)
4. Start writing or use the generation buttons

## Template Placeholders

The app automatically replaces these placeholders when building prompts:

- `{{user}}` → Your persona name (or "User" if not set)
- `{{char}}` → Character name from the card
- `{{character}}` → Character name from the card

These placeholders can appear in:
- Character descriptions
- Personality traits
- Scenarios
- System prompts
- Dialogue examples
- Post-history instructions

## Files

- `index.html` - Main application interface
- `styles.css` - Application styling
- `app.js` - Main application logic
- `tavern-parser.js` - PNG character card parser
- `deepseek-api.js` - DeepSeek API integration

## Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- DeepSeek API key
- Internet connection for API calls

## Storage

All data is stored locally in your browser:
- Character card data (including images as base64)
- Persona information
- Document content
- Settings (API key, preferences)
- Conversation history

## Privacy

- Your API key is stored only in your browser's localStorage
- No data is sent anywhere except to DeepSeek's API
- Character images are converted to base64 and stored locally
