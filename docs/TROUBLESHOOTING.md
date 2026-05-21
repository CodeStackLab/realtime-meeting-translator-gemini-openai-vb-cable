# Troubleshooting

## Buyer Captions Do Not Appear

Check:

- App `Buyer audio source` is `CABLE-A Output`.
- Meeting app speaker is `CABLE-A Input`.
- Buyer captions checkbox is ON.
- Use the latest app window after code changes.

## Buyer Audio Appears On The Left Panel

This usually means buyer audio is leaking into your real microphone.

Fix:

- Use headphones.
- Do not play meeting audio on laptop speakers.
- Meeting app speaker should be CABLE-A Input, not real speakers.
- App `Your microphone` should be your real headset mic only.

## Buyer Says "How Are You" And App Answers Instead Of Translating

The prompts are designed to translate only, not answer. If this happens:

- Restart the app.
- Confirm you are using the newest build.
- Check copied error/log details.

Correct behavior:

- Buyer: `How are you?`
- Hindi output: `Aap kaise ho?`

Incorrect behavior:

- `Main theek hoon`

## Error Code 1007

This usually means the realtime API rejected a setup or payload message.

Use the in-app error panel:

1. Wait for the error panel.
2. Click `Copy error`.
3. Share the copied error ID and log tail.

## No Audio In Meeting

Check:

- App translated output is CABLE-B Input.
- Meeting app microphone is CABLE-B Output.
- App has started live translation.
- API key is valid.

## API Key Safety

The app stores local keys in `config.json`. This file is ignored by git. Never upload it publicly.
