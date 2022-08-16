var socket = io();
var isTyping = true;
var startedTimer = false;

//#region Variables
var words = [
    "some", "here", "tell", "to", "about", "will", "of",
    "mean", "both", "eye", "out", "change", "and", "the", 
    "from", "into", "look", "person", "have", "go", "can",
    "say", "a", "beat", "anything", "all", "another",
    "point", "come", "place", "world", "new", "break"
];

var input = document.getElementById('input');

socket.on('words', (data) => {
    words = data;
});

socket.emit('fetchWords');

var typingTimer = {
    start: 0,
    end: 0,
    startTimer: function () {
        this.start = new Date().getTime();
    },
    endTimer: function () {
        this.end = new Date().getTime();
    }
}

var config = { words: 10 }
var userInfo = { }
var testInfo = { wordsCompleted: 0, wordData: "", inputData: "", currentChar: 0, wpmSector: [ ] }
//#endregion

/** Calculates wpm based on how fast the test was complete (Speed based) */
function calculateWordWPM(words) {
    var timerResult = typingTimer.end - typingTimer.start;
    var wpm = ((words * 60) / timerResult) * 1000;
    return {
        raw: wpm,
        wpm: Math.ceil(wpm)
    }
}

/** Calculates wpm based on how fast the test was complete, using current time */
function calculateUpdatingWPM(words) {
    var timerResult = new Date().getTime() - typingTimer.start;
    var wpm = ((words * 60) / timerResult) * 1000;
    return {
        raw: wpm,
        wpm: Math.ceil(wpm)
    }
}

/** Calculates wpm based on how many words were written in the test (Timer based) */
function calculateTimeWPM(time) {
    var wordsPerMinute = (testInfo.wordsCompleted * 60) / time;
    return {
        raw: wordsPerMinute,
        wpm: Math.ceil(wordsPerMinute)
    }
}

/** Create a random sentence from words */
function createSentence(length) {
    var sentence = '';
    for (var i = 0; i < length; i++) {
        sentence += words[Math.floor(Math.random() * words.length)] + " ";
    }
    return sentence;
}

/** Append a sentence to the input div */
function appendSentence(str) {
    // Remove space at the end of the string if it exists
    if (str[str.length - 1] == ' ') { str = str.substring(0, str.length - 1); }

    // Append the sentence to the input div
    var strSplit = str.split(' ');

    for (var i = 0; i < strSplit.length; i++) {
        var word = document.createElement('div');
        word.className = 'input-word';

        var wordText = strSplit[i];
        for (var j = 0; j < wordText.length; j++) {
            var letter = document.createElement('letter');
            letter.innerHTML = wordText[j];
            word.appendChild(letter);
        }
        
        if (i !== strSplit.length - 1) {
            var space = document.createElement('letter');
            space.innerHTML = '&nbsp;';
            word.appendChild(space);
        } else {
            var endingSlot = document.createElement('letter');
            endingSlot.className = 'ending-slot';
            endingSlot.innerHTML = '&nbsp;';
            word.appendChild(endingSlot);
        }

        input.appendChild(word);
    }
}

/** Find all letter elements in #input */
function getWordData() {
    var wordData = '';
    var words = document.getElementById('input').getElementsByClassName('input-word');

    for (var i = 0; i < words.length; i++) {
        var letters = words[i].getElementsByTagName('letter');
        for (var j = 0; j < letters.length; j++) {
            wordData += letters[j].innerHTML.replace('&nbsp;', ' ');
        }
    }

    return wordData;
}

/** Update test data */
function updateData() {
    testInfo.wordData = getWordData();
}

/** Check whether a key is a character or not */
function isChar(key) {
    return key.length === 1 && key.match(/[a-zA-Z!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~ ]/);
}

//#region Key events
var ctrl = false;
var alt = false;

function handleInputEvents(e) {
    if (e.key === 'Control') ctrl = true;
    if (e.key === 'Alt') alt = true;
}

function handleInputEventsUp(e) {
    if (e.key === 'Control') ctrl = false;
    if (e.key === 'Alt') alt = false;
}

document.addEventListener('keydown', handleInputEvents);
document.addEventListener('keyup', handleInputEventsUp);
//#endregion

/* Input handling */
function handleInput(e) {
    if (e.key === 'Control') ctrl = true;

    if (isTyping) {
        if (testInfo.currentChar >= testInfo.wordData.length - 1) return;
        if (!startedTimer) { startedTimer = true; typingTimer.startTimer(); }

        if (e.key == 'Backspace' || e.key == 'Delete') {
            testInfo.currentChar--;
            if (testInfo.currentChar < 0) testInfo.currentChar = 0;
            testInfo.inputData = testInfo.inputData.substring(0, testInfo.inputData.length - 1);
        }

        if (isChar(e.key)) {
            if (ctrl || alt) return;

            testInfo.currentChar++;
            testInfo.inputData += e.key;
        }
        
        checkInput();
        handleCaret();
        if (testInfo.currentChar >= testInfo.wordData.length - 1) { finishTest(); }
    }
}

/** Check the input for correct and incorrect characters */
function checkInput() {
    var inputData = testInfo.inputData;
    var wordData = testInfo.wordData;

    var inputSplit = inputData.split(' ');
    var wordSplit = wordData.split(' ');

    testInfo.wordsCompleted = 0;

    for (var i = 0; i < wordSplit.length; i++) {
        var currentWord = wordSplit[i];

        if (inputSplit[i]) {
            var word = document.getElementById('input').getElementsByClassName('input-word')[i];
            if (inputSplit[i] == currentWord) {
                word.classList.add('correct-word');
                testInfo.wordsCompleted++;
            } else {
                word.classList.remove('correct-word');
            }
        }
    }

    var wpm = calculateUpdatingWPM(testInfo.wordsCompleted);
    if (testInfo.wordsCompleted > 0) {
        $('#wpm').html(wpm.wpm);
        testInfo.wpmSector.push(wpm.wpm);
    } else {
        $('#wpm').html('0');
    }

    for (var i = 0; i < inputData.length; i++) {
        var charElem = document.getElementById('input').getElementsByTagName('letter')[i];

        if (inputData[i] == wordData[i]) {
            charElem.classList.add('correct');
            charElem.classList.remove('incorrect');
        } else {
            charElem.classList.add('incorrect');
            charElem.classList.remove('correct');
        }
    }

    for (var i = inputData.length; i < wordData.length; i++) {
        var charElem = document.getElementById('input').getElementsByTagName('letter')[i];
        charElem.classList.remove('correct');
        charElem.classList.remove('incorrect');
    }
}

/** End the test */
function finishTest() {
    isTyping = false;
    startedTimer = false;
    typingTimer.endTimer();
    updateData();

    var wpm = calculateWordWPM(testInfo.wordsCompleted);
    $('#wpm').html(wpm.wpm);

    input.classList.add('input-end-blur');

    $(".results-wrapper").css('display', 'flex');
    setTimeout(() => {
        $(".results-wrapper").css('opacity', '1');
    }, 50);

    var chartParent = $("#results-graph").parent();
    $("#results-graph").remove();
    chartParent.append('<canvas id="results-graph"></canvas>');
    var chart = $("#results-graph").get(0).getContext("2d");

    var myChart = new Chart(chart, {
        type: 'line',
        data: {
            labels: testInfo.wpmSector.map(function(x) { return x; }),
            datasets: [{
                label: 'WPM',
                data: testInfo.wpmSector,
                backgroundColor: 'rgba(0, 228, 255, 0.2)',
                borderColor: 'rgba(0, 228, 255, 1)',
                borderWidth: 2
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true,
                        fontColor: 'rgba(0, 228, 255, 1)',
                        fontSize: 20
                    }
                }],
                xAxes: [{
                    ticks: {
                        display: false
                    }
                }]
            },
            tension: 0.4,
            responsive: true
        }
    });


    myChart.update();
}

/** Move caret to the input location */
function handleCaret() {
    var caret = $("#caret");
    var letters = $("#input").find("letter");
    var currentLetter = letters[testInfo.currentChar];

    var caretLeft = currentLetter.offsetLeft;
    var caretTop = currentLetter.offsetTop;

    caret.css("left", caretLeft);
    caret.css("top", caretTop);
}

$("#restart").on('click', () => {
    $("#restart").blur();
    $("#input").html("<div id=\"caret\"></div>");
    testInfo = { wordsCompleted: 0, wordData: "", inputData: "", currentChar: 0, wpmSector: [ ] }
    appendSentence(createSentence(10));

    $("#results-graph").css("opacity", "0");
    setTimeout(() => { $(".results-wrapper").css('display', 'none'); }, 500);
    input.classList.remove('input-end-blur');

    updateData();
    isTyping = true;
    startedTimer = false;
    console.log(testInfo.wordData);
});

var tabLock = false;
function tabHandle(e) {
    if (e.key === 'Tab') {
        if (tabLock) return;
        e.preventDefault();
        $("#restart").focus();
        tabLock = true;
    } else {
        tabLock = false;
    }
}

document.addEventListener('keydown', handleInput);
document.addEventListener('keydown', tabHandle);
document.addEventListener('mousedown', () => { tabLock = false; });
appendSentence(createSentence(10));
setInterval(handleCaret, 100);
updateData();