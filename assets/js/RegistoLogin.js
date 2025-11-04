// Aplica o modo escuro se estiver guardado no localStorage
if (localStorage.getItem('modo-escuro') === 'ativado') {
    document.body.classList.add('dark-mode');
}

const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

const isStrongPassword = (password) => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);

// Obter formulários
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

//Alternancia manual pelos botoes da interface
// Registo e Login
registerBtn.addEventListener('click', () => {
    container.classList.add('active');
});

loginBtn.addEventListener('click', () => {
    container.classList.remove('active');
});

//verifica o parametro da URL
const urlParams = new URLSearchParams(window.location.search);
const modo = urlParams.get('modo');

// Se o modo for 'registo', adiciona a classe 'active' ao container
if (modo === 'registo') {
    container.classList.add('active');
}
// Se o modo for 'login', remove a classe 'active' do container
else {
    container.classList.remove('active');
}

// Formulário de Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevenir submissão padrão

    const formData = new FormData(loginForm);
    const username = formData.get('username');
    const password = formData.get('password');

    try {
        const response = await fetch('http://localhost:3001/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json(); // 'data' é a resposta do servidor, ex: { message: "...", userIdentifier: "..." }

        if (response.ok) {
            // Login bem-sucedido
            alert(data.message); // Mostrar mensagem de sucesso

            if (data.userIdentifier) {
                localStorage.setItem('userIdentifier', data.userIdentifier);
                console.log('Login bem-sucedido! userIdentifier guardado:', data.userIdentifier);
            } else {
                console.error('Login bem-sucedido, mas userIdentifier não foi retornado pelo servidor:', data);
            }

            // Guardar o caminho do avatar no localStorage
            if (data.avatarPath) {
                localStorage.setItem('userAvatarPath', data.avatarPath);
            } else {
                localStorage.setItem('userAvatarPath', 'null'); // Usar 'null' como string
            }

            // Redirecionar para a página inicial ou dashboard após login
            window.location.href = 'pageInit.html';
        } else {
            // Erro no login
            alert('Erro no login: ' + data.message);
        }

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        alert('Ocorreu um erro ao tentar fazer login. Tente novamente.');
    }
});

// Formulário de Registo
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevenir submissão padrão

    const formData = new FormData(registerForm);
    const username = formData.get('username');
    const email = formData.get('email');
    const password = formData.get('password');
    const instituicao = formData.get('instituicao');
    
    // Validação básica no frontend (opcional, mas recomendado)
    if (!username || !email || !password || !instituicao) {
        alert('Por favor, preencha todos os campos.');
        return;
    }
    if (!isStrongPassword(password)) {
        alert('A palavra-passe deve ter pelo menos 8 caracteres, incluir uma letra maiúscula e um número.');
        return;
    }

    try {
        const response = await fetch('http://localhost:3001/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password, instituicao }) // Incluir instituição
        });

        const data = await response.json();

        if (response.ok) {
            // Registo bem-sucedido
            alert(data.message);
             registerForm.reset(); // Limpa o formulário
             container.classList.remove('active'); // Volta para o formulário de login
        } else {
            // Erro no registo
            alert('Erro no registo: ' + data.message);
        }

    } catch (error) {
        console.error('Erro ao registar:', error);
        alert('Ocorreu um erro ao tentar registar. Tente novamente.');
    }
});
