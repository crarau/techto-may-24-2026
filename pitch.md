# Pitch — Should I Cop This?

3 minute video submission for TechTO Hackathon May 24 2026. Track 2 (Tangerine, Family Financial Life).

## At a glance

- **Persona for the demo**: Maya. 23 years old. Part time barista in Toronto. $1,159 monthly income. 3 active BNPL plans. Saving for an emergency fund she keeps tapping.
- **The query**: *"should i cop these airpods, two fifty?"*
- **The reveal**: a generic budget app says "yes, you have $1,452 in checking." Our agent says WAIT, and tells her exactly why with real numbers from her ledger.
- **The hook for judges**: Tangerine wants personalized AI for under 40 customers. We built it. The 99% is deterministic Python. The 1% is voice and chat that grounds every figure in the engine, never invents one.

## The 3 minute cut

```
TIME    BEAT                            ACTION ON SCREEN / SCRIPT
─────────────────────────────────────────────────────────────────────
0:00    TEAM SLIDE (REQUIRED FIRST)     Static slide with team name
        (5 sec)                         and all four members + emails:
                                          Chip Rarau    chip@ideaplaces.com
                                          Luca ...      ...@...
                                          Pablo ...     ...@...
                                          Abdul ...     ...@...
                                        Track 2 · "should i cop this?"

0:05    Set up the problem              Cut to the app, Maya's profile
        (25 sec)                        panel visible.

                                        Voiceover (or on screen text):
                                        "Maya is 23. Part time barista.
                                        Eleven fifty a month. Three
                                        active BNPL plans. Saving for
                                        an emergency fund she keeps
                                        tapping. She wants the AirPods.
                                        Most apps say 'you have fourteen
                                        fifty in checking, sure, buy
                                        them.' That answer is wrong."

0:30    LIVE VOICE QUERY                Chip taps the mic.
        (40 sec)                        Says aloud:
                                        "should i cop these airpods
                                        two fifty?"

                                        Charlie (agent voice, 15 to 20
                                        seconds of spoken response):

                                        "bestie wait. you're already
                                        ninety bucks in on these, a
                                        hundred sixty to go. don't raid
                                        your fourteen fifty cushion.
                                        your save pace plus killing
                                        apple music and audible gets
                                        you there in seven weeks."

                                        Verdict card pops on screen:
                                        WAIT + 3 grounded reasons +
                                        "free up cash" panel.

1:10    The architecture beat           Quick cut. Terminal showing
        (25 sec)                        the engine JSON. Then the
                                        ngrok inspector at
                                        localhost:4040 showing the
                                        get_verdict tool call fire
                                        live.

                                        Voiceover:
                                        "Every number you just heard
                                        came from a deterministic
                                        Python engine doing the math.
                                        Claude narrates. It never
                                        invents a figure. The 99% is
                                        rule based. The 1% is voice."

1:35    Switch to text chat             Chip types in the chat box:
        (35 sec)                        "what subscriptions am i
                                        wasting on?"

                                        Stream comes back instantly.
                                        Names Apple Music and Audible.
                                        Quotes the monthly + annual
                                        savings.

                                        Then types:
                                        "if i cancel both, when do i
                                        hit my emergency fund?"

                                        Engine math comes back live
                                        with a fresh ETA.

                                        Voiceover:
                                        "Voice and text. Same brain.
                                        Same data. No invention."

2:10    The Tangerine pitch             On screen text or voiceover:
        (30 sec)                        "Tangerine ships personalized
                                        AI to every customer. Under 40
                                        segment. Real BNPL exposure.
                                        Real save pace. Real verdicts.
                                        Cancel a wasted sub in one
                                        sentence of conversation. We
                                        built family financial
                                        confidence in the voice your
                                        customer actually wants to
                                        talk to."

2:40    Close                           Brief brand callback. Logo +
        (20 sec)                        product line: "should i cop
                                        this? family financial
                                        confidence, your voice."

                                        Voiceover:
                                        "Built today. Live demo ready.
                                        Voice powered by ElevenLabs.
                                        Math powered by us."

3:00    END
```

## Five talking points to memorize

These are the lines that land. Drop one or two if voice runs long.

1. *"The 99% is deterministic Python. The 1% is voice."* The Track 2 differentiator. Engineer judges will reward this.
2. *"It never invents a figure."* Every number on screen came from the engine. Hold up the receipt in the architecture beat.
3. *"Three BNPL plans, dining up 43% this week, save rate not covering the cushion."* The Maya reveal. The non obvious answer.
4. *"Voice and text. Same brain. Same data."* The architecture story in one line. Sells the technical sophistication without slides.
5. *"Family financial confidence in the voice your customer actually wants to talk to."* The Tangerine pitch line. Mirrors their language back at them.

## Tech rundown for the architecture beat

Useful as voiceover or as a single slide if you cut the architecture moment short.

The user speaks. ElevenLabs converts speech to text. Claude Sonnet 4.6 receives the question grounded in Maya's profile baked into its system prompt. Claude decides to call `get_verdict` with the item and price. ElevenLabs hits our public HTTPS endpoint. The endpoint is our Python engine running locally, exposed via ngrok. The engine loads Maya's persona JSON, runs the deterministic rule tree, returns a structured verdict with reasons, freed up cash actions, and goal impact. Claude reads the JSON, narrates it in Charlie's voice. ElevenLabs streams audio back. The browser plays it. Verdict card renders the structured payload. Total round trip under two seconds.

## Three things to nail in rehearsal

1. **The voice query has to land cleanly.** Practice *"should i cop these airpods, two fifty"* a few times so the STT doesn't mishear. If it does, fall back to *"should i buy these airpods for two hundred fifty dollars"*.
2. **The verdict card pop has to be visible while voice narrates.** Camera frames both. If the chat thread is what's showing, the visual beat is weaker.
3. **Keep the architecture beat under 25 seconds.** Flash the engine JSON, flash the ngrok call, done. Don't lecture.

## Submission requirements

- 3 minute max video.
- Title format: `Team <#> - <team name> - Track 2 - should i cop this?`
- First slide must list all four team member names + emails.
- Upload to the Google Drive link by 5pm.
- Be ready for a live demo if shortlisted.

## Demo machine checklist

- `python3 engine/serve.py` running on port 8000.
- ngrok tunnel up at `https://1e78-96-45-202-2.ngrok-free.app` (or a fresh URL if it restarted).
- `npm run dev` running on localhost:3000.
- `caffeinate -di` running so the laptop never sleeps.
- ngrok inspector tab open at localhost:4040 for the architecture beat cutaway.
- Mic permission granted in the browser.
- Test the voice query once before hitting record.

## Agent details (for reference)

- Demo agent ID: `agent_4301ksdn6jywekb9tej8wcsntcr5` (Claude Sonnet 4.6, voice Charlie).
- Shared team agent: `agent_8201ksdk4enzesh8zwrjrdqj8kk8` (Gemini 2.5 Flash, same tools).
- Both wired to the same workspace tools: `get_verdict`, `get_profile`, pointing at the ngrok engine with `persona=maya` hardcoded.
- System prompt is grounded in Maya's full profile (subs, goals, categories, past buys baked in).
