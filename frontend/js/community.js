// Aguarda o DOM carregar completamente
document.addEventListener('DOMContentLoaded', function () {
    console.log('JS carregado! Inicializando...');

    // Seleciona todas as seções chat
    const chats = document.querySelectorAll('.chat');
    console.log('Seções encontradas:', chats.length);  // Deve ser 6

    // Seleciona todos os itens do menu (opcao-chat)
    const opcoesMenu = document.querySelectorAll('.opcao-chat');
    console.log('Itens de menu encontrados:', opcoesMenu.length);  // Deve ser 6

    // Ativa "Conheça a Comunidade" por padrão (índice 0) e destaca no menu
    abrirChat(0);

    // Carrega seminovos iniciais
    exibir_seminovos();

    // Outras inicializações
    inicializarFiltros();

    // Inicializa destaque no menu para o item 0
    destacarMenu(0, opcoesMenu);

    // Novo: Inicializa Socket.io para o chat (conecta ao servidor, mas ativa só no chat geral)
    inicializarChatSocket();
});

// Função para abrir seções e destacar menu (atualizada para ativar chat se for o índice 1)
function abrirChat(index) {
    const chats = document.querySelectorAll('.chat');
    const opcoesMenu = document.querySelectorAll('.opcao-chat');  // Pega itens do menu

    // Remove 'active' de todas as seções chat
    chats.forEach(chat => {
        chat.classList.remove('active');
    });

    // Adiciona 'active' à seção pelo índice
    if (chats[index]) {
        chats[index].classList.add('active');
        console.log('Seção ativada:', index);

        // Destaca o item correspondente no menu
        destacarMenu(index, opcoesMenu);

        // Novo: Se for o chat geral (índice 1), ativa o socket e carrega histórico
        if (index === 1) {
            ativarChatSocket();
        } else {
            desativarChatSocket();  // Desativa listeners se sair do chat
        }

        // Scroll suave para o topo
        chats[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        console.error('Índice inválido:', index);
    }
}

// Função auxiliar para destacar o item do menu (nova)
function destacarMenu(index, opcoesMenu) {
    // Remove 'active' de todos os itens do menu
    opcoesMenu.forEach(opcao => {
        opcao.classList.remove('active');
        // Opcional: Remove aria-current para acessibilidade
        opcao.setAttribute('aria-current', 'false');
    });

    // Adiciona 'active' ao item pelo índice
    if (opcoesMenu[index]) {
        opcoesMenu[index].classList.add('active');
        opcoesMenu[index].setAttribute('aria-current', 'true');  // Para acessibilidade
        console.log('Item de menu destacado:', index);
    } else {
        console.error('Item de menu não encontrado para índice:', index);
    }
}

// Novo: Inicialização do Socket.io (conecta uma vez, mas ativa listeners só no chat)
let socket;  // Variável global para o socket
function inicializarChatSocket() {
    // Conecta ao servidor Socket.io (ajuste a URL se o servidor for diferente)
    socket = io('https://community-production-f05d.up.railway.app');
    console.log('Socket.io inicializado e conectado.');

    // Listeners globais (ex: erros)
    socket.on('connect', () => {
        console.log('Conectado ao servidor de chat:', socket.id);
    });

    socket.on('disconnect', () => {
        console.log('Desconectado do servidor de chat.');
    });

    socket.on('connect_error', (err) => {
        console.error('Erro de conexão no chat:', err);
        // Opcional: Mostrar alerta no UI
    });
}

// Novo: Ativa o chat (carrega histórico e ativa envio/recebimento) - só para índice 1
// Novo: Ativa o chat (carrega histórico e ativa envio/recebimento) - só para índice 1
function ativarChatSocket() {
    if (!socket || !document.getElementById('chat_aqui')) {
        console.error('Socket ou chat_aqui não encontrado.');
        return;
    }

    const chatDiv = document.getElementById('chat_aqui');
    const messageInput = document.getElementById('messageInput');
    const enviarButton = document.getElementById('enviar');

    // CORREÇÃO: Gera username único por aba usando sessionStorage
    let baseUsername = document.getElementById('nome-perfil') ? document.getElementById('nome-perfil').textContent.trim() : 'Anônimo';
    if (!baseUsername) baseUsername = 'Anônimo';

    // Verifica se já existe um ID único na sessionStorage desta aba
    let sessionId = sessionStorage.getItem('chatSessionId');
    if (!sessionId) {
        // Gera um ID aleatório (4 dígitos) para esta aba
        sessionId = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        sessionStorage.setItem('chatSessionId', sessionId);
        console.log('Nova sessão de chat criada para aba:', sessionId);
    }

    const username = `${baseUsername} #${sessionId}`;  // Ex: "João #1234" ou "Anônimo #5678"
    console.log('Username único para esta aba:', username);

    // Limpa o chat e carrega histórico do servidor
    chatDiv.innerHTML = '';
    socket.emit('loadMessages');  // Solicita histórico (Backend responde a isso)

    // Registra listeners aqui, mas remove antes para evitar duplicatas
    socket.off('loadMessages');  // Remove listener anterior se existir
    socket.off('newMessage');

    // Recebe histórico do servidor
    socket.on('loadMessages', (messages) => {
        console.log('Histórico carregado:', messages.length, 'mensagens.');
        messages.forEach(addMessage);
    });

    // Recebe novas mensagens em tempo real
    socket.on('newMessage', (msg) => {
        console.log('Nova mensagem recebida:', msg.id);
        addMessage(msg);
    });

    // Função para adicionar mensagem ao chat (histórico ou nova)
    function addMessage(msg) {
        const messageDiv = document.createElement('div');
        messageDiv.id = `chat-message-${msg.id}`;

        const isOwnMessage = msg.username === username;  // Verifica se é do usuário atual (com ID único)

        if (isOwnMessage) {
            // Mensagem enviada (direita)
            messageDiv.className = 'enviado';
            messageDiv.innerHTML = `
                <div class="mensagem-header">
                    <span class="hora-envio">${formatarHora(new Date(msg.timestamp))}</span>
                </div>
                <p>${escapeHtml(msg.message)}</p>
            `;
        } else {
            // Mensagem recebida (esquerda)
            messageDiv.className = 'recebido';
            messageDiv.innerHTML = `
                <div class="mensagem-header">
                    <span class="nome-usuario">${escapeHtml(msg.username)}</span>
                    <span class="hora-envio">${formatarHora(new Date(msg.timestamp))}</span>
                </div>
                <p>${escapeHtml(msg.message)}</p>
            `;
        }

        chatDiv.appendChild(messageDiv);
        chatDiv.scrollTop = chatDiv.scrollHeight;  // Scroll automático para baixo
    }

    // Função auxiliar para formatar hora (HH:MM)
    function formatarHora(data) {
        const h = data.getHours().toString().padStart(2, '0');
        const m = data.getMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
    }

    // Função auxiliar para escapar HTML (evita XSS)
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Função para enviar mensagem (com validação extra e preventDefault)
    function enviarMensagem(e) {
        e.preventDefault();  // Impede submit de form e redirecionamento para outro site
        const message = messageInput.value.trim();
        if (message && socket) {
            socket.emit('sendMessage', { username, message });  // Usa o username único
            messageInput.value = '';  // Limpa o input
            console.log('Mensagem enviada por', username + ':', message);  // Log para debug
        } else {
            console.warn('Mensagem vazia ou socket não conectado.');
        }
    }

    // Listener para botão enviar (com preventDefault para evitar submit)
    if (enviarButton) {
        // Remove listener anterior se existir (evita duplicatas)
        const newButton = enviarButton.cloneNode(true);
        enviarButton.parentNode.replaceChild(newButton, enviarButton);
        newButton.addEventListener('click', enviarMensagem);
    }

    // Listener para Enter no input (com preventDefault para evitar submit)
    if (messageInput) {
        // Remove listener anterior se existir (evita duplicatas)
        messageInput.onkeypress = null;
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();  // Impede submit de form
                enviarMensagem(e);
            }
        });
    }

    // Opcional: Listener para submit do form (se o input estiver dentro de um <form>)
    const chatForm = document.querySelector('#chat_aqui form');  // Ajuste o seletor se necessário
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();  // Impede qualquer submit do form
            enviarMensagem(e);
        });
    }

    console.log('Chat ativado para usuário único:', username);
}


// Novo: Desativa o chat (remove listeners para evitar duplicatas ao navegar)
function desativarChatSocket() {
    if (socket) {
        // Remove listeners específicos (evita duplicatas)
        socket.off('loadMessages');
        socket.off('newMessage');

        // Opcional: Limpa o input se sair
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = '';
            messageInput.onkeypress = null;  // Remove keypress
        }

        // Remove listeners de envio (clone para remover event listeners)
        const enviarButton = document.getElementById('enviar');
        if (enviarButton) {
            const newButton = enviarButton.cloneNode(true);
            enviarButton.parentNode.replaceChild(newButton, enviarButton);
        }

        // Opcional: Listener para form (remove se existir)
        const chatForm = document.querySelector('#chat_aqui form');
        if (chatForm) {
            chatForm.onSubmit = null;  // Ou use removeEventListener se adicionado dinamicamente
        }

        console.log('Chat desativado.');
    }
}

// Placeholder para inicializarFiltros (não definida no original; remova se não precisar)
function inicializarFiltros() {
    console.log('Filtros inicializados (placeholder).');
    // Adicione lógica aqui se necessário (ex: event listeners para checkboxes)
}

// ... (Mantenha as outras funções como exibir_seminovos, toggleFilter, etc., do código anterior)

function solicitarAnuncio() {
    document.getElementById("formulario-seminovo").classList.remove("hiden")
}

function esconderSolicitacao() {
    document.getElementById("formulario-seminovo").classList.add("hiden")
}

function verEventos() {
    document.getElementById("lightbox-eventos").classList.remove("hiden")
    document.getElementById("explica-eventos").classList.add("hiden")
    document.getElementById("sair-lightbox").classList.remove("hiden")
}

function esconderEventos() {
    document.getElementById("lightbox-eventos").classList.add("hiden")
    document.getElementById("explica-eventos").classList.remove("hiden")
    document.getElementById("sair-lightbox").classList.add("hiden")
}

function abrirOverlay(img_element) {
    var overlay = document.getElementById("overlay-eventos")
    var overlayImg = document.getElementById("overlay-eventos-img")
    overlayImg.src = img_element.src
    overlay.style.display = "flex"
}


function fecharOverlayEventos() {
    document.getElementById("overlay-eventos").style.display = "none"
}

function abrirOverlayMural(img_element) {
    var overlay = document.getElementById("overlay-mural-eventos");
    var overlayImg = document.getElementById("overlay-mural-eventos-img");

    // Copia a img
    overlayImg.src = img_element.src;
    overlayImg.alt = img_element.alt;  // Atualiza alt para acessibilidade

    // Popula os detalhes do card usando data-*
    document.getElementById("evt-nome").textContent = img_element.dataset.nome || "—";
    document.getElementById("evt-descricao").textContent = img_element.dataset.descricao || "—";
    document.getElementById("evt-gratuito").textContent = img_element.dataset.gratuito || "—";
    document.getElementById("evt-preco").textContent = img_element.dataset.preco || "—";
    document.getElementById("evt-endereco").textContent = img_element.dataset.endereco || "—";
    document.getElementById("evt-data").textContent = img_element.dataset.data || "—";

    // Abre o overlay
    overlay.style.display = "flex";

    // Opcional: Foco no overlay para acessibilidade (trap focus se avançado)
    overlay.focus();
}

function fecharOverlayMuralEventos(event) {
    var overlay = document.getElementById("overlay-mural-eventos");
    overlay.style.display = "none";

    // Limpa a img para próxima uso
    var overlayImg = document.getElementById("overlay-mural-eventos-img");
    overlayImg.src = "";
    overlayImg.alt = "";

    // Limpa detalhes
    document.querySelectorAll(".card-evento .value").forEach(el => el.textContent = "—");
}


// -------------------------------------
//               SEMINOVOS
// ------------------------------------- 

async function exibir_seminovos() {
    let container = document.getElementById("anuncios");
    container.innerHTML = "<p>Carregando anúncios...</p>";

    try {
        console.log('Iniciando fetch para seminovos...');  // Debug
        const resposta = await fetch("https://community-production-f05d.up.railway.app/seminovos");

        console.log('Status do fetch:', resposta.status);  // Debug: Deve ser 200
        if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status} - ${resposta.statusText}`);
        }

        const anuncios = await resposta.json();
        console.log('Anúncios recebidos:', anuncios.length);  // Debug
        var html = "";
        anuncios.forEach(anuncio => {
            const urlImg = anuncio.imagem ? `https://community-production-f05d.up.railway.app/uploads/${anuncio.imagem}` : 'caminho/para/imagem-padrao.png';
            html += `
                <div class="anuncio" role="region" aria-label="Anúncio de seminovo">
                <div class="img-seminovo">
                    <img src="${urlImg}" alt="Imagem do ${anuncio.nome} - ${anuncio.marca}" />
                </div>
                <div class="content">
                    <p class="descricao">${anuncio.descricao}</p>
                    <p class="nome">${anuncio.nome}<span class="marca"> - ${anuncio.marca}</span></p>
                    <p class="preco">R$ <span class="valor">${anuncio.preco}</span></p>
                    <button type="button" aria-label="Saber mais sobre ${anuncio.nome}">Saber mais</button>
                </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        console.error('Erro no fetch de seminovos:', err);  // Debug detalhado
        container.innerHTML = "<p>Erro ao carregar anúncios: " + err.message + "</p>";
    }
}

async function cadastrarAnuncio() {
    try {
        // Validação extra para arquivo
        const inputFile = document.getElementById("imagem-seminovo");
        const arquivo = inputFile.files[0];
        if (arquivo && arquivo.size > 5 * 1024 * 1024) {  // 5MB
            alert("Arquivo muito grande! Máximo 5MB.");
            return;
        }

        const form = new FormData();
        form.append("nome", document.getElementById("nome-seminovo").value);
        form.append("descricao", document.getElementById("descricao-seminovo").value);
        form.append("preco", document.getElementById("preco-seminovo").value);
        form.append("marca", document.getElementById("marca-seminovo").value);
        form.append("email", document.getElementById("email-seminovo").value);
        form.append("id_categoria", document.getElementById("id_categoria-seminovo").value);

        if (arquivo) {
            form.append("imagem", arquivo);
        }

        console.log('Iniciando fetch para cadastrar seminovo...');  // Debug
        // CORREÇÃO: Rota certa é /seminovo/register
        const requisicao = await fetch("https://community-production-f05d.up.railway.app/seminovo/register", {
            method: "POST",
            body: form
            // credentials: "include" se precisar de auth
        });

        console.log('Status do fetch de cadastro:', requisicao.status);  // Debug: Deve ser 201
        if (!requisicao.ok) {
            const erroTexto = await requisicao.text();  // Pega corpo do erro
            console.error('Erro no response:', erroTexto);
            throw new Error(`Erro HTTP: ${requisicao.status} - ${requisicao.statusText}. Detalhes: ${erroTexto}`);
        }

        const dados = await requisicao.json();
        alert(dados.mensagem || "Anúncio de seminovo inserido com sucesso...");

        document.getElementById("form-seminovo").reset();
        inputFile.value = '';  // Limpa o input de arquivo
        await exibir_seminovos();  // Recarrega lista
    } catch (erro) {
        console.error('Erro no fetch de cadastro:', erro);  // Debug
        alert("Falha ao cadastrar anúncio de seminovo: " + erro.message);
    }
}



// ------------- EVENTOS ------------------

// Função atualizada para mover a pesquisa e expandir opções
function toggleFilter(filterType) {
    const pesquisa = document.getElementById("pesquisa-eventos");
    const filterOptions = document.getElementById("filter-options");
    const allPanels = document.querySelectorAll(".option-panel");
    const activePanel = document.getElementById(filterType + "-options");
    const buttons = document.querySelectorAll(".filter button");

    // Move a caixa para cima (toggle topo)
    if (pesquisa.classList.contains("topo")) {
        // Se já está expandido, fecha tudo
        pesquisa.classList.remove("topo");
        allPanels.forEach(panel => panel.style.display = "none");
        buttons.forEach(btn => btn.classList.remove("active"));
        return;
    } else {
        pesquisa.classList.add("topo");
    }

    // Esconde todos os painéis e remove classe active dos botões
    allPanels.forEach(panel => panel.style.display = "none");
    buttons.forEach(btn => btn.classList.remove("active"));

    // Mostra o painel específico e adiciona classe active ao botão
    if (activePanel) {
        activePanel.style.display = "block";
        const activeButton = Array.from(buttons).find(btn => btn.textContent.trim().toLowerCase().includes(filterType));
        if (activeButton) {
            activeButton.classList.add("active");
        }
    }

    // Opcional: Adicione lógica para aplicar filtros (ex: on change dos inputs)
    // Exemplo: document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', applyFilters));
    // Onde applyFilters() filtra os eventos baseados nos valores selecionados
    console.log(`Filtro '${filterType}' ativado.`);
}

// ------------- SUGESTÕES ------------------

const btnVotar_sugestoes = document.getElementById('btnVotar-sugestoes');
const btnCurtir_sugestoes = document.getElementById('btnCurtir-sugestoes');
const btnComentar_sugestoes = document.getElementById('btnComentar-sugestoes');
const btnEncaminhar_sugestoes = document.getElementById('btnEncaminhar-sugestoes');
const contadorVotos_sugestoes = document.getElementById('contadorVotos-sugestoes');
const contadorCurtidas_sugestoes = document.getElementById('contadorCurtidas-sugestoes');
const areaComentarios_sugestoes = document.getElementById('areaComentarios-sugestoes');
const listaComentarios_sugestoes = document.getElementById('listaComentarios-sugestoes');
const inputComentario_sugestoes = document.getElementById('inputComentario-sugestoes');
const btnEnviarComentario_sugestoes = document.getElementById('btnEnviarComentario-sugestoes');

let votos = 0;
let curtidas = 0;
let comentarios = [];

btnVotar_sugestoes.addEventListener('click', () => {
    votos++;
    contadorVotos_sugestoes.textContent = votos;
    btnVotar_sugestoes.disabled = true; // usuário só pode votar uma vez
});

btnCurtir_sugestoes.addEventListener('click', () => {
    curtidas++;
    contadorCurtidas_sugestoes.textContent = curtidas;
    btnCurtir_sugestoes.disabled = true; // usuário só pode curtir uma vez
});

btnComentar_sugestoes.addEventListener('click', () => {
    if (areaComentarios_sugestoes.style.display === 'none') {
        areaComentarios_sugestoes.style.display = 'block';
        btnComentar_sugestoes.textContent = '⬆️ Minimizar';
    } else {
        areaComentarios_sugestoes.style.display = 'none';
        btnComentar_sugestoes.textContent = '💬 Comentar';
    }
});

btnEnviarComentario_sugestoes.addEventListener('click', () => {
    const texto = inputComentario_sugestoes.value.trim();
    if (texto) {
        const comentario = {
            usuario: 'Usuário', // nome fixo, pode ser dinâmico
            hora: new Date(),
            texto: texto
        };
        comentarios.push(comentario);
        atualizarComentarios();
        inputComentario_sugestoes.value = '';
    }
});

function formatarHora(data) {
    const h = data.getHours().toString().padStart(2, '0');
    const m = data.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
}

function atualizarComentarios() {
    listaComentarios_sugestoes.innerHTML = '';
    comentarios.forEach(cmt => {
        const div = document.createElement('div');
        div.style.marginBottom = '12px';

        const info = document.createElement('div');
        info.style.fontSize = '12px';
        info.style.color = 'var(--muted)';
        info.style.fontWeight = '600';
        info.textContent = `${cmt.usuario} • ${formatarHora(cmt.hora)}`;

        const texto = document.createElement('p');
        texto.style.margin = '4px 0 0 0';
        texto.textContent = cmt.texto;

        div.appendChild(info);
        div.appendChild(texto);
        listaComentarios_sugestoes.appendChild(div);
    });
}

btnEncaminhar_sugestoes.addEventListener('click', () => {
    alert('Funcionalidade de encaminhar ainda não implementada.');
});


// ---------------------- TOAST ----------------------
function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast';
    toast.classList.add(type); // success ou error
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}


// -----------------------------------
//         LOGIN E CADASTRO
// -----------------------------------

// Mostrar / esconder formulários com animações de fade
function mostrarCadastro() {
    const loginForm = document.getElementById("formulario-login");
    const cadastroForm = document.getElementById("formulario-cadastro");

    loginForm.classList.add('fade-out');
    setTimeout(() => {
        loginForm.classList.add("oculto");
        loginForm.classList.remove('fade-out');
        cadastroForm.classList.remove("oculto");
        cadastroForm.classList.add('fade-in');
        setTimeout(() => cadastroForm.classList.remove('fade-in'), 400);
    }, 200);
}

function mostrarLogin() {
    const loginForm = document.getElementById("formulario-login");
    const cadastroForm = document.getElementById("formulario-cadastro");

    cadastroForm.classList.add('fade-out');
    setTimeout(() => {
        cadastroForm.classList.add("oculto");
        cadastroForm.classList.remove('fade-out');
        loginForm.classList.remove("oculto");
        loginForm.classList.add('fade-in');
        setTimeout(() => loginForm.classList.remove('fade-in'), 400);
    }, 200);
}

// Função auxiliar para máscara de telefone
function aplicarMascaraTelefone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 11) {
        value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (value.length >= 7) {
        value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (value.length >= 2) {
        value = value.replace(/(\d{2})/, '($1) ');
    }
    input.value = value;
}

// Função para abrir termos (simulada)
function abrirTermos(event) {
    event.preventDefault();
    alert('Termos de uso: [Conteúdo simulado]. Em produção, abra uma página/modal.');
    // Exemplo: window.open('/termos.html', '_blank');
}

// Função simples para toast (se não existir no seu código)
function showToast(mensagem, tipo = 'success') {
    // Remove toast anterior
    const oldToast = document.querySelector('.toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.textContent = mensagem;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Cadastro com validações
async function cadastrar_usuario(event) {
    event.preventDefault();
    const button = event.target.querySelector('button');
    const form = event.target;

    // Remove erros anteriores
    form.querySelectorAll('.erro').forEach(el => el.classList.remove('erro'));

    // Pega valores
    const nome = document.getElementById("nome-cadastro").value.trim();
    const email = document.getElementById("email-cadastro").value.trim();
    const telefone = document.getElementById("telefone-cadastro").value.trim();
    const dataNascimento = document.getElementById("data-nascimento-cadastro").value;
    const senha = document.getElementById("password-cadastro").value;
    const confirmSenha = document.getElementById("confirm-password-cadastro").value;
    const aceitarTermos = document.getElementById("aceitar-termos").checked;

    let valido = true;

    // Validações
    if (senha.length < 8) {
        document.getElementById("password-cadastro").classList.add('erro');
        valido = false;
    }
    if (senha !== confirmSenha) {
        document.getElementById("confirm-password-cadastro").classList.add('erro');
        valido = false;
    }
    if (!aceitarTermos) {
        document.querySelector('.checkbox-container').classList.add('erro');
        valido = false;
    }
    if (!dataNascimento) {
        document.getElementById("data-nascimento-cadastro").classList.add('erro');
        valido = false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        document.getElementById("email-cadastro").classList.add('erro');
        valido = false;
    }
    if (!nome || !telefone) {
        valido = false; // required já cuida, mas reforço
    }

    if (!valido) {
        showToast('Por favor, corrija os erros no formulário.', 'error');
        return;
    }

    // Ativa loading
    button.classList.add('loading');
    button.textContent = '';

    try {
        const usuario = {
            nome,
            telefone,
            data_nascimento: dataNascimento, // Backend espera underscore
            email,
            senha
        };

        const requisicao = await fetch("https://community-production-f05d.up.railway.app/user/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(usuario)
        });

        const resposta = await requisicao.json();
        if (!requisicao.ok) throw new Error(resposta.mensagem || "Erro ao cadastrar usuário");

        showToast(resposta.mensagem || "Usuário cadastrado com sucesso!", "success");
        form.reset();
        mostrarLogin();
    } catch (erro) {
        showToast("Falha ao cadastrar usuário: " + erro.message, "error");
    } finally {
        button.classList.remove('loading');
        button.textContent = 'Cadastrar';
    }
}

// Login com validações básicas
// ... (mantenha as funções anteriores: mostrarCadastro, mostrarLogin, aplicarMascaraTelefone, abrirTermos, showToast, cadastrar_usuario, DOMContentLoaded)

// ... (mantenha as funções anteriores: mostrarCadastro, mostrarLogin, aplicarMascaraTelefone, abrirTermos, showToast, cadastrar_usuario, etc.)

// Login com lógica pós-sucesso para esconder form e mostrar comunidade
async function logar_usuario(event) {
    event.preventDefault();
    console.log('=== DEBUG LOGIN INICIADO ===');
    console.log('Função logar_usuario chamada com sucesso');

    const button = event.target.querySelector('button');
    const email = document.getElementById("email-login").value.trim();
    const senha = document.getElementById("password-login").value;

    console.log('Dados de login capturados:', { email, senhaLength: senha.length });

    if (!email || !senha) {
        console.log('Validação falhou: campos vazios');
        showToast('E-mail e senha são obrigatórios.', 'error');
        return;
    }

    // Ativa loading
    button.classList.add('loading');
    button.textContent = '';

    try {
        const usuario = { email, senha };
        const url = "https://community-production-f05d.up.railway.app/user/login";
        console.log('Preparando fetch para URL:', url);

        const requisicao = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(usuario),
            credentials: "include"
        });

        console.log('Fetch executado! Status:', requisicao.status);
        console.log('OK?', requisicao.ok);

        if (!requisicao.ok && requisicao.status === 0) {
            throw new Error('Falha de rede ou CORS bloqueado. Verifique console e backend.');
        }

        const resposta = await requisicao.json();
        console.log('Resposta JSON recebida:', resposta);

        if (!requisicao.ok || resposta.sucesso === false) {
            console.log('Erro na autenticação:', resposta.mensagem || resposta.erro);
            throw new Error(resposta.mensagem || resposta.erro || "Credenciais inválidas");
        }

        console.log('=== LOGIN BEM-SUCEDIDO ===');
        showToast("Login realizado com sucesso! Bem-vindo " + (resposta.usuario?.nome || ""), "success");

        // NOVA LÓGICA: Armazena estado de login no localStorage (para persistir após refresh)
        localStorage.setItem('usuarioLogado', JSON.stringify(resposta.usuario)); // Ex: { id, nome, email }
        localStorage.setItem('logado', 'true'); // Flag simples para checar no load da página

        // NOVA LÓGICA: Esconde o form de login/cadastro e mostra a comunidade
        const containerLogin = document.getElementById('login-cadastro');
        const secaoComunidade = document.getElementById('comunidade');

        if (containerLogin) {
            containerLogin.classList.add('hidden'); // Adiciona .hidden ao form inteiro
        }

        if (secaoComunidade) {
            secaoComunidade.classList.remove('hidden'); // Remove .hidden da comunidade
        } else {
            console.warn('Elemento #comunidade não encontrado. Adicione no HTML.');
        }

        // Opcional: Redirecione ou carregue conteúdo dinâmico na comunidade
        // Ex: carregarAnuncios(); // Função para fetch de seminovos

    } catch (erro) {
        console.error('=== ERRO NO LOGIN (FRONTEND) ===');
        console.error('Mensagem:', erro.message);
        console.error('Stack:', erro.stack);
        console.log('Status do login (se disponível):', requisicao ? requisicao.status : 'N/A');  // Debug extra
        if (!requisicao || !requisicao.ok) {
            const erroTexto = await requisicao.text().catch(() => 'Erro desconhecido');
            console.error('Texto do erro no response:', erroTexto);
        }
        showToast("Falha no login: " + erro.message, "error");
    } finally {
        button.classList.remove('loading');
        button.textContent = 'Entrar';
        console.log('=== DEBUG LOGIN FINALIZADO ===');
    }
}

// NOVA FUNÇÃO: Logout (opcional, para botão "Sair" na comunidade)
function logout() {
    // Limpa localStorage
    localStorage.removeItem('usuarioLogado');
    localStorage.removeItem('logado');

    // Reverte visibilidade: Mostra login e esconde comunidade
    const containerLogin = document.querySelector('.login-cadastro');
    const secaoComunidade = document.getElementById('comunidade');

    if (containerLogin) {
        containerLogin.classList.remove('hidden');
    }

    if (secaoComunidade) {
        secaoComunidade.classList.add('hidden');
    }

    showToast('Logout realizado. Até logo!', 'success');
    // Opcional: Limpa forms ou redireciona
    document.getElementById('formulario-login').reset();
    mostrarLogin(); // Volta para form de login se precisar
}

// ÚNICO BLOCO DOMContentLoaded: Mescla checagem de login + listeners de interatividade
document.addEventListener('DOMContentLoaded', function () {
    // NOVA LÓGICA: Se já logado (via localStorage), mostra comunidade automaticamente
    const logado = localStorage.getItem('logado') === 'true';
    const usuario = localStorage.getItem('usuarioLogado');

    if (logado && usuario) {
        console.log('Usuário já logado detectado:', JSON.parse(usuario));
        const containerLogin = document.querySelector('.login-cadastro');
        const secaoComunidade = document.getElementById('comunidade');

        if (containerLogin) containerLogin.classList.add('hidden');
        if (secaoComunidade) secaoComunidade.classList.remove('hidden');

        // Opcional: Atualize UI com nome do usuário
        const nomeUsuario = JSON.parse(usuario).nome;
        const headerComunidade = document.querySelector('#comunidade h1'); // Exemplo
        if (headerComunidade) headerComunidade.textContent = `Bem-vindo, ${nomeUsuario}!`;
    }

    // Listeners para interatividade (máscara e remoção de erros) - MANTIDOS AQUI
    // Máscara para telefone
    const telefoneInput = document.getElementById('telefone-cadastro');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', () => aplicarMascaraTelefone(telefoneInput));
    }

    // Remover erro ao digitar confirmação de senha
    const confirmSenhaInput = document.getElementById('confirm-password-cadastro');
    if (confirmSenhaInput) {
        confirmSenhaInput.addEventListener('input', () => {
            if (confirmSenhaInput.classList.contains('erro')) {
                confirmSenhaInput.classList.remove('erro');
            }
        });
    }

    // Remover erro no checkbox
    const termosCheckbox = document.getElementById('aceitar-termos');
    if (termosCheckbox) {
        termosCheckbox.addEventListener('change', () => {
            const container = document.querySelector('.checkbox-container');
            if (container && container.classList.contains('erro')) {
                container.classList.remove('erro');
            }
        });
    }

    // Similar para outros campos (ex: senha)
    const senhaInput = document.getElementById('password-cadastro');
    if (senhaInput) {
        senhaInput.addEventListener('input', () => {
            if (senhaInput.classList.contains('erro')) {
                senhaInput.classList.remove('erro');
            }
        });
    }
});


