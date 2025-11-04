require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Alterado de fs.promises para fs para usar existsSync e mkdirSync
const app = express();
const port = Number(process.env.APP_PORT || process.env.PORT || 3001);

const isStrongPassword = (password) =>
    typeof password === 'string' && /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

const baseLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 200),
    standardHeaders: true,
    legacyHeaders: false
});

const authLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_AUTH_MAX || 5),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: 'Demasiadas tentativas. Tente novamente mais tarde.',
    handler: (req, res, next, options) => {
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
        console.warn(`Limite de tentativas excedido para ${req.originalUrl}`, { username: req.body?.username, ip: clientIp });
        res.status(options.statusCode).json({ message: options.message });
    }
});

app.use(baseLimiter);
app.use(['/login', '/register'], authLimiter);

// Servir ficheiros estáticos da pasta 'uploads' (incluindo 'uploads/avatars/')
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Configuração do Multer para MATERIAIS (PDFs) ---
const materialStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/materiais/'; // Pasta específica para materiais
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});

const materialFileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Apenas ficheiros PDF são permitidos para materiais!'), false);
    }
};

const uploadMaterial = multer({
    storage: materialStorage,
    fileFilter: materialFileFilter
});

// --- Configuração do Multer para AVATARES (Imagens) ---
const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/avatars/'; // Pasta específica para avatares
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Idealmente, o username viria de um req.user (autenticação)
        // Por agora, se for um update, pegamos do params, senão do body.
        const username = req.params?.username || req.body?.username || 'default';
        cb(null, `${username.replace(/\s+/g, '_')}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const avatarFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Apenas ficheiros de imagem são permitidos para avatar!'), false);
    }
};

const uploadAvatar = multer({
    storage: avatarStorage,
    fileFilter: avatarFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB
});

// Conexão MySQL
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

['DB_USER', 'DB_PASSWORD', 'DB_NAME'].forEach((key) => {
    if (!process.env[key]) {
        console.warn(`Environment variable ${key} is not set.`);
    }
});

const db = mysql.createPool(dbConfig).promise(); // Usar .promise() para async/await com db.query

db.getConnection()
  .then(conn => {
    conn.release();
    console.log('Ligação MySQL verificada com sucesso.');
  })
  .catch(err => {
    console.error('Falha na ligação MySQL:', err);
  });

// (A conexão é implícita com .promise(), não precisa de db.connect)
console.log('Configuração da base de dados pronta para uso com promessas.');

// --- Endpoints de AUTENTICAÇÃO ---
app.post('/register', async (req, res) => {
    const { username, email, password, instituicao } = req.body;
    if (!username || !email || !password || !instituicao) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }
    if (!isStrongPassword(password)) {
        return res.status(400).json({
            message: 'A palavra-passe deve ter pelo menos 8 caracteres, incluir uma letra maiúscula e um número.'
        });
    }
    try {
        const [users] = await db.query('SELECT * FROM Utilizador WHERE Username = ? OR Email = ?', [username, email]);
        if (users.length > 0) {
            return res.status(409).json({ message: 'Nome de utilizador ou email já em uso.' });
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        await db.query('INSERT INTO Utilizador (Username, Email, Password, Instituicao, Avatar) VALUES (?, ?, ?, ?, NULL)', 
                       [username, email, hashedPassword, instituicao]);
        res.status(201).json({ message: 'Utilizador registado com sucesso!' });
    } catch (err) {
        console.error('Erro ao registar utilizador:', err);
        res.status(500).json({ message: 'Erro interno do servidor ao registar utilizador.' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username e password são obrigatórios.' });
    }
    try {
        const [users] = await db.query('SELECT Username, Password, Email, Instituicao, Avatar FROM Utilizador WHERE Username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Username ou password incorretos.' });
        }
        const user = users[0];
        const match = await bcrypt.compare(password, user.Password);
        if (match) {
            res.status(200).json({
                message: 'Login bem-sucedido!',
                userIdentifier: user.Username,
                avatarPath: user.Avatar ? `/uploads/avatars/${user.Avatar}` : null // Usa a coluna 'Avatar'
            });
        } else {
            res.status(401).json({ message: 'Username ou password incorretos.' });
        }
    } catch (err) {
        console.error('Erro ao fazer login:', err);
        res.status(500).json({ message: 'Erro interno do servidor durante a autenticação.' });
    }
});

// Listar todos os utilizadores ou pesquisar
app.get('/utilizadores', async (req, res) => {
    const { search } = req.query;
    let query = 'SELECT Username, Email, Instituicao, Avatar FROM Utilizador';
    const queryParams = [];
    if (search) {
        query += ' WHERE Username LIKE ?';
        queryParams.push(`%${search}%`);
    }
    query += ' ORDER BY Username ASC';
    try {
        const [utilizadores] = await db.query(query, queryParams);
        const utilizadoresComCaminhoAvatar = utilizadores.map(user => ({
            ...user,
            // O frontend construirá o caminho completo, aqui só enviamos o nome do arquivo
            Avatar: user.Avatar // ou null
        }));
        res.status(200).json(utilizadoresComCaminhoAvatar);
    } catch (err) {
        console.error('Erro ao buscar utilizadores:', err);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Buscar dados de um utilizador específico (para perfil e para carregar avatar)
app.get('/utilizador/:username', async (req, res) => {
    const { username } = req.params;
    if (!username) return res.status(400).json({ message: 'Nome de utilizador não fornecido.' });
    try {
        const [users] = await db.query('SELECT Username, Email, Instituicao, Avatar FROM Utilizador WHERE Username = ?', [username]);
        if (users.length === 0) return res.status(404).json({ message: 'Utilizador não encontrado.' });
        
        const user = users[0];
        res.status(200).json({
            username: user.Username,
            email: user.Email,
            instituicao: user.Instituicao,
            avatar: user.Avatar, // Nome do arquivo do avatar (ou null)
            avatarPath: user.Avatar ? `/uploads/avatars/${user.Avatar}` : null // Caminho para o frontend usar
        });
    } catch (err) {
        console.error('Erro ao buscar dados do utilizador:', err);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Atualizar dados do utilizador (email, instituição, avatar)
app.put('/utilizador/:username/update', uploadAvatar.single('avatarFile'), async (req, res) => {
    const { username: paramUsername } = req.params;
    const { email, instituicao, loggedInUserIdentifier } = req.body;
    
    // TODO: Implementar lógica de autenticação real e obter loggedInUser de req.user
    if (!loggedInUserIdentifier || loggedInUserIdentifier !== paramUsername) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: 'Não autorizado a atualizar este perfil.' });
    }

    if (!email) { // Username não deve ser alterado, instituição pode ser opcional
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Email é obrigatório.' });
    }

    let avatarFileName = null;
    if (req.file) {
        avatarFileName = req.file.filename;
    }

    try {
        //Obter o avatar atual antes de atualizar
        const [currentUserDataRows] = await db.query('SELECT Avatar FROM Utilizador WHERE Username = ?', [paramUsername]);
        if (currentUserDataRows.length === 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }
        const oldAvatar = currentUserDataRows[0].Avatar;

        //Preparar a query de atualização
        let updateQuery = 'UPDATE Utilizador SET Email = ?, Instituicao = ?';
        const queryParams = [email, instituicao || null];

        if (avatarFileName) {
            updateQuery += ', Avatar = ?';
            queryParams.push(avatarFileName);
        }

        // Adicionar a cláusula WHERE para atualizar apenas o utilizador correto
        updateQuery += ' WHERE Username = ?';
        queryParams.push(paramUsername);

        //Executar a atualização
        const [updateResult] = await db.query(updateQuery, queryParams);

        if (updateResult.affectedRows === 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'Utilizador não encontrado durante a atualização.' });
        }

        // Se o avatar foi atualizado, apagar o antigo
        if(avatarFileName && oldAvatar && oldAvatar !== 'default-avatar.png') {
            const oldAvatarPathOnServer = path.join(__dirname, 'uploads', 'avatars', oldAvatar);
            fs.unlink(oldAvatarPathOnServer, (errUnlink) => {
                if (errUnlink && errUnlink.code !== 'ENOENT'){ 
                    console.error("Erro ao apagar avatar antigo:", errUnlink);
                }
            });
        }

        //Retorna os dados finais e atualizados do utilizador
        const [finalUserRows] = await db.query('SELECT Username, Email, Instituicao, Avatar FROM Utilizador WHERE Username = ?', [paramUsername]);
        const finalUser = finalUserRows[0];

        res.status(200).json({
            message: 'Perfil atualizado com sucesso!',
            user: {
                username: finalUser.Username,
                email: finalUser.Email,
                instituicao: finalUser.Instituicao,
                avatar: finalUser.Avatar,
                avatarPath: finalUser.Avatar ? `/uploads/avatars/${finalUser.Avatar}` : null
            }
        });
    } catch (err) {
        console.error('Erro ao atualizar utilizador:', err);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Erro interno ao atualizar perfil.' });
    }
});

// Rota para alterar a palavra-passe do utilizador
app.put('/utilizador/:username/change-password', async (req, res) => {
    const { username: paramUsername } = req.params;
    const { currentPassword, newPassword, loggedInUserIdentifier } = req.body;

    // TODO: Implementar lógica de autenticação real e obter loggedInUser de req.user
    if (!loggedInUserIdentifier || loggedInUserIdentifier !== paramUsername) {
        return res.status(403).json({ message: 'Não autorizado a alterar a palavra-passe deste perfil.' });
    }

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Palavra-passe atual e nova palavra-passe são obrigatórias.' });
    }

    try {
        // 1. Obter a palavra-passe atual do utilizador
        const [users] = await db.query('SELECT Password FROM Utilizador WHERE Username = ?', [paramUsername]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Utilizador não encontrado.' });
        }
        const user = users[0];

        // 2. Comparar a palavra-passe atual fornecida com a hash guardada
        const match = await bcrypt.compare(currentPassword, user.Password);
        if (!match) {
            return res.status(401).json({ message: 'Palavra-passe atual incorreta.' });
        }

        // 3. Gerar hash para a nova palavra-passe
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // 4. Atualizar a palavra-passe na base de dados
        const [updateResult] = await db.query('UPDATE Utilizador SET Password = ? WHERE Username = ?', [hashedNewPassword, paramUsername]);

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ message: 'Utilizador não encontrado durante a atualização da palavra-passe.' });
        }

        res.status(200).json({ message: 'Palavra-passe alterada com sucesso!' });

    } catch (err) {
        console.error('Erro ao alterar palavra-passe:', err);
        res.status(500).json({ message: 'Erro interno do servidor ao alterar palavra-passe.' });
    }
});

// --- Endpoints de MATERIAIS ---
app.post('/materiais/upload', uploadMaterial.single('materialFile'), async (req, res) => {
    const { criadorUser, titulo, tipo } = req.body;
    const ficheiro = req.file;

    if (!ficheiro){ 
        return res.status(400).json({ message: 'Nenhum ficheiro foi enviado ou o tipo é inválido.' });
    }
    if (!criadorUser) {
        fs.unlinkSync(ficheiro.path);
        return res.status(400).json({ message: 'Criador do material não especificado.' });
    }

    const tituloMaterial = titulo || ficheiro.originalname;
    const caminhoFicheiro = ficheiro.filename; // O multer já colocou em 'uploads/materiais/'
    const tipoMaterial = tipo ? parseInt(tipo,10) : 0;
    const estadoMaterial = 0;

    try {
        const [resultado] = await db.query(
            'INSERT INTO Material (Titulo, Caminho_Ficheiro, Criador_User, Estado, Tipo) VALUES (?, ?, ?, ?, ?)',
            [tituloMaterial, caminhoFicheiro, criadorUser, estadoMaterial, tipoMaterial]
        );
        res.status(201).json({
            message: 'Material enviado com sucesso!',
            materialId: resultado.insertId,
            caminho: `/uploads/materiais/${caminhoFicheiro}`,
            nomeFicheiroServidor: caminhoFicheiro,
            titulo: tituloMaterial
        });
    } catch (err) {
        console.error('Erro ao inserir material na base de dados:', err);
        fs.unlinkSync(ficheiro.path);
        res.status(500).json({ message: 'Erro interno do servidor ao guardar o material.' });
    }
});

app.post('/materiais/save-converted',
    uploadMaterial.fields([{ name: 'originalFile', maxCount: 1 }, { name: 'convertedFile', maxCount: 1 }]),
    async (req, res) => {
    
    const { criadorUser, tituloOriginal, tituloConvertido } = req.body;
    const originalFile = req.files.originalFile ? req.files.originalFile[0] : null;
    const convertedFile = req.files.convertedFile ? req.files.convertedFile[0] : null;

    if (!criadorUser) {
        if (originalFile) fs.unlinkSync(originalFile.path);
        if (convertedFile) fs.unlinkSync(convertedFile.path);
        return res.status(400).json({ message: 'Criador do material não especificado.' });
    }
    if (!originalFile || !convertedFile) {
        if (originalFile) fs.unlinkSync(originalFile.path);
        if (convertedFile) fs.unlinkSync(convertedFile.path);
        return res.status(400).json({ message: 'Ficheiro original e convertido são obrigatórios.' });
    }

    const nomeTituloOriginal = tituloOriginal || originalFile.originalname;
    const nomeTituloConvertido = tituloConvertido || `Convertido - ${originalFile.originalname}`;
    const caminhoOriginal = originalFile.filename;
    const caminhoConvertido = convertedFile.filename;
    const estadoMaterial = 0;

    try {
        const [resultOriginal] = await db.query(
            'INSERT INTO Material (Titulo, Caminho_Ficheiro, Criador_User, Estado, Tipo) VALUES (?, ?, ?, ?, ?)',
            [nomeTituloOriginal, caminhoOriginal, criadorUser, estadoMaterial, 0]
        );
        const originalMaterialId = resultOriginal.insertId;

        const [resultConvertido] = await db.query(
            'INSERT INTO Material (Titulo, Caminho_Ficheiro, Criador_User, Estado, Tipo) VALUES (?, ?, ?, ?, ?)',
            [nomeTituloConvertido, caminhoConvertido, criadorUser, estadoMaterial, 1]
        );
        const convertidoMaterialId = resultConvertido.insertId;

        await db.query(
            'INSERT INTO Conversao (ID_Original, Convertido_ID) VALUES (?, ?)',
            [originalMaterialId, convertidoMaterialId]
        );

        res.status(201).json({
            message: 'Material original e convertido guardados com sucesso!',
            original: { id: originalMaterialId, titulo: nomeTituloOriginal, caminho: `/uploads/materiais/${caminhoOriginal}` },
            convertido: { id: convertidoMaterialId, titulo: nomeTituloConvertido, caminho: `/uploads/materiais/${caminhoConvertido}` }
        });

    } catch (error) {
        console.error('Erro ao guardar material convertido e original:', error);
        if (originalFile) fs.unlink(originalFile.path, err => { if(err) console.error("Erro ao apagar originalFile após falha DB:", err)});
        if (convertedFile) fs.unlink(convertedFile.path, err => { if(err) console.error("Erro ao apagar convertedFile após falha DB:", err)});
        return res.status(500).json({ message: 'Erro interno do servidor ao guardar os materiais.' });
    }
});

app.post('/materiais/criar', uploadMaterial.single('materialFile'), async (req, res) => {
    // Os dados de texto vêm em req.body, o ficheiro vem em req.file
    const { titulo, descricao, tamanho, orientacao, criadorUser, tipo } = req.body;
    const ficheiro = req.file;

    // Validação
    if (!ficheiro) {
        return res.status(400).json({ message: 'Nenhum ficheiro PDF foi recebido.' });
    }
    if (!titulo || !criadorUser || !tamanho || !orientacao || !tipo) {
        // Se a validação falhar, apagar o ficheiro que o multer já guardou
        fs.unlinkSync(ficheiro.path); 
        return res.status(400).json({ message: 'Dados incompletos. São necessários: título, criador, tamanho, orientação e tipo.' });
    }

    try {
        const nomeFicheiroServidor = ficheiro.filename;
        const estado = 0; // Privado por defeito

        const sql = `
            INSERT INTO Material 
            (Titulo, Descricao, Tipo, Caminho_Ficheiro, Estado, Criador_User, Tamanho, Orientacao) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            titulo,
            descricao || null,
            parseInt(tipo),
            nomeFicheiroServidor,
            estado,
            criadorUser,
            tamanho,
            orientacao
        ];

        const [result] = await db.query(sql, values);
        res.status(201).json({ 
            message: 'Material criado com sucesso!', 
            materialId: result.insertId,
            caminho: `/uploads/materiais/${nomeFicheiroServidor}`
        });

    } catch (err) {
        console.error("Erro ao guardar o material na base de dados:", err);
        // Apagar o ficheiro órfão em caso de erro na base de dados
        if (ficheiro) {
            fs.unlink(ficheiro.path, (unlinkErr) => {
                if (unlinkErr) console.error("Erro ao apagar ficheiro órfão:", unlinkErr);
            });
        }
        res.status(500).json({ message: 'Erro interno do servidor ao guardar o material.', error: err.message });
    }
});


app.get('/materiais/:username', async (req, res) => {
    const { username } = req.params;
    const query = 'SELECT ID_Material, Titulo, Caminho_Ficheiro, Estado, Tipo, Data_Criacao FROM Material WHERE Criador_User = ? ORDER BY Data_Criacao DESC';
    try {
        const [resultados] = await db.query(query, [username]);
        const materiaisComCaminhoCorreto = resultados.map(m => ({
            ...m,
            Caminho_Ficheiro_Completo: `/uploads/materiais/${m.Caminho_Ficheiro}` // Para o frontend
        }));
        res.status(200).json(materiaisComCaminhoCorreto);
    } catch (err) {
        console.error('Erro ao buscar materiais:', err);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

app.put('/materiais/:idMaterial/estado', async (req, res) => {
    // ... (Lógica como antes, mas usando async/await com db.query)
    const { idMaterial } = req.params;
    const { novoEstado, criadorUser } = req.body;

    if (novoEstado === undefined || criadorUser === undefined) {
        return res.status(400).json({ message: 'Novo estado e criador são obrigatórios.' });
    }
    if ( ![0, 1].includes(parseInt(novoEstado)) ) {
        return res.status(400).json({ message: 'Estado inválido. Use 0 para privado ou 1 para público.' });
    }
    try {
        const [materialRows] = await db.query('SELECT Criador_User FROM Material WHERE ID_Material = ?', [idMaterial]);
        if (materialRows.length === 0) return res.status(404).send("Material não encontrado.");
        if (materialRows[0].Criador_User !== criadorUser) return res.status(403).send("Não autorizado a modificar este material.");

        const [updateResult] = await db.query('UPDATE Material SET Estado = ? WHERE ID_Material = ?', [novoEstado, idMaterial]);
        if (updateResult.affectedRows === 0) return res.status(404).json({ message: 'Material não encontrado para atualizar.' });
        
        res.status(200).json({ message: `Material ${novoEstado == 1 ? 'publicado' : 'tornado privado'} com sucesso.` });
    } catch (err) {
        console.error('Erro ao atualizar estado do material:', err);
        res.status(500).json({ message: 'Erro interno ao atualizar estado.' });
    }
});

app.delete('/materiais/:idMaterial', async (req, res) => {
    const { idMaterial } = req.params;
    const { criadorUser } = req.query; // Corrigido para ler da query

    if (!criadorUser) {
        return res.status(400).json({ message: 'Identificador do criador é necessário.' });
    }

    // Declarar a conexão fora para que seja acessível no `finally`
    let connection; 

    try {
        // Obter conexão e iniciar a transação DENTRO do bloco try
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [materialPrincipalRows] = await connection.query(
            'SELECT Caminho_Ficheiro, Tipo FROM Material WHERE ID_Material = ? AND Criador_User = ?',
            [idMaterial, criadorUser]
        );

        if (materialPrincipalRows.length === 0) {
            await connection.rollback(); // Faz rollback antes de retornar
            return res.status(404).json({ message: 'Material não encontrado ou não tem permissão para o eliminar.' });
        }

        const materialPrincipal = materialPrincipalRows[0];
        const ficheirosParaApagar = [materialPrincipal.Caminho_Ficheiro];

        // Lógica para apagar material original e suas conversões
        if (materialPrincipal.Tipo === 0) { // É um material Original
            const [conversoes] = await connection.query(
                `SELECT m.ID_Material, m.Caminho_Ficheiro 
                 FROM Conversao c
                 JOIN Material m ON c.Convertido_ID = m.ID_Material
                 WHERE c.ID_Original = ?`,
                [idMaterial]
            );

            for (const conversao of conversoes) {
                ficheirosParaApagar.push(conversao.Caminho_Ficheiro);
                await connection.query('DELETE FROM Material WHERE ID_Material = ?', [conversao.ID_Material]);
            }
            await connection.query('DELETE FROM Conversao WHERE ID_Original = ?', [idMaterial]);
        } else { // É um material Convertido
            await connection.query('DELETE FROM Conversao WHERE Convertido_ID = ?', [idMaterial]);
        }

        // Apaga o registo do material principal (seja original ou convertido)
        await connection.query('DELETE FROM Material WHERE ID_Material = ?', [idMaterial]);

        // Apaga os ficheiros físicos do disco
        for (const nomeFicheiro of ficheirosParaApagar) {
            if (nomeFicheiro) {
                const caminhoFicheiroNoDisco = path.join(__dirname, 'uploads', 'materiais', nomeFicheiro);
                try {
                    await fs.promises.unlink(caminhoFicheiroNoDisco);
                    console.log(`Ficheiro apagado com sucesso: ${caminhoFicheiroNoDisco}`);
                } catch (errUnlink) {
                    if (errUnlink.code !== 'ENOENT') { // Se o erro for outro que não "ficheiro não existe"
                        throw errUnlink; // Lança o erro para ser apanhado pelo catch principal e fazer rollback
                    }
                    console.warn(`Tentativa de apagar ficheiro que já não existe: ${caminhoFicheiroNoDisco}`);
                }
            }
        }

        // Se tudo correu bem, faz commit
        await connection.commit();
        res.status(200).json({ message: 'Material e ficheiros associados eliminados com sucesso.' });

    } catch (error) {
        // Se a conexão foi estabelecida, faz rollback
        if (connection) await connection.rollback();
        
        console.error('Erro ao eliminar material:', error); // A mensagem de erro detalhada aparecerá aqui!
        res.status(500).json({ message: 'Erro interno do servidor ao tentar eliminar o material.' });

    } finally {
        // Garante que a conexão é sempre libertada
        if (connection) {
            connection.release();
        }
    }
});

// ROTA PARA BUSCAR OS DETALHES DE UM ÚNICO MATERIAL (INCLUINDO O CONTEÚDO HTML)
app.get('/material/:idMaterial', async (req, res) => {
    const { idMaterial } = req.params;

    const query = `
        SELECT ID_Material, Titulo, Tipo, Conteudo, Tamanho, Orientacao 
        FROM Material 
        WHERE ID_Material = ?
    `;

    try {
        const [materiais] = await db.query(query, [idMaterial]);
        if (materiais.length === 0) {
            return res.status(404).json({ message: 'Material não encontrado.' });
        }
        res.status(200).json(materiais[0]);
    } catch (err) {
        console.error(`Erro ao buscar detalhes do material ${idMaterial}:`, err);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// --- Middleware de Tratamento de Erros (DEVE SER O ÚLTIMO APP.USE) ---
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        let message = err.message;
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            // Tenta ser mais específico baseado no campo que causou o erro, se disponível
            if (err.field === 'avatarFile') {
                message = 'Tipo de ficheiro inválido. Apenas imagens são permitidas para avatar.';
            } else if (err.field && (err.field.includes('materialFile') || err.field.includes('originalFile') || err.field.includes('convertedFile'))) {
                message = 'Tipo de ficheiro inválido. Apenas PDFs são permitidos para materiais.';
            } else {
                message = 'Tipo de ficheiro inesperado.';
            }
        }
        return res.status(400).json({ message });
    } else if (err) {
        console.error("Erro não tratado:", err.stack || err);
        return res.status(500).json({ message: 'Ocorreu um erro inesperado no servidor.' });
    }
    next();
});

// Novo endpoint para buscar apenas materiais PÚBLICOS de um utilizador
app.get('/materiais/publicos/:username', async (req, res) => {
    const { username } = req.params;
    
    // A query seleciona apenas materiais onde Estado = 1 (público)
    const query = 'SELECT ID_Material, Titulo, Caminho_Ficheiro, Tipo, Data_Criacao FROM Material WHERE Criador_User = ? AND Estado = 1 ORDER BY Data_Criacao DESC';
    
    try {
        const [materiais] = await db.query(query, [username]);
        
        // Não precisa de mapear o caminho completo, o frontend pode construir
        res.status(200).json(materiais);
        
    } catch (err) {
        console.error(`Erro ao buscar materiais públicos para ${username}:`, err);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar materiais públicos.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor a correr em http://localhost:${port}`);
});
