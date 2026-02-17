require('dotenv').config();

async function getVocab() {
  const response = await fetch('http://localhost:3471/api/vocab/ita_for_eng');
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

getVocab();
