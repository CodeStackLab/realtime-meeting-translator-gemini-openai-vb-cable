# Cable A+B Audio Routing Guide

The app uses two virtual audio cables to avoid echo and keep meeting audio separated.

VB-Cable A+B is an external VB-Audio product used for routing only. This repository is not sponsored by VB-Audio.

## Cable Roles

| Cable | Purpose | Meeting app setting | App setting |
| --- | --- | --- | --- |
| CABLE-A | Incoming buyer audio | Speaker = `CABLE-A Input` | Buyer source = `CABLE-A Output` |
| CABLE-B | Outgoing translated voice | Microphone = `CABLE-B Output` | English output = `CABLE-B Input` |

## Why Two Cables Are Needed

One cable can create feedback loops. Two cables keep directions separate:

- Buyer voice comes from the meeting into CABLE-A.
- The app listens to CABLE-A Output.
- Your translated English goes into CABLE-B Input.
- The meeting app sends CABLE-B Output as microphone audio.

## Recommended App Route

- Your microphone: real headset microphone
- Buyer audio source: `CABLE-A Output`
- Send translated English voice to: `CABLE-B Input`
- Play buyer Hindi voice to: real headphones

## Recommended Meeting Route

Works the same idea in Zoom, Microsoft Teams, and Google Meet:

- Meeting microphone: `CABLE-B Output`
- Meeting speaker: `CABLE-A Input`

## Avoiding Echo

- Wear headphones.
- Do not use laptop speakers during the meeting.
- Do not choose your real microphone in the meeting app.
- Do not choose your real speaker as the meeting speaker.
