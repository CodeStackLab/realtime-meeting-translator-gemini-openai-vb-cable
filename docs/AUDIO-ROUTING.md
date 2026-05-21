# Cable A+B Audio Routing Guide

The app uses two virtual cables to separate incoming and outgoing audio.

## Cable Roles

| Cable | Purpose | Meeting app setting | App setting |
| --- | --- | --- | --- |
| CABLE-A | Incoming buyer audio | Speaker = CABLE-A Input | Buyer source = CABLE-A Output |
| CABLE-B | Outgoing translated voice | Microphone = CABLE-B Output | English output = CABLE-B Input |

## Why Two Cables Are Needed

Using one cable can create echo loops. Two cables keep buyer audio separate from translated output:

- Buyer voice goes into CABLE-A.
- App listens to CABLE-A Output.
- App sends translated English to CABLE-B Input.
- Meeting app receives translated English from CABLE-B Output.

## Recommended Two-Way Mode

Use this when you speak Hindi and the buyer speaks English:

- App `Your microphone`: real headset mic
- App `Buyer audio source`: CABLE-A Output
- App `Send translated English voice to`: CABLE-B Input
- App `Play buyer Hindi voice to`: headset speakers
- Meeting app `Microphone`: CABLE-B Output
- Meeting app `Speaker`: CABLE-A Input

## Hearing Original Buyer English

If you also want to hear the buyer's original English voice:

1. Open Windows Sound settings.
2. Open More sound settings.
3. Go to Recording.
4. Select `CABLE-A Output`.
5. Open Properties.
6. Go to Listen.
7. Enable `Listen to this device`.
8. Playback through your headphones.

If you only want translated Hindi voice, keep this off.

## Avoiding Echo

- Wear headphones.
- Keep laptop speakers muted.
- Do not select your real mic as the meeting app mic.
- Meeting app mic should be CABLE-B Output.
