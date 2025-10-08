import fs from 'fs-extra';
import bcrypt from 'bcrypt';

const USERS_FILE = 'users.json';
const SEMINOVOS_FILE = 'seminovos.json';

// -------------------------
// FUNÇÕES AUXILIARES JSON
// -------------------------
async function loadData(file) {
  try {
    if (await fs.pathExists(file)) return await fs.readJson(file);
    return [];
  } catch (err) {
    console.error('Erro ao carregar JSON:', err);
    return [];
  }
}

async function saveData(data, file) {
  try {
    await fs.writeJson(file, data, { spaces: 2 });
    return true;
  } catch (err) {
    console.error('Erro ao salvar JSON:', err);
    return false;
  }
}

// -------------------------
// USUÁRIOS
// -------------------------
export async function inserir_usuario(usuario, dbPool) {
  // Hash da senha
  usuario.senha_hash = await bcrypt.hash(usuario.senha, 10);

  if (dbPool) {
    try {
      const [result] = await dbPool.execute(
        'INSERT INTO usuarios (nome, email, senha_hash, telefone, data_nascimento) VALUES (?, ?, ?, ?, ?)',
        [usuario.nome, usuario.email, usuario.senha_hash, usuario.telefone, usuario.data_nascimento]
      );
      return { sucesso: true, id: result.insertId };
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return { sucesso: false, mensagem: 'Email já existe' };
      return { sucesso: false, mensagem: err.message };
    }
  }

  // Fallback JSON
  const users = await loadData(USERS_FILE);
  const id = users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
  usuario.id = id;
  users.push(usuario);
  const saved = await saveData(users, USERS_FILE);
  return { sucesso: saved, id };
}

export async function autenticar_usuario({ email, senha }, dbPool) {
  if (dbPool) {
    try {
      const [rows] = await dbPool.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
      const user = rows[0];
      if (user && await bcrypt.compare(senha, user.senha_hash)) {
        const { senha_hash, ...safeUser } = user;
        return { sucesso: true, usuario: safeUser };
      }
      return { sucesso: false, mensagem: 'Credenciais inválidas' };
    } catch (err) {
      return { sucesso: false, mensagem: err.message };
    }
  }

  // Fallback JSON
  const users = await loadData(USERS_FILE);
  const user = users.find(u => u.email === email);
  if (user && await bcrypt.compare(senha, user.senha_hash)) {
    const { senha_hash, ...safeUser } = user;
    return { sucesso: true, usuario: safeUser };
  }
  return { sucesso: false, mensagem: 'Credenciais inválidas' };
}

// -------------------------
// SEMINOVOS
// -------------------------
export async function listar_seminovo(dbPool) {
  if (dbPool) {
    try {
      const [rows] = await dbPool.execute('SELECT * FROM seminovos ORDER BY id DESC');
      return rows;
    } catch (err) {
      console.error('Erro listar seminovos DB:', err);
      return [];
    }
  }
  return await loadData(SEMINOVOS_FILE);
}

export async function inserir_seminovo(seminovo, dbPool) {
  if (dbPool) {
    try {
      const [result] = await dbPool.execute(
        'INSERT INTO seminovos (nome, descricao, preco, marca, email, id_categoria, imagem) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [seminovo.nome, seminovo.descricao, seminovo.preco, seminovo.marca, seminovo.email, seminovo.id_categoria, seminovo.imagem]
      );
      return { sucesso: true, id: result.insertId };
    } catch (err) {
      return { sucesso: false, mensagem: err.message };
    }
  }

  // Fallback JSON
  const seminovos = await loadData(SEMINOVOS_FILE);
  const id = seminovos.length ? Math.max(...seminovos.map(s => s.id)) + 1 : 1;
  seminovo.id = id;
  seminovos.push(seminovo);
  const saved = await saveData(seminovos, SEMINOVOS_FILE);
  return { sucesso: saved, id };
}

export async function excluir_semivovo(id, dbPool) {
  if (dbPool) {
    try {
      const [result] = await dbPool.execute('DELETE FROM seminovos WHERE id = ?', [id]);
      return { sucesso: result.affectedRows > 0, mensagem: result.affectedRows > 0 ? 'Excluído' : 'Não encontrado' };
    } catch (err) {
      return { sucesso: false, mensagem: err.message };
    }
  }

  // Fallback JSON
  let seminovos = await loadData(SEMINOVOS_FILE);
  const initialLength = seminovos.length;
  seminovos = seminovos.filter(s => s.id != id);
  const saved = await saveData(seminovos, SEMINOVOS_FILE);
  return { sucesso: saved && seminovos.length < initialLength, mensagem: 'Excluído' };
}
