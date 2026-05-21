# Setup Guide

For the complete Windows setup, use the A-Z guide:

[Windows A-Z Guide](WINDOWS-A-TO-Z-GUIDE.md)

Short setup:

1. Buy/donate/download VB-Cable A+B from the official shop:
   [https://shop.vb-audio.com/en/win-apps/12-vb-cable-ab.html](https://shop.vb-audio.com/en/win-apps/12-vb-cable-ab.html)
   If the official shop shows a `$5` contribution option, choose it and complete checkout to get the download link. This project is not sponsored by VB-Audio.
2. Install Cable A as administrator.
3. Install Cable B as administrator.
4. Restart Windows.
5. Run:

```bash
npm install
copy config.example.json config.json
npm start
```

6. In the meeting app, select:
   - Microphone: `CABLE-B Output`
   - Speaker: `CABLE-A Input`

7. In this app, select:
   - Your microphone: real headset mic
   - Buyer source: `CABLE-A Output`
   - Translated output: `CABLE-B Input`
   - Buyer Hindi voice output: your headphones
   - Provider/model: Gemini Live or OpenAI Realtime, whichever works best for your API key
