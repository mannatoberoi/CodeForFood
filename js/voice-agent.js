/**
 * Voice agent: microphone → Groq chat → on-screen text + speech synthesis.
 *
 * Setup: copy `.env.example` to `.env`, set `VITE_GROQ_API_KEY`, then run
 * `npm run dev` or `npm run build`. Keys are injected at build/dev time by Vite.
 * Direct browser calls to Groq may be blocked by CORS; use a backend proxy if needed.
 *
 * Run `npm run dev` (Vite) so `import.meta.env` is defined. Opening the HTML file
 * directly will load the script but leave the API key empty unless you use a build.
 */
const env = import.meta.env ?? {};
const GROQ_API_KEY = String(env.VITE_GROQ_API_KEY ?? "").trim();
const GROQ_MODEL =
  env.VITE_GROQ_MODEL ?? "llama-3.1-8b-instant";
const GROQ_URL =
  env.VITE_GROQ_API_URL ??
  "https://api.groq.com/openai/v1/chat/completions";

(function () {
  const trigger = document.getElementById("voice-agent-trigger");
  const panel = document.getElementById("voice-agent-panel");
  const messagesEl = document.getElementById("voice-agent-messages");
  const closeBtn = document.getElementById("voice-agent-close");
  const SpeechRecognition =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  let recognition = null;
  let listening = false;
  let processing = false;
  let thinkingEl = null;

  function setPanelOpen(open) {
    if (!panel || !trigger) return;
    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function openPanel() {
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    stopListening();
    clearSpeakingGlow();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    clearThinking();
  }

  function appendMessage(role, text) {
    if (!messagesEl || !text) return;
    const div = document.createElement("div");
    div.className = `voice-agent-msg voice-agent-msg--${role}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function clearThinking() {
    if (thinkingEl && thinkingEl.parentNode) {
      thinkingEl.parentNode.removeChild(thinkingEl);
    }
    thinkingEl = null;
  }

  function setThinking(on) {
    clearThinking();
    if (!on || !messagesEl) return;
    thinkingEl = document.createElement("div");
    thinkingEl.className = "voice-agent-msg voice-agent-msg--system";
    thinkingEl.textContent = "Thinking…";
    messagesEl.appendChild(thinkingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setListening(on) {
    listening = on;
    if (trigger) {
      trigger.classList.toggle("is-listening", on);
      trigger.setAttribute("aria-pressed", on ? "true" : "false");
    }
  }

  function setSpeaking(on) {
    if (trigger) trigger.classList.toggle("is-speaking", on);
  }

  function clearSpeakingGlow() {
    if (trigger) trigger.classList.remove("is-speaking");
  }

  async function askGroq(text) {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful voice assistant for the Code For Food learning site. Keep answers concise and friendly.",
          },
          { role: "user", content: text },
        ],
        max_tokens: 256,
      }),
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const j = await res.json();
        detail = j.error?.message || JSON.stringify(j);
      } catch (_) {
        try {
          detail = await res.text();
        } catch (_) {}
      }
      throw new Error(detail || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  }

  function speak(text) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    clearSpeakingGlow();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  function stopListening() {
    if (recognition) {
      try {
        recognition.abort();
      } catch (_) {}
    }
    setListening(false);
  }

  function startListening() {
    if (!SpeechRecognition) {
      openPanel();
      appendMessage(
        "system",
        "Speech recognition is not supported in this browser."
      );
      return;
    }
    if (!GROQ_API_KEY) {
      openPanel();
      appendMessage(
        "system",
        "Add your Groq key: put VITE_GROQ_API_KEY in a `.env` file, then run `npm run dev` (restart the dev server after editing .env)."
      );
      return;
    }
    if (processing) {
      openPanel();
      appendMessage(
        "system",
        "Please wait for the current reply to finish."
      );
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setListening(true);
      appendMessage("system", "Listening… speak now.");
    };
    recognition.onerror = (e) => {
      setListening(false);
      const err = e.error || "unknown";
      if (err === "aborted") {
        appendMessage("system", "Voice input cancelled.");
        return;
      }
      appendMessage("system", `Microphone error: ${err}`);
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript.trim().toLowerCase();
      if (!transcript) {
        appendMessage(
          "system",
          "Did not catch that. Tap the icon again to try."
        );
        return;
      }
      appendMessage("user", transcript);

      var navUrl = null;
      if (/go\s*(back|to\s*home)/i.test(transcript) || transcript === "home" || transcript === "back") {
        navUrl = new URL("../index.html", window.location.href).href;
      } else if (/game/i.test(transcript) && !/rewards|leaderboard|login|revise/i.test(transcript)) {
        navUrl = new URL("./game.html", window.location.href).href;
      } else if (/reward/i.test(transcript)) {
        navUrl = new URL("./rewards.html", window.location.href).href;
      } else if (/leaderboard/i.test(transcript) || /leader.?board/i.test(transcript)) {
        navUrl = new URL("./leaderboard.html", window.location.href).href;
      } else if (/login/i.test(transcript) || /sign.?in/i.test(transcript) || /log.?in/i.test(transcript)) {
        navUrl = new URL("./login.html", window.location.href).href;
      } else if (/revise/i.test(transcript) || /point/i.test(transcript)) {
        navUrl = new URL("./points-to-revise.html", window.location.href).href;
      }

      if (navUrl) {
        appendMessage("assistant", "Navigating…");
        speak("Navigating");
        window.location.assign(navUrl);
        return;
      }

      processing = true;
      setThinking(true);
      try {
        const reply = await askGroq(transcript);
        clearThinking();
        if (!reply) {
          appendMessage("system", "No reply from the assistant.");
          return;
        }
        appendMessage("assistant", reply);
        speak(reply);
      } catch (err) {
        clearThinking();
        const msg = err instanceof Error ? err.message : String(err);
        appendMessage(
          "system",
          `Could not get a reply (network, CORS, or API error). ${msg}`
        );
      } finally {
        processing = false;
      }
    };

    try {
      recognition.start();
    } catch (_) {
      setListening(false);
      appendMessage("system", "Could not start the microphone.");
    }
  }

  if (!trigger) return;

  trigger.addEventListener("click", () => {
    const panelWasOpen = panel?.classList.contains("is-open");
    if (!panelWasOpen) {
      openPanel();
    }

    if (processing) return;

    if (listening) {
      stopListening();
      appendMessage("system", "Stopped.");
      return;
    }

    startListening();
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closePanel();
    });
  }
})();
