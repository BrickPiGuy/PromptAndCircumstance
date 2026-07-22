const slides = Array.from(document.querySelectorAll('.slide'));
const slideCounter = document.getElementById('slideCounter');
const progressBar = document.getElementById('progressBar');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const dotNav = document.getElementById('dotNav');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const overviewOverlay = document.getElementById('overviewOverlay');
const overviewList = document.getElementById('overviewList');
const overviewCloseBtn = document.getElementById('overviewCloseBtn');

let current = 0;
let touchStartX = 0;
let overviewOpen = false;

function buildDotNav() {
  slides.forEach((slide, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Go to slide ${index + 1}: ${slide.dataset.title || 'Untitled'}`);
    dot.addEventListener('click', () => goToSlide(index));
    dotNav.append(dot);
  });
}

function buildOverviewList() {
  if (!overviewList) return;

  overviewList.innerHTML = '';

  slides.forEach((slide, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'overview-item';
    item.setAttribute('aria-label', `Go to slide ${index + 1}: ${slide.dataset.title || 'Untitled'}`);
    item.addEventListener('click', () => {
      goToSlide(index);
      closeOverview();
    });

    item.innerHTML = `
      <span class="slide-number">${String(index + 1).padStart(2, '0')}</span>
      <span class="slide-name">${slide.dataset.title || 'Untitled'}</span>
      <span class="slide-summary">${slide.querySelector('h1, h2')?.textContent || 'Open this slide'}</span>
    `;

    overviewList.append(item);
  });
}

function updateOverviewUi() {
  if (!overviewOverlay || !overviewList) return;

  overviewOverlay.classList.toggle('is-open', overviewOpen);
  overviewOverlay.setAttribute('aria-hidden', overviewOpen ? 'false' : 'true');

  Array.from(overviewList.children).forEach((item, index) => {
    item.classList.toggle('is-current', index === current);
  });
}

function openOverview() {
  overviewOpen = true;
  updateOverviewUi();
  overviewCloseBtn?.focus();
}

function closeOverview() {
  overviewOpen = false;
  updateOverviewUi();
}

function toggleOverview() {
  if (overviewOpen) {
    closeOverview();
    return;
  }

  openOverview();
}

function updateUi() {
  slides.forEach((slide, index) => {
    slide.classList.toggle('active', index === current);
  });

  const total = slides.length;
  slideCounter.textContent = `${current + 1} / ${total}`;
  progressBar.style.width = `${((current + 1) / total) * 100}%`;

  prevBtn.disabled = current === 0 && !hasVisibleRevealItems();
  nextBtn.disabled = current === total - 1 && !hasHiddenRevealItems();

  Array.from(dotNav.children).forEach((dot, index) => {
    dot.classList.toggle('active', index === current);
  });

  updateOverviewUi();
}

function goToSlide(index) {
  current = Math.max(0, Math.min(index, slides.length - 1));
  updateUi();
}

function currentSlide() {
  return slides[current];
}

function getRevealItems(slide) {
  return Array.from(slide.querySelectorAll('.reveal-item'));
}

function hasHiddenRevealItems() {
  const reveals = getRevealItems(currentSlide());
  return reveals.some((item) => !item.classList.contains('is-visible'));
}

function hasVisibleRevealItems() {
  const reveals = getRevealItems(currentSlide());
  return reveals.some((item) => item.classList.contains('is-visible'));
}

function showNextReveal() {
  const reveals = getRevealItems(currentSlide());
  const next = reveals.find((item) => !item.classList.contains('is-visible'));
  if (!next) return false;
  next.classList.add('is-visible');
  return true;
}

function hideLastReveal() {
  const reveals = getRevealItems(currentSlide());
  const visible = reveals.filter((item) => item.classList.contains('is-visible'));
  if (visible.length <= 1) return false;
  visible[visible.length - 1].classList.remove('is-visible');
  return true;
}

function nextStep() {
  if (showNextReveal()) {
    updateUi();
    return;
  }
  if (current < slides.length - 1) {
    current += 1;
    updateUi();
  }
}

function prevStep() {
  if (hideLastReveal()) {
    updateUi();
    return;
  }
  if (current > 0) {
    current -= 1;
    updateUi();
  }
}

function evaluatePrompt(text) {
  const normalized = text.trim().toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);

  const checks = {
    task: /(explain|create|write|summarize|compare|analyze|generate|review|improve)/.test(normalized) ? 20 : 5,
    audience: /(for|to)\s+(students?|beginners?|developers?|executives?|customers?|children|team)/.test(normalized) ? 20 : 4,
    context: /(about|on|regarding|context|because|project|class|workshop)/.test(normalized) ? 20 : 4,
    structure: /(table|bullet|json|markdown|outline|steps?|numbered|format)/.test(normalized) ? 20 : 4,
    success: /(under|less than|words|tone|examples?|avoid|include|must|criteria|concise|professional)/.test(normalized) ? 20 : 4
  };

  if (words.length > 24) checks.context = Math.min(20, checks.context + 4);
  if (words.length > 14) checks.task = Math.min(20, checks.task + 2);

  return checks;
}

function renderScores(scores) {
  const scoreBoard = document.getElementById('scoreBoard');
  const labels = {
    task: 'Task',
    audience: 'Audience',
    context: 'Context',
    structure: 'Structure',
    success: 'Success'
  };

  const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const rows = Object.entries(scores)
    .map(([key, value]) => {
      return `
        <div class="score-row">
          <span>${labels[key]}</span>
          <div class="score-bar"><div class="score-fill" style="width:${(value / 20) * 100}%"></div></div>
          <strong>${value}</strong>
        </div>
      `;
    })
    .join('');

  const summary = `<p><strong>Total: ${total} / 100</strong> ${total >= 80 ? 'Excellent prompt foundation.' : 'Try adding missing details for a stronger prompt.'}</p>`;
  scoreBoard.innerHTML = rows + summary;
}

function bindInteractions() {
  prevBtn.addEventListener('click', prevStep);
  nextBtn.addEventListener('click', nextStep);

  document.addEventListener('keydown', (event) => {
    const activeTag = document.activeElement?.tagName;
    if (activeTag === 'TEXTAREA' || activeTag === 'INPUT') return;

    if (event.key === 'Escape' && overviewOpen) {
      event.preventDefault();
      closeOverview();
      return;
    }

    if (event.key.toLowerCase() === 'o') {
      event.preventDefault();
      toggleOverview();
      return;
    }

    if (overviewOpen) return;

    if (['ArrowRight', 'PageDown', ' '].includes(event.key)) {
      event.preventDefault();
      nextStep();
    }

    if (['ArrowLeft', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      prevStep();
    }

    if (event.key === 'Home') {
      event.preventDefault();
      goToSlide(0);
    }

    if (event.key === 'End') {
      event.preventDefault();
      goToSlide(slides.length - 1);
    }
  });

  document.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].screenX;
  });

  document.addEventListener('touchend', (event) => {
    const delta = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(delta) < 55) return;
    if (delta < 0) nextStep();
    if (delta > 0) prevStep();
  });

  const scorePromptBtn = document.getElementById('scorePromptBtn');
  const promptInput = document.getElementById('promptInput');

  let scoreDebounceTimer = null;

  function runEvaluation() {
    const scores = evaluatePrompt(promptInput.value || '');
    renderScores(scores);
  }

  scorePromptBtn?.addEventListener('click', runEvaluation);

  promptInput?.addEventListener('input', () => {
    clearTimeout(scoreDebounceTimer);
    const scoreBoard = document.getElementById('scoreBoard');
    if (!scoreBoard || scoreBoard.innerHTML === '') return;
    scoreDebounceTimer = setTimeout(runEvaluation, 400);
  });

  document.querySelectorAll('.reveal-answer-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.mistake-card');
      const answer = card?.querySelector('.answer');
      if (!card || !answer) return;
      answer.textContent = card.dataset.answer || '';
    });
  });

  overviewOverlay?.addEventListener('click', (event) => {
    if (event.target?.hasAttribute?.('data-overview-close')) {
      closeOverview();
    }
  });

  overviewCloseBtn?.addEventListener('click', closeOverview);

  fullscreenBtn?.addEventListener('click', async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      fullscreenBtn.textContent = 'Exit Fullscreen';
      return;
    }

    await document.exitFullscreen();
    fullscreenBtn.textContent = 'Fullscreen';
  });
}

buildDotNav();
buildOverviewList();
bindInteractions();
updateUi();
