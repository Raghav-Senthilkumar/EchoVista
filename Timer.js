 const timerDisplay = document.getElementById('timer');
  const startStopBtn = document.getElementById('startStopBtn');
  const resetBtn = document.getElementById('resetBtn');

  const playIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="black"><polygon points="5,3 19,12 5,21"/></svg>`;
  const pauseIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="black"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;

  let startTime = 0;
  let elapsedTime = 0;
  let timerInterval = null;
  let running = false;

  function updateDisplay(time) {
    const hrs = String(Math.floor(time / 3600000)).padStart(2, '0');
    const mins = String(Math.floor((time % 3600000) / 60000)).padStart(2, '0');
    const secs = String(Math.floor((time % 60000) / 1000)).padStart(2, '0');
    timerDisplay.textContent = `${hrs}:${mins}:${secs}`;
  }

  function startTimer() {
    startTime = Date.now() - elapsedTime;
    timerInterval = setInterval(() => {
      elapsedTime = Date.now() - startTime;
      updateDisplay(elapsedTime);
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
  }

  startStopBtn.addEventListener('click', () => {
    if (!running) {
      startTimer();
      startStopBtn.innerHTML = pauseIcon;
    } else {
      stopTimer();
      startStopBtn.innerHTML = playIcon;
    }
    running = !running;
  });

  resetBtn.addEventListener('click', () => {
    stopTimer();
    elapsedTime = 0;
    updateDisplay(0);
    startStopBtn.innerHTML = playIcon;
    running = false;
  });