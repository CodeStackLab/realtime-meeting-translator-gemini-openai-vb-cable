# Realtime Meeting Translator

Real-time speech-to-speech voice translation with captions for all meetings, including Zoom, Microsoft Teams, Google Meet, and other meeting software, using Gemini Live or OpenAI Realtime voice models with VB-Cable A+B audio routing.

The app uses VB-Cable A+B virtual audio cables to route meeting audio into a realtime AI translation session and route translated voice back into the meeting.

## What It Does

- Your Hindi speech is translated to English voice for the buyer.
- Buyer English speech is translated to Hindi captions and optional Hindi voice for you.
- Fast Streaming Realtime mode is the default for both sides, so speech starts translating while the meeting is live.
- Works with Zoom, Microsoft Teams, Google Meet, and similar meeting apps through normal audio device routing.
- Supports Google Gemini Live and OpenAI Realtime providers.
- Uses CABLE-A for incoming meeting audio and CABLE-B for outgoing translated voice.

## Buy / Donate / Download VB-Cable A+B

Official VB-Audio shop link:

[VB-Cable A+B for Windows](https://shop.vb-audio.com/en/win-apps/12-vb-cable-ab.html)

Direct `$5` one-time donation option, when available on the official shop:

[VB-Cable A+B - $5 donation / P1 I'm a fan](https://shop.vb-audio.com/en/win-apps/12-vb-cable-ab.html#/30-donation_s-p1_i_m_a_fan)

VB-Cable A+B is used only for audio routing. This project is not sponsored by VB-Audio and is not an official VB-Audio product. Buy/download it only from the official VB-Audio website.

The VB-Audio shop uses a contribution/donation selector. Select the contribution amount shown on the official page or checkout. If you see the `$5` one-time donation/contribution option, you can choose it and complete checkout to get the download link. After that, VB-Cable A+B can be used for this app's audio routing. The amount can change by selection, account, region, or shop updates.

After checkout, VB-Audio provides a download link with two driver packages:

- `VBCABLE_A_Driver_Pack...zip`
- `VBCABLE_B_Driver_Pack...zip`

## Quick Windows Setup

1. Buy/donate/download VB-Cable A+B from the official link above.
2. Extract both ZIP files:
   - `VBCABLE_A_Driver_Pack...zip`
   - `VBCABLE_B_Driver_Pack...zip`
3. For Cable A, right-click the setup file and choose `Run as administrator`.
4. Install Cable A.
5. For Cable B, right-click the setup file and choose `Run as administrator`.
6. Install Cable B.
7. Restart Windows. This reboot is required.
8. Open Windows sound devices and confirm these devices exist:
   - Playback: `CABLE-A Input`
   - Recording: `CABLE-A Output`
   - Playback: `CABLE-B Input`
   - Recording: `CABLE-B Output`

## App Quick Start

```bash
npm install
```

```bash
copy config.example.json config.json
```

```bash
npm start
```

Add your Gemini API key or OpenAI API key in Settings. The app code is free to use, but Gemini/OpenAI usage depends on your provider account, model access, quota, and pricing.

## AI Provider / Model

In Settings:

- Provider: choose `Google Gemini Live` or `OpenAI Realtime`.
- Model: choose the best realtime speech/audio model available in your account.
- Translation timing: use `Ultra Realtime Streaming` when you want translated voice to start while you are still speaking.
- API key: paste your own Gemini or OpenAI API key.
- Voice: for a young Indian male-style English buyer voice, start with `Puck`; try `Fenrir`, `Orus`, or `Leda` if you prefer a different tone.

Recommended:

- For OpenAI pure live translation, use `gpt-realtime-translate` when you integrate the dedicated realtime translations endpoint.
- For low-cost testing, start with `gpt-realtime-mini`. For best OpenAI speech-to-speech quality, switch to `gpt-realtime-2`.
- For Gemini speech-to-speech in this app, start with `gemini-3.1-flash-live-preview`; use `gemini-2.5-flash-native-audio-preview-12-2025` as a stable fallback.
- If one provider/model is slow, unavailable, or too costly, switch provider/model in Settings.

## Meeting App Audio Settings

Use these settings in Zoom, Microsoft Teams, Google Meet, or any meeting app:

| Meeting app setting | Select this device |
| --- | --- |
| Microphone | `CABLE-B Output (VB-Audio Virtual Cable B)` |
| Speaker | `CABLE-A Input (VB-Audio Virtual Cable A)` |

## Translator App Settings

| Translator app setting | Select this device |
| --- | --- |
| Your microphone | Your real microphone/headset, for example `BH900 PRO` |
| Buyer's audio source | `CABLE-A Output (VB-Audio Virtual Cable A)` |
| Send translated English voice to | `CABLE-B Input (VB-Audio Virtual Cable B)` |
| Play buyer Hindi voice to | Your headphones, for example `BH900 PRO` |
| Translation timing | `Ultra Realtime Streaming` |
| Buyer Hindi captions | ON |
| Buyer translated Hindi voice | ON if you want to hear buyer in Hindi |

## How The Audio Flows

```text
You speak Hindi
  -> app captures your real microphone
  -> app translates Hindi to English speech
  -> app sends English voice to CABLE-B Input
  -> meeting app microphone CABLE-B Output sends English to buyer

Buyer speaks English
  -> meeting app speaker sends buyer audio to CABLE-A Input
  -> app captures CABLE-A Output
  -> app translates English to Hindi caption/voice
  -> app plays Hindi voice to your headphones
```

## Documentation

- [Full Windows setup guide](docs/WINDOWS-A-TO-Z-GUIDE.md)
- [Cable A+B routing guide](docs/AUDIO-ROUTING.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Important Notes

- This is not an official Zoom, Microsoft Teams, Google Meet, Gemini, OpenAI, or VB-Audio integration.
- This project is not sponsored by VB-Audio. VB-Cable A+B is only recommended because it is useful for audio routing.
- Do not commit your real API keys. Local `config.json` is ignored by git.
- Use headphones to avoid echo.
- Realtime speech-to-speech translation usually has a small delay, often around 1-3 seconds.
- `Ultra Realtime Streaming` is the default for lowest delay. It sends short translated voice chunks while you keep speaking; use `Balanced Sentence Mode` if you prefer cleaner phrase boundaries.

## License

MIT
