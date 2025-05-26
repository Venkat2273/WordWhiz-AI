function submitScore(score) {
    const urlParams = new URLSearchParams(window.location.search);
    const course = urlParams.get('course');
    console.log('Submitting score for course:', course); // Debug log

    fetch('/submit_score', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: playerName,
            score: score,
            course: course,
            difficulty: difficulty
        })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            console.error('Error submitting score:', data.error);
        }
    })
    .catch(error => console.error('Error:', error));
}


function startQuiz() {
    const selectedCourse = document.querySelector('.selected').textContent;
    console.log('Selected course:', selectedCourse); // Debug log
    const difficulty = document.getElementById('difficultySelect').value;
    window.location.href = `/quiz?course=${encodeURIComponent(selectedCourse)}&difficulty=${difficulty}`;
}