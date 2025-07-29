document.getElementById('sendBtn').addEventListener('click', () => {
  const input = document.getElementById('userInput').value;
  if (input.trim() === '') return;
  const chat = document.getElementById('chat');
  chat.innerHTML += `<div><b>You:</b> ${input}</div>`;
  document.getElementById('userInput').value = '';
  chat.innerHTML += `<div><b>Spanky:</b> I saw what you typed and now my circuits are tingling. (Actual backend coming soon!)</div>`;
});
