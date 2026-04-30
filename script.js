const SUPABASE_URL = 'https://lrzofimngusbcwlqbsts.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyem9maW1uZ3VzYmN3bHFic3RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Nzk4NjgsImV4cCI6MjA5MzA1NTg2OH0.SF21e1Sx_bueRV48exU08NGG2raNahY68nngPtWWLKU';

let map, markersLayer;
let praias = [];
let praiaSelecionada = null;
let usuarioId = null;

let listaElement, filtroInput, painelDetalhes, praiaNome, praiaTipo, praiaDados, praiaPerigos;
let analisePraia, eventosDiv, servicosDiv, comentariosDiv, comentarioInput, btnEnviar;

window.addEventListener('DOMContentLoaded', () => {
    iniciarApp();
});

async function iniciarApp() {
    listaElement = document.getElementById('listaPraias');
    filtroInput = document.getElementById('filtroPraia');
    painelDetalhes = document.getElementById('painelDetalhes');
    praiaNome = document.getElementById('praiaNome');
    praiaTipo = document.getElementById('praiaTipo');
    praiaDados = document.getElementById('praiaDados');
    praiaPerigos = document.getElementById('praiaPerigos');
    analisePraia = document.getElementById('analisePraia');
    eventosDiv = document.getElementById('eventos');
    servicosDiv = document.getElementById('servicos');
    comentariosDiv = document.getElementById('comentarios');
    comentarioInput = document.getElementById('comentario');
    btnEnviar = document.getElementById('btnEnviar');
    
    configurarMapa();
    usuarioId = await inicializarUsuario();
    btnEnviar.addEventListener('click', enviarComentario);
    filtroInput.addEventListener('input', filtrarPraias);
    await carregarPraias();
}

function configurarMapa() {
    map = L.map('map').setView([-3.73, -38.52], 11);
    markersLayer = L.layerGroup().addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap & CARTO'
    }).addTo(map);
}

async function fazerRequisicaoSupabase(tabela, filtros = '') {
    const url = `${SUPABASE_URL}/rest/v1/${tabela}?${filtros}`;
    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
    };
    
    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            console.error(`Erro na requisicao: ${response.status}`);
            return null;
        }
        return await response.json();
    } catch (erro) {
        console.error(`Erro ao buscar ${tabela}:`, erro);
        return null;
    }
}

async function inserirNoSupabase(tabela, dados) {
    const url = `${SUPABASE_URL}/rest/v1/${tabela}`;
    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(dados)
        });
        return response.ok;
    } catch (erro) {
        console.error(`Erro ao inserir em ${tabela}:`, erro);
        return false;
    }
}

async function inicializarUsuario() {
    let id = localStorage.getItem('shakaUserId');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('shakaUserId', id);
    }

    await inserirNoSupabase('Usuario', {
        id,
        nome: 'Surfista Anonimo',
        email: ''
    });

    return id;
}

async function carregarPraias() {
    const filtros = 'order=nivel_popularidade.desc';
    let data = await fazerRequisicaoSupabase('Praia', filtros);
    
    if (!data) {
        data = await fazerRequisicaoSupabase('praia', filtros);
    }
    
    if (!data) {
        listaElement.innerHTML = '<p>Nao foi possivel carregar as praias.</p>';
        return;
    }

    praias = data;
    renderizarLista(praias);
    atualizarMarcadores(praias);
}

function atualizarMarcadores(lista) {
    markersLayer.clearLayers();
    lista.forEach(p => {
        const marker = L.marker([p.latitude, p.longitude], {
            title: p.nome
        }).addTo(markersLayer);

        marker.bindPopup(`<strong>${p.nome}</strong><br>${p.tipo_onda || 'Sem tipo'}<br>Popularidade: ${p.nivel_popularidade}`);
        marker.on('click', () => selecionarPraia(p));
    });
}

function renderizarLista(lista) {
    listaElement.innerHTML = '';

    if (!lista.length) {
        listaElement.innerHTML = '<p>Nenhuma praia encontrada.</p>';
        return;
    }

    lista.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="titulo">${p.nome}</div>
            <div class="descricao">${p.tipo_onda ? `Onda: ${p.tipo_onda}` : 'Tipo de onda nao informado'} - Popularidade: ${p.nivel_popularidade}/5</div>
            <div class="descricao">Dificuldade: ${p.nivel_dificuldade}/5 - Perigos: ${p.perigos || 'Nenhum informado'}</div>
        `;
        card.addEventListener('click', () => selecionarPraia(p));
        listaElement.appendChild(card);
    });
}

function filtrarPraias() {
    const termo = filtroInput.value.toLowerCase().trim();
    const filtradas = praias.filter(p => {
        return p.nome.toLowerCase().includes(termo)
            || (p.tipo_onda || '').toLowerCase().includes(termo)
            || (p.perigos || '').toLowerCase().includes(termo);
    });
    renderizarLista(filtradas);
    atualizarMarcadores(filtradas);
}

async function selecionarPraia(praia) {
    praiaSelecionada = praia;
    painelDetalhes.classList.remove('hidden');
    praiaNome.textContent = praia.nome;
    praiaTipo.textContent = praia.tipo_onda ? praia.tipo_onda : 'Tipo de onda nao informado';
    praiaPerigos.textContent = praia.perigos || 'Nenhum perigo listado.';

    praiaDados.innerHTML = `
        <div class="info-card"><strong>Popularidade:</strong> ${renderizarEstrelas(praia.nivel_popularidade)}</div>
        <div class="info-card"><strong>Dificuldade:</strong> ${renderizarEstrelas(praia.nivel_dificuldade)}</div>
        <div class="info-card"><strong>Latitude:</strong> ${praia.latitude.toFixed(5)}</div>
        <div class="info-card"><strong>Longitude:</strong> ${praia.longitude.toFixed(5)}</div>
    `;

    map.flyTo([praia.latitude, praia.longitude], 13, { animate: true });

    await Promise.all([
        carregarAnalisePraia(praia.id),
        carregarEventos(praia.id),
        carregarServicos(praia.id),
        carregarComentarios(praia.id)
    ]);
}

function renderizarEstrelas(valor) {
    let stars = '';
    for (let i = 0; i < 5; i++) {
        stars += i < valor ? '★' : '☆';
    }
    return `<span class="rating">${stars}</span>`;
}

async function carregarAnalisePraia(idPraia) {
    const filtros = `id_praia=eq.${idPraia}`;
    const data = await fazerRequisicaoSupabase('AnalisePraia', filtros);

    if (!data || data.length === 0) {
        analisePraia.innerHTML = '<div class="info-card">Nenhuma analise disponivel.</div>';
        return;
    }

    const analise = data[0];
    analisePraia.innerHTML = `
        <div class="info-card"><strong>Pedras:</strong> ${analise.pedras ? 'Sim' : 'Nao'}</div>
        <div class="info-card"><strong>Corrente forte:</strong> ${analise.corrente_forte ? 'Sim' : 'Nao'}</div>
        <div class="info-card"><strong>Ondas fortes:</strong> ${analise.ondas_fortes ? 'Sim' : 'Nao'}</div>
    `;
}

async function carregarEventos(idPraia) {
    const filtros = `id_praia=eq.${idPraia}&order=data.asc`;
    const data = await fazerRequisicaoSupabase('Evento', filtros);

    if (!data || data.length === 0) {
        eventosDiv.innerHTML = '<div class="info-card">Nenhum evento cadastrado para esta praia.</div>';
        return;
    }

    eventosDiv.innerHTML = data.map(evento => `
        <div class="info-card">
            <strong>${evento.titulo}</strong>
            <p>${evento.descricao || 'Sem descricao'}</p>
            <span>${new Date(evento.data).toLocaleDateString('pt-BR')}</span>
        </div>
    `).join('');
}

async function carregarServicos(idPraia) {
    const filtros = `id_praia=eq.${idPraia}&order=tipo.asc`;
    const data = await fazerRequisicaoSupabase('Servico', filtros);

    if (!data || data.length === 0) {
        servicosDiv.innerHTML = '<div class="info-card">Nenhum servico cadastrado para esta praia.</div>';
        return;
    }

    servicosDiv.innerHTML = data.map(servico => `
        <div class="info-card">
            <strong>${servico.nome}</strong>
            <p>${servico.descricao || 'Descricao nao disponivel.'}</p>
            <span>${servico.tipo} - ${servico.contato || 'Contato nao informado'}</span>
        </div>
    `).join('');
}

async function carregarComentarios(idPraia) {
    const filtros = `id_praia=eq.${idPraia}&order=data.desc`;
    const data = await fazerRequisicaoSupabase('Comentario', filtros);

    if (!data || data.length === 0) {
        comentariosDiv.innerHTML = '<div class="info-card">Seja o primeiro a deixar um comentario.</div>';
        return;
    }

    comentariosDiv.innerHTML = data.map(c => `
        <div class="comentario-item">
            <span>${c.tipo || 'Comentario'} - ${new Date(c.data).toLocaleString('pt-BR')}</span>
            <p>${c.texto}</p>
        </div>
    `).join('');
}

async function enviarComentario() {
    const texto = comentarioInput.value.trim();

    if (!praiaSelecionada) {
        alert('Selecione uma praia primeiro!');
        return;
    }

    if (!texto) {
        alert('Digite uma mensagem antes de enviar.');
        return;
    }

    const sucesso = await inserirNoSupabase('Comentario', {
        texto,
        tipo: 'avaliacao',
        id_praia: praiaSelecionada.id,
        id_usuario: usuarioId,
        data: new Date().toISOString()
    });

    if (!sucesso) {
        alert('Nao foi possivel enviar o comentario.');
        return;
    }

    comentarioInput.value = '';
    await carregarComentarios(praiaSelecionada.id);
}
