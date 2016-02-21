var data;
var key;
var lineCell;
var lineText;
var nameCell;
var nameText;
var newRow;
var scoreCell;
var scoreText;
var timeCell;
var timeText;

if (window.localStorage) {
  for (var i = 0; i < localStorage.length; i += 1) {
    key = localStorage.key(i);
    data = JSON.parse(localStorage.getItem(key));

    newRow = document.createElement('tr');

    nameCell = document.createElement('td');
    nameText = document.createTextNode(data.username);
    nameCell.appendChild(nameText);

    scoreCell = document.createElement('td');
    scoreText = document.createTextNode(data.score);
    scoreCell.appendChild(scoreText);

    lineCell = document.createElement('td');
    lineText = document.createTextNode(data.totalLines);
    lineCell.appendChild(lineText);

    timeCell = document.createElement('td');
    timeText = document.createTextNode(data.roundTime);
    timeCell.appendChild(timeText);

    newRow.appendChild(nameCell);
    newRow.appendChild(scoreCell);
    newRow.appendChild(lineCell);
    newRow.appendChild(timeCell);

    document.getElementById('tableData').appendChild(newRow);
  }
}
