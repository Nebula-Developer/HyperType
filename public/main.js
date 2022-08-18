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

var config = { words: 50 }
var userInfo = { }
var testInfo = { wordsCompleted: 0, wordData: "", inputData: "", currentChar: 0, wpmSector: [ ], errors: 0 }
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
        wpm: Math.floor(wpm)
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

/** Calculate accuracy based on the amount of errors */
function calculateAccuracy(errors, words) {
    var accuracy = (words - errors) / words * 100;
    return Math.abs(Math.floor(accuracy * 10) / 10);
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
            space.classList.add('space');
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

/* Input handling */
function handleInput(e) {
    console.log("a");

    if (isTyping) {
        console.log("b");
        if (testInfo.currentChar >= testInfo.wordData.length - 1) return;
        if (!startedTimer) { startedTimer = true; typingTimer.startTimer(); }
        console.log("c");

        if (e.key == 'Backspace' || e.key == 'Delete') {
            testInfo.currentChar--;
            if (testInfo.currentChar < 0) testInfo.currentChar = 0;
            testInfo.inputData = testInfo.inputData.substring(0, testInfo.inputData.length - 1);
        }

        if (isChar(e.key)) {
            console.log("d");
            if (e.ctrlKey) return;
            console.log("e");

            if (testInfo.wordData[testInfo.currentChar] != e.key) {
                testInfo.errors++;
                console.log(testInfo.wordData[testInfo.currentChar])
            }

            testInfo.currentChar++;
            testInfo.inputData += e.key;
            console.log("f");
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
        $('.wpm').html(wpm.wpm);
        testInfo.wpmSector.push(wpm.wpm);
    } else {
        $('.wpm').html('0');
    }

    var acc = calculateAccuracy(testInfo.errors, testInfo.inputData.length);
    if (acc > 100 || acc < 0) acc = 0;
    if (acc > 100 && testInfo.errors > 1) acc = 0;
    $('.acc').html(acc);

    for (var i = 0; i < inputData.length; i++) {
        var charElem = document.getElementById('input').getElementsByTagName('letter')[i];

        if (inputData[i] == wordData[i]) {
            charElem.classList.add('correct');
            charElem.classList.remove('error');
            charElem.classList.remove('space-error');
        } else {
            charElem.classList.add('error');
            charElem.classList.remove('correct');

            if (charElem.innerHTML == '&nbsp;') {
                charElem.classList.add('space-error');
            }
        }
    }

    for (var i = inputData.length; i < wordData.length; i++) {
        var charElem = document.getElementById('input').getElementsByTagName('letter')[i];
        charElem.classList.remove('correct');
        charElem.classList.remove('error');
        charElem.classList.remove('space-error');
    }
}

/** End the test */
function finishTest() {
    isTyping = false;
    startedTimer = false;
    typingTimer.endTimer();
    updateData();

    var wpm = calculateWordWPM(testInfo.wordsCompleted);
    $('.wpm').html(wpm.wpm);
    var acc = calculateAccuracy(testInfo.errors, testInfo.wordData.length - 1);
    if (acc > 100 || acc < 0) acc = "0";
    $('.acc').html(acc);

    $('.typing-wrapper').css('display', 'none');

    // make wpmSector start half way through the array
    var wpmSector = testInfo.wpmSector;
    var wpmSectorStart = Math.floor(wpmSector.length / 2);
    testInfo.wpmSector = wpmSector.slice(wpmSectorStart, wpmSector.length);

    input.classList.add('input-end-blur');

    $(".results-wrapper").css('display', 'flex');

    var chartParent = $("#wpmGraph").parent();
    $("#wpmGraph").remove();

    chartParent.append('<canvas id="wpmGraph"></canvas>');
    var ctx = $("#wpmGraph");

    /*var myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: testInfo.wpmSector.map(function (wpm) { return wpm + ' wpm'; }),
            datasets: [{
                label: 'WPM',
                data: testInfo.wpmSector,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'red',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero:true
                    }
                }]
            },
            responsive: true,
            maintainAspectRatio: false,
            showScale: false,
            legend: {
                display: false
            }   
        }
    });

    myChart.update();*/
}

/** Move caret to the input location */
function handleCaret() {
    var caret = $("#caret");
    var letters = $("#input").find("letter");

    var curOffset = letters[testInfo.currentChar].offsetTop;
    var nOffsetLock = -1;

    for (var i = 0; i < letters.length; i++) {
        if (nOffsetLock != -1 && letters[i].offsetTop > letters[nOffsetLock].offsetTop) {
            letters[i].classList.add('hidden');
        } else if (nOffsetLock == -1) {
            if (letters[i].offsetTop > curOffset) { newOffset = letters[i].offsetTop; nOffsetLock = i; i--; }
    
            if (letters[i].offsetTop < curOffset) {
                letters[i].classList.add('hidden');
            } else {
                letters[i].classList.remove('hidden');
            }
        } else {
            letters[i].classList.remove('hidden');
        }
    }

    $("#input").css("transform", "translateY(" + -curOffset + "px)");
    var currentLetter = letters[testInfo.currentChar];

    var caretLeft = currentLetter.offsetLeft;
    var caretTop = currentLetter.offsetTop;

    caret.css("left", caretLeft);
    caret.css("top", caretTop);
}

$("#restart").on('click', () => {
    $("#restart").blur();
    $('.typing-wrapper').css('display', 'flex');
    $("#input").html("<div id=\"caret\"></div>");
    testInfo = { wordsCompleted: 0, wordData: "", inputData: "", currentChar: 0, wpmSector: [ ], errors: 0 }
    appendSentence(createSentence(config.words));

    $(".results-wrapper").css('display', 'none');
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
appendSentence(createSentence(config.words));
setInterval(handleCaret, 100);
updateData();

console.log(calculateAccuracy(50, 100) + "% acc");
handleCaret();

window.onload = function () {
    setTimeout(() => {
        $('*').css('transition', 'all var(--primary-transition-time) ease');
    }, 100);
}