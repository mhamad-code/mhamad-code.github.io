// ==========================================================
// Reads the streamed answer: server-sent events, reasoning text
// and <think> blocks. Pure functions, no DOM.
// ==========================================================

// Splits a chunk of streamed text into complete "data:" lines.
// `rest` is the unfinished last line: put it in front of the next chunk.
export function parseSSE(buffer) {
    const lines = buffer.split(/\r?\n/);
    const rest = lines.pop();
    const events = [];
    for (const line of lines) {
        if (!line.startsWith("data:")) continue; // comments like ": OPENROUTER PROCESSING" are skipped
        const data = line.slice(5).trim();
        if (data) events.push(data);
    }
    return { events, rest };
}

// Reads one event: { content, reasoning, done, error }
export function readDelta(data) {
    if (data === "[DONE]") return { done: true };
    let json;
    try {
        json = JSON.parse(data);
    } catch {
        return {};
    }
    if (json.error) return { error: json.error.message || "The model returned an error." };

    const choice = (json.choices || [])[0] || {};
    const delta = choice.delta || {};

    let reasoning = delta.reasoning || delta.reasoning_content || "";
    if (!reasoning && Array.isArray(delta.reasoning_details)) {
        reasoning = delta.reasoning_details.map((d) => d.text || d.summary || "").join("");
    }
    return { content: delta.content || "", reasoning };
}

// Some models write their thinking inside <think>...</think> in the answer itself.
// Works on the whole text so far, so it is safe to call after every chunk.
export function extractThink(text) {
    let clean = text;

    // Hide a half-typed opening tag at the very end ("<thi")
    for (let n = 1; n <= 10; n++) {
        const tail = clean.slice(-n).toLowerCase();
        const partial = (tag) => tag.startsWith(tail) && tail !== tag;
        if (tail.startsWith("<") && (partial("<think>") || partial("<thinking>"))) {
            clean = clean.slice(0, -n);
            break;
        }
    }

    const open = clean.match(/<think(?:ing)?>/i);
    if (!open) return { thinking: "", answer: clean, open: false };

    const from = open.index + open[0].length;
    const rest = clean.slice(from);
    const close = rest.match(/<\/think(?:ing)?>/i);
    if (!close) {
        return { thinking: rest.trim(), answer: clean.slice(0, open.index).trim(), open: true };
    }
    return {
        thinking: rest.slice(0, close.index).trim(),
        answer: (clean.slice(0, open.index) + rest.slice(close.index + close[0].length)).trim(),
        open: false
    };
}
