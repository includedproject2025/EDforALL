// Aplica o modo escuro se estiver guardado no localStorage
if (localStorage.getItem('modo-escuro') === 'ativado') {
    document.body.classList.add('dark-mode');
}

// Carregar o menu.html
fetch("menu.html")
    .then(response => response.text())
    .then(data => {
        const menuContainer = document.getElementById("menu-container");
        if (menuContainer) {
            menuContainer.innerHTML = data;
            inicializarMenu(); // Chamar a função global de menu.js
            atualizarExibicaoAvatarGlobal(); // Chamar a função global de globalAvatarUpdater.js
        } else {
            console.error("Elemento 'menu-container' não encontrado.");
        }
    })
    .catch(error => console.error("Erro ao carregar o menu:", error));


// Lógica da página Comunidade
document.addEventListener('DOMContentLoaded', () => {
    const perfisGrid = document.getElementById('perfisGrid');
    const inputPesquisa = document.getElementById('inputPesquisa');
    const mensagemVazio = document.getElementById('mensagemVazio');
    const AVATAR_BASE_PATH = '/uploads/avatars/';

    async function carregarPerfis(termoPesquisa = '') {
        try {
             if (termoPesquisa) {
                url += `?search=${encodeURIComponent(termoPesquisa)}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro ${response.status} ao buscar perfis.`);
            }
            const utilizadores = await response.json();
            renderizarPerfis(utilizadores);
        } catch (error) {
            console.error("Erro ao carregar perfis:", error);
            perfisGrid.innerHTML = ''; // Limpar grid em caso de erro
            mensagemVazio.textContent = error.message || "Não foi possível carregar os perfis.";
            mensagemVazio.style.display = 'block';
        }
    }

    function renderizarPerfis(utilizadores) {
        perfisGrid.innerHTML = ''; // Limpar perfis existentes

        if (utilizadores.length === 0) {
            mensagemVazio.textContent = "Nenhum perfil encontrado com os critérios da pesquisa.";
            mensagemVazio.style.display = 'block';
            return;
        }

        mensagemVazio.style.display = 'none';

        utilizadores.forEach(user => {
            const perfilCard = document.createElement('div');
            perfilCard.className = 'perfil-card';
            perfilCard.dataset.username = user.Username; 

            let avatarSrc = `${AVATAR_BASE_PATH}default_avatar.png`; // Default
            if (user.Avatar) {
                if (user.Avatar.startsWith('http://') || user.Avatar.startsWith('https://') || user.Avatar.startsWith('/')) {
                    avatarSrc = user.Avatar; 
                } else {
                    avatarSrc = `${AVATAR_BASE_PATH}${user.Avatar}`;
                }
            }
            
            perfilCard.innerHTML = `
                <img src="${avatarSrc}" alt="Avatar de ${user.Username}" class="avatar-perfil" onerror="this.onerror=null;this.src='${AVATAR_BASE_PATH}default_avatar.png';">
                <h3 class="nome-perfil">${user.Username}</h3>
                <p class="instituicao-perfil">${user.Instituicao || 'Não especificada'}</p>
                <button class="btn-ver-perfil">Ver Perfil</button>
            `;

            perfilCard.addEventListener('click', () => {
                window.location.href = `userProfile.html?username=${encodeURIComponent(user.Username)}`;
            });

            perfisGrid.appendChild(perfilCard);
        });
    }

    // Event listener para a barra de pesquisa
    let debounceTimer;
    inputPesquisa.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const termo = e.target.value.trim();
        debounceTimer = setTimeout(() => {
            carregarPerfis(termo);
        }, 300); // Atraso de 300ms para evitar muitas requisições
    });

    // Carregar todos os perfis inicialmente
    carregarPerfis();
});