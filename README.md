# All Meeting Realtime Voice Translator

Real-time speech-to-speech meeting translator for Zoom, Microsoft Teams, Google Meet, and other meeting apps that can select microphone and speaker devices.

The app uses virtual audio cables to route meeting audio into a realtime AI translation session and route translated voice back into the meeting.

## What It Does

- Your Hindi speech is translated to English voice for the buyer.
- Buyer English speech is translated to Hindi captions and optional Hindi voice for you.
- Works with Zoom, Microsoft Teams, Google Meet, and similar meeting software through microphone/speaker routing.
- Supports Google Gemini Live and OpenAI Realtime providers.
- Uses CABLE-A for incoming meeting audio and CABLE-B for outgoing translated voice.

## Repository Name

Suggested public repository name:

`all-meeting-realtime-voice-translator`

## Safety Notice

Do not commit your real API keys. The local `config.json` file is ignored by git. Use `config.example.json` as a template.

If you accidentally expose an API key, rotate it immediately in the provider dashboard.

## Quick Start

1. Install Node.js.
2. Install VB-Audio Virtual Cable A+B, or equivalent virtual audio cables.
3. Install dependencies:

```bash
npm install
```

4. Copy sample config:

```bash
copy config.example.json config.json
```

5. Add your Gemini API key or OpenAI API key in app Settings.
6. Start the app:

```bash
npm start
```

## Recommended Zoom / Meeting App Audio Route

In Zoom, Teams, or Google Meet:

- Microphone: `CABLE-B Output`
- Speaker: `CABLE-A Input`

In this app:

- Your microphone: your real headset microphone, for example `BH900 PRO`
- Buyer's audio source: `CABLE-A Output`
- Send translated English voice to: `CABLE-B Input`
- Play buyer Hindi voice to: your headphones, for example `BH900 PRO`
- Enable buyer Hindi captions: ON
- Also play buyer translated Hindi voice: ON

## Documentation

- [Full setup guide](docs/SETUP.md)
- [Cable A+B routing guide](docs/AUDIO-ROUTING.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Development

```bash
npm start
```

```bash
npm run dev
```

## Important Notes

- This is not an official Zoom, Microsoft Teams, or Google Meet integration.
- It works by normal audio device selection and virtual audio routing.
- Realtime translation has a small delay, usually around 1-3 seconds depending on network, model, and voice activity detection.
- Use headphones to avoid echo and prevent buyer audio from leaking into your own microphone.

## License

MIT
