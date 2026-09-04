'use strict';

const typingTexts = [
    {
        id: 'anthem', title: '애국가 1절', category: '대한민국 국가', language: 'KOREAN',
        segments: ['동해 물과 백두산이 마르고 닳도록', '하느님이 보우하사 우리나라 만세.', '무궁화 삼천리 화려 강산', '대한 사람, 대한으로 길이 보전하세.']
    },
    {
        id: 'korean-song', title: '별빛 산책', category: '한국어 창작 가사', language: 'KOREAN',
        segments: ['저녁 바람이 창가에 머물면', '작은 별 하나 마음에 내려와.', '천천히 걸어도 괜찮다고,', '오늘의 나를 조용히 안아 준다.']
    },
    {
        id: 'english-song', title: 'Bright Tomorrow', category: '영어 창작 가사', language: 'ENGLISH',
        segments: ['Morning light is on the window,', 'drawing golden lines.', 'Take another little step', 'and leave the doubt behind.', 'We can find a brighter day', 'in every word we write.']
    }
];

const STORAGE_KEY = 'typingGame.rankings.v1';
const ATTACK_DURATION_MS = 60000;

const state = {
    screen: 'home', mode: null, selectedTextId: null, startedAt: null, timerId: null,
    typedValue: '', lastCommittedValue: '', correctCount: 0, totalInputCount: 0,
    errorCount: 0, completedCycles: 0, segmentIndex: 0, awaitingNext: false,
    isRunning: false, isComposing: false,
    selectedRankingId: typingTexts[0].id
};

const elements = {
    screens: [...document.querySelectorAll('.screen')],
    textList: document.getElementById('textList'),
    selectionEyebrow: document.getElementById('selectionEyebrow'),
    selectionDescription: document.getElementById('selectionDescription'),
    practiceModeBadge: document.getElementById('practiceModeBadge'),
    practiceCategory: document.getElementById('practiceCategory'),
    practiceTitle: document.getElementById('practiceTitle'),
    timeLabel: document.getElementById('timeLabel'),
    timeValue: document.getElementById('timeValue'),
    cpmValue: document.getElementById('cpmValue'),
    accuracyValue: document.getElementById('accuracyValue'),
    progressBar: document.getElementById('progressBar'),
    targetText: document.getElementById('targetText'),
    typingInput: document.getElementById('typingInput'),
    practiceHint: document.getElementById('practiceHint'),
    resultScreen: document.getElementById('resultScreen'),
    resultEyebrow: document.getElementById('resultEyebrow'),
    resultTitle: document.getElementById('resultTitle'),
    resultSummary: document.getElementById('resultSummary'),
    primaryResultLabel: document.getElementById('primaryResultLabel'),
    primaryResultValue: document.getElementById('primaryResultValue'),
    newRecordBadge: document.getElementById('newRecordBadge'),
    resultCpm: document.getElementById('resultCpm'),
    resultAccuracy: document.getElementById('resultAccuracy'),
    resultErrors: document.getElementById('resultErrors'),
    rankingTabs: document.getElementById('rankingTabs'),
    rankingBody: document.getElementById('rankingBody'),
    emptyRanking: document.getElementById('emptyRanking'),
    toast: document.getElementById('toast')
};

function getSelectedText() {
    return typingTexts.find((item) => item.id === state.selectedTextId) || typingTexts[0];
}

function getFullText(item = getSelectedText()) {
    return item.segments.join(' ');
}

function getCurrentSegment() {
    return getSelectedText().segments[state.segmentIndex];
}

function getTotalLength(item = getSelectedText()) {
    return item.segments.reduce((total, segment) => total + segment.length, 0);
}

function showScreen(name) {
    state.screen = name;
    elements.screens.forEach((screen) => {
        const isActive = screen.id === `${name}Screen`;
        screen.classList.toggle('is-active', isActive);
        screen.setAttribute('aria-hidden', String(!isActive));
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectMode(mode) {
    state.mode = mode;
    const isMeasure = mode === 'measure';
    elements.selectionEyebrow.textContent = isMeasure ? 'TIME TRIAL · 시간 측정' : '60 SECOND · 타임 어택';
    elements.selectionDescription.textContent = isMeasure ? '처음부터 끝까지 정확하게 완주해 보세요.' : '60초 동안 최대한 많은 글자를 정확히 입력해 보세요.';
    renderTextChoices();
    showScreen('selection');
}

function renderTextChoices() {
    elements.textList.innerHTML = typingTexts.map((item, index) => `
        <button class="text-choice" type="button" data-text-id="${item.id}">
            <span class="choice-index">${String(index + 1).padStart(2, '0')}</span>
            <span class="choice-title"><strong>${item.title}</strong><span>${item.category}</span></span>
            <span class="choice-preview">${getFullText(item)}</span><span class="choice-meta">${getTotalLength(item)}자 · ${item.segments.length}구간</span>
            <span class="choice-go" aria-hidden="true">→</span>
        </button>`).join('');
}

function resetGameState() {
    stopTimer();
    Object.assign(state, { startedAt: null, typedValue: '', lastCommittedValue: '', correctCount: 0, totalInputCount: 0, errorCount: 0, completedCycles: 0, segmentIndex: 0, awaitingNext: false, isRunning: false, isComposing: false });
    elements.typingInput.value = '';
    elements.typingInput.disabled = false;
    elements.typingInput.classList.remove('input-error');
    elements.cpmValue.textContent = '0';
    elements.accuracyValue.textContent = '100';
    elements.progressBar.style.width = '0%';
}

function startPractice(textId) {
    state.selectedTextId = textId;
    resetGameState();
    const item = getSelectedText();
    const isMeasure = state.mode === 'measure';
    elements.practiceModeBadge.textContent = isMeasure ? '시간 측정' : '60초 타임 어택';
    updateSegmentMeta();
    elements.practiceTitle.textContent = item.title;
    elements.timeLabel.textContent = isMeasure ? '경과 시간' : '남은 시간';
    elements.timeValue.textContent = isMeasure ? '00:00.0' : '01:00.0';
    elements.practiceHint.textContent = '현재 구간을 정확히 입력한 뒤 Enter를 누르세요.';
    elements.typingInput.placeholder = '여기에 첫 글자를 입력하면 시작됩니다.';
    renderTypingProgress();
    showScreen('practice');
    window.setTimeout(() => elements.typingInput.focus(), 80);
}

function startTimer() {
    if (state.isRunning) return;
    state.isRunning = true;
    state.startedAt = Date.now();
    elements.typingInput.placeholder = '';
    state.timerId = window.setInterval(updateLiveStats, 100);
    updateLiveStats();
}

function stopTimer() {
    if (state.timerId !== null) { window.clearInterval(state.timerId); state.timerId = null; }
}

function getElapsedMs() { return state.startedAt ? Math.max(0, Date.now() - state.startedAt) : 0; }

function formatTime(milliseconds) {
    const safeMs = Math.max(0, milliseconds);
    const minutes = Math.floor(safeMs / 60000);
    const seconds = Math.floor((safeMs % 60000) / 1000);
    const tenths = Math.floor((safeMs % 1000) / 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

function getAccuracy() {
    if (state.totalInputCount === 0) return 100;
    return Math.max(0, ((state.totalInputCount - state.errorCount) / state.totalInputCount) * 100);
}

function getCpm(elapsedMs = getElapsedMs()) {
    if (elapsedMs <= 0) return 0;
    return Math.round((state.correctCount / elapsedMs) * 60000);
}

function updateLiveStats() {
    if (!state.isRunning) return;
    const elapsed = getElapsedMs();
    if (state.mode === 'attack') {
        const remaining = Math.max(0, ATTACK_DURATION_MS - elapsed);
        elements.timeValue.textContent = formatTime(remaining);
        if (remaining <= 0) { finishGame(ATTACK_DURATION_MS); return; }
    } else {
        elements.timeValue.textContent = formatTime(elapsed);
    }
    elements.cpmValue.textContent = String(getCpm(elapsed));
    elements.accuracyValue.textContent = String(Math.round(getAccuracy()));
    renderProgressBar();
}

function countNewInput(previous, current, target) {
    if (current.length <= previous.length) return;
    let prefixLength = 0;
    const commonLength = Math.min(previous.length, current.length);
    while (prefixLength < commonLength && previous[prefixLength] === current[prefixLength]) prefixLength += 1;
    const removedTailLength = previous.length - prefixLength;
    const addedEnd = Math.max(prefixLength, current.length - removedTailLength);
    const addedText = current.slice(prefixLength, addedEnd);
    [...addedText].forEach((character, offset) => {
        const position = prefixLength + offset;
        state.totalInputCount += 1;
        if (character === target[position]) state.correctCount += 1;
        else state.errorCount += 1;
    });
}

function processCommittedInput() {
    if (state.screen !== 'practice') return;
    const target = getCurrentSegment();
    let value = elements.typingInput.value;
    if (value.length > target.length) { value = value.slice(0, target.length); elements.typingInput.value = value; }
    if (value.length > 0 && !state.isRunning) startTimer();
    countNewInput(state.lastCommittedValue, value, target);
    state.lastCommittedValue = value;
    state.typedValue = value;
    state.awaitingNext = value === target;
    renderTypingProgress();
    updateLiveStats();
    const latestIndex = Math.max(0, value.length - 1);
    if (value && value[latestIndex] !== target[latestIndex]) flashInputError();
    elements.practiceHint.textContent = state.awaitingNext
        ? (state.segmentIndex === getSelectedText().segments.length - 1 && state.mode === 'measure' ? 'Enter를 누르면 기록 측정이 완료됩니다.' : '좋아요! Enter를 눌러 다음 구간으로 넘어가세요.')
        : '현재 구간을 정확히 입력한 뒤 Enter를 누르세요.';
}

function updateSegmentMeta() {
    const item = getSelectedText();
    elements.practiceCategory.textContent = `${item.language} · ${state.segmentIndex + 1}/${item.segments.length} 구간`;
}

function advanceSegment() {
    if (!state.awaitingNext) {
        flashInputError();
        showToast('현재 구간을 정확히 입력해 주세요.');
        return;
    }

    const item = getSelectedText();
    const isLastSegment = state.segmentIndex === item.segments.length - 1;
    if (isLastSegment && state.mode === 'measure') {
        finishGame(getElapsedMs());
        return;
    }

    if (isLastSegment) {
        state.completedCycles += 1;
        state.segmentIndex = 0;
        showToast(`${state.completedCycles}회 완주! 처음 구간부터 이어집니다.`);
    } else {
        state.segmentIndex += 1;
    }

    state.typedValue = '';
    state.lastCommittedValue = '';
    state.awaitingNext = false;
    elements.typingInput.value = '';
    elements.practiceHint.textContent = '현재 구간을 정확히 입력한 뒤 Enter를 누르세요.';
    updateSegmentMeta();
    renderTypingProgress();
}

function renderProgressBar() {
    const item = getSelectedText();
    const completedLength = item.segments.slice(0, state.segmentIndex).reduce((total, segment) => total + segment.length, 0);
    const progress = state.mode === 'attack' ? Math.min(100, (getElapsedMs() / ATTACK_DURATION_MS) * 100) : ((completedLength + state.typedValue.length) / getTotalLength(item)) * 100;
    elements.progressBar.style.width = `${progress}%`;
}

function renderTypingProgress() {
    const target = getCurrentSegment();
    const value = state.typedValue;
    elements.targetText.innerHTML = [...target].map((character, index) => {
        let className = 'target-char';
        if (index < value.length) className += value[index] === character ? ' correct' : ' wrong';
        else if (index === value.length) className += ' current';
        const safeCharacter = character === ' ' ? '&nbsp;' : escapeHtml(character);
        return `<span class="${className}">${safeCharacter}</span>`;
    }).join('');
    renderProgressBar();
}

function escapeHtml(value) {
    const span = document.createElement('span');
    span.textContent = value;
    return span.innerHTML;
}

function flashInputError() {
    elements.typingInput.classList.remove('input-error');
    void elements.typingInput.offsetWidth;
    elements.typingInput.classList.add('input-error');
    window.setTimeout(() => elements.typingInput.classList.remove('input-error'), 220);
}

function finishGame(forcedElapsedMs) {
    if (!state.isRunning) return;
    const elapsedMs = forcedElapsedMs ?? getElapsedMs();
    state.isRunning = false;
    stopTimer();
    elements.typingInput.disabled = true;
    const result = { timeMs: elapsedMs, cpm: getCpm(elapsedMs), accuracy: Number(getAccuracy().toFixed(1)), errors: state.errorCount, correctCount: state.correctCount, playedAt: new Date().toISOString() };
    const isNewBest = state.mode === 'measure' ? saveRanking(result) : false;
    renderResult(result, isNewBest);
    showScreen('result');
    window.setTimeout(() => elements.resultScreen.focus(), 80);
}

function renderResult(result, isNewBest) {
    const isMeasure = state.mode === 'measure';
    elements.resultEyebrow.textContent = isMeasure ? 'TIME TRIAL COMPLETE' : 'TIME ATTACK COMPLETE';
    elements.resultTitle.textContent = isMeasure ? '문장을 완주했어요!' : '60초 도전 완료!';
    elements.resultSummary.textContent = isMeasure ? `${getSelectedText().title} 기록이 이 기기에 저장되었습니다.` : `${state.completedCycles}회 완주하고 총 ${result.correctCount}타를 정확히 입력했습니다.`;
    elements.primaryResultLabel.textContent = isMeasure ? '완주 시간' : '정확하게 입력한 글자';
    elements.primaryResultValue.textContent = isMeasure ? formatTime(result.timeMs) : `${result.correctCount}타`;
    elements.newRecordBadge.hidden = !isNewBest;
    elements.resultCpm.textContent = String(result.cpm);
    elements.resultAccuracy.textContent = result.accuracy.toFixed(1);
    elements.resultErrors.textContent = String(result.errors);
}

function loadRankings() {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) { return {}; }
}

function writeRankings(rankings) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rankings)); return true; }
    catch (error) { showToast('기록을 저장할 수 없는 브라우저 환경입니다.'); return false; }
}

function saveRanking(result) {
    const rankings = loadRankings();
    const textId = state.selectedTextId;
    const previousBest = Array.isArray(rankings[textId]) && rankings[textId].length ? Math.min(...rankings[textId].map((record) => record.timeMs)) : Infinity;
    const safeResult = { timeMs: Math.max(1, Math.round(result.timeMs)), cpm: Math.max(0, Math.round(result.cpm)), accuracy: Math.min(100, Math.max(0, result.accuracy)), playedAt: result.playedAt };
    const records = Array.isArray(rankings[textId]) ? rankings[textId] : [];
    rankings[textId] = [...records, safeResult].filter(isValidRecord).sort((a, b) => a.timeMs - b.timeMs).slice(0, 10);
    const saved = writeRankings(rankings);
    return saved && safeResult.timeMs < previousBest;
}

function isValidRecord(record) {
    return record && Number.isFinite(record.timeMs) && record.timeMs > 0 && Number.isFinite(record.cpm) && Number.isFinite(record.accuracy) && typeof record.playedAt === 'string';
}

function openRankings() {
    renderRankingTabs();
    renderRankings(state.selectedRankingId);
    showScreen('ranking');
}

function renderRankingTabs() {
    elements.rankingTabs.innerHTML = typingTexts.map((item) => `<button class="ranking-tab" type="button" role="tab" data-ranking-id="${item.id}" aria-selected="${String(item.id === state.selectedRankingId)}">${item.title}</button>`).join('');
}

function renderRankings(textId) {
    state.selectedRankingId = textId;
    const rankings = loadRankings();
    const records = Array.isArray(rankings[textId]) ? rankings[textId].filter(isValidRecord) : [];
    elements.rankingTabs.querySelectorAll('.ranking-tab').forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.rankingId === textId)));
    elements.rankingBody.innerHTML = records.map((record, index) => `<tr><td><span class="rank-number ${index < 3 ? 'top' : ''}">${String(index + 1).padStart(2, '0')}</span></td><td>${formatTime(record.timeMs)}</td><td>${record.cpm} CPM</td><td>${Number(record.accuracy).toFixed(1)}%</td><td>${formatDate(record.playedAt)}</td></tr>`).join('');
    elements.emptyRanking.hidden = records.length > 0;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }).format(date);
}

function clearRankings() {
    const hasRecords = Object.values(loadRankings()).some((records) => Array.isArray(records) && records.length);
    if (!hasRecords) { showToast('초기화할 기록이 없습니다.'); return; }
    if (!window.confirm('저장된 시간 측정 기록을 모두 삭제할까요?')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (error) { /* 게임은 계속 이용할 수 있다. */ }
    renderRankings(state.selectedRankingId);
    showToast('모든 기록을 초기화했습니다.');
}

let toastTimer = null;
function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => elements.toast.classList.remove('is-visible'), 2200);
}

function leavePractice(destination) {
    if (state.isRunning && !window.confirm('진행 중인 연습을 종료하고 나갈까요?')) return;
    resetGameState();
    showScreen(destination);
}

function goHome() {
    if (state.screen === 'practice') { leavePractice('home'); return; }
    resetGameState();
    showScreen('home');
}

document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => selectMode(button.dataset.mode)));
document.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => state.screen === 'practice' ? leavePractice(button.dataset.back) : showScreen(button.dataset.back)));
document.getElementById('brandButton').addEventListener('click', goHome);
document.getElementById('rankingButton').addEventListener('click', openRankings);
document.getElementById('restartButton').addEventListener('click', () => startPractice(state.selectedTextId));
document.getElementById('retryButton').addEventListener('click', () => startPractice(state.selectedTextId));
document.getElementById('chooseAnotherButton').addEventListener('click', () => showScreen('selection'));
document.getElementById('clearRankingsButton').addEventListener('click', clearRankings);
elements.textList.addEventListener('click', (event) => { const choice = event.target.closest('[data-text-id]'); if (choice) startPractice(choice.dataset.textId); });
elements.rankingTabs.addEventListener('click', (event) => { const tab = event.target.closest('[data-ranking-id]'); if (tab) renderRankings(tab.dataset.rankingId); });

elements.typingInput.addEventListener('compositionstart', () => { state.isComposing = true; });
elements.typingInput.addEventListener('compositionend', () => { state.isComposing = false; processCommittedInput(); });
elements.typingInput.addEventListener('input', () => {
    if (!state.isComposing) processCommittedInput();
    else { state.typedValue = elements.typingInput.value.slice(0, getCurrentSegment().length); renderTypingProgress(); }
});
elements.typingInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || state.isComposing) return;
    event.preventDefault();
    advanceSegment();
});
elements.typingInput.addEventListener('paste', (event) => { event.preventDefault(); showToast('붙여넣기 대신 직접 입력해 주세요.'); });
elements.typingInput.addEventListener('drop', (event) => event.preventDefault());
document.addEventListener('visibilitychange', () => { if (!document.hidden && state.isRunning) updateLiveStats(); });
window.addEventListener('beforeunload', (event) => { if (state.isRunning) { event.preventDefault(); event.returnValue = ''; } });

showScreen('home');
