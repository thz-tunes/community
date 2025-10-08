import fs from 'fs-extra';
import bcrypt from 'bcrypt';

const USERS_FILE = 'users.json';
const SEMINOVOS_FILE = 'seminovos.json';

// Carrega dados (fallback se DB null)
async function loadData(file) {
  if (dbPool) return null;  // Usa DB
  try {
    if (await fs.pathExists(file)) return await fs.readJson(file);
    return [];
  } catch (err) {
    return [];
  }
}

async function saveData(data, file) {
  if (dbPool) return true;  // Salva no DB via funções
  try {
    await fs.writeJson(file, data, { spaces: 2 });
    return true;
  } catch (err) {
    console.error('Erro save:', err);
    return false;
  }
}

// Usuários
export async function inserir_usuario(usuario, dbPool) {
  if (dbPool) {
    try {
      const query = 'INSERT INTO usuarios (nome, email, senha_hash, telefone, data_nascimento) VALUES ($1, $2, $3, $4, $5) RETURNING id';
      const result = await dbPool.query(query, [usuario.nome, usuario.email, usuario.senha_hash, usuario.telefone, usuario.data_nascimento]);
      return { sucesso: true, id: result.rows[0].id };
    } catch (err) {
      if (err.code === '23505') return { sucesso: false, mensagem: 'Email já existe' };  // Unique violation
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
      const query = 'SELECT * FROM usuarios WHERE email = $1';
      const result = await dbPool.query(query, [email]);
      const user = result.rows[0];
      if (user && await bcrypt.compare(senha, user.senha_hash)) {
        const { senha_hash, ...safeUser  } = user;
        return { sucesso: true, usuario: safeUser  };
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
    const { senha_hash, ...safeUser  } = user;
    return { sucesso: true, usuario: safeUser  };
  }
  return { sucesso: false, mensagem: 'Credenciais inválidas' };
}

// Seminovos (similar, com INSERT/SELECT no DB)
export async function listar_seminovo(dbPool) {
  if (dbPool) {
    try {
      const result = await dbPool.query('SELECT * FROM seminovos ORDER BY id DESC');
      return result.rows;
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
      const query = 'INSERT INTO seminovos (nome, descricao, preco, marca, email, id_categoria, imagem) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id';
      const result = await dbPool.query(query, [seminovo.nome, seminovo.descricao, seminovo.preco, seminovo.marca, seminovo.email, seminovo.id_categoria, seminovo.imagem]);
      return { sucesso: true, id: result.rows[0].id };
    } catch (err) {
      return { sucesso: false, mensagem: err.message };
    }
  }
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
      const result = await dbPool.query('DELETE FROM seminovos WHERE id = $1 RETURNING id', [id]);
      return { sucesso: !!result.rows.length, mensagem: result.rows.length ? 'Excluído' : 'Não encontrado' };
    } catch (err) {
      return { sucesso: false, mensagem: err.message };
    }
  }
  let seminovos = await loadData(SEMINOVOS_FILE);
  const initialLength = seminovos.length;
  seminovos = seminovos.filter(s => s.id != id);
  const saved = await saveData(seminovos, SEMINOVOS_FILE);
  return { sucesso: saved && seminovos.length < initialLength, mensagem: 'Excluído' };
}
