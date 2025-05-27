// user name
let user = "";

document.addEventListener("DOMContentLoaded", function () {
  user = localStorage.getItem("username");
  console.log("user is :", user);
});

function fetchLeaderboard(course) {
  fetch(`/get_leaderboard?course=${encodeURIComponent(course)}`)
    .then((response) => response.json())
    .then((data) => {
      const tbody = document.getElementById("leaderboardBody");
      tbody.innerHTML = "";

      if (data.success && data.leaderboard.length > 0) {
        data.leaderboard.forEach((entry, index) => {
          const date = new Date(entry.timestamp).toLocaleDateString();
          const row = document.createElement("tr");
          if (entry.name == user) {
            row.classList.add("highlight");
          }
          row.innerHTML = `
                                <td>${index + 1}</td>
                                <td>${entry.name}</td>
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
    });
}

const courseSelect = document.getElementById("courseSelect");
fetchLeaderboard(courseSelect.value);
courseSelect.addEventListener("change", (e) => {
  fetchLeaderboard(e.target.value);
});
