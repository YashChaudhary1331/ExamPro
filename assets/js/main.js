document.addEventListener('DOMContentLoaded', function () {

    // --- NOTIFICATION HELPER FUNCTION ---
    const notificationContainer = document.getElementById('notification-container');
    let notificationTimeout;

    function showNotification(message, type = 'error') {
        if (!notificationContainer) return;
        clearTimeout(notificationTimeout);
        notificationContainer.textContent = message;
        notificationContainer.className = `notification ${type}`;
        notificationTimeout = setTimeout(() => {
            notificationContainer.classList.add('hidden');
        }, 5000);
    }

    // --- LOGIC FOR LOGIN & SIGNUP PAGES ---
    if (document.title.includes('Login') || document.title.includes('Sign Up')) {
        const form = document.querySelector('form');
        if (form) {
            form.addEventListener('submit', async function (event) {
                event.preventDefault();
                const submitButton = form.querySelector('button[type="submit"]');
                const originalButtonText = submitButton.textContent;
                submitButton.disabled = true;

                const isSignUp = document.title.includes('Sign Up');
                if (isSignUp) {
                    submitButton.textContent = 'Creating Account...';
                    const fullName = document.getElementById('fullname').value;
                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;
                    const confirmPassword = document.getElementById('confirm-password').value;

                    if (password !== confirmPassword) {
                        showNotification('Passwords do not match.', 'error');
                        submitButton.disabled = false;
                        submitButton.textContent = originalButtonText;
                        return;
                    }

                    try {
                        const response = await fetch('/api/signup', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ fullName, email, password }),
                        });
                        const result = await response.json();
                        if (response.ok) {
                            showNotification('Sign up successful! Please log in.', 'success');
                            setTimeout(() => window.location.href = `login.html`, 1500);
                        } else {
                            showNotification(`Sign up failed: ${result.message}`, 'error');
                        }
                    } catch (error) {
                        showNotification('An error occurred. Please try again.', 'error');
                    } finally {
                        submitButton.disabled = false;
                        submitButton.textContent = originalButtonText;
                    }
                } else { // Login logic
                    submitButton.textContent = 'Logging In...';
                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;
                    try {
                        const response = await fetch('/api/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, password }),
                        });
                        const result = await response.json();
                        if (response.ok) {
                            localStorage.setItem('userRole', result.role);
                            localStorage.setItem('userEmail', email);
                            localStorage.setItem('userFullName', result.fullName); 
                            window.location.href = result.role === 'admin' ? 'admin-dashboard.html' : 'student-dashboard.html';
                        } else {
                            showNotification(`Login failed: ${result.message}`, 'error');
                        }
                    } catch (error) {
                        showNotification('An error occurred during login.', 'error');
                    } finally {
                        submitButton.disabled = false;
                        submitButton.textContent = originalButtonText;
                    }
                }
            });
        }
    }

    // --- LOGIC FOR DASHBOARD PAGES ---
    // --- LOGIC FOR DASHBOARD PAGES (UPDATED) ---
if (document.title.includes('Dashboard')) {
    const dashboardMain = document.querySelector('.dashboard-main');
    const userRole = localStorage.getItem('userRole');
    const logoutButton = document.querySelector('.logout-button');
    
    if (logoutButton) {
        logoutButton.addEventListener('click', function(event) {
            event.preventDefault();
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }

    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage && userRole === 'student') {
        const userFullName = localStorage.getItem('userFullName');
        if (userFullName) {
            welcomeMessage.textContent = `Welcome Back, ${userFullName}!`;
        }
    }

    // --- Chart Initialization & Data Loading ---
    let averageScoresChart, passFailChart;

    function initializeCharts() {
        const avgScoresCtx = document.getElementById('averageScoresChart');
        const passFailCtx = document.getElementById('passFailChart');

        if (avgScoresCtx) {
            averageScoresChart = new Chart(avgScoresCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Average Score (%)',
                        data: [],
                        backgroundColor: 'rgba(74, 144, 226, 0.5)',
                        borderColor: 'rgba(74, 144, 226, 1)',
                        borderWidth: 1
                    }]
                },
                options: { scales: { y: { beginAtZero: true, max: 100 } } }
            });
        }

        if (passFailCtx) {
            passFailChart = new Chart(passFailCtx, {
                type: 'pie',
                data: {
                    labels: ['Pass (>=50%)', 'Fail (<50%)'],
                    datasets: [{
                        data: [],
                        backgroundColor: ['rgba(40, 167, 69, 0.7)', 'rgba(197, 48, 48, 0.7)'],
                        borderColor: ['rgba(40, 167, 69, 1)', 'rgba(197, 48, 48, 1)'],
                        borderWidth: 1
                    }]
                }
            });
        }
    }

    async function loadAdminAnalytics() {
        try {
            const response = await fetch('/api/analytics/dashboard');
            const data = await response.json();

            if (data.status === 'success') {
                const avgData = data.analytics.averageScores;
                if (averageScoresChart) {
                    averageScoresChart.data.labels = avgData.map(d => d.title);
                    averageScoresChart.data.datasets[0].data = avgData.map(d => d.score);
                    averageScoresChart.update();
                }
                const passFailData = data.analytics.passFail;
                if (passFailChart) {
                    passFailChart.data.datasets[0].data = [passFailData.pass, passFailData.fail];
                    passFailChart.update();
                }
            }
        } catch (error) {
            console.error("Failed to load admin analytics:", error);
        }
    }

    // --- Data Loading Functions (RESTORED) ---
    async function loadDashboardExams() {
        try {
            const response = await fetch('/api/exams');
            const upcomingExamsList = document.querySelector('.upcoming-exams ul');
            if (!upcomingExamsList) return;
            upcomingExamsList.innerHTML = '';

            if (response.ok) {
                const result = await response.json();
                if (result.exams && result.exams.length > 0) {
                    result.exams.forEach(exam => {
                        const newExamLi = document.createElement('li');
                        const buttonHTML = userRole === 'admin' 
                            ? `<button class="remove-exam-button" data-id="${exam._id}">Remove</button>`
                            : `<button class="start-exam-button" data-id="${exam._id}">Start Exam</button>`;
                        newExamLi.innerHTML = `<span>${exam.title || "Untitled Exam"}</span><div class="exam-buttons">${buttonHTML}</div>`;
                        upcomingExamsList.appendChild(newExamLi);
                    });
                } else {
                    upcomingExamsList.innerHTML = '<li>No upcoming exams available.</li>';
                }
            } else {
                upcomingExamsList.innerHTML = '<li>Could not load exams.</li>';
            }
        } catch (error) {
            console.error('Error fetching exams for dashboard:', error);
            const upcomingExamsList = document.querySelector('.upcoming-exams ul');
            if (upcomingExamsList) upcomingExamsList.innerHTML = '<li>Error loading exams.</li>';
        }
    }
    
    async function loadRecentResults() {
        const studentEmail = localStorage.getItem('userEmail');
        const recentResultsList = document.querySelector('.recent-results ul');
        if (!recentResultsList || userRole === 'admin') return;

        try {
            const response = await fetch(`/api/my-results?email=${studentEmail}`);
            const data = await response.json();
            recentResultsList.innerHTML = '';

            if (data.status === 'success' && data.results.length > 0) {
                const recent = data.results.slice(0, 3);
                recent.forEach(result => {
                    const percentage = Math.round((result.score / result.totalQuestions) * 100);
                    const li = document.createElement('li');
                    li.innerHTML = `<span>${result.examTitle}</span><span class="score ${percentage >= 50 ? 'pass' : 'fail'}">${percentage}%</span>`;
                    recentResultsList.appendChild(li);
                });
            } else {
                recentResultsList.innerHTML = '<li>No results yet.</li>';
            }
        } catch (error) {
            console.error('Error fetching recent results:', error);
            recentResultsList.innerHTML = '<li>Error loading results.</li>';
        }
    }
    
    // --- Initial Load ---
    loadDashboardExams();
    if (userRole === 'student') {
        loadRecentResults();
    } else if (userRole === 'admin') {
        initializeCharts();
        loadAdminAnalytics();
    }

    // --- Event Listeners (RESTORED) ---
    if (dashboardMain) {
        dashboardMain.addEventListener('click', async function(event) {
            const target = event.target;
            
            if (target.classList.contains('start-exam-button')) {
                const examId = target.getAttribute('data-id');
                window.location.href = `exam.html?id=${examId}`;
            }

            if (target.classList.contains('remove-exam-button')) {
                const examId = target.getAttribute('data-id');
                if(confirm('Are you sure you want to permanently remove this exam?')) {
                    try {
                        const response = await fetch(`/api/exams/${examId}`, { method: 'DELETE' });
                        if(response.ok) {
                            alert('Exam removed.');
                            loadDashboardExams(); // Reload the list after deleting
                        } else {
                            alert('Failed to remove exam.');
                        }
                    } catch(error) {
                        alert('An error occurred while removing the exam.');
                    }
                }
            }
        });
    }
}
 // --- LOGIC FOR EXAM PAGE (RESTORED AND FIXED) ---
if (document.title.includes('Ongoing Exam')) {
    const urlParams = new URLSearchParams(window.location.search);
    const examId = urlParams.get('id');

    if (!examId) {
        document.body.innerHTML = '<h1>Error: No Exam ID Provided</h1><p>Please return to the dashboard and select an exam.</p>';
        return;
    }

    // Flag to prevent double submission
    let isSubmitting = false;

    const calibrationOverlay = document.getElementById('calibration-overlay');
    const startCalibrationBtn = document.getElementById('start-calibration-btn');
    const examContainer = document.querySelector('.exam-container');
    const gazeWarning = document.getElementById('gaze-warning');

    const fixedCalibrationPoints = [
        { x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.9, y: 0.1 },
        { x: 0.1, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.5 },
        { x: 0.1, y: 0.9 }, { x: 0.5, y: 0.9 }, { x: 0.9, y: 0.9 }
    ];
    let currentCalibPointIndex = 0;

    function displayCalibrationPoint(point) {
        const existingPoint = document.getElementById('calibration-point');
        if (existingPoint) existingPoint.remove();

        const calibPoint = document.createElement('div');
        calibPoint.id = 'calibration-point';
        calibPoint.style.left = `${point.x * 100}%`;
        calibPoint.style.top = `${point.y * 100}%`;
        calibPoint.className = 'calibration-dot';
        calibrationOverlay.appendChild(calibPoint);

        calibPoint.addEventListener('click', () => {
            webgazer.recordScreenPosition(point.x * window.innerWidth, point.y * window.innerHeight, 'click');
            currentCalibPointIndex++;
            if (currentCalibPointIndex < fixedCalibrationPoints.length) {
                displayCalibrationPoint(fixedCalibrationPoints[currentCalibPointIndex]);
            } else {
                finishCalibration();
            }
        });
    }

    if (startCalibrationBtn) {
        startCalibrationBtn.addEventListener('click', async () => {
            startCalibrationBtn.disabled = true;
            startCalibrationBtn.textContent = 'Starting...';
            await webgazer.setRegression('ridge').saveDataAcrossSessions(false).showPredictionPoints(true).begin();
            webgazer.showPredictionPoints(false);
            displayCalibrationPoint(fixedCalibrationPoints[currentCalibPointIndex]);
        });
    }

    function finishCalibration() {
        webgazer.pause();
        const existingPoint = document.getElementById('calibration-point');
        if (existingPoint) existingPoint.remove();
        if (calibrationOverlay) calibrationOverlay.classList.add('hidden');
        if (examContainer) examContainer.style.display = 'flex';
        setupExamPage();
    }

    async function setupExamPage() {
        try {
            webgazer.resume();
            
            const proctoringFeedDiv = document.querySelector('.proctoring-feed');
            const videoFeed = document.getElementById('webgazerVideoFeed');
            const faceOverlay = document.getElementById('webgazerFaceOverlay');
            const faceFeedbackBox = document.getElementById('webgazerFaceFeedbackBox');

            if (videoFeed) proctoringFeedDiv.appendChild(videoFeed);
            if (faceOverlay) proctoringFeedDiv.appendChild(faceOverlay);
            if (faceFeedbackBox) proctoringFeedDiv.appendChild(faceFeedbackBox);

            const response = await fetch(`/api/exam/${examId}`);
            if (!response.ok) throw new Error('Exam not found');
            const result = await response.json();
            const examData = result.exam;
            const questions = examData.questions;

            document.getElementById('exam-title-text').textContent = examData.title || "Exam";
            let currentQuestionIndex = 0;
            const userAnswers = new Array(questions.length).fill(null);
            const questionTextElement = document.querySelector('.question-text');
            const answerOptionsContainer = document.querySelector('.answer-form');
            const questionCounterElement = document.getElementById('question-counter-text');
            const nextButton = document.querySelector('.nav-button.next');
            const prevButton = document.querySelector('.nav-button.prev');
            const timerElement = document.querySelector('.timer');
            const submitButton = document.querySelector('.submit-exam-button');

            let countdown, takeSnapshot, gazeMonitor;

            let timeInSeconds = examData.timeLimit * 60 || 1800;
            countdown = setInterval(() => {
                if (timeInSeconds <= 0) {
                    clearInterval(countdown);
                    submitExam();
                    return;
                }
                timeInSeconds--;
                const minutes = Math.floor(timeInSeconds / 60);
                const seconds = timeInSeconds % 60;
                timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }, 1000);

            const canvas = document.createElement('canvas');
            let offScreenDetected = false;

            takeSnapshot = setInterval(async () => {
                const sourceVideo = document.getElementById('webgazerVideoFeed');
                if (sourceVideo && sourceVideo.readyState >= 2) {
                    canvas.width = sourceVideo.videoWidth;
                    canvas.height = sourceVideo.videoHeight;
                    const context = canvas.getContext('2d');
                    context.drawImage(sourceVideo, 0, 0, canvas.width, canvas.height);
                    const imageDataUrl = canvas.toDataURL('image/jpeg');
                    await fetch('/api/save-snapshot', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageDataUrl, offScreenGaze: offScreenDetected })
                    });
                    offScreenDetected = false;
                }
            }, 5000);

            let offScreenTimer = 0;
            gazeMonitor = setInterval(() => {
                webgazer.getCurrentPrediction().then(prediction => {
                    if (prediction) {
                        const { x, y } = prediction;
                        const buffer = 50;
                        if (x < buffer || y < buffer || x > window.innerWidth - buffer || y > window.innerHeight - buffer) {
                            offScreenTimer++;
                        } else {
                            offScreenTimer = 0;
                        }
                    }
                    if (offScreenTimer > 40) {
                        gazeWarning.classList.remove('hidden');
                        offScreenDetected = true;
                    } else {
                        gazeWarning.classList.add('hidden');
                    }
                });
            }, 50);

            window.addEventListener('beforeunload', () => {
                clearInterval(countdown);
                clearInterval(takeSnapshot);
                clearInterval(gazeMonitor);
                if (webgazer) webgazer.end();
            });

            function displayQuestion(index) {
                const question = questions[index];
                questionTextElement.textContent = question.text;
                answerOptionsContainer.innerHTML = '';
                question.options.forEach((option, i) => {
                    const label = document.createElement('label');
                    label.className = 'answer-option';
                    if (userAnswers[index] === i) label.classList.add('selected');
                    label.innerHTML = `<input type="radio" name="answer" value="${i}" ${userAnswers[index] === i ? 'checked' : ''}><span>${option}</span>`;
                    label.addEventListener('click', () => {
                        userAnswers[index] = i;
                        document.querySelectorAll('.answer-option').forEach(opt => opt.classList.remove('selected'));
                        label.classList.add('selected');
                    });
                    answerOptionsContainer.appendChild(label);
                });
                questionCounterElement.textContent = `Question ${index + 1} of ${questions.length}`;
                prevButton.style.display = index === 0 ? 'none' : 'inline-block';
                nextButton.style.display = index === questions.length - 1 ? 'none' : 'inline-block';
            }

            // THIS IS THE FULLY CORRECTED SUBMIT FUNCTION
            function submitExam() {
                // Check if we are already submitting
                if (isSubmitting) {
                    return; 
                }
                isSubmitting = true;

                clearInterval(countdown);
                clearInterval(takeSnapshot);
                clearInterval(gazeMonitor);
                if (webgazer) webgazer.end();
                const studentEmail = localStorage.getItem('userEmail');

                // ONLY send answers to the backend. Do not calculate score here.
                fetch(`/api/submit-exam/${examId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userAnswers: userAnswers, studentEmail: studentEmail })
                })
                .then(response => response.json())
                .then(result => {
                    if (result.status === 'success') {
                        // ONLY redirect after a successful response from the server.
                        window.location.href = `results.html?score=${result.score}&total=${result.total}`;
                    } else {
                        alert('There was an error submitting your exam. Please try again.');
                        isSubmitting = false; // Allow user to try again if submission fails
                    }
                })
                .catch(error => {
                    console.error('Submission error:', error);
                    alert('Could not connect to the server to submit exam.');
                    isSubmitting = false; // Allow user to try again if connection fails
                });

                // THE OLD, CONFLICTING CODE HAS BEEN REMOVED FROM HERE.
            }

            nextButton.addEventListener('click', () => { if (currentQuestionIndex < questions.length - 1) displayQuestion(++currentQuestionIndex); });
            prevButton.addEventListener('click', () => { if (currentQuestion_index > 0) displayQuestion(--current_question_index); });
            submitButton.addEventListener('click', () => { if (confirm('Are you sure you want to submit?')) submitExam(); });

            if (questions.length > 0) displayQuestion(currentQuestionIndex);

        } catch (error) {
            console.error('Failed to load exam:', error);
            document.querySelector('.exam-content').innerHTML = "<h1>Error Loading Exam</h1><p>Could not fetch exam from the server.</p>";
            if (document.querySelector('.proctoring-sidebar')) {
                document.querySelector('.proctoring-sidebar').style.display = 'none';
            }
        }
    }
}
    // --- LOGIC FOR CREATE EXAM PAGE ---
 // --- LOGIC FOR CREATE EXAM PAGE (UPDATED FOR QUESTION TYPES) ---
if (document.title.includes('Create Exam')) {
    const addQuestionBtn = document.getElementById('add-question-btn');
    const saveExamBtn = document.getElementById('save-exam-btn');
    const questionsContainer = document.getElementById('questions-container');
    let questionCounter = 0;

    function createQuestionCard(qNumber) {
        const newCard = document.createElement('div');
        newCard.classList.add('question-card');
        newCard.dataset.questionNumber = qNumber;
        
        newCard.innerHTML = `
            <div class="question-header">
                <h4>Question ${qNumber}</h4>
                <div class="question-type-selector">
                    <label for="q-type-${qNumber}">Type:</label>
                    <select class="question-type-dropdown" id="q-type-${qNumber}">
                        <option value="multiple-choice" selected>Multiple Choice</option>
                        <option value="true-false">True / False</option>
                    </select>
                </div>
                <button class="delete-btn question-delete">X</button>
            </div>
            
            <textarea class="question-input" placeholder="Enter the question text..."></textarea>
            <label>Answer Options (select the correct one):</label>
            
            <div class="options-container multiple-choice-options">
                <div class="option-input-group"><input type="radio" name="correct-answer-${qNumber}" value="0" checked><input type="text" class="option-input" placeholder="Option A"></div>
                <div class="option-input-group"><input type="radio" name="correct-answer-${qNumber}" value="1"><input type="text" class="option-input" placeholder="Option B"></div>
                <button class="add-option-btn">Add Option</button>
            </div>

            <div class="options-container true-false-options" style="display: none;">
                <div class="option-input-group"><input type="radio" name="correct-answer-${qNumber}" value="true" checked><span>True</span></div>
                <div class="option-input-group"><input type="radio" name="correct-answer-${qNumber}" value="false"><span>False</span></div>
            </div>
        `;
        return newCard;
    }

    if (questionsContainer) {
        questionsContainer.appendChild(createQuestionCard(++questionCounter));

        addQuestionBtn.addEventListener('click', () => {
            questionsContainer.appendChild(createQuestionCard(++questionCounter));
        });

        saveExamBtn.addEventListener('click', async () => {
            const examTitle = document.getElementById('exam-title').value;
            const timeLimit = document.getElementById('time-limit').value;
            const questions = [];

            document.querySelectorAll('.question-card').forEach((card) => {
                const questionType = card.querySelector('.question-type-dropdown').value;
                const questionText = card.querySelector('.question-input').value;
                let questionData = {
                    type: questionType,
                    text: questionText,
                    options: [],
                    correct: null
                };

                if (questionType === 'multiple-choice') {
                    const optionInputs = card.querySelectorAll('.multiple-choice-options .option-input');
                    optionInputs.forEach(input => questionData.options.push(input.value));
                    
                    const correctRadio = card.querySelector('.multiple-choice-options input[type="radio"]:checked');
                    if(correctRadio) {
                        questionData.correct = parseInt(correctRadio.value);
                    }
                } else if (questionType === 'true-false') {
                    questionData.options = ['True', 'False'];
                    const correctRadio = card.querySelector('.true-false-options input[type="radio"]:checked');
                    if(correctRadio) {
                        // Convert string 'true' or 'false' to boolean
                        questionData.correct = (correctRadio.value === 'true');
                    }
                }
                questions.push(questionData);
            });

            const examData = { title: examTitle, timeLimit: parseInt(timeLimit) || 30, questions: questions };
            
            try {
                const response = await fetch('/api/save-exam', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(examData)
                });
                if(response.ok) {
                    alert('Exam Saved Successfully!');
                    window.location.href = 'admin-dashboard.html';
                } else {
                    alert('Failed to save exam.');
                }
            } catch(error) {
                console.error('Error saving exam:', error);
                alert('An error occurred while saving the exam.');
            }
        });

        questionsContainer.addEventListener('click', function(event) {
            const { target } = event;
            const questionCard = target.closest('.question-card');
            if (!questionCard) return;

            if (target.classList.contains('add-option-btn')) {
                const radioName = questionCard.querySelector('.multiple-choice-options input[type="radio"]').name;
                const optionCount = questionCard.querySelectorAll('.multiple-choice-options .option-input-group').length;
                const newOptionGroup = document.createElement('div');
                newOptionGroup.classList.add('option-input-group');
                newOptionGroup.innerHTML = `<input type="radio" name="${radioName}" value="${optionCount}"><input type="text" class="option-input" placeholder="Another Option">`;
                target.parentNode.insertBefore(newOptionGroup, target);
            }
            if (target.classList.contains('question-delete')) {
                if (confirm('Are you sure you want to delete this question?')) {
                    questionCard.remove();
                }
            }
        });

        questionsContainer.addEventListener('change', function(event) {
            if (event.target.classList.contains('question-type-dropdown')) {
                const questionCard = event.target.closest('.question-card');
                const selectedType = event.target.value;
                
                const mcOptions = questionCard.querySelector('.multiple-choice-options');
                const tfOptions = questionCard.querySelector('.true-false-options');

                if (selectedType === 'true-false') {
                    mcOptions.style.display = 'none';
                    tfOptions.style.display = 'block';
                } else {
                    mcOptions.style.display = 'block';
                    tfOptions.style.display = 'none';
                }
            }
        });
    }
}
    // --- LOGIC FOR REVIEW EXAM PAGE ---
    if (document.title.includes('Review Exam')) {
        const gallery = document.getElementById('snapshot-gallery');
        async function loadSnapshots() {
            if (!gallery) return;
            try {
                const response = await fetch('/api/get-snapshots');
                const result = await response.json();
                gallery.innerHTML = '';
                if (result.status === 'success' && result.snapshots.length > 0) {
                    result.snapshots.forEach(snapshot => {
                        const item = document.createElement('div');
                        item.className = 'snapshot-item';
                        if (snapshot.offScreenGaze) item.classList.add('gaze-deviation');
                        item.innerHTML = `
                            <div class="snapshot-buttons"><button class="delete-snapshot-button" data-filename="${snapshot.filename}">×</button></div>
                            <img src="/snapshots/${snapshot.filename}" alt="Snapshot">
                            <p>
                                ${new Date(parseInt(snapshot.filename.split('_')[1])).toLocaleString()}
                                ${snapshot.offScreenGaze ? '<br><span class="gaze-alert">Gaze Deviation</span>' : ''}
                            </p>`;
                        gallery.appendChild(item);
                    });
                } else {
                    gallery.innerHTML = '<p>No snapshots have been recorded.</p>';
                }
            } catch (error) {
                gallery.innerHTML = '<p>Could not load snapshots.</p>';
            }
        }
        if (gallery) {
            gallery.addEventListener('click', async (event) => {
                if (event.target.classList.contains('delete-snapshot-button')) {
                    const filename = event.target.dataset.filename;
                    if (confirm(`Delete snapshot ${filename}?`)) {
                        await fetch(`/api/delete-snapshot/${filename}`, { method: 'DELETE' });
                        loadSnapshots();
                    }
                }
            });
            loadSnapshots();
        }
    }

    // --- LOGIC FOR RESULTS PAGE ---
    if (document.title.includes('Exam Results')) {
        const scorePercentageElement = document.getElementById('score-percentage');
        const correctAnswersElement = document.getElementById('correct-answers');
        const totalQuestionsElement = document.getElementById('total-questions');
        const scoreCircle = document.querySelector('.score-circle');

        const urlParams = new URLSearchParams(window.location.search);
        const score = urlParams.get('score');
        const total = urlParams.get('total');

        if (score !== null && total !== null && scorePercentageElement) {
            const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
            scorePercentageElement.textContent = `${percentage}%`;
            correctAnswersElement.textContent = score;
            totalQuestionsElement.textContent = total;
            if (scoreCircle) {
                if (percentage >= 50) scoreCircle.classList.add('pass');
                else scoreCircle.classList.add('fail');
            }
        }
    }

    // --- LOGIC FOR ALL DATA PAGE ---
    if (document.title.includes('All Data')) {
        async function loadAllData() {
            // Fetch and render users
            try {
                const usersRes = await fetch('/api/get-all-users');
                const usersResult = await usersRes.json();
                const usersTableBody = document.querySelector('#users-table tbody');
                usersTableBody.innerHTML = '';
                if (usersResult.users.length > 0) {
                    document.getElementById('no-users-message').classList.add('hidden-message');
                    usersResult.users.forEach(user => {
                        const row = usersTableBody.insertRow();
                        row.insertCell().textContent = user.fullName;
                        row.insertCell().textContent = user.email;
                        row.insertCell().textContent = user.role;
                    });
                } else {
                    document.getElementById('no-users-message').classList.remove('hidden-message');
                }
            } catch (e) { document.querySelector('#users-table tbody').innerHTML = '<tr><td colspan="3">Error loading users.</td></tr>'; }

            // Fetch and render exams
            try {
                const examsRes = await fetch('/api/get-all-exams');
                const examsResult = await examsRes.json();
                const examsTableBody = document.querySelector('#exams-table tbody');
                examsTableBody.innerHTML = '';
                if (examsResult.exams.length > 0) {
                    document.getElementById('no-exams-message').classList.add('hidden-message');
                    examsResult.exams.forEach(exam => {
                        const row = examsTableBody.insertRow();
                        row.insertCell().textContent = exam.title;
                        row.insertCell().textContent = exam.timeLimit;
                        row.insertCell().textContent = exam.questions.length;
                        row.insertCell().textContent = new Date(exam.createdOn).toLocaleString();
                    });
                } else {
                    document.getElementById('no-exams-message').classList.remove('hidden-message');
                }
            } catch (e) { document.querySelector('#exams-table tbody').innerHTML = '<tr><td colspan="4">Error loading exams.</td></tr>'; }

            // Fetch and render snapshots
            try {
                const snapshotsRes = await fetch('/api/get-all-snapshots-data');
                const snapshotsResult = await snapshotsRes.json();
                const snapshotsTableBody = document.querySelector('#snapshots-table tbody');
                snapshotsTableBody.innerHTML = '';
                if (snapshotsResult.snapshots.length > 0) {
                    document.getElementById('no-snapshots-message').classList.add('hidden-message');
                    snapshotsResult.snapshots.forEach(snapshot => {
                        const row = snapshotsTableBody.insertRow();
                        row.insertCell().innerHTML = `<img src="/snapshots/${snapshot.filename}" style="width:100px; border-radius: 4px;">`;
                        row.insertCell().textContent = new Date(snapshot.timestamp).toLocaleString();
                        row.insertCell().textContent = snapshot.offScreenGaze ? 'Yes' : 'No';
                    });
                } else {
                    document.getElementById('no-snapshots-message').classList.remove('hidden-message');
                }
            } catch (e) { document.querySelector('#snapshots-table tbody').innerHTML = '<tr><td colspan="3">Error loading snapshots.</td></tr>'; }
        }
        loadAllData();
    }
// ... keep all the existing code for other pages ...

    // --- LOGIC FOR MY RESULTS PAGE (NEW) ---
    if (document.title.includes('My Results')) {
        const resultsTableBody = document.querySelector('#results-table tbody');
        const noResultsMessage = document.getElementById('no-results-message');
        const studentEmail = localStorage.getItem('userEmail');

        async function loadMyResults() {
            if (!studentEmail) {
                resultsTableBody.innerHTML = `<tr><td colspan="4">Could not find user email. Please log in again.</td></tr>`;
                return;
            }

            try {
                const response = await fetch(`/api/my-results?email=${studentEmail}`);
                const data = await response.json();

                resultsTableBody.innerHTML = ''; // Clear existing rows

                if (data.status === 'success' && data.results.length > 0) {
                    noResultsMessage.classList.add('hidden-message');
                    data.results.forEach(result => {
                        const percentage = Math.round((result.score / result.totalQuestions) * 100);
                        const row = resultsTableBody.insertRow();
                        
                        row.insertCell().textContent = result.examTitle;
                        row.insertCell().textContent = new Date(result.dateTaken).toLocaleDateString();
                        row.insertCell().textContent = `${result.score} / ${result.totalQuestions}`;
                        
                        const percentageCell = row.insertCell();
                        percentageCell.innerHTML = `<span class="score ${percentage >= 50 ? 'pass' : 'fail'}">${percentage}%</span>`;
                    });
                } else {
                    noResultsMessage.classList.remove('hidden-message');
                }
            } catch (error) {
                console.error('Error loading results:', error);
                resultsTableBody.innerHTML = `<tr><td colspan="4">An error occurred while loading your results.</td></tr>`;
            }
        }

        loadMyResults();
    }

// ... keep all the existing code for other pages ...

// --- LOGIC FOR PROFILE PAGE (ALL FEATURES INCLUDED) ---
if (document.title.includes('My Profile')) {
    const studentEmail = localStorage.getItem('userEmail');

    // --- Element References ---
    const profileForm = document.getElementById('profile-details-form');
    const fullNameInput = document.getElementById('profile-fullname');
    const emailInput = document.getElementById('profile-email');
    
    const examsTakenElement = document.getElementById('stats-exams-taken');
    const avgScoreElement = document.getElementById('stats-average-score');

    const passwordForm = document.getElementById('change-password-form');
    
    const avatarImg = document.getElementById('profile-avatar-img');
    const avatarForm = document.getElementById('avatar-upload-form');
    const avatarInput = document.getElementById('avatar-input');
    const removeAvatarBtn = document.getElementById('remove-avatar-btn');
    
    const deleteBtn = document.getElementById('delete-account-btn');
    
    const profileNotification = document.getElementById('notification-container-profile');
    const passwordNotification = document.getElementById('notification-container-password');
    const avatarNotification = document.getElementById('notification-container-avatar');

    // --- Helper Functions ---
    function showProfileNotification(message, type, container) {
        if (!container) return;
        container.textContent = message;
        container.className = `notification ${type}`;
        setTimeout(() => container.classList.add('hidden'), 5000);
    }

    async function loadProfile() {
        if (!studentEmail) {
            fullNameInput.value = 'Error: Not logged in.';
            emailInput.value = 'Please log in again.';
            return;
        }
        try {
            const response = await fetch(`/api/profile?email=${studentEmail}`);
            const data = await response.json();
            if (data.status === 'success') {
                fullNameInput.value = data.profile.fullName;
                emailInput.value = data.profile.email;
                if (data.profile.avatarUrl) {
                    avatarImg.src = data.profile.avatarUrl;
                } else {
                    avatarImg.src = 'assets/img/default-avatar.png';
                }
            } else {
                fullNameInput.value = 'Could not load profile.';
            }
        } catch (error) { console.error('Error loading profile:', error); }
    }

    async function loadProfileStats() {
        if (!studentEmail) return;
        try {
            const response = await fetch(`/api/profile/stats?email=${studentEmail}`);
            const data = await response.json();
            if (data.status === 'success') {
                examsTakenElement.textContent = data.stats.totalExamsTaken;
                avgScoreElement.textContent = `${data.stats.averageScore}%`;
            }
        } catch (error) {
            console.error('Error loading profile stats:', error);
            examsTakenElement.textContent = 'N/A';
            avgScoreElement.textContent = 'N/A';
        }
    }

    // --- Event Listeners ---
    if (profileForm) {
        profileForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const newFullName = fullNameInput.value;
            const submitButton = profileForm.querySelector('button');
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';
            try {
                const response = await fetch('/api/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: studentEmail, fullName: newFullName })
                });
                const result = await response.json();
                if (response.ok) {
                    showProfileNotification('Profile updated successfully!', 'success', profileNotification);
                } else {
                    showProfileNotification(`Error: ${result.message}`, 'error', profileNotification);
                }
            } catch (error) {
                showProfileNotification('Could not connect to the server.', 'error', profileNotification);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Save Changes';
            }
        });
    }

    if (passwordForm) {
        passwordForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            if (newPassword !== confirmPassword) {
                showProfileNotification('New passwords do not match.', 'error', passwordNotification);
                return;
            }
            const submitButton = passwordForm.querySelector('button');
            submitButton.disabled = true;
            submitButton.textContent = 'Updating...';
            try {
                const response = await fetch('/api/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: studentEmail, currentPassword, newPassword })
                });
                const result = await response.json();
                if (response.ok) {
                    showProfileNotification('Password changed successfully!', 'success', passwordNotification);
                    passwordForm.reset();
                } else {
                    showProfileNotification(`Error: ${result.message}`, 'error', passwordNotification);
                }
            } catch (error) {
                showProfileNotification('Could not connect to the server.', 'error', passwordNotification);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Update Password';
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            const password = prompt('To delete your account, please enter your password:');
            if (password === null) return;
            if (!confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) return;
            try {
                const response = await fetch('/api/profile', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: studentEmail, password: password })
                });
                const result = await response.json();
                if (response.ok) {
                    alert('Your account has been successfully deleted.');
                    localStorage.clear();
                    window.location.href = 'index.html';
                } else {
                    alert(`Deletion failed: ${result.message}`);
                }
            } catch (error) {
                alert('Could not connect to the server to delete the account.');
            }
        });
    }

    if (avatarForm) {
        avatarForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitButton = avatarForm.querySelector('button[type="submit"]');
            const file = avatarInput.files[0];
            if (!file) {
                showProfileNotification('Please select an image file.', 'error', avatarNotification);
                return;
            }
            const formData = new FormData();
            formData.append('avatar', file);
            formData.append('email', studentEmail);
            submitButton.disabled = true;
            submitButton.textContent = 'Uploading...';
            try {
                const response = await fetch('/api/profile/avatar', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();
                if (response.ok) {
                    showProfileNotification('Avatar updated!', 'success', avatarNotification);
                    avatarImg.src = `${result.avatarUrl}?t=${new Date().getTime()}`;
                    avatarForm.reset();
                } else {
                    showProfileNotification(`Error: ${result.message}`, 'error', avatarNotification);
                }
            } catch (error) {
                showProfileNotification('Could not connect to the server.', 'error', avatarNotification);
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Upload';
            }
        });
    }

    if (removeAvatarBtn) {
        removeAvatarBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to remove your profile picture?')) return;
            try {
                const response = await fetch('/api/profile/avatar', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: studentEmail })
                });
                const result = await response.json();
                if (response.ok) {
                    showProfileNotification('Avatar removed!', 'success', avatarNotification);
                    avatarImg.src = 'assets/img/default-avatar.png';
                } else {
                    showProfileNotification(`Error: ${result.message}`, 'error', avatarNotification);
                }
            } catch (error) {
                showProfileNotification('Could not connect to the server.', 'error', avatarNotification);
            }
        });
    }

    // --- Initial Data Load ---
    loadProfile();
    loadProfileStats();
}
}); // This is the final closing bracket of the whole file/ This is the final closing bracket of the whole file
