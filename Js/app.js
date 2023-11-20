document.getElementById("searchBtn").addEventListener("click", function (e) {
  e.preventDefault();
  var searchQuery = document.getElementById("searchQuery").value;

  fetch("'http://localhost:8080/api/search'", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ searchQuery: searchQuery }),
  })
    .then((response) => response.json())
    .then((data) => {
      updateSearchResults(data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});

function updateSearchResults(data) {
  var resultsTableBody = document.querySelector("#resultsTable tbody");
  resultsTableBody.innerHTML = ""; // 清空当前的搜索结果
  // 假设返回的数据结构是 { results: [{ icdCode, conditionName, conditionChineseName }, ...] }
  data.results.forEach((result) => {
    var row = resultsTableBody.insertRow();
    row.innerHTML = `<td>${result.icdCode}</td><td>${result.conditionName}</td><td>${result.conditionChineseName}</td>`;
  });
}
