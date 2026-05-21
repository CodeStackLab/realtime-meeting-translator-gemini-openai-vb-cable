# Setup Guide

This guide sets up the app for two-way realtime meeting translation.

## 1. Install Requirements

- Node.js
- npm
- VB-Audio Virtual Cable A+B or equivalent virtual audio cable software
- Google Gemini API key or OpenAI API key
- Zoom, Microsoft Teams, Google Meet, or another meeting app

## 2. Install Project Dependencies

```bash
npm install
```

## 3. Create Local Config

```bash
copy config.example.json config.json
```

Open `config.json` and add your API key, or add it from app Settings.

Never commit `config.json`.

## 4. Start The App

```bash
npm start
```

## 5. App Settings

Recommended settings:

- Provider: Google Gemini Live
- Live speech model: Gemini native audio model
- Your microphone: your real microphone, for example `BH900 PRO`
- Buyer's audio source: `CABLE-A Output`
- Send translated English voice to: `CABLE-B Input`
- Play buyer Hindi voice to: your headphones
- Buyer's language: English
- Enable buyer Hindi captions: ON
- Also play buyer translated Hindi voice: ON

## 6. Meeting App Settings

In Zoom, Microsoft Teams, or Google Meet:

- Microphone: `CABLE-B Output`
- Speaker: `CABLE-A Input`

## 7. Test Flow

1. Start the app.
2. Press `Start Live Translation`.
3. Speak Hindi into your real mic.
4. The meeting participant should hear English voice.
5. Ask the buyer to speak English.
6. You should see Hindi captions and hear Hindi voice in your headphones.

## Expected Delay

Realtime speech-to-speech translation is not zero-delay. A practical delay is usually 1-3 seconds.
