const STORE = "cae-native-test-3-separated";
const ACCESS_KEY = "cae-native-test-3-access";
const ACCESS_PASSWORD = "C1mockJune26";
const LISTENING_PLAYLIST = [
  { label: "Part 1", src: "audio/C1_Advanced_4__Test_4__Part_1.mp3" },
  { label: "Part 2", src: "audio/C1_Advanced_4__Test_4__Part_2.mp3" },
  { label: "Part 3", src: "audio/C1_Advanced_4__Test_4__Part_3.mp3" },
  { label: "Part 4", src: "audio/C1_Advanced_4__Test_4__Part_4.mp3" }
];
if (new URLSearchParams(window.location.search).get("reset") === "1") {
  localStorage.removeItem(STORE);
}
const appState = loadState();
let draggedParagraph = null;
let selectedParagraph = null;
let listeningPlayerCreated = false;
let listeningTrackIndex = 0;

function loadState() {
  const base = { screen: "start", paper: null, part: null, answers: {}, seconds: {}, running: null, submitted: {}, notes: {}, notesOpen: {}, highlights: {}, showExplanations: {}, audioMinimized: false };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE)) || {};
    const merged = Object.assign(base, saved);
    if (typeof merged.submitted === "boolean") {
      merged.submitted = merged.submitted ? { reading: true, listening: true } : {};
    }
    merged.notes = merged.notes || {};
    merged.notesOpen = merged.notesOpen || {};
    merged.highlights = merged.highlights || {};
    merged.showExplanations = merged.showExplanations || {};
    if (!merged.screen) merged.screen = merged.paper ? "paper" : "start";
    return merged;
  } catch {
    return base;
  }
}

function saveState() {
  localStorage.setItem(STORE, JSON.stringify(appState));
}

function currentPaper() {
  return examData.papers.find((paper) => paper.id === appState.paper);
}

function currentPart() {
  return currentPaper().parts.find((part) => part.id === appState.part);
}

function key(number) {
  return `${appState.paper}-${number}`;
}

function partKey(part, number) {
  return `${currentPaper().id}-${number}`;
}

function answer(number) {
  return appState.answers[key(number)] || "";
}

function setAnswer(number, value) {
  appState.answers[key(number)] = value;
  saveState();
  updateProgress();
}

function render() {
  if (!hasExamAccess()) {
    renderAccessScreen();
    return;
  }
  if (appState.screen === "overall") {
    renderOverallScreen();
    return;
  }
  if (appState.screen === "start" || !appState.paper) {
    renderStartScreen();
    return;
  }
  const paper = currentPaper();
  const part = currentPart();
  ensureTimer(paper);
  document.getElementById("app").innerHTML = `
    <header class="exam-shell">
      <div class="brand">
        <span>${examData.subtitle}</span>
        <h1>${examData.title}</h1>
      </div>
      <div class="timer">
        <strong data-time>${formatTime(appState.seconds[paper.id])}</strong>
        <button data-command="timer">${appState.running === paper.id ? "Pause" : "Start"}</button>
        <button data-command="submit">Submit ${paper.title}</button>
      </div>
    </header>
    <nav class="paper-tabs">
      <button data-start-screen>Start screen</button>
      <button class="active">${paper.title}</button>
    </nav>
    ${isPaperSubmitted(paper.id) ? renderResultsPanel(paper.id) : ""}
    ${renderExamTools(paper.id)}
    <main class="exam-layout">
      <aside class="navigator">
        ${paper.parts.map((item) => `<button class="${item.id === part.id ? "active" : ""}" data-part="${item.id}"><b>${item.title}</b><span>${labelFor(item.taskType)}</span></button>`).join("")}
        <div class="status-card"><b data-progress>${progressText(paper)}</b><span>completed</span></div>
      </aside>
      <section class="task-card">${renderPart(part)}</section>
    </main>
  `;
  updateListeningPlayer(paper);
  bind();
  applyStoredHighlights();
}

function hasExamAccess() {
  return sessionStorage.getItem(ACCESS_KEY) === "granted";
}

function renderAccessScreen(error = "") {
  document.body.classList.remove("listening-active");
  const host = document.getElementById("globalListeningPlayer");
  if (host) host.hidden = true;
  document.getElementById("app").innerHTML = `
    <main class="access-screen">
      <form class="access-panel" data-access-form>
        <div>
          <span>${examData.subtitle}</span>
          <h1>C1 Advanced Digital Mock</h1>
        </div>
        <label>
          <span>Password</span>
          <input type="password" data-access-password autocomplete="current-password" autofocus>
        </label>
        ${error ? `<p class="access-error">${error}</p>` : ""}
        <button type="submit">Enter exam</button>
      </form>
    </main>`;
  bindAccessScreen();
}

function bindAccessScreen() {
  const form = document.querySelector("[data-access-form]");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.querySelector("[data-access-password]");
    if (input && input.value === ACCESS_PASSWORD) {
      sessionStorage.setItem(ACCESS_KEY, "granted");
      appState.screen = "start";
      appState.paper = null;
      appState.part = null;
      saveState();
      renderStartScreen();
      return;
    }
    renderAccessScreen("Incorrect password. Please try again.");
  });
}

function renderStartScreen() {
  document.body.classList.remove("listening-active");
  const host = document.getElementById("globalListeningPlayer");
  if (host) host.hidden = true;
  document.getElementById("app").innerHTML = `
    <header class="exam-shell">
      <div class="brand">
        <span>${examData.subtitle}</span>
        <h1>${examData.title}</h1>
      </div>
    </header>
    <main class="start-screen">
      <section>
        <p>Choose a paper</p>
        <h2>Start an independent test</h2>
      </section>
      <div class="start-actions">
        <button data-start-paper="reading">Start Reading and Use of English</button>
        <button data-start-paper="listening">Start Listening</button>
        <button data-overall-results>Overall results</button>
      </div>
    </main>`;
  bind();
}

function renderOverallScreen() {
  document.body.classList.remove("listening-active");
  const host = document.getElementById("globalListeningPlayer");
  if (host) host.hidden = true;
  document.getElementById("app").innerHTML = `
    <header class="exam-shell">
      <div class="brand">
        <span>${examData.subtitle}</span>
        <h1>${examData.title}</h1>
      </div>
    </header>
    <nav class="paper-tabs"><button data-start-screen>Start screen</button></nav>
    ${renderOverallResultsPanel()}
  `;
  bind();
}

function renderPart(part) {
  return `
    <div class="task-head">
      <div><p>${currentPaper().title}</p><h2>${part.title}${part.heading ? `: ${part.heading}` : ""}</h2></div>
    </div>
    <p class="instructions">${part.instructions}</p>
    ${renderer[part.taskType](part)}
  `;
}

const renderer = {
  multipleCloze(part) {
    return `<article class="reading-text">${part.text.map((p) => `<p>${withChoiceGaps(p, part.questions)}</p>`).join("")}</article>`;
  },
  openCloze(part) {
    return `<article class="reading-text">${part.text.map((p) => `<p>${withTextGaps(p)}</p>`).join("")}</article>`;
  },
  wordFormation(part) {
    return `<article class="reading-text">${part.text.map((p) => `<p>${withTextGaps(p, true, part.questions)}</p>`).join("")}</article>`;
  },
  transformations(part) {
    return `<div class="transform-list">${part.questions.map((item) => `
      <section class="transform ${feedbackClass(item.number)}">
        <div class="qbadge">${item.number}</div>
        <p>${item.first}</p>
        <strong>${item.word}</strong>
        <label>${item.second.replace("__________", `<input value="${esc(answer(item.number))}" data-input="${item.number}" aria-label="Question ${item.number} answer">`)}</label>
        ${feedbackNote(item.number)}
        ${explanationBox(item.number)}
      </section>`).join("")}</div>`;
  },
  splitReading(part) {
    return `<div class="split"><article class="passage">${part.text.map((p) => `<p>${p}</p>`).join("")}</article><div class="question-panel">${choiceQuestions(part.questions)}</div></div>`;
  },
  matching(part) {
    return `<div class="split"><div class="section-grid">${sections(part.sections)}</div><div class="question-panel">${choiceQuestions(part.questions)}</div></div>`;
  },
  dragDrop(part) {
    const placed = Object.entries(appState.answers).filter(([k]) => k.startsWith(`${appState.paper}-`)).reduce((acc, [k, v]) => (acc[v] = k.split("-")[1], acc), {});
    return `
      <div class="drag-layout">
        <article class="reading-text">${part.text.map((p) => `<p>${withDropGaps(p)}</p>`).join("")}</article>
        <aside class="paragraph-bank">
          ${part.options.map((item) => `<div class="drag-card ${placed[item.key] ? "used" : ""} ${selectedParagraph === item.key ? "selected" : ""}" draggable="true" data-drag="${item.key}"><b>${item.key}</b><span>${item.text}</span></div>`).join("")}
        </aside>
      </div>`;
  },
  dropdownMatching(part) {
    return `<div class="split"><div class="section-grid">${sections(part.sections)}</div><div class="question-panel">${selectQuestions(part.questions)}</div></div>`;
  },
  listeningChoice(part) {
    if (part.groups) {
      return `<div class="question-panel wide">${part.groups.map((group) => `<section><h3>${group.heading}</h3><p>${group.intro}</p>${choiceQuestions(group.questions)}</section>`).join("")}</div>`;
    }
    return `<div class="question-panel wide">${choiceQuestions(part.questions)}</div>`;
  },
  listeningText(part) {
    return `<div class="question-panel wide listening-sentences"><h3>${part.heading}</h3>${part.questions.map((item) => renderListeningSentence(item)).join("")}</div>`;
  },
  listeningMultiMatch(part) {
    return `
      <div class="listening-part4-matrix">
        ${part.sets.map((set, setIndex) => renderPart4Matrix(set, part.options, setIndex)).join("")}
      </div>`;
  }
};

function updateListeningPlayer(paper) {
  let host = document.getElementById("globalListeningPlayer");
  if (!host) {
    host = document.createElement("div");
    host.id = "globalListeningPlayer";
    host.className = "global-listening-player";
    host.innerHTML = `
      <button type="button" class="audio-toggle" data-audio-toggle aria-label="Minimise or expand audio">Audio</button>
      <div class="audio-panel-body">
        <div>
          <strong>Listening audio</strong>
          <span data-audio-track>Track 1 of 4: Part 1</span>
          <span data-audio-time>0:00 / 0:00</span>
        </div>
        <progress class="audio-progress" data-audio-progress value="0" max="1"></progress>
        <audio controls preload="metadata"></audio>
      </div>
    `;
    host.querySelector("[data-audio-toggle]").addEventListener("click", () => {
      appState.audioMinimized = !appState.audioMinimized;
      saveState();
      updateListeningPlayer(currentPaper() || { id: null });
    });
    const audio = host.querySelector("audio");
    audio.addEventListener("ended", playNextListeningTrack);
    audio.addEventListener("loadedmetadata", updateListeningPlaylistMeta);
    audio.addEventListener("timeupdate", updateListeningPlaylistMeta);
    audio.addEventListener("play", updateListeningPlaylistMeta);
    audio.addEventListener("pause", updateListeningPlaylistMeta);
    document.body.appendChild(host);
    listeningPlayerCreated = true;
  }
  const show = paper.id === "listening";
  host.hidden = !show;
  if (show) setListeningTrack(listeningTrackIndex, false);
  host.classList.toggle("minimized", !!appState.audioMinimized);
  const toggle = host.querySelector("[data-audio-toggle]");
  if (toggle) toggle.textContent = appState.audioMinimized ? "Audio" : "Minimise";
  document.body.classList.toggle("listening-active", show);
  updateListeningPlaylistMeta();
}

function setListeningTrack(index, shouldPlay) {
  const host = document.getElementById("globalListeningPlayer");
  const audio = host ? host.querySelector("audio") : null;
  if (!audio) return;
  listeningTrackIndex = Math.max(0, Math.min(index, LISTENING_PLAYLIST.length - 1));
  const track = LISTENING_PLAYLIST[listeningTrackIndex];
  if (audio.getAttribute("src") !== track.src) {
    audio.setAttribute("src", track.src);
    audio.load();
  }
  updateListeningPlaylistMeta();
  if (shouldPlay) audio.play().catch(() => updateListeningPlaylistMeta());
}

function playNextListeningTrack() {
  if (listeningTrackIndex >= LISTENING_PLAYLIST.length - 1) {
    updateListeningPlaylistMeta();
    return;
  }
  setListeningTrack(listeningTrackIndex + 1, true);
}

function updateListeningPlaylistMeta() {
  const host = document.getElementById("globalListeningPlayer");
  const audio = host ? host.querySelector("audio") : null;
  if (!host || !audio) return;
  const track = LISTENING_PLAYLIST[listeningTrackIndex];
  const trackNode = host.querySelector("[data-audio-track]");
  const timeNode = host.querySelector("[data-audio-time]");
  const progressNode = host.querySelector("[data-audio-progress]");
  if (trackNode) trackNode.textContent = `Track ${listeningTrackIndex + 1} of ${LISTENING_PLAYLIST.length}: ${track.label}`;
  if (timeNode) timeNode.textContent = `${formatMediaTime(audio.currentTime)} / ${formatMediaTime(audio.duration)}`;
  if (progressNode) progressNode.value = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration : 0;
}

function formatMediaTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const rounded = Math.floor(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainder = String(rounded % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function renderListeningSentence(item) {
  const [before, after = ""] = item.text.split("{input}");
  return `
    <label class="sentence-completion">
      <span class="sentence-number">${item.number}</span>
      <span class="sentence-body ${feedbackClass(item.number)}">
        <span class="sentence-before">${before}</span>
        <input value="${esc(answer(item.number))}" data-input="${item.number}" aria-label="Question ${item.number} answer">
        <span class="sentence-after">${after}</span>
        ${feedbackNote(item.number)}
        ${explanationBox(item.number)}
      </span>
    </label>`;
}

function renderPart4Matrix(set, options, setIndex) {
  const optionList = Array.isArray(options) ? options : (setIndex === 0 ? options.taskOne : options.taskTwo);
  return `
    <section class="part4-matrix-task">
      <h3>${set.heading}</h3>
      <div class="matrix-scroll">
        <table class="part4-matrix">
          <thead>
            <tr>
              <th class="option-heading">Options A-H</th>
              ${set.questions.map((question, index) => `<th><span>Question ${question.number}</span><b>Speaker ${index + 1}</b></th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${optionList.map((option) => {
              const letter = option.slice(0, 1);
              return `<tr>
                <th scope="row"><b>${letter}</b><span>${esc(option.slice(2))}</span></th>
                ${set.questions.map((question) => `
                  <td class="${matrixCellClass(question.number, letter)}">
                    <input type="radio" name="q${question.number}" value="${letter}" data-part4-radio="${question.number}:${letter}:${setIndex}" ${answer(question.number) === letter ? "checked" : ""} aria-label="Question ${question.number}, option ${letter}">
                  </td>
                `).join("")}
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
      ${renderMatrixFeedback(set.questions)}
      ${renderMatrixExplanations(set.questions)}
    </section>`;
}

function withChoiceGaps(text, questions) {
  return text.replace(/\{(\d+)\}/g, (_, n) => {
    const item = questions.find((q) => q.number === Number(n));
    const current = answer(Number(n));
    return `<span class="cloze-gap-wrap ${feedbackClass(Number(n))}"><b>${n}</b><select class="cloze-gap ${current ? "answered" : ""}" data-cloze-select="${n}" aria-label="Question ${n}">
      <option value="">________</option>
      ${item.options.map((option) => `<option value="${esc(option)}" ${current === option ? "selected" : ""}>${option}</option>`).join("")}
    </select>${feedbackNote(Number(n))}${explanationBox(Number(n))}</span>`;
  });
}

function withTextGaps(text, showPrompt = false, questions = []) {
  return text.replace(/\{(\d+)\}/g, (_, n) => {
    const item = questions.find((q) => q.number === Number(n));
    return `<span class="inline-text-gap ${feedbackClass(Number(n))}"><b>${n}</b><input value="${esc(answer(Number(n)))}" data-input="${n}">${showPrompt && item ? `<em>${item.promptWord}</em>` : ""}${feedbackNote(Number(n))}${explanationBox(Number(n))}</span>`;
  });
}

function withDropGaps(text) {
  return text.replace(/\{(\d+)\}/g, (_, n) => {
    const value = answer(Number(n));
    const option = currentPart().options.find((item) => item.key === value);
    if (option) {
      return `<span class="inserted-paragraph ${feedbackClass(Number(n))}" data-drop="${n}" data-inserted-drag="${option.key}" draggable="true"><b>${n}</b>${esc(option.text)}<button type="button" data-clear-drop="${n}" aria-label="Remove paragraph from gap ${n}">Remove</button>${feedbackNote(Number(n))}${explanationBox(Number(n))}</span>`;
    }
    return `<span class="drop-zone ${feedbackClass(Number(n))}" data-drop="${n}"><b>${n}</b>Drop paragraph here${feedbackNote(Number(n))}${explanationBox(Number(n))}</span>`;
  });
}

function choiceQuestions(questions) {
  return questions.map((item) => `
    <section class="question ${feedbackClass(item.number)}">
      <h3>${item.number}. ${item.prompt || ""}</h3>
      <div class="option-list">${item.options.map((option, index) => {
        const letter = item.options.length <= 3 ? "ABC"[index] : "ABCDEFGH"[index];
        return `<label class="${answer(item.number) === letter ? "checked" : ""} ${choiceFeedbackClass(item.number, letter)}"><input type="radio" name="q${item.number}" value="${letter}" data-radio="${item.number}"><b>${letter}</b><span>${option}</span></label>`;
      }).join("")}</div>
      ${feedbackNote(item.number)}
      ${explanationBox(item.number)}
    </section>`).join("");
}

function selectQuestions(questions) {
  return questions.map((item) => `
    <label class="select-row ${feedbackClass(item.number)}"><span>${item.number}. ${item.prompt || `Speaker ${item.number}`}</span>
      <select data-select="${item.number}">
        <option value="">-</option>
        ${item.options.map((o) => `<option value="${o}" ${answer(item.number) === o ? "selected" : ""}>${o}</option>`).join("")}
      </select>
      ${feedbackNote(item.number)}
      ${explanationBox(item.number)}
    </label>`).join("");
}

function sections(items) {
  return items.map((item) => `<section><h3>${item.title || item.key}</h3><p>${item.text}</p></section>`).join("");
}

function renderExamTools(paperId) {
  const open = !!appState.notesOpen[paperId];
  return `
    <section class="exam-tools ${open ? "open" : "collapsed"}">
      <button type="button" data-command="toggle-notes">${open ? "Hide notes" : "Notes"}</button>
      <span>Highlight selected text</span>
      ${open ? `<textarea data-notes="${paperId}" placeholder="Notes">${esc(appState.notes[paperId] || "")}</textarea>` : ""}
    </section>`;
}

function bind() {
  document.querySelectorAll("[data-start-paper]").forEach((button) => button.addEventListener("click", () => {
    startPaper(button.dataset.startPaper);
  }));
  document.querySelectorAll("[data-start-screen]").forEach((button) => button.addEventListener("click", () => {
    appState.screen = "start";
    appState.paper = null;
    appState.part = null;
    saveState();
    render();
  }));
  const overallButton = document.querySelector("[data-overall-results]");
  if (overallButton) {
    overallButton.addEventListener("click", () => {
      appState.screen = "overall";
      appState.paper = null;
      appState.part = null;
      saveState();
      render();
    });
  }
  document.querySelectorAll("[data-paper]").forEach((button) => button.addEventListener("click", () => {
    appState.paper = button.dataset.paper;
    appState.part = currentPaper().parts[0].id;
    appState.screen = "paper";
    saveState();
    render();
  }));
  document.querySelectorAll("[data-part]").forEach((button) => button.addEventListener("click", () => {
    appState.part = button.dataset.part;
    saveState();
    render();
  }));
  document.querySelectorAll("[data-choice]").forEach((button) => button.addEventListener("click", () => {
    const [number, value] = button.dataset.choice.split(":");
    setAnswer(Number(number), value);
    render();
  }));
  document.querySelectorAll("[data-cloze-select]").forEach((select) => select.addEventListener("change", () => {
    setAnswer(Number(select.dataset.clozeSelect), select.value);
    render();
  }));
  document.querySelectorAll("[data-radio]").forEach((input) => {
    input.checked = answer(Number(input.dataset.radio)) === input.value;
    input.addEventListener("change", () => {
      setAnswer(Number(input.dataset.radio), input.value);
      render();
    });
  });
  document.querySelectorAll("[data-input]").forEach((input) => input.addEventListener("input", () => setAnswer(Number(input.dataset.input), input.value.trim())));
  document.querySelectorAll("[data-select]").forEach((select) => select.addEventListener("change", () => setAnswer(Number(select.dataset.select), select.value)));
  document.querySelectorAll("[data-part4-radio]").forEach((input) => {
    input.addEventListener("change", () => {
      const [number, value] = input.dataset.part4Radio.split(":");
      setAnswer(Number(number), value);
      render();
    });
  });
  document.querySelectorAll("[data-drag]").forEach((card) => {
    card.addEventListener("dragstart", () => draggedParagraph = card.dataset.drag);
    card.addEventListener("click", () => {
      selectedParagraph = selectedParagraph === card.dataset.drag ? null : card.dataset.drag;
      render();
    });
  });
  document.querySelectorAll("[data-inserted-drag]").forEach((paragraph) => {
    paragraph.addEventListener("dragstart", () => draggedParagraph = paragraph.dataset.insertedDrag);
  });
  document.querySelectorAll("[data-drop]").forEach((zone) => {
    zone.addEventListener("dragover", (event) => event.preventDefault());
    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      if (!draggedParagraph) return;
      const target = Number(zone.dataset.drop);
      Object.keys(appState.answers).forEach((k) => {
        if (appState.answers[k] === draggedParagraph) delete appState.answers[k];
      });
      setAnswer(target, draggedParagraph);
      draggedParagraph = null;
      selectedParagraph = null;
      render();
    });
    zone.addEventListener("click", () => {
      if (!selectedParagraph) return;
      const target = Number(zone.dataset.drop);
      Object.keys(appState.answers).forEach((k) => {
        if (appState.answers[k] === selectedParagraph) delete appState.answers[k];
      });
      setAnswer(target, selectedParagraph);
      selectedParagraph = null;
      render();
    });
  });
  document.querySelectorAll("[data-clear-drop]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      delete appState.answers[key(Number(button.dataset.clearDrop))];
      saveState();
      render();
    });
  });
  const timerButton = document.querySelector("[data-command='timer']");
  if (timerButton) timerButton.addEventListener("click", toggleTimer);
  const submitButton = document.querySelector("[data-command='submit']");
  if (submitButton) submitButton.addEventListener("click", showResults);
  const tryAgainButton = document.querySelector("[data-command='try-again']");
  if (tryAgainButton) tryAgainButton.addEventListener("click", () => resetPaper(appState.paper));
  const explanationsToggle = document.querySelector("[data-command='toggle-explanations']");
  if (explanationsToggle) explanationsToggle.addEventListener("click", () => {
    appState.showExplanations[appState.paper] = !appState.showExplanations[appState.paper];
    saveState();
    render();
  });
  const notesToggle = document.querySelector("[data-command='toggle-notes']");
  if (notesToggle) notesToggle.addEventListener("click", () => {
    appState.notesOpen[appState.paper] = !appState.notesOpen[appState.paper];
    saveState();
    render();
  });
  document.querySelectorAll("[data-notes]").forEach((textarea) => textarea.addEventListener("input", () => {
    appState.notes[textarea.dataset.notes] = textarea.value;
    saveState();
  }));
  document.querySelectorAll(".task-card").forEach((card) => {
    card.addEventListener("mouseup", saveSelectedHighlight);
    card.addEventListener("keyup", saveSelectedHighlight);
  });
}

function startPaper(paperId) {
  const paper = examData.papers.find((item) => item.id === paperId);
  appState.screen = "paper";
  appState.paper = paperId;
  appState.part = paper.parts[0].id;
  saveState();
  render();
}

function ensureTimer(paper) {
  if (!appState.seconds[paper.id]) appState.seconds[paper.id] = paper.duration * 60;
  if (paper.id === "reading" && appState.seconds[paper.id] === 75 * 60) appState.seconds[paper.id] = paper.duration * 60;
}

function toggleTimer() {
  appState.running = appState.running === appState.paper ? null : appState.paper;
  saveState();
  render();
}

setInterval(() => {
  if (!appState.running) return;
  appState.seconds[appState.running] = Math.max(0, (appState.seconds[appState.running] || 0) - 1);
  saveState();
  const node = document.querySelector("[data-time]");
  if (node && appState.running === appState.paper) node.textContent = formatTime(appState.seconds[appState.paper]);
}, 1000);

function showResults() {
  appState.submitted[appState.paper] = true;
  saveState();
  render();
  const panel = document.querySelector(".results-panel");
  if (panel) panel.scrollIntoView({ block: "start", behavior: "smooth" });
}

function resetPaper(paperId) {
  const paper = examData.papers.find((item) => item.id === paperId);
  Object.keys(appState.answers).forEach((item) => {
    if (item.startsWith(`${paperId}-`)) delete appState.answers[item];
  });
  Object.keys(appState.highlights).forEach((item) => {
    if (item.startsWith(`${paperId}-`)) delete appState.highlights[item];
  });
  appState.notes[paperId] = "";
  appState.notesOpen[paperId] = false;
  appState.showExplanations[paperId] = false;
  appState.submitted[paperId] = false;
  appState.seconds[paperId] = paper.duration * 60;
  if (appState.running === paperId) appState.running = null;
  appState.paper = paperId;
  appState.part = paper.parts[0].id;
  appState.screen = "paper";
  saveState();
  render();
}

function saveSelectedHighlight() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !appState.paper || !appState.part) return;
  const card = document.querySelector(".task-card");
  if (!card || !card.contains(selection.anchorNode) || !card.contains(selection.focusNode)) return;
  const startElement = selection.anchorNode.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection.anchorNode;
  if (startElement && startElement.closest("input, textarea, select, button")) return;
  const text = selection.toString().replace(/\s+/g, " ").trim();
  if (text.length < 2) return;
  const storageKey = `${appState.paper}-${appState.part}`;
  const existing = appState.highlights[storageKey] || [];
  if (!existing.includes(text)) {
    appState.highlights[storageKey] = existing.concat(text);
    saveState();
  }
  selection.removeAllRanges();
  render();
}

function applyStoredHighlights() {
  if (!appState.paper || !appState.part) return;
  const card = document.querySelector(".task-card");
  const items = (appState.highlights[`${appState.paper}-${appState.part}`] || [])
    .slice()
    .sort((a, b) => b.length - a.length);
  if (!card || !items.length) return;
  items.forEach((text) => highlightText(card, text));
}

function highlightText(root, text) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || !node.nodeValue.includes(text)) return NodeFilter.FILTER_REJECT;
      if (parent.closest("input, textarea, select, button, mark, .feedback-note")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const matches = [];
  while (walker.nextNode()) matches.push(walker.currentNode);
  matches.forEach((node) => {
    const fragment = document.createDocumentFragment();
    let rest = node.nodeValue;
    let index = rest.indexOf(text);
    while (index !== -1) {
      if (index > 0) fragment.appendChild(document.createTextNode(rest.slice(0, index)));
      const mark = document.createElement("mark");
      mark.className = "student-highlight";
      mark.textContent = text;
      fragment.appendChild(mark);
      rest = rest.slice(index + text.length);
      index = rest.indexOf(text);
    }
    if (rest) fragment.appendChild(document.createTextNode(rest));
    node.parentNode.replaceChild(fragment, node);
  });
}

function renderResultsPanel(paperId) {
  const results = calculatePaperResults(paperId);
  const paper = examData.papers.find((item) => item.id === paperId);
  const tryAgain = `<button class="try-again" data-command="try-again">Try again</button>`;
  const explanations = `<button class="explanations-toggle" data-command="toggle-explanations">${appState.showExplanations[paperId] ? "Hide explanations" : "Show explanations"}</button>`;
  return `
    <section class="results-panel">
      <div>
        <p>${paper.title} results</p>
        <h2>${results.headline}</h2>
      </div>
      <div class="score-grid">
        <span><b>${results.scoreLabel}</b>${paper.title}</span>
        <span><b>${results.percentage}%</b>Score</span>
        <span class="grade ${results.band}"><b>${results.grade}</b>Grade / 10</span>
      </div>
      <p class="score-comment">${results.comment}</p>
      <div class="results-actions">${explanations}${tryAgain}</div>
    </section>`;
}

function renderOverallResultsPanel() {
  const completed = ["reading", "listening"].filter((paperId) => isPaperSubmitted(paperId));
  if (!completed.length) {
    return `<section class="results-panel"><div><p>Overall results</p><h2>No completed papers yet</h2></div><p class="score-comment">Submit Reading or Listening first, then return here for a combined result.</p></section>`;
  }
  const scores = completed.map(scorePaper);
  const totalCorrect = scores.reduce((sum, item) => sum + item.correct, 0);
  const totalQuestions = scores.reduce((sum, item) => sum + item.total, 0);
  const result = finishScore(totalCorrect, totalQuestions);
  return `
    <section class="results-panel">
      <div><p>Overall results</p><h2>${totalCorrect}/${totalQuestions} correct</h2></div>
      <div class="score-grid">
        ${completed.map((paperId, index) => `<span><b>${scores[index].correct}/${scores[index].total}</b>${examData.papers.find((paper) => paper.id === paperId).title}</span>`).join("")}
        <span><b>${result.percentage}%</b>Overall</span>
        <span class="grade ${result.band}"><b>${result.grade}</b>Grade / 10</span>
      </div>
      <p class="score-comment">${result.comment}</p>
    </section>`;
}

function calculatePaperResults(paperId) {
  if (paperId === "reading") return calculateReadingResults();
  const score = scorePaper(paperId);
  return Object.assign({
    totalCorrect: score.correct,
    totalQuestions: score.total,
    headline: `${score.correct}/${score.total} correct`,
    scoreLabel: `${score.correct}/${score.total}`
  }, finishScore(score.correct, score.total));
}

function calculateReadingResults() {
  const questions = questionsForPaper("reading");
  const points = questions.reduce((sum, question) => sum + readingQuestionScore(question.number), 0);
  const max = questions.reduce((sum, question) => sum + readingQuestionMax(question.number), 0);
  return Object.assign({
    points,
    maxPoints: max,
    headline: `${points}/${max} points`,
    scoreLabel: `${points}/${max} points`
  }, finishScore(points, max));
}

function finishScore(totalCorrect, totalQuestions) {
  const grade = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) / 10 : 0;
  const percentage = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  return {
    percentage,
    grade: grade.toFixed(1),
    band: grade >= 6 ? "green" : grade >= 5 ? "yellow" : "red",
    comment: gradeComment(grade)
  };
}

function scorePaper(paperId) {
  const questions = questionsForPaper(paperId);
  const correct = questions.filter((question) => isCorrect(paperId, question.number)).length;
  return { correct, total: questions.length };
}

function readingQuestionScore(number) {
  if (number >= 25 && number <= 30) {
    return readingPart4Score(number);
  }
  return isCorrect("reading", number) ? readingQuestionMax(number) : 0;
}

function readingQuestionMax(number) {
  if (number >= 25 && number <= 30) return 2;
  if ((number >= 31 && number <= 46)) return 2;
  return 1;
}

function questionsForPaper(paperId) {
  const paper = examData.papers.find((item) => item.id === paperId);
  return paper.parts.flatMap((part) => collectQuestions(part));
}

function gradeComment(grade) {
  if (grade >= 9) return "Excellent work! Outstanding performance — you are clearly ready for this level.";
  if (grade >= 8) return "Very strong result! You’re doing really well, with only a few details to polish.";
  if (grade >= 7) return "Good job! You have a solid base and you’re moving in the right direction.";
  if (grade >= 6) return "Pass level. Well done — keep practising to make your answers more consistent.";
  if (grade >= 5) return "Almost there. You’re close, but you need a little more practice before feeling fully confident.";
  return "Don’t panic. This result shows what we need to work on. Keep going — mistakes are useful because they show us exactly where to improve.";
}

function feedbackClass(number) {
  if (!isPaperSubmitted(appState.paper)) return "";
  if (appState.paper === "reading" && number >= 25 && number <= 30) {
    const score = readingPart4Score(number);
    if (score === 2) return "is-correct";
    if (score === 1) return "is-partial";
    return "is-incorrect";
  }
  return isCorrect(appState.paper, number) ? "is-correct" : "is-incorrect";
}

function choiceFeedbackClass(number, value) {
  if (!isPaperSubmitted(appState.paper)) return "";
  const user = answer(number);
  const correct = correctAnswers(appState.paper, number);
  if (user === value && answerMatches(user, correct)) return "is-correct";
  if (user === value && !answerMatches(user, correct)) return "is-incorrect";
  if (!user && correct.some((item) => normalise(item) === normalise(value))) return "is-correct";
  return "";
}

function matrixCellClass(number, value) {
  if (!isPaperSubmitted(appState.paper)) return "";
  const user = answer(number);
  const correct = correctAnswers(appState.paper, number);
  if (user === value && answerMatches(user, correct)) return "is-correct";
  if (user === value && !answerMatches(user, correct)) return "is-incorrect";
  if (correct.some((item) => normalise(item) === normalise(value))) return "is-correct";
  return "";
}

function feedbackNote(number) {
  if (!isPaperSubmitted(appState.paper)) return "";
  if (appState.paper === "reading" && number >= 25 && number <= 30) {
    const score = readingPart4Score(number);
    const tone = score === 2 ? "correct" : score === 1 ? "partial" : "incorrect";
    const label = score === 2 ? "Correct — 2/2" : score === 1 ? "Partially correct — 1/2" : "Incorrect — 0/2";
    return `<div class="part4-feedback"><span class="feedback-note ${tone}">${label}</span><span class="part4-correct-answer">Correct answer: ${esc(formatPart4CorrectAnswer(number))}</span></div>`;
  }
  if (isCorrect(appState.paper, number)) return `<span class="feedback-note correct">Correct</span>`;
  return `<span class="feedback-note incorrect">Correct: ${esc(formatCorrectAnswers(appState.paper, number))}</span>`;
}

function renderMatrixFeedback(questions) {
  if (!isPaperSubmitted(appState.paper)) return "";
  const rows = questions.filter((question) => !isCorrect(appState.paper, question.number));
  if (!rows.length) return `<div class="matrix-feedback correct">All answers in this task are correct.</div>`;
  return `<div class="matrix-feedback incorrect">${rows.map((question) => `<span>Question ${question.number}: correct answer ${esc(formatCorrectAnswers(appState.paper, question.number))}</span>`).join("")}</div>`;
}

function renderMatrixExplanations(questions) {
  if (!shouldShowExplanations()) return "";
  return `<div class="matrix-explanations">${questions.map((question) => explanationBox(question.number)).join("")}</div>`;
}

function shouldShowExplanations() {
  return !!appState.paper && isPaperSubmitted(appState.paper) && !!appState.showExplanations[appState.paper];
}

function explanationBox(number) {
  if (!shouldShowExplanations()) return "";
  const text = examData.explanations && examData.explanations[`${appState.paper}-${number}`];
  if (!text) return "";
  return `<div class="explanation-box ${explanationTone(number)}"><b>Explanation</b><span>${esc(text)}</span></div>`;
}

function explanationTone(number) {
  if (appState.paper === "reading" && number >= 25 && number <= 30) {
    const score = readingPart4Score(number);
    if (score === 2) return "correct";
    if (score === 1) return "partial";
    return "incorrect";
  }
  return isCorrect(appState.paper, number) ? "correct" : "incorrect";
}

function isCorrect(paperId, number) {
  if (paperId === "reading" && number >= 25 && number <= 30) return readingPart4Score(number) === 2;
  return answerMatches(appState.answers[`${paperId}-${number}`], correctAnswers(paperId, number));
}

function correctAnswers(paperId, number) {
  const raw = examData.answerKey[`${paperId}-${number}`] || [];
  if (raw && !Array.isArray(raw) && raw.chunks) return expandChunkAnswers(raw.chunks);
  if (raw && !Array.isArray(raw) && raw.full) return raw.full;
  return Array.isArray(raw) ? raw : [raw];
}

function partialAnswers(paperId, number) {
  const raw = examData.answerKey[`${paperId}-${number}`] || [];
  return raw && !Array.isArray(raw) && raw.partial ? raw.partial : [];
}

function readingPart4Score(number) {
  const raw = examData.answerKey[`reading-${number}`];
  if (!raw || !raw.chunks) return answerMatches(appState.answers[`reading-${number}`], correctAnswers("reading", number)) ? 2 : 0;
  const user = normalise(appState.answers[`reading-${number}`]);
  if (!user) return 0;
  return raw.chunks.reduce((sum, chunk) => sum + (chunk.some((item) => user.includes(normalise(item))) ? 1 : 0), 0);
}

function expandChunkAnswers(chunks) {
  return chunks.reduce((acc, chunk) => {
    const next = [];
    acc.forEach((prefix) => {
      chunk.forEach((option) => next.push(`${prefix} ${option}`.trim()));
    });
    return next;
  }, [""]);
}

function answerMatches(userAnswer, acceptedAnswers) {
  if (!userAnswer) return false;
  const user = normalise(userAnswer);
  return acceptedAnswers.some((item) => normalise(item) === user);
}

function formatCorrectAnswers(paperId, number) {
  return correctAnswers(paperId, number).join(" / ");
}

function formatPart4CorrectAnswer(number) {
  const raw = examData.answerKey[`reading-${number}`];
  if (!raw || !raw.chunks) return formatCorrectAnswers("reading", number);
  return raw.chunks.map((chunk) => chunk.join(" / ")).join(" | ");
}

function isPaperSubmitted(paperId) {
  return !!(paperId && appState.submitted && appState.submitted[paperId]);
}

function collectQuestions(part) {
  if (part.questions) return part.questions;
  if (part.groups) return part.groups.flatMap((group) => group.questions);
  if (part.sets) return part.sets.flatMap((set) => set.questions);
  return [];
}

function progressText(paper) {
  const questions = paper.parts.flatMap(collectQuestions);
  const done = questions.filter((item) => appState.answers[`${paper.id}-${item.number}`]).length;
  return `${done}/${questions.length}`;
}

function updateProgress() {
  const node = document.querySelector("[data-progress]");
  if (node) node.textContent = progressText(currentPaper());
}

function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function labelFor(type) {
  return {
    multipleCloze: "A/B/C/D gaps",
    openCloze: "Text gaps",
    wordFormation: "Word formation",
    transformations: "Sentence transforms",
    splitReading: "Split reading",
    matching: "A-D matching",
    dragDrop: "Drag and drop",
    dropdownMatching: "Dropdowns",
    listeningChoice: "Audio choices",
    listeningText: "Audio gaps",
    listeningMultiMatch: "Audio matching"
  }[type] || "Task";
}

function normalise(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function esc(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll("\"", "&quot;");
}

render();
