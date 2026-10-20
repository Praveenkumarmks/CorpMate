(function () {
"use strict";
// CropMate AI: a round button on the right side that opens a chat window.
// You can type or speak. It answers questions, researches, and prepares changes to your records
// (add, edit, delete) that only happen after you tap Confirm. The window can be made bigger.
const { api } = CM.api;
const { loadData } = CM.data;
const { renderPage } = CM.router;
const { $, esc, storageGet, storageSet } = CM.utils;
const { createRecognizer, voiceSupported, speak, stopSpeaking, speakSupported } = CM.voice;

const WELCOME =
  "Hi! I'm CropMate AI. Ask me anything: your farm data, weather, prices, plant problems, or any other question. " +
  "I can also add or change records for you. Type, or tap 🎤 and speak.";

const CHIPS = [
  ["🌦️ Weather", "What is the weather forecast for my farm?"],
  ["💰 Tomato price", "What is the market price of tomato?"],
  ["📊 My profit", "What is my profit so far?"],
  ["➕ Add harvest", "Add harvest 12 boxes tomato, each box 20kg, price 35 per kg"],
  ["🍃 Yellow leaves", "My tomato leaves are turning yellow. What should I do?"],
  ["🌱 Research", "What are the best practices to grow tomato?"],
];
const ICON = { create: "➕", update: "✏️", delete: "🗑️" };

const chat = {
  open: false,
  expanded: storageGet("cm_chat_big") === "1",
  messages: [{ role: "assistant", text: WELCOME }],
  draft: "",
  busy: false,
  listening: false,
  lang: "en-IN",
  readAloud: false,
  talk: false,     // hands-free: after it answers, it listens again
  notice: "",
};
let recognizer = null;
let focusInput = false;

const fab = () => $("#chat-fab");
const panel = () => $("#chat-panel");
const looksTamil = (text) => /[\u0B80-\u0BFF]/.test(text);

// Removes markdown symbols the AI sometimes adds.
const tidy = (text) => String(text).replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1").replace(/`/g, "").replace(/^\s*[*-]\s+/gm, "• ");
const safeLink = (uri) => /^https?:\/\//i.test(uri);

// ---------- drawing ----------
function cardHtml(p) {
  let footer;
  if (p.status === "done") footer = '<span class="tag">✓ Done</span>';
  else if (p.status === "cancelled") footer = '<span class="muted small">Cancelled</span>';
  else if (p.status === "error") footer = `<span class="error">${esc(p.error)}</span>`;
  else {
    footer = `<div class="button-row" style="margin-top:8px">
      <button class="btn btn-small${p.kind === "delete" ? " btn-danger" : ""}" data-confirm="${esc(p.pid)}">✓ Confirm</button>
      <button class="btn btn-outline btn-small" data-cancel="${esc(p.pid)}">Cancel</button></div>`;
  }
  const now = p.before ? Object.entries(p.before).map(([k, v]) => `${k}: ${v === "" || v == null ? "empty" : v}`).join(", ") : "";
  return `<div class="proposal"><strong>${ICON[p.kind] || "✏️"} ${esc(p.summary)}</strong>${now ? `<div class="muted small">Now: ${esc(now)}</div>` : ""}${footer}</div>`;
}

function messageHtml(m) {
  const bubble = `<div class="bubble ${m.role === "user" ? "user" : "bot"}">${esc(m.role === "user" ? m.text : tidy(m.text))}</div>`;
  const links = (m.sources || []).filter((s) => safeLink(s.uri))
    .map((s) => `<a href="${esc(s.uri)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a>`).join(" · ");
  return bubble + (links ? `<div class="sources">Sources: ${links}</div>` : "") + (m.proposals || []).map(cardHtml).join("");
}

function status() {
  if (chat.listening) return "Listening…";
  if (chat.busy) return "Thinking…";
  return "Online";
}

function draw() {
  const el = panel();
  if (!el) return;
  el.classList.toggle("expanded", chat.expanded);
  el.hidden = !chat.open;
  fab().classList.toggle("open", chat.open);
  if (!chat.open) return;

  const keepScroll = $("#cw-chat");
  const atEnd = !keepScroll || keepScroll.scrollHeight - keepScroll.scrollTop - keepScroll.clientHeight < 80;

  el.innerHTML = `
    <header class="cw-head">
      <img src="assets/logo.jpg" alt="">
      <div class="cw-title"><strong>CropMate AI</strong><span>${status()}</span></div>
      <button class="cw-btn" data-act="expand" aria-label="${chat.expanded ? "Make window smaller" : "Make window bigger"}" title="${chat.expanded ? "Smaller" : "Bigger"}">${chat.expanded ? "⤡" : "⤢"}</button>
      <button class="cw-btn" data-act="clear" aria-label="Start a new chat" title="New chat">🧹</button>
      <button class="cw-btn" data-act="close" aria-label="Close">✕</button>
    </header>
    <div class="chat cw-chat" id="cw-chat" aria-live="polite">${chat.messages.map(messageHtml).join("")}</div>
    ${chat.messages.length === 1 ? `<div class="chips cw-chips">${CHIPS.map(([label], i) => `<button class="chip" data-chip="${i}">${esc(label)}</button>`).join("")}</div>` : ""}
    <p class="cw-note" role="status">${esc(chat.notice)}</p>
    <form class="chat-form cw-form" id="cw-form">
      <button type="button" class="btn btn-outline mic-small${chat.listening ? " recording" : ""}" data-act="mic" aria-label="${chat.listening ? "Stop listening" : "Speak"}">🎤</button>
      <input id="cw-input" placeholder="Ask anything or tell me what to do…" aria-label="Message CropMate AI" autocomplete="off" value="${esc(chat.draft)}">
      <button class="btn" type="submit"${chat.busy ? " disabled" : ""}>Send</button>
    </form>
    <div class="chat-tools cw-tools">
      <label>Voice <select data-set="lang"><option value="en-IN"${chat.lang === "en-IN" ? " selected" : ""}>English</option><option value="ta-IN"${chat.lang === "ta-IN" ? " selected" : ""}>தமிழ்</option></select></label>
      ${speakSupported() ? `<label><input type="checkbox" data-set="readAloud"${chat.readAloud ? " checked" : ""}> Read aloud</label>
      <label><input type="checkbox" data-set="talk"${chat.talk ? " checked" : ""}> Talk mode</label>` : ""}
    </div>`;

  const list = $("#cw-chat");
  if (list && atEnd) list.scrollTop = list.scrollHeight;
  else if (list && keepScroll) list.scrollTop = keepScroll.scrollTop;
  if (focusInput && !chat.listening) { $("#cw-input").focus(); }
  focusInput = false;
}

// ---------- opening, closing, sizing ----------
function open({ expanded } = {}) {
  chat.open = true;
  if (typeof expanded === "boolean") chat.expanded = expanded;
  focusInput = true;
  draw();
}
function close() {
  chat.open = false;
  stopListening();
  stopSpeaking();
  draw();
}
function setExpanded(value) {
  chat.expanded = value;
  storageSet("cm_chat_big", value ? "1" : "0");
  draw();
}
function resetChat() {
  stopListening();
  stopSpeaking();
  chat.messages = [{ role: "assistant", text: WELCOME }];
  chat.draft = ""; chat.notice = ""; chat.busy = false; chat.talk = false;
  draw();
}

// ---------- sending ----------
async function send(text) {
  text = String(text || "").trim();
  if (!text || chat.busy) return;
  stopSpeaking();
  chat.notice = ""; chat.draft = "";
  chat.messages.push({ role: "user", text });
  const reply = { role: "assistant", text: "Thinking…", pending: true };
  chat.messages.push(reply);
  chat.busy = true;
  focusInput = true;
  draw();

  try {
    const history = chat.messages.filter((m) => !m.pending).slice(-14).map((m) => ({ role: m.role, text: m.text }));
    const result = await api("/ai/chat", { method: "POST", body: { messages: history, lang: chat.lang } });
    reply.text = result.reply;
    reply.sources = result.sources || [];
    reply.proposals = (result.proposals || []).map((p) => ({ ...p, status: "pending" }));
  } catch (error) {
    reply.text = `Sorry, I could not answer: ${error.message}`;
  }
  delete reply.pending;
  chat.busy = false;
  draw();

  if (chat.readAloud || chat.talk) {
    speak(tidy(reply.text), looksTamil(reply.text) ? "ta-IN" : chat.lang, () => { if (chat.talk && chat.open) startListening(); });
  }
}

// ---------- confirm cards ----------
async function applyProposal(p) {
  if (p.kind === "create") return api(`/${p.resource}`, { method: "POST", body: p.data });
  if (p.kind === "update") return api(`/${p.resource}/${p.recordId}`, { method: "PUT", body: p.data });
  return api(`/${p.resource}/${p.recordId}`, { method: "DELETE" });
}

async function resolveProposal(pid, accept) {
  const proposal = chat.messages.flatMap((m) => m.proposals || []).find((p) => p.pid === pid);
  if (!proposal || proposal.status !== "pending") return;
  if (!accept) {
    proposal.status = "cancelled";
  } else {
    try {
      await applyProposal(proposal);
      await loadData();
      proposal.status = "done";
      renderPage(); // the screen behind the chat shows the new data
    } catch (error) {
      proposal.status = "error";
      proposal.error = error.message;
    }
  }
  draw();
}

// ---------- microphone ----------
function startListening() {
  if (recognizer) return;
  if (!voiceSupported()) {
    chat.notice = "Speech input is not available in this browser. Please type your message.";
    chat.talk = false;
    return draw();
  }
  let heard = "";
  stopSpeaking();
  recognizer = createRecognizer({
    lang: chat.lang,
    continuous: false,
    onText: (text) => {
      heard = text;
      chat.draft = text;
      const input = $("#cw-input");
      if (input) input.value = text;
    },
    onEnd: () => {
      chat.listening = false;
      recognizer = null;
      if (heard.trim()) send(heard);
      else { chat.talk = false; draw(); } // heard nothing: leave talk mode
    },
  });
  chat.listening = true;
  recognizer.start();
  draw();
}

function stopListening() {
  if (recognizer) recognizer.stop();
}

// ---------- one set of listeners for the whole window ----------
function wire() {
  fab().addEventListener("click", () => (chat.open ? close() : open()));

  const el = panel();
  el.addEventListener("click", (event) => {
    const target = event.target.closest("[data-act],[data-chip],[data-confirm],[data-cancel]");
    if (!target) return;
    const { act, chip, confirm, cancel } = target.dataset;
    if (act === "close") close();
    else if (act === "expand") setExpanded(!chat.expanded);
    else if (act === "clear") resetChat();
    else if (act === "mic") (chat.listening ? stopListening() : startListening());
    else if (chip !== undefined) send(CHIPS[chip][1]);
    else if (confirm) resolveProposal(confirm, true);
    else if (cancel) resolveProposal(cancel, false);
  });
  el.addEventListener("input", (event) => { if (event.target.id === "cw-input") chat.draft = event.target.value; });
  el.addEventListener("submit", (event) => { event.preventDefault(); send($("#cw-input").value); });
  el.addEventListener("change", (event) => {
    const key = event.target.dataset.set;
    if (!key) return;
    if (key === "lang") chat.lang = event.target.value;
    else {
      chat[key] = event.target.checked;
      if (key === "talk" && chat.talk) chat.readAloud = true;
      if (!chat.readAloud && !chat.talk) stopSpeaking();
    }
    draw();
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && chat.open) close(); });
}

CM.chatWidget = {
  init: wire,
  show: () => { fab().hidden = false; },
  open,
  reset: () => { chat.open = false; resetChat(); fab().hidden = true; },
};
})();
