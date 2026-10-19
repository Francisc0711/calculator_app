const currentOperandEl = document.getElementById('current-operand');
const previousOperandEl = document.getElementById('previous-operand');
const soundToggleBtn = document.getElementById('sound-toggle');
const historyToggleBtn = document.getElementById('history-toggle');
const historyPanel = document.getElementById('history-panel');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');
const copyBtn = document.getElementById('copy-btn');
const toast = document.getElementById('toast');


let currentInput = '0';
let previousInput = '';
let operator = null;
let shouldResetScreen = false;

let lastOperator = null;
let lastOperand = null;

let soundEnabled = true;
let history = JSON.parse(localStorage.getItem('calc_history')) || [];


const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playClickSound(freq = 520) {
    if (!soundEnabled) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.045);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.045);
}

// functii calculator
function checkErrorState() {
    if (currentInput === 'Eroare') {
        clearAll();
    }
}

function clearAll() {
    currentInput = '0';
    previousInput = '';
    operator = null;
    lastOperator = null;
    lastOperand = null;
    shouldResetScreen = false;
    updateDisplay();
}

function deleteLast() {
    checkErrorState();
    if (shouldResetScreen) return;

    if (currentInput.length === 1 || (currentInput.length === 2 && currentInput.startsWith('-'))) {
        currentInput = '0';
    } else {
        currentInput = currentInput.slice(0, -1);
    }
    updateDisplay();
}

function appendNumber(number) {
    checkErrorState();

    if (shouldResetScreen) {
        currentInput = '';
        shouldResetScreen = false;
    }


    if (number === '.' && currentInput.includes('.')) return;


    if (number === '.' && currentInput === '') {
        currentInput = '0.';
        updateDisplay();
        return;
    }

    if (currentInput.replace(/[-.]/g, '').length >= 12) return;

    if (currentInput === '0' && number !== '.') {
        currentInput = number;
    } else {
        currentInput += number;
    }

    updateDisplay();
}

function chooseOperator(op) {
    checkErrorState();


    if (operator !== null && shouldResetScreen) {
        operator = op;
        updateDisplay();
        return;
    }

    if (operator !== null) {
        calculate();
    }

    previousInput = currentInput;
    operator = op;
    lastOperator = null;
    lastOperand = null;
    shouldResetScreen = true;
    updateDisplay();
}

function calculate() {
    let a, b, activeOp;

    if (operator !== null) {

        a = parseFloat(previousInput);
        b = parseFloat(currentInput);
        activeOp = operator;


        lastOperator = operator;
        lastOperand = b;
    } else if (lastOperator !== null && lastOperand !== null) {

        a = parseFloat(currentInput);
        b = lastOperand;
        activeOp = lastOperator;
        previousInput = currentInput;
    } else {
        return;
    }

    if (isNaN(a) || isNaN(b)) return;

    let result;
    switch (activeOp) {
        case '+':
            result = a + b;
            break;
        case '-':
            result = a - b;
            break;
        case '×':
            result = a * b;
            break;
        case '÷':
            if (b === 0) {
                currentInput = 'Eroare';
                previousInput = '';
                operator = null;
                shouldResetScreen = true;
                updateDisplay();
                return;
            }
            result = a / b;
            break;
        default:
            return;
    }


    result = Math.round(result * 1e10) / 1e10;


    addToHistory(`${formatNumber(a)} ${activeOp} ${formatNumber(b)}`, result);

    currentInput = result.toString();
    previousInput = `${formatNumber(a)} ${activeOp} ${formatNumber(b)} =`;
    operator = null;
    shouldResetScreen = true;
    updateDisplay();
}

function toggleSign() {
    checkErrorState();
    if (currentInput === '0') return;
    currentInput = (parseFloat(currentInput) * -1).toString();
    updateDisplay();
}

function applyPercent() {
    checkErrorState();
    const val = parseFloat(currentInput);
    if (isNaN(val)) return;
    currentInput = (Math.round((val / 100) * 1e10) / 1e10).toString();
    updateDisplay();
}


function formatNumber(numStr) {
    if (numStr === 'Eroare') return 'Eroare';
    const str = numStr.toString();
    const parts = str.split('.');
    const integerPart = parseFloat(parts[0]);
    const decimalPart = parts[1];

    let formattedInteger = isNaN(integerPart)
        ? ''
        : integerPart.toLocaleString('ro-RO', { maximumFractionDigits: 0 });

    if (str.startsWith('-0') && integerPart === 0) {
        formattedInteger = '-0';
    }

    if (decimalPart !== undefined) {
        return `${formattedInteger}.${decimalPart}`;
    }
    return formattedInteger;
}

function updateDisplay() {
    currentOperandEl.textContent = formatNumber(currentInput);

    if (currentInput.length > 9) {
        currentOperandEl.style.fontSize = '1.75rem';
    } else {
        currentOperandEl.style.fontSize = '2.4rem';
    }

    if (operator !== null) {
        previousOperandEl.textContent = `${formatNumber(previousInput)} ${operator}`;
    } else {
        previousOperandEl.textContent = previousInput;
    }


    document.querySelectorAll('.btn-operator').forEach(btn => {
        btn.classList.toggle('active-op', btn.dataset.operator === operator && shouldResetScreen);
    });
}

// gestionare istoric
function addToHistory(expression, result) {
    history.unshift({ expression, result });
    if (history.length > 20) history.pop(); // Păstrăm ultimele 20 de calcule
    localStorage.setItem('calc_history', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = '';
    if (history.length === 0) {
        historyList.innerHTML = '<li class="empty-history">Niciun calcul salvat încă.</li>';
        return;
    }

    history.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <div class="history-expr">${item.expression} =</div>
            <div class="history-res">${formatNumber(item.result)}</div>
        `;
        li.addEventListener('click', () => {
            currentInput = item.result.toString();
            shouldResetScreen = true;
            historyPanel.classList.remove('open');
            updateDisplay();
        });
        historyList.appendChild(li);
    });
}

// butoane de la tastatura
document.querySelector('.buttons-grid').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;

    playClickSound(btn.classList.contains('btn-operator') ? 640 : 480);

    if (btn.dataset.number !== undefined) {
        appendNumber(btn.dataset.number);
    } else if (btn.dataset.operator !== undefined) {
        chooseOperator(btn.dataset.operator);
    } else if (btn.dataset.action === 'clear') {
        clearAll();
    } else if (btn.dataset.action === 'delete') {
        deleteLast();
    } else if (btn.dataset.action === 'negate') {
        toggleSign();
    } else if (btn.dataset.action === 'percent') {
        applyPercent();
    } else if (btn.dataset.action === 'calculate') {
        calculate();
    }
});

 // support macbook taste
window.addEventListener('keydown', (e) => {
    if (e.key >= '0' && e.key <= '9') {
        playClickSound(480);
        appendNumber(e.key);
    } else if (e.key === '.' || e.key === ',') {
        playClickSound(480);
        appendNumber('.');
    } else if (e.key === '+' || e.key === '-') {
        playClickSound(640);
        chooseOperator(e.key);
    } else if (e.key === '*') {
        playClickSound(640);
        chooseOperator('×');
    } else if (e.key === '/') {
        e.preventDefault();
        playClickSound(640);
        chooseOperator('÷');
    } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        playClickSound(720);
        calculate();
    } else if (e.key === 'Backspace') {
        playClickSound(420);
        deleteLast();
    } else if (e.key === 'Escape') {
        playClickSound(420);
        clearAll();
    } else if (e.key === '%') {
        playClickSound(520);
        applyPercent();
    }
});


soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggleBtn.textContent = soundEnabled ? '🔊' : '🔇';
});


historyToggleBtn.addEventListener('click', () => {
    historyPanel.classList.toggle('open');
});


clearHistoryBtn.addEventListener('click', () => {
    history = [];
    localStorage.removeItem('calc_history');
    renderHistory();
});


copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(currentInput).then(() => {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1800);
    });
});

renderHistory();
updateDisplay();
