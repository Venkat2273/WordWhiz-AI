document.addEventListener('DOMContentLoaded', function() {
    // Get course from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const course = urlParams.get('course');
    
    fetchLeaderboard(course);
});

async function fetchLeaderboard(course) {
    try {
        const url = course 
            ? `/get_leaderboard?course=${encodeURIComponent(course)}`
            : '/get_leaderboard';
        
        const response = await fetch(url);
        const data = await response.json();
        displayLeaderboard(data.leaderboard);
        
        // Update title if course is specified
        if (course) {
            document.querySelector('h1').textContent = `${course} Quiz Leaderboard`;
        }
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
    }
}

function displayLeaderboard(leaderboard) {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';

    leaderboard.forEach((entry, index) => {
        const row = document.createElement('tr');
        const date = new Date(entry.timestamp);
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.name}</td>
            <td>${entry.score}</td>
            <td>${entry.course}</td>
            <td>${entry.difficulty}</td>
            <td>${date.toLocaleDateString()}</td>
        `;
        tbody.appendChild(row);
    });
}