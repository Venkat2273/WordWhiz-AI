// user name
let user = "";

document.addEventListener("DOMContentLoaded", function () {
  user = localStorage.getItem("username");
  console.log("Current user:", user);
  // Fetch initial leaderboard data
  const courseSelect = document.getElementById("courseSelect");
  fetchLeaderboard(courseSelect.value);
});

function fetchLeaderboard(course) {
  console.log("Fetching leaderboard for course:", course);
  
  fetch(`/get_leaderboard?course=${encodeURIComponent(course)}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("Received leaderboard data:", data);
      const tbody = document.getElementById("leaderboardBody");
      tbody.innerHTML = "";

      if (data.success && data.leaderboard && data.leaderboard.length > 0) {
        data.leaderboard.forEach((entry, index) => {
          const date = new Date(entry.timestamp).toLocaleDateString();
          const row = document.createElement("tr");
          
          // Highlight current user's row
          if (entry.name === user) {
            row.classList.add("table-success");
          }
          
          row.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.name || 'Anonymous'}</td>
            <td>${entry.score}</td>
            <td>${entry.difficulty}</td>
            <td>${date}</td>
          `;
          tbody.appendChild(row);
        });
      } else {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">No scores available for this course</td></tr>`;
      }
    })
    .catch((error) => {
      console.error("Error fetching leaderboard:", error);
      const tbody = document.getElementById("leaderboardBody");
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error loading leaderboard data</td></tr>`;
    });
}

const courseSelect = document.getElementById("courseSelect");
courseSelect.addEventListener("change", (e) => {
  fetchLeaderboard(e.target.value);
});

// Add feedback form submission handling
document.addEventListener('DOMContentLoaded', function() {
  const feedbackForm = document.getElementById('feedbackForm');
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = {
        name: document.getElementById('name').value,
        rating: document.getElementById('rating').value,
        feedback: document.getElementById('feedback').value
      };
      
      fetch('/submit_feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          feedbackForm.style.display = 'none';
          document.getElementById('successMessage').style.display = 'block';
        } else {
          alert('Error submitting feedback: ' + data.error);
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while submitting your feedback.');
      });
    });
  }
});
