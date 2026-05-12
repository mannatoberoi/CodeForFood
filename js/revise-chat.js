const env = import.meta.env ?? {};
const GROQ_API_KEY = String(env.VITE_GROQ_API_KEY ?? "").trim();
const GROQ_MODEL = env.VITE_GROQ_MODEL ?? "llama-3.1-8b-instant";
const GROQ_URL = env.VITE_GROQ_API_URL ?? "https://api.groq.com/openai/v1/chat/completions";

(function () {
  var form = document.getElementById("revise-chat-form");
  var input = document.getElementById("revise-chat-input");
  var messagesEl = document.getElementById("revise-chat-messages");
  if (!form || !input || !messagesEl) return;

  if (!GROQ_API_KEY) {
    appendMsg("system", "Add your Groq key: put VITE_GROQ_API_KEY in a `.env` file, then run `npm run dev`.");
    return;
  }

  appendMsg("assistant", "Hello! I'm your study tutor. Ask me anything about JavaScript or coding.");

  var chatHistory = [
    {
      role: "system",
      content: "You are a friendly study tutor for the Code For Food learning site. Help students understand JavaScript and programming concepts. Keep explanations clear, concise, and encouraging. Use examples when helpful.",
    },
  ];

  function appendMsg(role, text) {
    if (!text) return;
    var div = document.createElement("div");
    div.className = "revise-chat-msg revise-chat-msg--" + role;
    var paras = text.split(/\n\s*\n/);
    for (var i = 0; i < paras.length; i++) {
      var p = document.createElement("p");
      p.textContent = paras[i].trim();
      if (p.textContent) div.appendChild(p);
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = "";

    appendMsg("user", text);
    chatHistory.push({ role: "user", content: text });

    var thinkingEl = document.createElement("div");
    thinkingEl.className = "revise-chat-msg revise-chat-msg--system";
    thinkingEl.textContent = "Thinking…";
    messagesEl.appendChild(thinkingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      var res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + GROQ_API_KEY,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: chatHistory,
          max_tokens: 512,
        }),
      });
      if (!res.ok) {
        var detail = res.statusText;
        try {
          var j = await res.json();
          detail = j.error?.message || JSON.stringify(j);
        } catch (_) {
          try { detail = await res.text(); } catch (_) {}
        }
        throw new Error(detail || "HTTP " + res.status);
      }
      var data = await res.json();
      var reply = data.choices?.[0]?.message?.content?.trim() || "";
      if (thinkingEl.parentNode) thinkingEl.parentNode.removeChild(thinkingEl);
      if (!reply) {
        appendMsg("system", "No reply from the assistant.");
        return;
      }
      appendMsg("assistant", reply);
      chatHistory.push({ role: "assistant", content: reply });
    } catch (err) {
      if (thinkingEl.parentNode) thinkingEl.parentNode.removeChild(thinkingEl);
      var msg = err instanceof Error ? err.message : String(err);
      appendMsg("system", "Error: " + msg);
    }
  });
})();