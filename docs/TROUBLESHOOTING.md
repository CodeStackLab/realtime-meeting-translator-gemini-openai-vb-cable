# Troubleshooting

## Buyer Captions Do Not Appear

Check:

- Meeting speaker is `CABLE-A Input`.
- App buyer audio source is `CABLE-A Output`.
- Buyer captions checkbox is ON.
- You restarted Windows after installing VB-Cable A+B.

## Buyer Voice Goes To Left Panel

This means buyer audio is leaking into your real microphone.

Fix:

- Wear headphones.
- Keep laptop speakers muted.
- Meeting speaker must be `CABLE-A Input`.
- App `Your microphone` must be your real headset mic.

## Buyer Says "How Are You" And App Answers

Correct behavior:

- Buyer says: `How are you?`
- Hindi translation: `Aap kaise ho?`

Wrong behavior:

- `Main theek hoon`

If wrong behavior appears, restart the app and make sure you are using the latest code.

The app prompt is configured for translation only. It should not answer questions, continue the conversation, or output internal analysis.

## Caption Looks Broken Or Shows Model Analysis

The app filters common internal-analysis text and removes the conversation history panel. If you still see labels such as `Awaiting Further Input`, restart the app and check that you are running the newest build.

## Realtime Feels Slow

Use the default Fast Streaming Realtime mode:

- Gemini model: `gemini-3.1-flash-live-preview`
- Good internet connection
- Headphones instead of speakers
- Speak in short, clear phrases
- Keep Zoom/Teams/Meet speaker set to `CABLE-A Input`
- Keep meeting microphone set to `CABLE-B Output`

## No Audio Sent To Buyer

Check:

- App translated output is `CABLE-B Input`.
- Meeting microphone is `CABLE-B Output`.
- Start Live Translation is active.
- API key is valid.
- Provider/model is available for your account. Try Gemini Live or OpenAI Realtime if one model does not work.

## VB-Cable A+B Download

Use the official VB-Audio shop:

[https://shop.vb-audio.com/en/win-apps/12-vb-cable-ab.html](https://shop.vb-audio.com/en/win-apps/12-vb-cable-ab.html)

This project is not sponsored by VB-Audio. If the official shop shows a `$5` donation/contribution option, select it there and download from your VB-Audio account/download page after checkout.

## Error Code 1007

Use the in-app error panel:

1. Wait for the error panel.
2. Click `Copy error`.
3. Share the copied error ID and recent log.

## API Key Safety

Never upload `config.json`. It is ignored by git.
