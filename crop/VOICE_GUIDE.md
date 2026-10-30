# Voice recording guide: How the government knows what crop is in your field

Record each line so it STARTS at the time shown (visuals and subtitles are timed to these starts). Natural Telugu pace; each line must fit in its slot.

| Start | Tenglish (subtitle) | Telugu | English subtitle | Typical length |
|---|---|---|---|---|
|  0.40s | Mee polam lo em panta undo, Delhi ki telusu. Ela? | మీ పొలంలో ఏ పంట ఉందో, ఢిల్లీకి తెలుసు. ఎలా? | The government knows which crop is in your field. How? | ~3.9s |
|  4.50s | Kotha digital crop survey lo, prathi plot ni record chestunnaru. | కొత్త డిజిటల్ క్రాప్ సర్వేలో, ప్రతి ప్లాట్ ని రికార్డ్ చేస్తున్నారు. | In the new digital crop survey, every plot is recorded. | ~4.9s |
| 10.00s | Mee panta photo, location tho kalipi, registry loki velthundi. | మీ పంట ఫోటో, లొకేషన్ తో కలిపి, రిజిస్ట్రీ లోకి వెళ్తుంది. | Your crop photo, with its location, goes into a registry. | ~4.8s |
| 16.30s | Oka season lo 30 crore kanna ekkuva plots. | ఒక సీజన్ లో, ముప్పై కోట్ల కంటే ఎక్కువ ప్లాట్స్. | In just one season, over 30 crore plots. | ~3.8s |
| 22.60s | Deeni tho loan, insurance lo mosalu aapochchu. | దీనితో లోన్, ఇన్సూరెన్స్ లో మోసాలు ఆపొచ్చు. | This helps stop fraud in loans and insurance. | ~3.5s |
| 29.90s | Plus oka Farmer ID, 10 crore kante ekkuva mandiki. | ప్లస్ ఒక ఫార్మర్ ఐడి, పది కోట్ల కంటే ఎక్కువ మందికి. | Plus a Farmer ID, for more than 10 crore farmers. | ~4.2s |
| 37.40s | Kani mee polam data evaru chustaru? | కానీ మీ పొలం డేటా ఎవరు చూస్తారు? | But who gets to see your field's data? | ~2.8s |
| 41.90s | Next reel lo. Follow cheyyandi. | నెక్స్ట్ రీల్ లో. ఫాలో చెయ్యండి. | In the next reel. Follow! | ~2.6s |

## Adding your voice
1. Record one WAV per line and save as `build/crop/vo/<line-id>.wav` (ids: hook, survey, photo, count, fraud, id, who, next).
2. `REEL=crop python3 tools/tts.py` re-times the subtitles from your audio (it prefers files in build/crop/vo).
3. `node crop/gen-index.mjs` then add `<audio id="vo" src="assets/voice.wav" data-start="0" data-duration="45"></audio>` (one mixed track) and render: `cd crop && npx hyperframes render -o ../out/final.mp4`.
