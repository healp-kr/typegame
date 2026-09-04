// 게임 상태를 관리하는 변수들
let score = 0;
let timeLeft = 20;
let gameInterval;
let isGameRunning = false; // 게임이 실행 중인지 확인하는 변수
let targetText = '';       // 현재 입력해야 하는 문자 또는 단어
let typedIndex = 0;        // 현재 단어에서 몇 글자까지 맞췄는지

// DOM 요소 참조
const targetCharElement = document.getElementById('targetChar');
const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');

// 점수 설정
const POINT_PER_CHAR = 2;   // 한 글자 맞출 때마다 얻는 점수
const POINT_BONUS = 10;     // 단어 하나를 끝까지 완성했을 때 보너스
const PENALTY = 5;          // 틀렸을 때 깎이는 점수 (단, 0점 밑으로는 안 내려감)

// 타겟으로 사용할 한 글자 목록
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// 타겟으로 사용할 단어 목록
const words = [
    'apple', 'banana', 'cherry', 'orange', 'grape',
    'window', 'button', 'script', 'string', 'number',
    'object', 'array', 'function', 'return', 'const',
    'browser', 'server', 'client', 'network', 'keyboard',
    'coffee', 'monitor', 'develop', 'design', 'random'
];

// 단어가 나올 확률 (0 ~ 1)
const WORD_RATE = 0.6;

// 랜덤 타겟(한 글자 또는 단어)을 만드는 함수
function getRandomTarget() {
    if (Math.random() < WORD_RATE) {
        return words[Math.floor(Math.random() * words.length)];
    }
    return chars[Math.floor(Math.random() * chars.length)];
}

// 타겟을 화면에 그리는 함수 (맞춘 부분은 다른 색으로 표시)
function renderTarget() {
    const typed = targetText.slice(0, typedIndex);
    const rest = targetText.slice(typedIndex);
    targetCharElement.innerHTML =
        `<span class="typed">${typed}</span><span class="rest">${rest}</span>`;
}

// 새로운 타겟을 설정하는 함수
function setNewTarget() {
    targetText = getRandomTarget();
    typedIndex = 0;
    renderTarget();
}

// 점수를 더하거나 빼는 함수 (0점 밑으로는 절대 내려가지 않음)
function addScore(point) {
    score = Math.max(0, score + point);
    scoreElement.innerText = `점수: ${score}`;
}

// 틀렸을 때 잠깐 빨갛게 표시하는 함수
function showWrong() {
    targetCharElement.classList.add('wrong');
    setTimeout(() => targetCharElement.classList.remove('wrong'), 200);
}

// 입력된 문자를 확인하고 점수를 업데이트하는 함수
function checkInput(event) {
    const inputChar = event.key;

    // Shift, CapsLock, 화살표, F1 등 글자가 아닌 키는 모두 무시
    // (글자 키는 event.key의 길이가 항상 1이다)
    if (inputChar.length !== 1) {
        return;
    }

    if (inputChar === targetText[typedIndex]) {
        // 맞았으면 다음 글자로 이동
        typedIndex++;
        addScore(POINT_PER_CHAR);

        if (typedIndex === targetText.length) {
            // 단어를 끝까지 완성했으면 보너스 점수 + 새 타겟
            addScore(POINT_BONUS);
            setNewTarget();
        } else {
            renderTarget();
        }
    } else {
        // 틀렸으면 점수를 깎고 그 단어를 처음부터 다시 입력
        addScore(-PENALTY);
        showWrong();
        typedIndex = 0;
        renderTarget();
    }
}

// 타이머를 업데이트하고 시간이 다 되면 게임을 종료하는 함수
function updateTimer() {
    timeLeft--;
    timerElement.innerText = `남은 시간: ${timeLeft}`;

    if (timeLeft <= 0) {
        endGame();
    }
}

// 게임을 종료하고 필요한 정리 작업을 수행하는 함수
function endGame() {
    clearInterval(gameInterval);
    targetCharElement.innerHTML = ''; // 타겟 제거
    timerElement.innerText = `시간 초과! 최종 점수: ${score}`;
    document.removeEventListener('keydown', checkInput); // 키 입력 이벤트 제거
    isGameRunning = false; // 게임 실행 상태를 종료로 설정
}

// 게임을 초기화하고 시작하는 함수
function startGame() {
    if (isGameRunning) return; // 게임이 이미 실행 중이면 새로 시작하지 않음
    isGameRunning = true; // 게임 실행 상태를 시작으로 설정

    score = 0;
    timeLeft = 20;
    scoreElement.innerText = `점수: ${score}`;
    timerElement.innerText = `남은 시간: ${timeLeft}`;
    setNewTarget(); // 첫 번째 타겟 설정

    gameInterval = setInterval(updateTimer, 1000); // 1초마다 타이머 업데이트
    document.addEventListener('keydown', checkInput); // 키 입력 이벤트 추가
}

// 게임을 리셋하는 함수
function resetGame() {
    clearInterval(gameInterval); // 타이머 정지
    score = 0;
    timeLeft = 20;
    targetText = '';
    typedIndex = 0;
    scoreElement.innerText = '점수: 0';
    timerElement.innerText = '남은 시간: 20';
    targetCharElement.innerHTML = ''; // 타겟 초기화
    document.removeEventListener('keydown', checkInput); // 키 입력 이벤트 제거
    isGameRunning = false; // 게임 실행 상태를 종료로 설정
}

// 페이지 로드 시 초기 설정
function initGame() {
    scoreElement.innerText = '점수: 0';
    timerElement.innerText = '남은 시간: 20';
    targetCharElement.innerHTML = ''; // 게임 시작 전 타겟 초기화
}

// 게임 초기화 함수 호출
initGame();
