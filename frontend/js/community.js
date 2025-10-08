// ============== CONFIGURAÇÃO DINÂMICA ==============
// Pega URLs da config.js (carregada antes deste script)
const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:5000';
const SOCKET_URL = window.APP_CONFIG?.SOCKET_URL || 'http://localhost:5000';

console.log('🔧 Usando API_URL:', API_URL);
console.log('🔧 Usando SOCKET_URL:', SOCKET_URL);

// ============== CARREGAMENTO DINÂMICO DO SOCKET.IO ==============
function loadSocketIO() {
  return new Promise((resolve, reject) => {
    // Verifica se já foi carregado
    if (window.io) {
      console.log('✅ Socket.io já carregado');
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `${SOCKET_URL}/socket.io/socket.io.js`;
    script.onload = () => {
      console.log('✅ Socket.io carregado com sucesso');
      resolve();
    };
    script.onerror = () => {
      console.error('❌ Erro ao carregar Socket.io');
      reject(new Error('Falha ao carregar Socket.io'));
    };
    document.head.appendChild(script);
  });
}

// ============== INICIALIZAÇÃO ==============
document.addEventListener('DOMContentLoaded', async function () {
    console.log('JS carregado! Inicializando...');

    // Carrega Socket.io dinamicamente
    try {
        await loadSocketIO();
    } catch (error) {
        console.error('Socket.io não pôde ser carregado:', error);
    }

    const chats = document.querySelectorAll('.chat');
    console.log('Seções encontradas:', chats.length);

    const opcoesMenu = document.querySelectorAll('.opcao-chat');
    console.log('Itens de menu encontrados:', opcoesMenu.length);

    abrirChat(0);
    exibir_seminovos();
    inicializarFiltros();
    destacarMenu(0, opcoesMenu);
    inicializarChatSocket();

    // Verifica se usuário já está logado
    verificarLogin();
});

// ============== VERIFICAÇÃO DE LOGIN ==============
function verificarLogin() {
    const logado = localStorage.getItem('logado') === 'true';
    const usuario = localStorage.getItem('usuarioLogado');

    if (logado && usuario) {
        console.log('Usuário já logado:', JSON.parse(usuario));
        const containerLogin = document.querySelector('.login-cadastro');
        const secaoComunidade = document.getElementById('comunidade');

        if (containerLogin) containerLogin.classList.add('hidden');
        if (secaoComunidade) secaoComunidade.classList.remove('hidden');

        const nomeUsuario = JSON.parse(usuario).nome;
        const nomePerfil = document.getElementById('nome-perfil');
        if (nomePerfil) nomePerfil.textContent = nomeUsuario;
    }
}

// ============== FUNÇÕES DE CHAT ==============
function abrirChat(index) {
    const chats = document.querySelectorAll('.chat');
    const opcoesMenu = document.querySelectorAll('.opcao-chat');

    chats.forEach(chat => chat.classList.remove('active'));

    if (chats[index]) {
        chats[index].classList.add('active');
        console.log('Seção ativada:', index);

        destacarMenu(index, opcoesMenu);

        if (index === 1) {
            ativarChatSocket();
        } else {
            desativarChatSocket();
        }

        chats[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        console.error('Índice inválido:', index);
    }
}

function destacarMenu(index, opcoesMenu) {
    opcoesMenu.forEach(opcao => {
        opcao.classList.remove('active');
        opcao.setAttribute('aria-current', 'false');
    });

    if (opcoesMenu[index]) {
        opcoesMenu[index].classList.add('active');
        opcoesMenu[index].setAttribute('aria-current', 'true');
        console.log('Item de menu destacado:', index);
    }
}

// ============== SOCKET.IO - CHAT EM TEMPO REAL ==============
let socket;

function inicializarChatSocket() {
    if (!window.io) {
        console.warn('Socket.io não está disponível ainda');
        return;
    }

    socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
    });

    console.log('Socket.io inicializado e conectado.');

    socket.on('connect', () => {
        console.log('✅ Conectado ao servidor de chat:', socket.id);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Desconectado do servidor de chat.');
    });

    socket.on('connect_error', (err) => {
        console.error('❌ Erro de conexão no chat:', err);
    });
}

function ativarChatSocket() {
    if (!socket || !document.getElementById('chat_aqui')) {
        console.error('Socket ou chat_aqui não encontrado.');
        return;
    }

    const chatDiv = document.getElementById('chat_aqui');
    const messageInput = document.getElementById('messageInput');
    const enviarButton = document.getElementById('enviar');

    let baseUsername = document.getElementById('nome-perfil') ? 
                       document.getElementById('nome-perfil').textContent.trim() : 'Anônimo';
    if (!baseUsername) baseUsername = 'Anônimo';

    let sessionId = sessionStorage.getItem('chatSessionId');
    if (!sessionId) {
        sessionId = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        sessionStorage.setItem('chatSessionId', sessionId);
        console.log('Nova sessão de chat criada:', sessionId);
    }

    const username = `${baseUsername} #${sessionId}`;
    console.log('Username único para esta aba:', username);

    chatDiv.innerHTML = '';
    socket.emit('loadMessages');

    socket.off('loadMessages');
    socket.off('newMessage');

    socket.on('loadMessages', (messages) => {
        console.log('Histórico carregado:', messages.length, 'mensagens.');
        messages.forEach(addMessage);
    });

    socket.on('newMessage', (msg) => {
        console.log('Nova mensagem recebida:', msg.id);
        addMessage(msg);
    });

    function addMessage(msg) {
        const messageDiv = document.createElement('div');
        messageDiv.id = `chat-message-${msg.id}`;

        const isOwnMessage = msg.username === username;

        if (isOwnMessage) {
            messageDiv.className = 'enviado';
            messageDiv.innerHTML = `
                <div class="mensagem-header">
                    <span class="hora-envio">${formatarHora(new Date(msg.timestamp))}</span>
                </div>
                <p>${escapeHtml(msg.message)}</p>
            `;
        } else {
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
        chatDiv.scrollTop = chatDiv.scrollHeight;
    }

    function formatarHora(data) {
        const h = data.getHours().toString().padStart(2, '0');
        const m = data.getMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function enviarMensagem(e) {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (message && socket) {
            socket.emit('sendMessage', { username, message });
            messageInput.value = '';
            console.log('Mensagem enviada por', username + ':', message);
        } else {
            console.warn('Mensagem vazia ou socket não conectado.');
        }
    }

    if (enviarButton) {
        const newButton = enviarButton.cloneNode(true);
        enviarButton.parentNode.replaceChild(newButton, enviarButton);
        newButton.addEventListener('click', enviarMensagem);
    }

    if (messageInput) {
        messageInput.onkeypress = null;
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                enviarMensagem(e);
            }
        });
    }

    console.log('Chat ativado para usuário único:', username);
}

function desativarChatSocket() {
    if (socket) {
        socket.off('loadMessages');
        socket.off('newMessage');

        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = '';
            messageInput.onkeypress = null;
        }

        const enviarButton = document.getElementById('enviar');
        if (enviarButton) {
            const newButton = enviarButton.cloneNode(true);
            enviarButton.parentNode.replaceChild(newButton, enviarButton);
        }

        console.log('Chat desativado.');
    }
}

function inicializarFiltros() {
    console.log('Filtros inicializados.');
}

// ============== SEMINOVOS ==============
async function exibir_seminovos() {
    let container = document.getElementById("anuncios");
    if (!container) return;

    container.innerHTML = "<p>Carregando anúncios...</p>";

    try {
        const resposta = await fetch(`${API_URL}/seminovos`);
        const anuncios = await resposta.json();
        
        let html = "";
        anuncios.forEach(anuncio => {
            const urlImg = anuncio.imagem ? 
                          `${API_URL}/uploads/${anuncio.imagem}` : 
                          'caminho/para/imagem-padrao.png';
            html += `
                <div class="anuncio">
                    <div class="img-seminovo">
                        <img src="${urlImg}" alt="${anuncio.nome}" />
                    </div>
                    <div class="content">
                        <p class="descricao">${anuncio.descricao}</p>
                        <p class="nome">${anuncio.nome}<span class="marca"> - ${anuncio.marca}</span></p>
                        <p class="preco">R$ ${anuncio.preco}</p>
                        <button type="button">Saber mais</button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (err) {
        console.error('Erro ao carregar seminovos:', err);
        container.innerHTML = "<p>Erro ao carregar anúncios...</p>";
    }
}

async function cadastrarAnuncio() {
    try {
        const inputFile = document.getElementById("imagem-seminovo");
        const arquivo = inputFile.files[0];

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

        const requisicao = await fetch(`${API_URL}/seminovo/register`, {
            method: "POST",
            body: form
        });

        if (!requisicao.ok) throw new Error("Erro ao cadastrar anuncio");

        const dados = await requisicao.json();
        alert(dados.mensagem || "Anúncio de seminovo inserido com sucesso...");

        document.getElementById("form-seminovo").reset();
        await exibir_seminovos();
    } catch (erro) {
        console.error(erro);
        alert("Falha ao cadastrar anúncio de seminovo: " + erro.message);
    }
}

// ============== FUNÇÕES DE UI ==============
function solicitarAnuncio() {
    document.getElementById("formulario-seminovo").classList.remove("hidden");
}

function esconderSolicitacao() {
    document.getElementById("formulario-seminovo").classList.add("hidden");
}

function verEventos() {
    document.getElementById("lightbox-eventos").classList.remove("hidden");
    document.getElementById("explica-eventos").classList.add("hidden");
    document.getElementById("sair-lightbox").classList.remove("hidden");
}

function esconderEventos() {
    document.getElementById("lightbox-eventos").classList.add("hidden");
    document.getElementById("explica-eventos").classList.remove("hidden");
    document.getElementById("sair-lightbox").classList.add("hidden");
}

function abrirOverlay(img_element) {
    var overlay = document.getElementById("overlay-eventos");
    var overlayImg = document.getElementById("overlay-eventos-img");
    overlayImg.src = img_element.src;
    overlay.style.display = "flex";
}

function fecharOverlayEventos() {
    document.getElementById("overlay-eventos").style.display = "none";
}

function abrirOverlayMural(img_element) {
    var overlay = document.getElementById("overlay-mural-eventos");
    var overlayImg = document.getElementById("overlay-mural-eventos-img");

    overlayImg.src = img_element.src;
    overlayImg.alt = img_element.alt;

    document.getElementById("evt-nome").textContent = img_element.dataset.nome || "—";
    document.getElementById("evt-descricao").textContent = img_element.dataset.descricao || "—";
    document.getElementById("evt-gratuito").textContent = img_element.dataset.gratuito || "—";
    document.getElementById("evt-preco").textContent = img_element.dataset.preco || "—";
    document.getElementById("evt-endereco").textContent = img_element.dataset.endereco || "—";
    document.getElementById("evt-data").textContent = img_element.dataset.data || "—";

    overlay.style.display = "flex";
    overlay.focus();
}

function fecharOverlayMuralEventos(event) {
    var overlay = document.getElementById("overlay-mural-eventos");
    overlay.style.display = "none";

    var overlayImg = document.getElementById("overlay-mural-eventos-img");
    overlayImg.src = "";
    overlayImg.alt = "";

    document.querySelectorAll(".card-evento .value").forEach(el => el.textContent = "—");
}

function toggleFilter(filterType) {
    const pesquisa = document.getElementById("pesquisa-eventos");
    const filterOptions = document.getElementById("filter-options");
    const allPanels = document.querySelectorAll(".option-panel");
    const activePanel = document.getElementById(filterType + "-options");
    const buttons = document.querySelectorAll(".filter button");

    if (pesquisa.classList.contains("topo")) {
        pesquisa.classList.remove("topo");
        allPanels.forEach(panel => panel.style.display = "none");
        buttons.forEach(btn => btn.classList.remove("active"));
        return;
    } else {
        pesquisa.classList.add("topo");
    }

    allPanels.forEach(panel => panel.style.display = "none");
    buttons.forEach(btn => btn.classList.remove("active"));

    if (activePanel) {
        activePanel.style.display = "block";
        const activeButton = Array.from(buttons).find(btn => 
            btn.textContent.trim().toLowerCase().includes(filterType)
        );
        if (activeButton) {
            activeButton.classList.add("active");
        }
    }

    console.log(`Filtro '${filterType}' ativado.`);
}

// ============== SUGESTÕES ==============
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

if (btnVotar_sugestoes) {
    btnVotar_sugestoes.addEventListener('click', () => {
        votos++;
        contadorVotos_sugestoes.textContent = votos;
        btnVotar_sugestoes.disabled = true;
    });
}

if (btnCurtir_sugestoes) {
    btnCurtir_sugestoes.addEventListener('click', () => {
        curtidas++;
        contadorCurtidas_sugestoes.textContent = curtidas;
        btnCurtir_sugestoes.disabled = true;
    });
}

if (btnComentar_sugestoes) {
    btnComentar_sugestoes.addEventListener('click', () => {
        if (areaComentarios_sugestoes.style.display === 'none') {
            areaComentarios_sugestoes.style.display = 'block';
            btnComentar_sugestoes.textContent = '⬆️ Minimizar';
        } else {
            areaComentarios_sugestoes.style.display = 'none';
            btnComentar_sugestoes.textContent = '💬 Comentar';
        }
    });
}

if (btnEnviarComentario_sugestoes) {
    btnEnviarComentario_sugestoes.addEventListener('click', () => {
        const texto = inputComentario_sugestoes.value.trim();
        if (texto) {
            const comentario = {
                usuario: 'Usuário',
                hora: new Date(),
                texto: texto
            };
            comentarios.push(comentario);
            atualizarComentarios();
            inputComentario_sugestoes.value = '';
        }
    });
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

if (btnEncaminhar_sugestoes) {
    btnEncaminhar_sugestoes.addEventListener('click', () => {
        alert('Funcionalidade de encaminhar ainda não implementada.');
    });
}

// ============== TOAST ==============
function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast';
    toast.classList.add(type);
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============== LOGIN E CADASTRO ==============
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

function abrirTermos(event) {
    event.preventDefault();
    alert('Termos de uso: [Conteúdo simulado]. Em produção, abra uma página/modal.');
}

async function cadastrar_usuario(event) {
    event.preventDefault();
    const button = event.target.querySelector('button');
    const form = event.target;

    form.querySelectorAll('.erro').forEach(el => el.classList.remove('erro'));

    const nome = document.getElementById("nome-cadastro").value.trim();
    const email = document.getElementById("email-cadastro").value.trim();
    const telefone = document.getElementById("telefone-cadastro").value.trim();
    const dataNascimento = document.getElementById("data-nascimento-cadastro").value;
    const senha = document.getElementById("password-cadastro").value;
    const confirmSenha = document.getElementById("confirm-password-cadastro").value;
    const aceitarTermos = document.getElementById("aceitar-termos").checked;

    let valido = true;

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
        valido = false;
    }

    if (!valido) {
        showToast('Por favor, corrija os erros no formulário.', 'error');
        return;
    }

    button.classList.add('loading');
    button.textContent = '';

    try {
        const usuario = {
            nome,
            telefone,
            data_nascimento: dataNascimento,
            email,
            senha
        };

        const requisicao = await fetch(`${API_URL}/user/register`, {
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

async function logar_usuario(event) {
    event.preventDefault();
    console.log('=== DEBUG LOGIN INICIADO ===');

    const button = event.target.querySelector('button');
    const email = document.getElementById("email-login").value.trim();
    const senha = document.getElementById("password-login").value;

    console.log('Dados de login:', { email, senhaLength: senha.length });

    if (!email || !senha) {
        console.log('Validação falhou: campos vazios');
        showToast('E-mail e senha são obrigatórios.', 'error');
        return;
    }

    button.classList.add('loading');
    button.textContent = '';

    try {
        const usuario = { email, senha };
        const url = `${API_URL}/user/login`;
        console.log('Fetch para URL:', url);

        const requisicao = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(usuario),
            credentials: "include"
        });

        console.log('Fetch executado! Status:', requisicao.status);

        if (!requisicao.ok && requisicao.status === 0) {
            throw new Error('Falha de rede ou CORS bloqueado.');
        }

        const resposta = await requisicao.json();
        console.log('Resposta JSON:', resposta);

        if (!requisicao.ok || resposta.sucesso === false) {
            throw new Error(resposta.mensagem || resposta.erro || "Credenciais inválidas");
        }

        console.log('=== LOGIN BEM-SUCEDIDO ===');
        showToast("Login realizado com sucesso! Bem-vindo " + (resposta.usuario?.nome || ""), "success");

        localStorage.setItem('usuarioLogado', JSON.stringify(resposta.usuario));
        localStorage.setItem('logado', 'true');

        const containerLogin = document.getElementById('login-cadastro');
        const secaoComunidade = document.getElementById('comunidade');

        if (containerLogin) {
            containerLogin.classList.add('hidden');
        }

        if (secaoComunidade) {
            secaoComunidade.classList.remove('hidden');
        }

        // Atualiza nome do perfil
        const nomePerfil = document.getElementById('nome-perfil');
        if (nomePerfil && resposta.usuario?.nome) {
            nomePerfil.textContent = resposta.usuario.nome;
        }

    } catch (erro) {
        console.error('=== ERRO NO LOGIN ===');
        console.error('Mensagem:', erro.message);
        showToast("Falha no login: " + erro.message, "error");
    } finally {
        button.classList.remove('loading');
        button.textContent = 'Entrar';
        console.log('=== DEBUG LOGIN FINALIZADO ===');
    }
}

function logout() {
    localStorage.removeItem('usuarioLogado');
    localStorage.removeItem('logado');

    const containerLogin = document.querySelector('.login-cadastro');
    const secaoComunidade = document.getElementById('comunidade');

    if (containerLogin) {
        containerLogin.classList.remove('hidden');
    }

    if (secaoComunidade) {
        secaoComunidade.classList.add('hidden');
    }

    showToast('Logout realizado. Até logo!', 'success');
    document.getElementById('formulario-login').reset();
    mostrarLogin();
}

// ============== LISTENERS DE INTERATIVIDADE ==============
const telefoneInput = document.getElementById('telefone-cadastro');
if (telefoneInput) {
    telefoneInput.addEventListener('input', () => aplicarMascaraTelefone(telefoneInput));
}

const confirmSenhaInput = document.getElementById('confirm-password-cadastro');
if (confirmSenhaInput) {
    confirmSenhaInput.addEventListener('input', () => {
        if (confirmSenhaInput.classList.contains('erro')) {
            confirmSenhaInput.classList.remove('erro');
        }
    });
}

const termosCheckbox = document.getElementById('aceitar-termos');
if (termosCheckbox) {
    termosCheckbox.addEventListener('change', () => {
        const container = document.querySelector('.checkbox-container');
        if (container && container.classList.contains('erro')) {
            container.classList.remove('erro');
        }
    });
}

const senhaInput = document.getElementById('password-cadastro');
if (senhaInput) {
    senhaInput.addEventListener('input', () => {
        if (senhaInput.classList.contains('erro')) {
            senhaInput.classList.remove('erro');
        }
    });
}