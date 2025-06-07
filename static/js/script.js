const subjectMap = {
  "Computer Technology": [
    "Programming",
    "Data Structures",
    "Networking",
    "Databases",
    "Operating Systems",
    "Cybersecurity",
  ],
  "Tool and Die": [
    "Mechanical Drawing",
    "Material Science",
    "CNC Machining",
    "Die Design",
    "Manufacturing Processes",
  ],
  Mechatronics: [
    "Sensors and Actuators",
    "Microcontrollers",
    "Control Systems",
    "Robotics",
    "PLCs and Automation",
  ],
  Electronics: [
    "Basic Circuits",
    "Analog and Digital Electronics",
    "Embedded Systems",
    "Signal Processing",
    "PCB Design",
  ],
  Electrical: [
    "Power Systems",
    "Electrical Machines",
    "Circuit Theory",
    "Renewable Energy",
    "Industrial Wiring",
  ],
};

let currentQuestionIndex = 0;
let questionsList = [];
let userAnswers = [];
let selectedCourse = "";
let selectedDifficulty = "easy";
let timer = null;

// Store initial data when page loads
document.addEventListener("DOMContentLoaded", () => {
  // Clear any old quiz data
  localStorage.removeItem("quizResults");
});

function setUsernameinLS() {
  const usernameInput = document.getElementById("username");
  const name = usernameInput.value;
  localStorage.setItem("username", name);
}

function nextStep() {
  const username = document.getElementById("username").value.trim();
  if (username) {
    // Store username in localStorage
    localStorage.setItem("username", username);
    document.getElementById("step-1").style.display = "none";
    document.getElementById("step-2").style.display = "block";
    document.getElementById("back-btn").style.display = "block";
  } else {
    alert("Please enter your name to continue.");
  }
}

// Handle difficulty selection
document.querySelectorAll(".difficulty-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    document
      .querySelectorAll(".difficulty-btn")
      .forEach((b) => b.classList.remove("active"));
    this.classList.add("active");
    selectedDifficulty = this.getAttribute("data-difficulty");
  });
});

// Fetch a question from the server
function fetchQuestion(course, difficulty, topics) {
  fetch("/get_questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      course: course,
      difficulty: difficulty,
      topics: topics,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      questionsList = data.questions;
      currentQuestionIndex = 0;
      userAnswers = [];
      showQuestion();

      setTimeout(() => {
        document.getElementById("quiz-area").style.display = "block";
        document.getElementById("step-3").classList.add("hide");
      }, 3000);
    });
}

// Handle course selection
function selectCourse(courseKey) {
  const courseMap = {
    computer_tech: "Computer Technology",
    tool_die: "Tool and Die",
    mechatronics: "Mechatronics",
    electronics: "Electronics",
    electricals: "Electrical",
  };

  selectedCourse = courseMap[courseKey];
  const subjects = subjectMap[selectedCourse] || [];

  document.getElementById("step-2").style.display = "none";
  document.getElementById("step-3").classList.remove("hide");
  document.getElementById("category-badge").textContent = selectedCourse;

  // Store course and difficulty in localStorage
  localStorage.setItem("selectedCourse", selectedCourse);
}

function SetDifficulty(diff) {
  selectedDifficulty = diff;
  document.getElementById("difficulty-badge").textContent = selectedDifficulty;
  localStorage.setItem("selectedDifficulty", selectedDifficulty);
  fetchQuestion(selectedCourse, selectedDifficulty);
}

if (timer) clearInterval(timer);

// Submit answer
function submitAnswer() {
  // IMPORTANT: Ensure 'userAnswers' contains ALL 10-11 quiz results
  // For example, if you collect answers one by one, 'userAnswers' should be populated
  // with objects like { selected: '...', correct: '...', questionText: '...' }
  // for all questions when this function is called.
  const quizResults = userAnswers;

  // 1. Store the complete quiz results array in localStorage
  localStorage.setItem("quizResults", JSON.stringify(quizResults));

  // 2. Redirect the user to the results page
  //    Make sure this path is correct. If 'results.html' is in the same directory
  //    as 'index.html', then 'results.html' is usually sufficient.
  //    If you are using Flask's url_for or a specific route, ensure it matches.
  //    If '/result' is your Flask route for rendering results.html, that's fine.
  window.location.href = "/result";
}

// Timer logic
function startTimer() {
  let timeLeft = 30;
  document.getElementById("timer").innerText = `Time left: ${timeLeft}s`;

  timer = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").innerText = `Time left: ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timer);
      alert("⏰ Time up!");
      const topics = subjectMap[selectedCourse] || [];
      fetchQuestion(selectedCourse, selectedDifficulty, topics);
    }
  }, 1000);
}

// Hint function
function getHint() {
  const hint = document.getElementById("hint").innerText;
  alert(hint);
}

// Skip question
function skipQuestion() {
  if (timer) clearInterval(timer);
  const topics = subjectMap[selectedCourse] || [];
  fetchQuestion(selectedCourse, selectedDifficulty, topics);
}

// Sound toggle (not implemented yet)
function toggleSound() {
  console.log("Sound toggled (not implemented yet)");
}

// Help modal
function showHelp() {
  document.getElementById("helpModal").style.display = "block";
}

function closeModal() {
  document.getElementById("helpModal").style.display = "none";
  document.getElementById("resultsModal").style.display = "none";
}

// Go back to course selection
function goBackToCourseSelection() {
  if (timer) clearInterval(timer);
  questionsList = [];
  selectedCourse = "";

  document.getElementById("quiz-area").classList.add("hide");
  document.getElementById("step-2").style.display = "block";
  document.getElementById("step-3").classList.add("hide");
  document.getElementById("quiz-area").style.display = "none"; // document.getElementById("result").innerText = "";
  // // document.getElementById("hint").innerText = "";
  // document.getElementById("timer").innerText = "";
  // document.getElementById("question").innerText = "";
  // document.getElementById("answer").value = "";
}
function showQuestion() {
  const q = questionsList[currentQuestionIndex];
  document.getElementById("question").innerText = q.clue;

  const optionsDiv = document.getElementById("options");
  optionsDiv.innerHTML = "";

  q.options.forEach((option) => {
    const button = document.createElement("button");
    button.innerText = option;
    button.onclick = () => selectAnswer(option);
    optionsDiv.appendChild(button);
  });
}
function selectAnswer(option) {
    userAnswers.push({
        questionText: questionsList[currentQuestionIndex].clue,
        selected: option,
        correct: questionsList[currentQuestionIndex].answer,
    });

    // If all 10 questions are answered
    if (userAnswers.length >= 10) {
        // Calculate score
        const correct = userAnswers.filter((a) => a.selected === a.correct).length;
        const score = correct * 10;

        // Store results and score in localStorage
        localStorage.setItem("quizResults", JSON.stringify(userAnswers));
        localStorage.setItem("quizScore", score.toString());

        // Clear question area and show view results button
        const quizArea = document.getElementById("quiz-area");
        quizArea.innerHTML = `
            <h2>Quiz Complete!</h2>
            <div class="quiz-summary">
                <p>You have completed all 10 questions.</p>
                <p>Click the button below to see your results:</p>
            </div>
            <button onclick="viewResults()" class="submit-button">View Results</button>
        `;
    } else if (currentQuestionIndex + 1 < questionsList.length) {
        // Show next question
        currentQuestionIndex++;
        showQuestion();
    }
}

function viewResults() {
    // Navigate to results page
    window.location.href = "/result";
}

// Add this function to your results page JavaScript
function submitToLeaderboardFromResults() {
    const score = parseInt(localStorage.getItem("quizScore"));
    let username = localStorage.getItem("username");
    const course = localStorage.getItem("selectedCourse");
    const difficulty = localStorage.getItem("selectedDifficulty");

    console.log("Submitting score with data:", { score, username, course, difficulty });

    // Validate data before sending
    if (!score || isNaN(score)) {
        alert("Invalid score data");
        return;
    }
    
    // Make sure we have a username
    if (!username || username.trim() === "") {
        username = prompt("Please enter your name for the leaderboard:", "Anonymous");
        if (!username) username = "Anonymous";
        localStorage.setItem("username", username);
    }
    
    if (!course || !difficulty) {
        alert("Missing course or difficulty data");
        return;
    }

    // Debug log
    console.log("Sending data to server:", {
        name: username,
        score: score,
        course: course,
        difficulty: difficulty
    });

    fetch("/submit_score", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name: username,
            score: score,
            course: course,
            difficulty: difficulty,
        }),
    })
    .then(response => {
        console.log("Server response status:", response.status);
        return response.json();
    })
    .then(data => {
        console.log("Server response data:", data);
        if (data.success) {
            // Clear localStorage after successful submission
            localStorage.removeItem("quizResults");
            localStorage.removeItem("quizScore");
            localStorage.removeItem("selectedCourse");
            localStorage.removeItem("selectedDifficulty");
            // Keep username in localStorage for future quizzes
            
            // Redirect to leaderboard
            window.location.href = "/leaderboard";
        } else {
            alert("Failed to submit score: " + (data.error || "Unknown error"));
        }
    })
    .catch(error => {
        console.error("Error submitting score:", error);
        alert("Error submitting score. Please try again.");
    });
}
let correct = userAnswers.filter((a) => a.selected === a.correct).length;
let total = userAnswers.length;
// alert(`Quiz Completed! \nCorrect Answers: ${correct}/${total}`);

document.getElementById("resultsModal").style.display = "block";
document.getElementById("total-questions").innerText = total;
document.getElementById("final-correct").innerText = correct;
document.getElementById("final-accuracy").innerText = `${(
  (correct / total) *
  100
).toFixed(2)}%`;
