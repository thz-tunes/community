import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';  // Para __dirname em ES Modules
import http from 'http';  // Built-in, sem require
import { Server } from 'socket.io';  // Import correto para socket.io em ES
import fs from 'fs-extra';  // Para persistência JSON
import multer from 'multer';

import { inserir_usuario, autenticar_usuario, listar_seminovo, inserir_seminovo, excluir_semivovo } from './controller.js';  // .js no final

// Polyfill para __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {  // Usando new Server() para ES Modules
  cors: {
    origin: "*",  // Ajuste para produção (ex: "http://localhost:3000")
    methods: ["GET", "POST"]
  }
});

// CORS Configurado Explicitamente (CORREÇÃO: Substitui app.use(cors()); para resolver bloqueio no frontend)
app.use(cors({
  origin: function (origin, callback) {
    // Defina origens permitidas (ajuste para o seu frontend)
    const allowedOrigins = [
      'http://localhost:5500',  // VS Code Live Server
      'http://127.0.0.1:5500',
      'http://thz-tunes.github.io',   // Adicionado: Versão HTTP do GitHub Pages para compatibilidade
      'https://thz-tunes.github.io',  // Frontend de produção (já existente)
    ];
    // Em dev, permite qualquer origem sem header (ex: file:// ou Postman)
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // ESSENCIAL para 'credentials: "include"' no fetch (cookies/sessão)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // Inclui OPTIONS para preflight
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']  // Headers comuns
}));

// Middleware para preflight OPTIONS (responde automaticamente a requests OPTIONS do navegador)
app.options('*', cors());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.json());

// ============== SOCKET.IO - CHAT EM TEMPO REAL ==============
// Arquivo para armazenar mensagens (persistência simples)
const MESSAGES_FILE = 'messages.json';

// Carregue mensagens uma vez no nível superior (agora possível com ES Modules)
let messages = [];
(async () => {
  try {
    messages = await loadMessages();
    console.log('Mensagens carregadas:', messages.length);
  } catch (error) {
    console.error('Erro ao carregar mensagens iniciais:', error);
  }
})();

// Função para carregar mensagens do arquivo
async function loadMessages() {
  try {
    if (await fs.pathExists(MESSAGES_FILE)) {
      return await fs.readJson(MESSAGES_FILE);
    }
    return [];
  } catch (err) {
    console.error('Erro ao carregar mensagens:', err);
    return [];
  }
}

// Função para salvar mensagens no arquivo (CORREÇÃO: Limita a 100 mensagens recentes para performance)
async function saveMessages(messages) {
  try {
    // Opcional: Manter só as últimas 100 mensagens
    const recentMessages = messages.slice(-100);
    await fs.writeJson(MESSAGES_FILE, recentMessages, { spaces: 2 });
  } catch (err) {
    console.error('Erro ao salvar mensagens:', err);
  }
}

io.on('connection', (socket) => {
  console.log('Usuário conectado ao chat:', socket.id);

  // CORREÇÃO: Removido o emit automático de 'loadMessages' aqui (para evitar perda de eventos).
  // Agora, responde apenas quando o client solicitar (veja abaixo).

  // CORREÇÃO: Novo listener para responder ao request de histórico do client
  socket.on('loadMessages', () => {
    console.log('Solicitação de histórico recebida de:', socket.id);
    socket.emit('loadMessages', messages);  // Envia só para o socket que pediu
  });

  // Recebe nova mensagem do cliente
  socket.on('sendMessage', async (data) => {
    const { username, message } = data;
    if (!username || !message.trim()) {
      console.log('Mensagem inválida ignorada.');
      return;
    }

    const newMessage = {
      id: Date.now(),  // ID simples baseado em timestamp
      username,
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    // Adiciona ao array e salva no arquivo
    messages.push(newMessage);
    await saveMessages(messages);  // Await aqui para garantir salvamento

    // Broadcasta para todos os clientes (incluindo o remetente)
    io.emit('newMessage', newMessage);
    console.log('Nova mensagem enviada:', newMessage.id);
  });

  // Quando o usuário desconecta (ex: sai da página ou fecha o chat)
  socket.on('disconnect', () => {
    console.log('Usuário desconectado do chat:', socket.id);
    // Não remove mensagens; elas persistem para todos
  });
});


// -------------------------------------
//               USUÁRIOS 
// ------------------------------------- 


// Rota de Register (Cadastro) - Mantém como está, mas com log
app.post('/user/register', async (req, res) => {
  try {
    console.log('Recebido no backend (register):', req.body);
    const novo_usuario = req.body;
    await inserir_usuario(novo_usuario);
    console.log('Usuário inserido com sucesso!');
    res.status(201).json({ mensagem: 'Usuário inserido com sucesso!' });
  } catch (err) {
    console.error("Erro no servidor (register):", err);
    res.status(500).json({ erro: err.message });
  }
});

// Rota de Login - Mantém como está, com logs
app.post("/user/login", async (req, res) => {
  try {
    console.log('Recebido no backend (login):', req.body);
    const resultado = await autenticar_usuario(req.body);
    console.log('Resultado da autenticação:', resultado);

    if (!resultado.sucesso) {
      console.log('Falha na autenticação:', resultado.mensagem);
      return res.status(401).json(resultado);
    }

    console.log('Login bem-sucedido para:', resultado.usuario.email);
    res.json(resultado);
  } catch (err) {
    console.error('Erro no servidor (login):', err);
    res.status(500).json({ sucesso: false, mensagem: "Erro ao autenticar usuário." });
  }
});




// -------------------------------------
//               MULTER 
// ------------------------------------- 

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const nome = `${timestamp}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, nome);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },  // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Apenas imagens são permitidas'));
    }
    cb(null, true);
  }
});



// -------------------------------------
//               SEMINOVOS 
// ------------------------------------- 

app.get('/seminovos', async (req, res) => {
  var seminovos = await listar_seminovo();
  res.send(seminovos);
});

app.post('/seminovo/register', upload.single('imagem'), async (req, res) => {
  try {
    const novoSemi = {
      nome: req.body.nome,
      descricao: req.body.descricao,
      preco: req.body.preco,
      marca: req.body.marca,
      email: req.body.email,
      id_categoria: req.body.id_categoria,
      imagem: req.file ? req.file.filename : null
    };

    await inserir_seminovo(novoSemi);
    res.status(201).json({ sucesso: true, mensagem: 'Anúncio de Seminovo inserido com sucesso!' });
  } catch (err) {
    console.error("Erro ao inserir seminovo:", err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao inserir seminovo', detalhe: err.message });
  }
});

app.delete("/seminovo/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await excluir_semivovo(id);
    res.status(200).send("Anúncio de Seminovo excluído com êxito!");
  } catch (erro) {
    res.status(500).send({ err: erro.message });
  }
});
// =============================================================

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Socket.io disponível em http://localhost:${PORT}`);
  console.log('CORS configurado para origens locais.');  // Confirmação da correção
});
