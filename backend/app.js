import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs-extra';
import multer from 'multer';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

import { inserir_usuario, autenticar_usuario, listar_seminovo, inserir_seminovo, excluir_semivovo } from './controller.js';

// Carregar variáveis de ambiente
dotenv.config();

// Polyfill para __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ============== CONEXÃO COM BANCO DE DADOS ==============
let dbPool = null;

async function initializeDatabase() {
  try {
    dbPool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const connection = await dbPool.getConnection();
    console.log('✅ Conectado ao MySQL com sucesso!');
    console.log('📊 Database:', process.env.DB_DATABASE);
    connection.release();

    await createTablesIfNotExist();

  } catch (error) {
    console.error('❌ Erro ao conectar no MySQL:', error.message);
    console.log('⚠️  Usando modo fallback (arquivos JSON)');
    dbPool = null;
  }
}

async function createTablesIfNotExist() {
  if (!dbPool) return;

  try {
    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        telefone CHAR(11) NOT NULL UNIQUE,
        data_nascimento DATE,
        email VARCHAR(100) NOT NULL UNIQUE,
        senha_hash VARCHAR(255) NOT NULL
      )
    `);

    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS categorias_esportes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome_categoria VARCHAR(100) NOT NULL
      )
    `);

    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS produtos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        descricao TEXT,
        preco DECIMAL(10,2) NOT NULL,
        marca VARCHAR(100),
        modelo VARCHAR(100),
        dimensoes VARCHAR(100),
        garantia_meses INT DEFAULT 0
      )
    `);

    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS seminovos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        descricao TEXT NOT NULL,
        preco DECIMAL(10,2) NOT NULL,
        marca VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL,
        id_categoria INT NULL,
        imagem VARCHAR(255) NULL
      )
    `);

    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS eventos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        descricao TEXT NOT NULL,
        gratuito BOOLEAN NOT NULL,
        preco DECIMAL(10,2),
        endereco VARCHAR(200) NOT NULL,
        data_evento DATE
      )
    `);

    console.log('✅ Tabelas verificadas/criadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
  }
}

await initializeDatabase();

// ============== CORS CONFIGURAÇÃO ==============
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'https://thz-tunes.github.io',
  'http://thz-tunes.github.io',
  'https://community-production-5ff9.up.railway.app'
];

console.log('🔒 Origens CORS permitidas:', allowedOrigins);

// CORS middleware - APENAS UMA VEZ
app.use(cors({
  origin: function (origin, callback) {
    // Permite requests sem origin (mobile apps, Postman, cURL)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS permitido para:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS bloqueado para:', origin);
      callback(null, false); // Não retorna erro, apenas bloqueia
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Para browsers antigos
}));

// Middleware JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============== SOCKET.IO - CHAT ==============
const MESSAGES_FILE = 'messages.json';
let messages = [];

(async () => {
  try {
    if (await fs.pathExists(MESSAGES_FILE)) {
      messages = await fs.readJson(MESSAGES_FILE);
      console.log('💬 Mensagens carregadas:', messages.length);
    }
  } catch (error) {
    console.error('Erro ao carregar mensagens:', error);
  }
})();

async function saveMessages(msgs) {
  try {
    const recentMessages = msgs.slice(-100);
    await fs.writeJson(MESSAGES_FILE, recentMessages, { spaces: 2 });
  } catch (err) {
    console.error('Erro ao salvar mensagens:', err);
  }
}

io.on('connection', (socket) => {
  console.log('👤 Usuário conectado:', socket.id);

  socket.on('loadMessages', () => {
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
  });

  socket.on('disconnect', () => {
    console.log('👋 Usuário desconectado:', socket.id);
  });
});

// ============== ROTAS ==============

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: dbPool ? 'connected' : 'fallback',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// USUÁRIOS
app.post('/user/register', async (req, res) => {
  try {
    console.log('📝 Cadastro recebido:', req.body.email);
    const novo_usuario = req.body;
    const resultado = await inserir_usuario(novo_usuario, dbPool);
    
    if (!resultado.sucesso) {
      return res.status(400).json({ erro: resultado.mensagem });
    }
    
    res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!' });
  } catch (err) {
    console.error("❌ Erro no cadastro:", err);
    res.status(500).json({ erro: err.message });
  }
});

app.post("/user/login", async (req, res) => {
  try {
    console.log('🔐 Login recebido:', req.body.email);
    const resultado = await autenticar_usuario(req.body, dbPool);

    if (!resultado.sucesso) {
      return res.status(401).json(resultado);
    }

    res.json(resultado);
  } catch (err) {
    console.error('❌ Erro no login:', err);
    res.status(500).json({ sucesso: false, mensagem: "Erro ao autenticar usuário." });
  }
});

// ============== MULTER ==============
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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Apenas imagens são permitidas'));
    }
    cb(null, true);
  }
});

// SEMINOVOS
app.get('/seminovos', async (req, res) => {
  try {
    const seminovos = await listar_seminovo(dbPool);
    res.json(seminovos);
  } catch (err) {
    console.error('❌ Erro ao listar seminovos:', err);
    res.status(500).json({ erro: err.message });
  }
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

    const resultado = await inserir_seminovo(novoSemi, dbPool);
    
    if (!resultado.sucesso) {
      return res.status(400).json({ sucesso: false, mensagem: resultado.mensagem });
    }

    res.status(201).json({ sucesso: true, mensagem: 'Anúncio inserido com sucesso!' });
  } catch (err) {
    console.error("❌ Erro ao inserir seminovo:", err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao inserir seminovo', detalhe: err.message });
  }
});

app.delete("/seminovo/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await excluir_semivovo(id, dbPool);
    
    if (!resultado.sucesso) {
      return res.status(404).json({ erro: resultado.mensagem });
    }
    
    res.status(200).json({ mensagem: "Anúncio excluído com êxito!" });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Erro no servidor:', err);
  res.status(500).json({ erro: 'Erro interno do servidor', mensagem: err.message });
});

// ============== INICIAR SERVIDOR ==============
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`💬 Socket.io disponível`);
  console.log(`🗄️  Database: ${dbPool ? 'MySQL conectado' : 'Modo fallback (JSON)'}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 CORS configurado para ${allowedOrigins.length} origens\n`);
});