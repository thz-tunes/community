import { conectar, desconectar } from './db.js';  // Já correto
import bcrypt from 'bcrypt';  // Mudança: import em vez de require

// ------------- USUÁRIO ------------------

// Função auxiliar para verificar se email já existe
async function emailExiste(email) {
    const conn = await conectar();
    const [rows] = await conn.execute('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [email]);
    await desconectar(conn);
    return rows.length > 0;
}

async function inserir_usuario(user) {
    const { nome, telefone, data_nascimento, email } = user;
    const senha = await bcrypt.hash(user.senha, 10);

    // Verifica se email já existe
    if (await emailExiste(email)) {
        throw new Error('E-mail já cadastrado. Use outro.');
    }

    const conn = await conectar();
    const query = 'INSERT INTO usuarios (nome, telefone, data_nascimento, email, senha) VALUES (?, ?, ?, ?, ?)';
    await conn.execute(query, [nome, telefone, data_nascimento, email, senha]);
    await desconectar(conn);
}

async function autenticar_usuario(usuario) {
    const { email, senha } = usuario;
    const conn = await conectar();

    // Busca usuário pelo email
    const [rows] = await conn.execute(
        'SELECT * FROM usuarios WHERE email = ? LIMIT 1',
        [email]
    );

    await desconectar(conn);

    // Se não achou usuário
    if (rows.length === 0) {
        return { sucesso: false, mensagem: 'Usuário não encontrado' };
    }

    const usuarioDB = rows[0];

    // Compara a senha informada com a senha hash
    const senhaCorreta = await bcrypt.compare(senha, usuarioDB.senha);

    if (!senhaCorreta) {
        return { sucesso: false, mensagem: 'Senha incorreta' };
    }

    return {
        sucesso: true,
        mensagem: 'Login realizado com sucesso',
        usuario: { id: usuarioDB.id, nome: usuarioDB.nome, email: usuarioDB.email }
    };
}



// ------------- SEMINOVOS ------------------

async function listar_seminovo() {
    try {
        const conn = await conectar();
        var query = 'SELECT * FROM seminovos';
        var [linhas] = await conn.execute(query);
        // console.log(linhas);
        await desconectar(conn);
        return linhas;
    } catch (err) {
        console.log('Erro: ', err.message)
    }
}

async function inserir_seminovo(seminovo) {
    const { nome, descricao, preco, marca, email, id_categoria, imagem } = seminovo;

    const conn = await conectar();
    const query = 'INSERT INTO seminovos (nome, descricao, preco, marca, email, id_categoria, imagem) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const parametros = [nome, descricao, preco, marca, email, id_categoria || null, imagem || null];
    await conn.execute(query, parametros);
    await desconectar(conn);
}

async function excluir_semivovo(id) {
    const conn = await conectar();

    var query = "DELETE FROM seminovos WHERE id = ?;";
    var param = [id];

    await conn.execute(query, param);
    await desconectar(conn)
}

// Mudança: Export em vez de module.exports
export { inserir_usuario, autenticar_usuario, listar_seminovo, inserir_seminovo, excluir_semivovo };
