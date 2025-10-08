import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs-extra';
import multer from 'multer';
import bcrypt from 'bcrypt';  // NOVA DEP: Para hash de senhas
import { Pool } from 'pg';  // NOVA DEP: Para Postgres (opcional)

import { inserir_usuario, autenticar_usuario, listar_seminovo, inserir_seminovo, excluir_semivovo } from './controller.js';

// Polyfill para __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",  // Permite Socket.IO de qualquer origem (ajuste se preciso)
    methods: ["GET", "POST"]
  }
});

// CORS ATUALIZADO: Adicionado suporte a GitHub Pages (https://thz-tunes.github.io e subpaths)
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5500',  // Dev local
      'http://127.0.0.1:5500',
      'https://thz-tunes.github.io',  // GitHub Pages principal
      'https://thz-tunes.github.io/community',  // Subpasta se deployado assim
      'https://*.github.io'  // Qualquer subdomínio GitHub (flexível)
    ];
    if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed)) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // Para cookies/auth
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.options('*', cors());  // Preflight OPTIONS

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());

// NOVA: Config DB Postgres (se DATABASE_URL existir no Railway; fallback JSON no controller)
let dbPool;
if (process.env.DATABASE_URL) {
  dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
  console.log('Postgres conectado!');
  // Inicializa tabelas se não existirem
  dbPool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      senha_hash VARCHAR(255),
      telefone VARCHAR(20),
      data_nascimento DATE
    );
    CREATE TABLE IF NOT EXISTS seminovos (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100),
      descricao TEXT,
      preco DECIMAL(10,2),
      marca VARCHAR(50),
      email VARCHAR(100),
      id_categoria INTEGER,
      imagem VARCHAR(255)
    );
  `).then(() => console.log('Tabelas criadas/verificadas.')).catch(console.error);
} else {
  console.log('Sem DB; usando JSON fallback.');
}

// ============== SOCKET.IO - CHAT (Melhorado com limite e logs) ==============
const MESSAGES_FILE = 'messages.json';
let messages = [];
(async () => {
  try {
    messages = await loadMessages();
    console.log('Mensagens carregadas:', messages.length);
  } catch (error) {
    console.error('Erro ao carregar mensagens:', error);
  }
})();

async function loadMessages() {
  try {
    if (await fs.pathExists(MESSAGES_FILE)) {
      return await fs.readJson(MESSAGES_FILE);
    }
    return [];
  } catch (err) {
    return [];
  }
}

async function saveMessages(messages) {
  try {
    const recent = messages.slice(-100);  // Limite 100 para performance
    await fs.writeJson(MESSAGES_FILE, recent, { spaces: 2 });
  } catch (err) {
    console.error('Erro ao salvar mensagens:', err);
  }
}

io.on('connection', (socket) => {
  console.log('Usuário conectado:', socket.id);
  socket.on('loadMessages', () => {
    console.log('Histórico solicitado por:', socket.id);
    socket.emit('loadMessages', messages);
  });
  socket.on('sendMessage', async (data) => {
    const { username, message } = data;
    if (!username || !message.trim()) return;
    const newMessage = {
      id: Date.now(),
      username,
      message: message.trim(),
      timestamp: new Date().toISOString()
    };
    messages.push(newMessage);
    await saveMessages(messages);
    io.emit('newMessage', newMessage);
    console.log('Mensagem enviada:', newMessage.id);
  });
  socket.on('disconnect', () => console.log('Desconectado:', socket.id));
});

// Rotas Usuários (Atualizado com bcrypt)
app.post('/user/register', async (req, res) => {
  try {
    console.log('Register recebido:', req.body.email);
    const { senha, ...usuario } = req.body;
    usuario.senha_hash = await bcrypt.hash(senha, 10);  // Hash seguro
    const resultado = await inserir_usuario(usuario, dbPool);  // Passa dbPool
    if (resultado.sucesso) {
      res.status(201).json({ mensagem: 'Usuário cadastrado!' });
    } else {
      res.status(400).json({ erro: resultado.mensagem });
    }
  } catch (err) {
    console.error('Erro register:', err);
    res.status(500).json({ erro: err.message });
  }
});

app.post('/user/login', async (req, res) => {
  try {
    console.log('Login recebido:', req.body.email);
    const resultado = await autenticar_usuario(req.body, dbPool);  // Passa dbPool
    if (resultado.sucesso) {
      res.json(resultado);  // Retorna { sucesso: true, usuario: { ... sem senha } }
    } else {
      res.status(401).json(resultado);
    }
  } catch (err) {
    console.error('Erro login:', err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno' });
  }
});

// Rotas Seminovos (Igual, mas com dbPool)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}-${Math.random().toString(36).substring(2, 8)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Apenas imagens')) });

app.get('/seminovos', async (req, res) => res.send(await listar_seminovo(dbPool)));

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
    const resultado = await inserir_seminovo(novoSemi, dbPool);
    if (resultado.sucesso) {
      res.status(201).json({ sucesso: true, mensagem: 'Inserido!' });
    } else {
      res.status(400).json(resultado);
    }
  } catch (err) {
    console.error('Erro seminovo:', err);
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
});

app.delete('/seminovo/delete/:id', async (req, res) => {
  try {
    const resultado = await excluir_semivovo(req.params.id, dbPool);
    if (resultado.sucesso) {
      res.status(200).json({ mensagem: 'Excluído!' });
    } else {
      res.status(404).json(resultado);
    }
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Servidor em http://localhost:${PORT}`);
  console.log('CORS ok para GitHub Pages e local.');
});
