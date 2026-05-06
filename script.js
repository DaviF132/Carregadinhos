//const SUPABASE_URL = 'https://gvnpnginkytfncflmtua.supabase.co';
//const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bnBuZ2lua3l0Zm5jZmxtdHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MzcxODQsImV4cCI6MjA5MzUxMzE4NH0.Gb2a-eT3HJcjLVLvyg3xgGQjrPb5lS97mPhCYgHZpV8';

const SUPABASE_URL = 'https://lrzofimngusbcwlqbsts.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxyem9maW1uZ3VzYmN3bHFic3RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Nzk4NjgsImV4cCI6MjA5MzA1NTg2OH0.SF21e1Sx_bueRV48exU08NGG2raNahY68nngPtWWLKU';

let map, markersLayer;
let praias = [];
let praiaSelecionada = null;
let usuarioId = null;

let listaElement, filtroInput, painelDetalhes, praiaNome, praiaTipo, praiaDados, praiaPerigos;
let analisePraia, eventosDiv, servicosDiv, comentariosDiv, comentarioInput, btnEnviar;
let resumoIADiv, btnGerarResumoIA;

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
    resumoIADiv = document.getElementById('resumoIA');
    btnGerarResumoIA = document.getElementById('btnGerarResumoIA');

    configurarMapa();
    usuarioId = await inicializarUsuario();

    btnEnviar.addEventListener('click', enviarComentario);

    if (btnGerarResumoIA) {
        btnGerarResumoIA.addEventListener('click', gerarResumoIA);
    }

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
            console.error(`Erro na requisicao da tabela ${tabela}: ${response.status}`);
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

        if (!response.ok) {
            console.error(`Erro ao inserir em ${tabela}: ${response.status}`);
        }

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

    await inserirNoSupabase('usuario', {
        id,
        nome: 'Surfista Anonimo',
        email: ''
    });

    return id;
}

async function carregarPraias() {
    const filtros = 'order=nivel_popularidade.desc';
    const data = await fazerRequisicaoSupabase('praia', filtros);

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

        marker.bindPopup(`
            <strong>${escaparHTML(p.nome)}</strong><br>
            ${escaparHTML(p.tipo_onda || 'Sem tipo')}<br>
            Popularidade: ${p.nivel_popularidade}
        `);

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
            <div class="titulo">${escaparHTML(p.nome)}</div>
            <div class="descricao">${p.tipo_onda ? `Onda: ${escaparHTML(p.tipo_onda)}` : 'Tipo de onda nao informado'} - Popularidade: ${p.nivel_popularidade}/5</div>
            <div class="descricao">Dificuldade: ${p.nivel_dificuldade}/5 - Perigos: ${escaparHTML(p.perigos || 'Nenhum informado')}</div>
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
        <div class="info-card"><strong>Latitude:</strong> ${Number(praia.latitude).toFixed(5)}</div>
        <div class="info-card"><strong>Longitude:</strong> ${Number(praia.longitude).toFixed(5)}</div>
    `;

    if (resumoIADiv) {
        resumoIADiv.innerHTML = `
            <div class="info-card">
                Clique em "Gerar resumo por IA" para analisar automaticamente os comentários desta praia.
            </div>
        `;
    }

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
    const quantidade = Number(valor) || 0;

    for (let i = 0; i < 5; i++) {
        stars += i < quantidade ? '★' : '☆';
    }

    return `<span class="rating">${stars}</span>`;
}

async function carregarAnalisePraia(idPraia) {
    const filtros = `id_praia=eq.${idPraia}`;
    const data = await fazerRequisicaoSupabase('analisepraia', filtros);

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
    const data = await fazerRequisicaoSupabase('evento', filtros);

    if (!data || data.length === 0) {
        eventosDiv.innerHTML = '<div class="info-card">Nenhum evento cadastrado para esta praia.</div>';
        return;
    }

    eventosDiv.innerHTML = data.map(evento => `
        <div class="info-card">
            <strong>${escaparHTML(evento.titulo)}</strong>
            <p>${escaparHTML(evento.descricao || 'Sem descricao')}</p>
            <span>${new Date(evento.data).toLocaleDateString('pt-BR')}</span>
        </div>
    `).join('');
}

async function carregarServicos(idPraia) {
    const filtros = `id_praia=eq.${idPraia}&order=tipo.asc`;
    const data = await fazerRequisicaoSupabase('servico', filtros);

    if (!data || data.length === 0) {
        servicosDiv.innerHTML = '<div class="info-card">Nenhum servico cadastrado para esta praia.</div>';
        return;
    }

    servicosDiv.innerHTML = data.map(servico => `
        <div class="info-card">
            <strong>${escaparHTML(servico.nome)}</strong>
            <p>${escaparHTML(servico.descricao || 'Descricao nao disponivel.')}</p>
            <span>${escaparHTML(servico.tipo || 'Tipo nao informado')} - ${escaparHTML(servico.contato || 'Contato nao informado')}</span>
        </div>
    `).join('');
}

async function carregarComentarios(idPraia) {
    const filtros = `id_praia=eq.${idPraia}&order=data.desc`;
    const data = await fazerRequisicaoSupabase('comentario', filtros);

    if (!data || data.length === 0) {
        comentariosDiv.innerHTML = '<div class="info-card">Seja o primeiro a deixar um comentario.</div>';
        return;
    }

    comentariosDiv.innerHTML = data.map(c => `
        <div class="comentario-item">
            <span>${escaparHTML(c.tipo || 'comentario')} - ${new Date(c.data).toLocaleString('pt-BR')}</span>
            <p>${escaparHTML(c.texto || '')}</p>
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

    const sucesso = await inserirNoSupabase('comentario', {
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

    if (resumoIADiv) {
        resumoIADiv.innerHTML = `
            <div class="info-card">
                Novo comentário enviado. Clique em "Gerar resumo por IA" para atualizar a análise.
            </div>
        `;
    }
}

async function buscarComentariosDaPraia(idPraia) {
    const filtros = `id_praia=eq.${idPraia}&order=data.desc`;
    const data = await fazerRequisicaoSupabase('comentario', filtros);
    return data || [];
}

async function gerarResumoIA() {
    if (!praiaSelecionada) {
        alert('Selecione uma praia primeiro.');
        return;
    }

    resumoIADiv.innerHTML = `
        <div class="info-card">
            Analisando comentários da praia...
        </div>
    `;

    const comentarios = await buscarComentariosDaPraia(praiaSelecionada.id);

    if (!comentarios || comentarios.length === 0) {
        const resultadoSemDados = {
            resumo: 'Ainda não há comentários suficientes para gerar uma análise automática desta praia.',
            pontos_positivos: [],
            pontos_negativos: [],
            dicas: ['Seja o primeiro a comentar para ajudar outros usuários do Shaka.'],
            sentimento_geral: 'sem dados suficientes'
        };

        renderizarResumoIA(resultadoSemDados);
        return;
    }

    const resultado = analisarComentariosLocal(comentarios, praiaSelecionada);
    renderizarResumoIA(resultado);
}

function analisarComentariosLocal(comentarios, praia) {
    const textos = comentarios
        .map(c => c.texto || '')
        .filter(texto => texto.trim() !== '');

    const textoGeral = textos.join(' ').toLowerCase();

    const palavrasPositivas = [
        'boa', 'bom', 'ótima', 'otima', 'excelente', 'maravilhosa',
        'bonita', 'limpa', 'tranquila', 'segura', 'agradável', 'agradavel',
        'recomendo', 'legal', 'perfeita', 'incrível', 'incrivel', 'top',
        'linda', 'calma', 'organizada', 'gostei', 'vale a pena'
    ];

    const palavrasNegativas = [
        'ruim', 'péssima', 'pessima', 'suja', 'lixo', 'perigosa',
        'perigo', 'assalto', 'violenta', 'lotada', 'cheia', 'cara',
        'problema', 'arriscado', 'corrente forte', 'poluída', 'poluida',
        'mal cuidada', 'desorganizada', 'não recomendo', 'nao recomendo'
    ];

    const palavrasSurf = [
        'onda', 'ondas', 'surf', 'surfar', 'surfista', 'mar', 'vento',
        'corrente', 'pedra', 'pedras', 'forte', 'tubo', 'maré', 'mare'
    ];

    const palavrasEstrutura = [
        'barraca', 'barracas', 'restaurante', 'estacionamento', 'banheiro',
        'quiosque', 'serviço', 'servico', 'comida', 'atendimento', 'hotel',
        'pousada', 'guarda-vidas', 'salva-vidas'
    ];

    const positivos = contarOcorrencias(textoGeral, palavrasPositivas);
    const negativos = contarOcorrencias(textoGeral, palavrasNegativas);
    const termosSurf = contarOcorrencias(textoGeral, palavrasSurf);
    const termosEstrutura = contarOcorrencias(textoGeral, palavrasEstrutura);

    let sentimento_geral = 'neutro';

    if (textos.length < 2) {
        sentimento_geral = 'sem dados suficientes';
    } else if (positivos > negativos + 1) {
        sentimento_geral = negativos > 0 ? 'positivo com ressalvas' : 'positivo';
    } else if (negativos > positivos + 1) {
        sentimento_geral = 'negativo';
    } else if (positivos > 0 && negativos > 0) {
        sentimento_geral = 'positivo com ressalvas';
    }

    const pontos_positivos = [];

    if (positivos > 0) {
        pontos_positivos.push('Os comentários apresentam percepções positivas sobre a praia.');
    }

    if (termosSurf > 0) {
        pontos_positivos.push('Há menções relacionadas ao mar, ondas ou prática de surf.');
    }

    if (termosEstrutura > 0) {
        pontos_positivos.push('Alguns comentários indicam presença de estrutura ou serviços próximos.');
    }

    if (Number(praia.nivel_popularidade) >= 4) {
        pontos_positivos.push('A praia possui alto nível de popularidade cadastrado no sistema.');
    }

    if (pontos_positivos.length === 0) {
        pontos_positivos.push('Ainda há poucas informações positivas identificadas automaticamente.');
    }

    const pontos_negativos = [];

    if (negativos > 0) {
        pontos_negativos.push('Foram identificadas ressalvas ou críticas nos comentários dos usuários.');
    }

    if ((praia.perigos || '').trim() !== '') {
        pontos_negativos.push(`Perigos cadastrados: ${praia.perigos}.`);
    }

    if (Number(praia.nivel_dificuldade) >= 4) {
        pontos_negativos.push('O nível de dificuldade cadastrado é elevado.');
    }

    if (textoGeral.includes('corrente') || textoGeral.includes('pedra') || textoGeral.includes('pedras')) {
        pontos_negativos.push('Existem menções a possíveis riscos naturais, como corrente ou pedras.');
    }

    if (pontos_negativos.length === 0) {
        pontos_negativos.push('Nenhum ponto negativo forte foi identificado automaticamente.');
    }

    const dicas = [];

    if (Number(praia.nivel_dificuldade) >= 4) {
        dicas.push('Recomendada maior cautela para iniciantes devido ao nível de dificuldade.');
    }

    if ((praia.perigos || '').trim() !== '') {
        dicas.push('Verifique os perigos informados antes de entrar no mar.');
    }

    if (textoGeral.includes('lotada') || textoGeral.includes('cheia')) {
        dicas.push('Evite horários de pico caso prefira uma experiência mais tranquila.');
    }

    if (termosSurf > 0) {
        dicas.push('Confira as condições do mar antes de surfar.');
    }

    if (dicas.length === 0) {
        dicas.push('Leia os comentários recentes para entender melhor as condições atuais da praia.');
    }

    const resumo = gerarTextoResumo(
        praia,
        textos.length,
        sentimento_geral,
        negativos,
        termosSurf,
        termosEstrutura
    );

    return {
        resumo,
        pontos_positivos,
        pontos_negativos,
        dicas,
        sentimento_geral
    };
}

function contarOcorrencias(texto, palavras) {
    let total = 0;

    palavras.forEach(palavra => {
        if (texto.includes(palavra)) {
            total++;
        }
    });

    return total;
}

function gerarTextoResumo(praia, quantidadeComentarios, sentimento, negativos, termosSurf, termosEstrutura) {
    let resumo = `Com base em ${quantidadeComentarios} comentário(s), a praia ${praia.nome} apresenta uma percepção geral `;

    if (sentimento === 'positivo') {
        resumo += 'positiva entre os usuários.';
    } else if (sentimento === 'negativo') {
        resumo += 'negativa, com críticas relevantes nos comentários.';
    } else if (sentimento === 'positivo com ressalvas') {
        resumo += 'positiva, mas com algumas ressalvas apontadas pelos usuários.';
    } else if (sentimento === 'sem dados suficientes') {
        resumo += 'ainda limitada, pois há poucos comentários disponíveis.';
    } else {
        resumo += 'neutra ou mista, sem predominância clara de avaliações positivas ou negativas.';
    }

    if (termosSurf > 0) {
        resumo += ' A análise identificou menções relacionadas ao mar, ondas ou surf.';
    }

    if (termosEstrutura > 0) {
        resumo += ' Também há indicações de estrutura ou serviços próximos.';
    }

    if (negativos > 0) {
        resumo += ' Alguns comentários indicam pontos de atenção que devem ser considerados antes da visita.';
    }

    return resumo;
}

function renderizarResumoIA(resumo) {
    resumoIADiv.innerHTML = `
        <div class="info-card">
            <strong>Resumo geral:</strong>
            <p>${escaparHTML(resumo.resumo)}</p>
        </div>

        <div class="info-card">
            <strong>Pontos positivos:</strong>
            <ul>
                ${(resumo.pontos_positivos || []).map(item => `<li>${escaparHTML(item)}</li>`).join('')}
            </ul>
        </div>

        <div class="info-card">
            <strong>Pontos negativos:</strong>
            <ul>
                ${(resumo.pontos_negativos || []).map(item => `<li>${escaparHTML(item)}</li>`).join('')}
            </ul>
        </div>

        <div class="info-card">
            <strong>Dicas:</strong>
            <ul>
                ${(resumo.dicas || []).map(item => `<li>${escaparHTML(item)}</li>`).join('')}
            </ul>
        </div>

        <div class="info-card">
            <strong>Sentimento geral:</strong> ${escaparHTML(resumo.sentimento_geral || 'Não informado')}
        </div>
    `;
}

function escaparHTML(valor) {
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
