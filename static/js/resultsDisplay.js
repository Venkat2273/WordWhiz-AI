/**
 * Dynamically generates and displays the detailed quiz results.
 * @param {Array<Object>} results - An array of quiz result objects, each with 'selected', 'correct', and 'questionText'.
 */
function displayDetailedQuizResults(results) {
  let detailedResultsHTML =
    '<h3>Review Your Answers:</h3><ol class="quiz-detailed-list">';

  // Check if results array is empty or invalid
  if (!Array.isArray(results) || results.length === 0) {
    detailedResultsHTML =
      "<p>No quiz results found or results are empty. Please complete the quiz first!</p>";
  } else {
    results.forEach((item, index) => {
      const isCorrect = item.selected === item.correct;
      const resultClass = isCorrect
        ? "correct-answer-item"
        : "incorrect-answer-item";

      detailedResultsHTML += `
          <li class="${resultClass}">
            <h4>Question ${index + 1}: ${item.questionText}</h4>
            <p>Your Answer: <strong>${item.selected}</strong></p>
            <p>Correct Answer: <strong>${item.correct}</strong></p>
            <p class="feedback-text">${
              isCorrect ? "&#10004; Correct!" : "&#10006; Incorrect!"
            }</p>
          </li>
        `;
    });
    detailedResultsHTML += "</ol>";
  }

  const detailedResultsContainer = document.getElementById(
    "quiz-detailed-results"
  );
  if (detailedResultsContainer) {
    detailedResultsContainer.innerHTML = detailedResultsHTML;
  } else {
    console.error(
      "Error: Element with ID 'quiz-detailed-results' not found on the page."
    );
  }
}

// Logic to run when results.html loads
document.addEventListener("DOMContentLoaded", () => {
  const detailedResultsContainer = document.getElementById(
    "quiz-detailed-results"
  );

  if (detailedResultsContainer) {
    const storedResults = localStorage.getItem("quizResults");

    if (storedResults) {
      try {
        const quizResultsData = JSON.parse(storedResults);
        displayDetailedQuizResults(quizResultsData);
        
        // Calculate score
        const correctAnswers = quizResultsData.filter(item => item.selected === item.correct).length;
        const score = correctAnswers * 10; // 10 points per correct answer
        
        // Get course and difficulty from localStorage
        const course = localStorage.getItem("selectedCourse") || "General";
        const difficulty = localStorage.getItem("selectedDifficulty") || "easy";
        
        // Add a submit button instead of automatic submission
        const submitButton = document.createElement('button');
        submitButton.textContent = 'Submit to Leaderboard';
        submitButton.className = 'submit-button';
        submitButton.onclick = () => submitScore(score, course, difficulty);
        detailedResultsContainer.appendChild(submitButton);
        
        // Clear the stored data only after manual submission
        localStorage.removeItem("quizResults");
        localStorage.removeItem("selectedCourse");
        localStorage.removeItem("selectedDifficulty");
      } catch (e) {
        console.error("Error parsing quiz results from localStorage:", e);
        detailedResultsContainer.innerHTML = "<p>Could not load results. The data might be corrupted. Please try the quiz again.</p>";
      }
    } else {
      detailedResultsContainer.innerHTML = "<p>No quiz results found. Please complete the quiz first!</p>";
    }
  }
});

// Update the submitScore function to handle the transition smoothly
async function submitScore(score, course, difficulty) {
    try {
        const name = localStorage.getItem("username") || "Anonymous";
        const response = await fetch('/submit_score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                score: score,
                course: course,
                difficulty: difficulty
            })
        });
        
        if (response.ok) {
            // Smooth transition to leaderboard
            window.location.href = "/leaderboard";
        } else {
            alert('Failed to submit score. Please try again.');
        }
    } catch (error) {
        console.error('Error submitting score:', error);
        alert('Failed to submit score. Please try again.');
    }
}

// Call this function after displaying the results
// Add this to your existing code where you calculate the final score
submitScore(totalScore, course, difficulty);