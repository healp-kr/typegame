/* =========================================================
   LyricType - 가사 타이핑 게임
   ---------------------------------------------------------
   기존 "한 글자 / 단어" 타이핑 게임을 "노래 가사 문장" 타이핑으로 개편.

   [주요 변경점]
   - keydown 한 글자 판정 -> input 요소 기반 문장 판정
     (keydown 방식은 한글 IME 조합 중인 글자를 비교할 수 없어서 한글이 불가능했음)
   - 곡 선택 / 플레이 / 결과 3개 화면 전환
   - 흩어져 있던 전역 변수를 state 객체 하나로 통합
   - 인라인 onclick 제거, addEventListener 로 일원화
   ========================================================= */
'use strict';

/* =========================================================
   1. 노래 데이터
   ---------------------------------------------------------
   lines 배열의 한 줄이 한 문제가 된다.
   여기 기본 수록곡은 저작권이 만료된 전래/고전 곡과 직접 쓴 창작 가사로만 채웠다.
   좋아하는 최신곡은 화면의 [+ 내 노래 추가] 버튼으로 직접 넣어서 플레이할 수 있다.
   ========================================================= */
const BUILTIN_SONGS = [
    {
        id: 'arirang',
        title: '아리랑',
        artist: '한국 민요',
        emoji: '⛰️',
        color: '#e35d6a',
        lang: 'ko',
        difficulty: '쉬움',
        timeLimit: 45,
        lines: [
            '아리랑 아리랑 아라리요',
            '아리랑 고개로 넘어간다',
            '나를 버리고 가시는 님은',
            '십리도 못가서 발병난다'
        ]
    },
    {
        id: 'twinkle',
        title: 'Twinkle, Twinkle, Little Star',
        artist: 'Jane Taylor (1806)',
        emoji: '✨',
        color: '#4f7cff',
        lang: 'en',
        difficulty: '쉬움',
        timeLimit: 55,
        lines: [
            'Twinkle, twinkle, little star,',
            'How I wonder what you are!',
            'Up above the world so high,',
            'Like a diamond in the sky.'
        ]
    },
    {
        id: 'firstcommit',
        title: '첫 커밋',
        artist: 'LyricType 창작곡',
        emoji: '🌱',
        color: '#1db954',
        lang: 'ko',
        difficulty: '보통',
        timeLimit: 80,
        lines: [
            '빈 폴더 하나에서 시작했어',
            '이름 짓는 데만 삼십 분이 걸렸지',
            '무엇을 만들지는 아직 몰라도',
            '오늘은 여기까지만 남겨두기로 해',
            '작게 적어둔 한 줄의 메시지',
            '언젠가 돌아와서 웃게 될 자리'
        ]
    },
    {
        id: 'amazing',
        title: 'Amazing Grace',
        artist: 'John Newton (1779)',
        emoji: '🕊️',
        color: '#b07cff',
        lang: 'en',
        difficulty: '보통',
        timeLimit: 65,
        lines: [
            'Amazing grace, how sweet the sound,',
            'That saved a wretch like me.',
            'I once was lost, but now am found,',
            'Was blind, but now I see.'
        ]
    },
    {
        id: 'auldlang',
        title: 'Auld Lang Syne',
        artist: 'Robert Burns (1788)',
        emoji: '🥂',
        color: '#f0a53d',
        lang: 'en',
        difficulty: '보통',
        timeLimit: 70,
        lines: [
            'Should auld acquaintance be forgot,',
            'And never brought to mind?',
            'Should auld acquaintance be forgot,',
            'And auld lang syne?',
            'For auld lang syne, my dear,',
            "We'll take a cup of kindness yet."
        ]
    },
    {
        id: 'threeam',
        title: '새벽 세 시의 코드',
        artist: 'LyricType 창작곡',
        emoji: '🌙',
        color: '#2f6fd0',
        lang: 'ko',
        difficulty: '어려움',
        timeLimit: 110,
        lines: [
            '새벽 세 시 모니터만 켜져 있어',
            '커서는 깜빡이고 나도 깜빡여',
            '어제 쓴 코드가 낯설게 느껴져',
            '주석 한 줄 없이 나를 바라봐',
            '콘솔에 찍힌 건 undefined 하나',
            '그래도 한 줄만 더 써보기로 해',
            '빨간 밑줄이 사라지는 그 순간',
            '나는 조금 더 나은 사람이 돼'
        ]
    },
    {
        id: 'midnight',
        title: 'Midnight Commit',
        artist: 'LyricType 창작곡',
        emoji: '☕',
        color: '#8c6d4f',
        lang: 'en',
        difficulty: '어려움',
        timeLimit: 115,
        lines: [
            'Coffee going cold beside the keyboard,',
            'Every tab is open, none of them are read.',
            'I have been here since the sun went down,',
            'Chasing one small bug around my head.',
            'Nothing works and then it works,',
            'And I will never really know the reason why.',
            'Push it to the branch and let it go,',
            'Say good night, my little midnight commit.'
        ]
    }
];

/* 사용자가 추가한 곡에 랜덤으로 붙일 커버 이모지 / 색 */
const CUSTOM_EMOJIS = ['🎧', '🎤', '💿', '🎹', '🔥', '🌊', '🍀', '🌸', '⚡', '🪐'];
const CUSTOM_COLORS = ['#1db954', '#4f7cff', '#e35d6a', '#b07cff', '#f0a53d', '#12b5a4'];

/* =========================================================
   2. 점수 / 저장소 설정
   ========================================================= */
const POINT_PER_CHAR = 10;   // 맞은 글자당 점수
const PENALTY_PER_CHAR = 5;  // 틀린 글자당 감점
const LINE_BONUS = 50;       // 한 줄 넘길 때마다
const PERFECT_BONUS = 100;   // 오타 없이 넘겼을 때 추가
const TIME_BONUS = 3;        // 도전 모드: 한 줄 완료 시 더해주는 초
const TIME_BONUS_PERFECT = 2; // 오타 없이 넘겼을 때 추가로 더해주는 초
const MAX_COMBO_MULTI = 10;  // 콤보 배수 상한 (1.0 ~ 2.0배)

const STORE_CUSTOM = 'lyricType.customSongs';
const STORE_BEST = 'lyricType.bestRecords';

/* =========================================================
   3. 게임 상태
   ========================================================= */
const state = {
    mode: 'challenge',   // 'challenge' | 'practice'
    song: null,
    lineIndex: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    typedChars: 0,       // 확정된 총 입력 글자 수
    correctChars: 0,     // 그중 맞은 글자 수
    perfectLines: 0,
    startTs: 0,
    deadline: 0,         // 도전 모드 종료 시각(ms)
    elapsed: 0,          // 초
    running: false,
    composing: false,    // 한글 IME 조합 중인지
    lastSubmitTs: 0,     // 마지막으로 줄을 확정한 시각 (연속 확정 방지용)
    timerId: null,
    countdownId: null
};

/* 줄 확정 직후 짧은 시간 동안은 추가 확정을 막는다.
   IME 커밋용 Enter와 자동 진행이 겹쳐서 두 줄이 한꺼번에 넘어가는 것을 방지. */
const SUBMIT_LOCK_MS = 150;

/* =========================================================
   4. DOM 참조
   ========================================================= */
const $ = (id) => document.getElementById(id);

const el = {
    screens: {
        select: $('screenSelect'),
        play: $('screenPlay'),
        result: $('screenResult')
    },
    songGrid: $('songGrid'),
    modeToggle: $('modeToggle'),
    modeDesc: $('modeDesc'),
    addSongBtn: $('addSongBtn'),

    backBtn: $('backBtn'),
    playCover: $('playCover'),
    playLabel: $('playLabel'),
    playTitle: $('playTitle'),
    playArtist: $('playArtist'),

    linePrev: $('linePrev'),
    lineCurrent: $('lineCurrent'),
    lineNext: $('lineNext'),
    typeInput: $('typeInput'),

    countdown: $('countdown'),
    countdownNum: $('countdownNum'),

    nowbar: $('nowbar'),
    barCover: $('barCover'),
    barTitle: $('barTitle'),
    barArtist: $('barArtist'),
    barLine: $('barLine'),
    barTime: $('barTime'),
    barCombo: $('barCombo'),
    barScore: $('barScore'),
    progressFill: $('progressFill'),

    resultGrade: $('resultGrade'),
    resultMsg: $('resultMsg'),
    resultSong: $('resultSong'),
    bestBadge: $('bestBadge'),
    statScore: $('statScore'),
    statAcc: $('statAcc'),
    statCpm: $('statCpm'),
    statCombo: $('statCombo'),
    statLines: $('statLines'),
    statTime: $('statTime'),
    prevBest: $('prevBest'),
    retryBtn: $('retryBtn'),
    toListBtn: $('toListBtn'),

    modal: $('songModal'),
    newTitle: $('newTitle'),
    newArtist: $('newArtist'),
    newLyrics: $('newLyrics'),
    lineCounter: $('lineCounter'),
    modalError: $('modalError'),
    saveSongBtn: $('saveSongBtn')
};

/* =========================================================
   5. 저장소 (localStorage)
   ---------------------------------------------------------
   사파리 프라이빗 모드 등에서 예외가 날 수 있어 전부 try/catch.
   ========================================================= */
function readStore(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        return fallback;
    }
}

function writeStore(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        /* 저장 못 해도 게임 자체는 계속 굴러가야 하므로 무시 */
    }
}

function getCustomSongs() {
    const list = readStore(STORE_CUSTOM, []);
    return Array.isArray(list) ? list : [];
}

function getAllSongs() {
    return BUILTIN_SONGS.concat(getCustomSongs());
}

function findSong(id) {
    return getAllSongs().find((s) => s.id === id) || null;
}

function bestKey(songId, mode) {
    return songId + ':' + mode;
}

function getBest(songId, mode) {
    const all = readStore(STORE_BEST, {});
    return all[bestKey(songId, mode)] || null;
}

function saveBest(songId, mode, record) {
    const all = readStore(STORE_BEST, {});
    all[bestKey(songId, mode)] = record;
    writeStore(STORE_BEST, all);
}

/* =========================================================
   6. 화면 전환
   ========================================================= */
function showScreen(name) {
    Object.keys(el.screens).forEach((key) => {
        el.screens[key].classList.toggle('is-active', key === name);
    });
    el.nowbar.classList.toggle('is-on', name === 'play');
}

/* =========================================================
   7. 곡 선택 화면
   ========================================================= */
const MODE_DESC = {
    challenge: '제한 시간 안에 완주하세요. 한 줄 넘길 때마다 시간이 조금씩 늘어납니다.',
    practice: '시간 제한 없이 끝까지. 정확도와 타수만 기록합니다.'
};

function coverStyle(song) {
    return 'background-image: linear-gradient(145deg, ' + song.color + ', #101010);';
}

function renderSongGrid() {
    const songs = getAllSongs();

    el.songGrid.innerHTML = songs.map((song) => {
        const best = getBest(song.id, state.mode);
        const bestText = best
            ? '<span class="card-best">최고 ' + best.score.toLocaleString() + '점 · ' + best.accuracy + '%</span>'
            : '<span class="card-best is-empty">기록 없음</span>';
        const removeBtn = song.custom
            ? '<button type="button" class="card-remove" data-remove="' + song.id + '" title="삭제">&times;</button>'
            : '';

        return (
            '<article class="song-card" data-play="' + song.id + '" tabindex="0" role="button">' +
            removeBtn +
            '<div class="cover" style="' + coverStyle(song) + '"><span>' + song.emoji + '</span>' +
            '<button type="button" class="play-fab" tabindex="-1" aria-hidden="true">&#9654;</button></div>' +
            '<h3 class="card-title">' + escapeHtml(song.title) + '</h3>' +
            '<p class="card-artist">' + escapeHtml(song.artist) + '</p>' +
            '<div class="card-tags">' +
            '<span class="tag">' + song.difficulty + '</span>' +
            '<span class="tag">' + song.lines.length + '줄</span>' +
            '<span class="tag">' + (song.lang === 'ko' ? '한글' : 'ENG') + '</span>' +
            '</div>' +
            bestText +
            '</article>'
        );
    }).join('');
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* =========================================================
   8. 게임 시작 / 카운트다운
   ========================================================= */
function selectSong(songId) {
    const song = findSong(songId);
    if (!song) return;

    state.song = song;
    resetRunStats();

    el.playCover.setAttribute('style', coverStyle(song));
    el.playCover.innerHTML = '<span>' + song.emoji + '</span>';
    el.playTitle.textContent = song.title;
    el.playArtist.textContent = song.artist;
    el.playLabel.textContent = state.mode === 'challenge' ? '도전 모드' : '연습 모드';

    el.barCover.setAttribute('style', coverStyle(song));
    el.barCover.innerHTML = '<span>' + song.emoji + '</span>';
    el.barTitle.textContent = song.title;
    el.barArtist.textContent = song.artist;

    el.linePrev.textContent = '';
    el.lineNext.textContent = '';
    el.lineCurrent.innerHTML = '';
    el.typeInput.value = '';
    el.typeInput.disabled = true;

    showScreen('play');
    updateHud();
    runCountdown();
}

function resetRunStats() {
    state.lineIndex = 0;
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.typedChars = 0;
    state.correctChars = 0;
    state.perfectLines = 0;
    state.elapsed = 0;
    state.composing = false;
    state.lastSubmitTs = 0;
}

function runCountdown() {
    clearTimers();
    let n = 3;
    el.countdown.classList.add('is-on');
    el.countdownNum.textContent = n;
    el.countdownNum.classList.add('pop');

    state.countdownId = setInterval(() => {
        n -= 1;
        if (n === 0) {
            el.countdownNum.textContent = 'START';
        } else if (n < 0) {
            clearInterval(state.countdownId);
            state.countdownId = null;
            el.countdown.classList.remove('is-on');
            beginPlay();
            return;
        } else {
            el.countdownNum.textContent = n;
        }
        /* 애니메이션 재시작 */
        el.countdownNum.classList.remove('pop');
        void el.countdownNum.offsetWidth;
        el.countdownNum.classList.add('pop');
    }, 800);
}

function beginPlay() {
    state.running = true;
    state.startTs = Date.now();
    state.deadline = state.startTs + state.song.timeLimit * 1000;

    el.typeInput.disabled = false;
    el.typeInput.value = '';
    el.typeInput.focus();

    renderLine();
    updateHud();

    state.timerId = setInterval(tick, 200);
}

function clearTimers() {
    if (state.timerId) clearInterval(state.timerId);
    if (state.countdownId) clearInterval(state.countdownId);
    state.timerId = null;
    state.countdownId = null;
}

/* =========================================================
   9. 가사 렌더링
   ---------------------------------------------------------
   목표 문장을 글자 단위로 쪼개서 상태별 색을 입힌다.
     ok       : 맞은 글자
     bad      : 틀린 글자
     composing: 한글 조합 중인 글자 (아직 판정하지 않음)
     cursor   : 지금 입력해야 할 위치
     extra    : 목표보다 길게 친 글자
   ========================================================= */
function currentLine() {
    return state.song.lines[state.lineIndex] || '';
}

function renderLine() {
    const target = currentLine();
    const typed = el.typeInput.value;
    /* 조합 중이면 마지막 글자는 아직 완성 전이므로 오답 판정을 미룬다 */
    const judgeLen = state.composing ? Math.max(0, typed.length - 1) : typed.length;

    const frag = document.createDocumentFragment();

    for (let i = 0; i < target.length; i++) {
        const span = document.createElement('span');
        span.className = 'ch';
        span.textContent = target[i];

        if (i < judgeLen) {
            span.classList.add(typed[i] === target[i] ? 'ok' : 'bad');
        } else if (i < typed.length) {
            span.classList.add('composing');
        } else if (i === typed.length) {
            span.classList.add('cursor');
        }
        if (target[i] === ' ') span.classList.add('is-space');
        frag.appendChild(span);
    }

    /* 목표 문장보다 길게 친 부분 */
    for (let i = target.length; i < typed.length; i++) {
        const span = document.createElement('span');
        span.className = 'ch extra';
        span.textContent = typed[i] === ' ' ? '·' : typed[i];
        frag.appendChild(span);
    }

    el.lineCurrent.innerHTML = '';
    el.lineCurrent.appendChild(frag);

    el.linePrev.textContent = state.lineIndex > 0 ? state.song.lines[state.lineIndex - 1] : '';
    el.lineNext.textContent = state.song.lines[state.lineIndex + 1] || '';
}

/* =========================================================
   10. 입력 처리
   ========================================================= */
function handleInput() {
    if (!state.running) return;

    renderLine();

    /* 목표와 완전히 일치하면 자동으로 다음 줄로 넘어간다.
       단 조합이 끝나지 않았으면 넘기지 않는다.
       (목표가 '가'인데 '강'을 치는 중이면 중간 상태가 '가'로 일치해버리기 때문) */
    if (!state.composing && el.typeInput.value === currentLine()) {
        submitLine();
    }
}

function handleKeyDown(event) {
    /* Esc는 document 레벨에서 한 번만 처리한다 (bindEvents 참고) */
    if (event.key !== 'Enter' || !state.running || event.isComposing) return;

    event.preventDefault();

    /* 빈 입력으로는 줄을 넘기지 않는다.
       한글 조합을 확정하려고 누른 Enter가 compositionend -> 자동 진행을 일으킨 뒤
       한 번 더 눌리면서 빈 줄을 그대로 확정해버리는 문제를 막는다. */
    if (el.typeInput.value.length === 0) return;

    submitLine();
}

/* 한 줄 확정 */
function submitLine() {
    if (!state.running) return;

    /* 브라우저마다 compositionend / input / keydown 순서가 달라서
       한 번의 확정 동작이 submitLine 을 두 번 호출하는 경우가 있다. 그때 두 줄이 한꺼번에 넘어간다. */
    const now = Date.now();
    if (now - state.lastSubmitTs < SUBMIT_LOCK_MS) return;
    state.lastSubmitTs = now;

    const target = currentLine();
    const typed = el.typeInput.value;
    const len = Math.max(target.length, typed.length);

    let correct = 0;
    for (let i = 0; i < len; i++) {
        if (typed[i] === target[i]) correct++;
    }
    const wrong = len - correct;
    const isPerfect = wrong === 0 && typed.length > 0;

    state.typedChars += len;
    state.correctChars += correct;

    /* 콤보는 오타 없이 넘겼을 때만 이어진다 */
    if (isPerfect) {
        state.combo += 1;
        state.perfectLines += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
    } else {
        state.combo = 0;
    }

    const multiplier = 1 + Math.min(state.combo, MAX_COMBO_MULTI) * 0.1;
    let gained = correct * POINT_PER_CHAR - wrong * PENALTY_PER_CHAR + LINE_BONUS;
    if (isPerfect) gained += PERFECT_BONUS;
    state.score = Math.max(0, state.score + Math.round(gained * multiplier));

    /* 도전 모드는 잘 칠수록 시간이 늘어난다 */
    if (state.mode === 'challenge') {
        state.deadline += TIME_BONUS * 1000;
        if (isPerfect) state.deadline += TIME_BONUS_PERFECT * 1000;
    }

    flashLine(isPerfect ? 'flash-good' : 'flash-bad');

    state.lineIndex += 1;
    el.typeInput.value = '';

    if (state.lineIndex >= state.song.lines.length) {
        finishGame(true);
        return;
    }

    renderLine();
    updateHud();
}

function flashLine(className) {
    el.lineCurrent.classList.add(className);
    setTimeout(() => el.lineCurrent.classList.remove(className), 260);
}

/* =========================================================
   11. 타이머 / HUD
   ========================================================= */
function tick() {
    if (!state.running) return;

    const now = Date.now();
    state.elapsed = (now - state.startTs) / 1000;

    if (state.mode === 'challenge' && now >= state.deadline) {
        finishGame(false);
        return;
    }
    updateHud();
}

function formatTime(sec) {
    const s = Math.max(0, Math.round(sec));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function updateHud() {
    if (!state.song) return;

    const total = state.song.lines.length;
    const done = Math.min(state.lineIndex, total);

    el.barLine.textContent = done + ' / ' + total;
    el.progressFill.style.width = (total ? (done / total) * 100 : 0) + '%';
    el.barScore.textContent = state.score.toLocaleString();

    el.barCombo.textContent = 'COMBO ' + state.combo;
    el.barCombo.classList.toggle('is-hot', state.combo >= 3);

    if (state.mode === 'challenge') {
        const left = Math.max(0, (state.deadline - Date.now()) / 1000);
        el.barTime.textContent = formatTime(left);
        el.barTime.classList.toggle('is-urgent', left <= 10);
    } else {
        el.barTime.textContent = formatTime(state.elapsed);
        el.barTime.classList.remove('is-urgent');
    }
}

/* =========================================================
   12. 종료 / 결과
   ========================================================= */
function quitToList() {
    state.running = false;
    clearTimers();
    el.typeInput.value = '';
    el.typeInput.disabled = true;
    el.countdown.classList.remove('is-on');
    renderSongGrid();
    showScreen('select');
}

function calcAccuracy() {
    if (state.typedChars === 0) return 0;
    return Math.round((state.correctChars / state.typedChars) * 1000) / 10;
}

function calcCpm() {
    const minutes = state.elapsed / 60;
    if (minutes <= 0) return 0;
    return Math.round(state.correctChars / minutes);
}

function calcGrade(accuracy, completed) {
    const order = ['S', 'A', 'B', 'C', 'D'];
    let idx = accuracy >= 98 ? 0
        : accuracy >= 94 ? 1
            : accuracy >= 88 ? 2
                : accuracy >= 78 ? 3 : 4;
    /* 완주하지 못했으면 한 등급 강등 */
    if (!completed) idx = Math.min(idx + 1, order.length - 1);
    return order[idx];
}

const GRADE_MSG = {
    S: '완벽합니다. 이 노래는 이제 당신 겁니다.',
    A: '거의 다 왔어요. 오타 몇 개만 더 줄이면 S입니다.',
    B: '안정적인 연주였어요. 조금만 더 정확하게!',
    C: '리듬은 탔는데 손이 살짝 미끄러졌네요.',
    D: '천천히 정확하게부터 다시 해봐요.'
};

function finishGame(completed) {
    state.running = false;
    clearTimers();
    el.typeInput.disabled = true;
    el.typeInput.value = '';

    /* 마지막 줄을 넘기자마자 끝나는 경우 tick이 돌지 않았을 수 있으므로 여기서 다시 계산 */
    state.elapsed = (Date.now() - state.startTs) / 1000;

    const accuracy = calcAccuracy();
    const cpm = calcCpm();
    const grade = calcGrade(accuracy, completed);
    const total = state.song.lines.length;
    const done = Math.min(state.lineIndex, total);

    el.resultGrade.textContent = grade;
    el.resultGrade.setAttribute('data-grade', grade);
    el.resultMsg.textContent = completed
        ? GRADE_MSG[grade]
        : '시간이 다 됐어요! ' + GRADE_MSG[grade];
    el.resultSong.textContent = state.song.title + ' · ' + state.song.artist +
        ' · ' + (state.mode === 'challenge' ? '도전 모드' : '연습 모드');

    el.statScore.textContent = state.score.toLocaleString();
    el.statAcc.textContent = accuracy + '%';
    el.statCpm.textContent = cpm.toLocaleString();
    el.statCombo.textContent = state.bestCombo;
    el.statLines.textContent = done + ' / ' + total;
    el.statTime.textContent = Math.round(state.elapsed) + '초';

    /* 최고 기록 갱신 */
    const prev = getBest(state.song.id, state.mode);
    const isNewBest = !prev || state.score > prev.score;
    if (isNewBest) {
        saveBest(state.song.id, state.mode, { score: state.score, accuracy: accuracy, cpm: cpm });
    }
    el.bestBadge.hidden = !isNewBest;
    el.prevBest.textContent = prev
        ? '이전 최고 기록 ' + prev.score.toLocaleString() + '점 · 정확도 ' + prev.accuracy + '%'
        : '';

    renderSongGrid();
    showScreen('result');
}

/* =========================================================
   13. 내 노래 추가 모달
   ========================================================= */
function openModal() {
    el.modal.hidden = false;
    el.modalError.hidden = true;
    el.newTitle.value = '';
    el.newArtist.value = '';
    el.newLyrics.value = '';
    el.lineCounter.textContent = '0줄';
    el.newTitle.focus();
}

function closeModal() {
    el.modal.hidden = true;
}

function parseLyrics(text) {
    return text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

function saveNewSong() {
    const title = el.newTitle.value.trim();
    const artist = el.newArtist.value.trim() || '알 수 없는 아티스트';
    const lines = parseLyrics(el.newLyrics.value);

    if (!title) return showModalError('노래 제목을 입력해주세요.');
    if (lines.length < 2) return showModalError('가사를 두 줄 이상 입력해주세요.');

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    /* 한글이 하나라도 있으면 한글 곡으로 분류 */
    const isKorean = /[가-힣]/.test(lines.join(''));
    const avgLen = lines.reduce((sum, l) => sum + l.length, 0) / lines.length;

    const song = {
        id: 'custom-' + Date.now(),
        title: title,
        artist: artist,
        emoji: pick(CUSTOM_EMOJIS),
        color: pick(CUSTOM_COLORS),
        lang: isKorean ? 'ko' : 'en',
        difficulty: avgLen >= 26 ? '어려움' : avgLen >= 16 ? '보통' : '쉬움',
        /* 줄당 넉넉히 잡되 최소 30초 */
        timeLimit: Math.max(30, Math.round(lines.length * (isKorean ? 7 : 9))),
        lines: lines,
        custom: true
    };

    const list = getCustomSongs();
    list.push(song);
    writeStore(STORE_CUSTOM, list);

    closeModal();
    renderSongGrid();
}

function showModalError(message) {
    el.modalError.textContent = message;
    el.modalError.hidden = false;
}

function removeCustomSong(songId) {
    const song = findSong(songId);
    if (!song) return;
    if (!window.confirm('"' + song.title + '"을(를) 플레이리스트에서 지울까요?')) return;

    writeStore(STORE_CUSTOM, getCustomSongs().filter((s) => s.id !== songId));
    renderSongGrid();
}

/* =========================================================
   14. 이벤트 연결
   ========================================================= */
function bindEvents() {
    /* 모드 선택 */
    el.modeToggle.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-mode]');
        if (!btn) return;
        state.mode = btn.dataset.mode;
        el.modeToggle.querySelectorAll('.seg').forEach((b) => {
            b.classList.toggle('is-on', b === btn);
        });
        el.modeDesc.textContent = MODE_DESC[state.mode];
        renderSongGrid();
    });

    /* 곡 카드 (클릭 + 키보드) */
    el.songGrid.addEventListener('click', (event) => {
        const removeBtn = event.target.closest('[data-remove]');
        if (removeBtn) {
            event.stopPropagation();
            removeCustomSong(removeBtn.dataset.remove);
            return;
        }
        const card = event.target.closest('[data-play]');
        if (card) selectSong(card.dataset.play);
    });

    el.songGrid.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const card = event.target.closest('[data-play]');
        if (!card) return;
        event.preventDefault();
        selectSong(card.dataset.play);
    });

    /* 타이핑 입력 */
    el.typeInput.addEventListener('input', handleInput);
    el.typeInput.addEventListener('keydown', handleKeyDown);
    el.typeInput.addEventListener('compositionstart', () => {
        state.composing = true;
    });
    el.typeInput.addEventListener('compositionend', () => {
        state.composing = false;
        handleInput();
    });

    /* 플레이 화면 아무 데나 누르면 다시 입력창으로 포커스 */
    el.screens.play.addEventListener('mouseup', () => {
        if (state.running && !window.getSelection().toString()) el.typeInput.focus();
    });

    /* 화면 이동 버튼 */
    el.backBtn.addEventListener('click', quitToList);
    el.toListBtn.addEventListener('click', quitToList);
    el.retryBtn.addEventListener('click', () => {
        if (state.song) selectSong(state.song.id);
    });

    /* 모달 */
    el.addSongBtn.addEventListener('click', openModal);
    el.saveSongBtn.addEventListener('click', saveNewSong);
    el.modal.addEventListener('click', (event) => {
        if (event.target.closest('[data-close]')) closeModal();
    });
    el.newLyrics.addEventListener('input', () => {
        el.lineCounter.textContent = parseLyrics(el.newLyrics.value).length + '줄';
    });

    /* 전역 Esc */
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (!el.modal.hidden) closeModal();
        else if (el.screens.play.classList.contains('is-active')) quitToList();
    });
}

/* =========================================================
   15. 초기화
   ========================================================= */
function init() {
    el.modeDesc.textContent = MODE_DESC[state.mode];
    renderSongGrid();
    bindEvents();
    showScreen('select');
}

init();
