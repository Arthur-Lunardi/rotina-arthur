const checkboxes =
document.querySelectorAll(
'input[type="checkbox"]'
);

const diaAtual =
new Date().toLocaleDateString(
'pt-BR',
{ weekday: 'long' }
);

document.getElementById(
'diaAtual'
).innerText =
diaAtual.toUpperCase();

const chaveDia =
new Date().toISOString().split('T')[0];

carregar();

checkboxes.forEach(cb => {

cb.addEventListener(
'change',
() => {

salvar();
atualizar();

});

});

function salvar(){

const dados={};

checkboxes.forEach(cb => {

dados[cb.id]=cb.checked;

});

localStorage.setItem(
chaveDia,
JSON.stringify(dados)
);

}

function carregar(){

const dados=
JSON.parse(
localStorage.getItem(chaveDia)
);

if(!dados) return;

checkboxes.forEach(cb => {

cb.checked=
dados[cb.id] || false;

});

atualizar();

}

function atualizar(){

const total=
checkboxes.length;

let marcados=0;

checkboxes.forEach(cb => {

if(cb.checked)
marcados++;

});

const porcentagem=
Math.round(
(marcados/total)*100
);

document.getElementById(
'barraInterna'
).style.width=
porcentagem + '%';

document.getElementById(
'percentual'
).innerText=
porcentagem + '%';

contarEstatisticas();

}

function contarEstatisticas(){

let dias=0;
let treinos=0;

for(let i=0;i<localStorage.length;i++){

const chave=
localStorage.key(i);

const dados=
JSON.parse(
localStorage.getItem(chave)
);

if(!dados) continue;

const valores=
Object.values(dados);

if(valores.every(v=>v))
dias++;

if(dados.treino)
treinos++;

}

document.getElementById(
'diasConcluidos'
).innerText=dias;

document.getElementById(
'treinosRealizados'
).innerText=treinos;

}

atualizar();