# Windows A-Z Guide

This is a full Windows guide for using the translator with Zoom, Microsoft Teams, Google Meet, and other meeting software.

## 1. Buy / Donate / Download VB-Cable A+B

Open the official VB-Audio shop page:

[https://shop.vb-audio.com/en/win-apps/12-vb-cable-ab.html](https://shop.vb-audio.com/en/win-apps/12-vb-cable-ab.html)

Direct `$5` one-time donation option, when available on the official shop:

[https://shop.vb-audio.com/en/win-apps/12-vb-cable-ab.html#/30-donation_s-p1_i_m_a_fan](https://shop.vb-audio.com/en/win-apps/12-vb-cable-ab.html#/30-donation_s-p1_i_m_a_fan)

This project is not sponsored by VB-Audio and is not an official VB-Audio product. VB-Cable A+B is recommended only because it creates two virtual audio cables that make meeting audio routing possible.

The official shop uses a contribution/donation selector. Select the contribution amount shown on the official page or checkout. If the `$5` one-time contribution option appears for you, choose `$5`, complete checkout, and download the software from VB-Audio. After installation, you can use VB-Cable A+B for this app's audio routing. Price/contribution display can change depending on selection, account, region, or shop updates.

The official page describes VB-Cable A+B as two Windows virtual audio drivers and says the download includes two ZIP archives, one for Cable A and one for Cable B. It also says to extract files, run setup as administrator, and reboot after installation.

## 2. Install Cable A

1. Download the VB-Cable A+B package after purchase.
2. Extract `VBCABLE_A_Driver_Pack...zip`.
3. Open the extracted folder.
4. Right-click the setup executable.
5. Click `Run as administrator`.
6. Complete the installer.

## 3. Install Cable B

1. Extract `VBCABLE_B_Driver_Pack...zip`.
2. Open the extracted folder.
3. Right-click the setup executable.
4. Click `Run as administrator`.
5. Complete the installer.

## 4. Restart Windows

Restart is mandatory. Do not skip it.

After restart, Windows should show:

- `CABLE-A Input` as playback/speaker device
- `CABLE-A Output` as recording/microphone device
- `CABLE-B Input` as playback/speaker device
- `CABLE-B Output` as recording/microphone device

## 5. Install The App

```bash
npm install
```

Copy sample config:

```bash
copy config.example.json config.json
```

Start:

```bash
npm start
```

## 6. Add API Key And Pick Model

Open app Settings and add one of:

- Gemini API key
- OpenAI API key

Then select:

- Provider: `Google Gemini Live` or `OpenAI Realtime`
- Model: the best realtime speech/audio model available in your account
- Voice: your preferred output voice
- Buyer Hindi voice style: Auto, Male, or Female. Manual selection is most reliable because not every realtime provider exposes speaker-gender detection.

Recommended models:

- Gemini: `gemini-3.1-flash-live-preview`; fallback `gemini-2.5-flash-native-audio-preview-12-2025`
- OpenAI in this app: `gpt-realtime-2`, then `gpt-realtime-1.5`, then `gpt-realtime-mini`
- OpenAI dedicated live translation endpoint: `gpt-realtime-translate`

The app is free to use, but your Gemini/OpenAI provider may have quota, billing, or model-access rules.

Do not upload `config.json` publicly.

## 7. Translator App Settings

Use this exact setup for Hindi to English and English to Hindi:

| App field | Select |
| --- | --- |
| Your microphone | Your real microphone/headset |
| Buyer's audio source | `CABLE-A Output` |
| Send translated English voice to | `CABLE-B Input` |
| Play buyer Hindi voice to | Your headphones |
| Translation timing | `Balanced Sentence Mode` |
| Buyer's language | English |
| Enable buyer Hindi captions | ON |
| Also play buyer translated Hindi voice | ON |

## 8. Zoom Settings

In Zoom audio menu:

| Zoom field | Select |
| --- | --- |
| Microphone | `CABLE-B Output` |
| Speaker | `CABLE-A Input` |

## 9. Microsoft Teams Settings

In Teams device settings:

| Teams field | Select |
| --- | --- |
| Microphone | `CABLE-B Output` |
| Speaker | `CABLE-A Input` |

## 10. Google Meet Settings

In Google Meet audio settings:

| Google Meet field | Select |
| --- | --- |
| Microphone | `CABLE-B Output` |
| Speaker | `CABLE-A Input` |

## 11. Test Conversation

1. Start the translator app.
2. Press `Start Live Translation`.
3. Balanced Sentence Mode starts on both sides.
4. Speak Hindi into your real microphone.
5. Buyer should hear clean English voice after each short natural phrase or sentence.
6. Buyer speaks English.
7. You should see Hindi captions on the buyer panel and hear translated Hindi voice in your headphones.

## 12. Optional: Hear Buyer Original English Too

If you want to hear original buyer English and translated Hindi:

1. Open Windows Sound settings.
2. Open `More sound settings`.
3. Go to `Recording`.
4. Select `CABLE-A Output`.
5. Open `Properties`.
6. Go to `Listen`.
7. Enable `Listen to this device`.
8. Playback through your headphones.

If you only want Hindi translated voice, keep this off.
