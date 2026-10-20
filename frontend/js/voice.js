(function () {
"use strict";
// Speech in and out, using the browser's built-in features (Chrome, Edge and Safari).

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const voiceSupported = () => Boolean(Recognition);
const speakSupported = () => "speechSynthesis" in window;

// Listens to the microphone. continuous = false stops by itself after one sentence.
function createRecognizer({ lang, onText, onEnd, continuous = true }) {
  const recognizer = new Recognition();
  recognizer.lang = lang;          // "en-IN" or "ta-IN"
  recognizer.continuous = continuous;
  recognizer.interimResults = true;

  recognizer.onresult = (event) => {
    let text = "";
    for (const result of event.results) text += result[0].transcript;
    onText(text);
  };
  recognizer.onend = onEnd;
  recognizer.onerror = () => {};

  return { start: () => recognizer.start(), stop: () => recognizer.stop() };
}

// Reads a text out loud. onEnd runs when it has finished (or could not speak).
function speak(text, lang, onEnd) {
  if (!speakSupported()) { if (onEnd) onEnd(); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  if (onEnd) { utterance.onend = onEnd; utterance.onerror = onEnd; }
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if (speakSupported()) window.speechSynthesis.cancel();
}

CM.voice = { voiceSupported, speakSupported, createRecognizer, speak, stopSpeaking };
})();
