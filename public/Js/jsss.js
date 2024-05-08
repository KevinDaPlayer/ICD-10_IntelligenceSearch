const searchInput = document.getElementById("searchQuery");

// 输入框绑定输入事件
searchInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    // 按下回车键触发搜索
    const keyword = searchInput.value;

    // 调用搜索函数
    await search(keyword);
  }
});

async function search(keyword) {
  const response = await fetch("/api/searchIcd10", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      keyword,
    }),
  });

  const data = await response.json();

  // 处理结果...
}
