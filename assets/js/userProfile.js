if (localStorage.getItem('modo-escuro') === 'ativado') {
    document.body.classList.add('dark-mode');
}

function inicializarMenuComunidade() {
    const btnExp = document.getElementById('btn-exp');
    const menuSide = document.querySelector('.menu-lateral');
    const mainContainer = document.querySelector('.conteudo-principal'); // Conteúdo principal desta página

    if (btnExp && menuSide && mainContainer) {
        // Estado inicial da margem baseado na classe 'expandir'
        if (menuSide.classList.contains('expandir')) {
            mainContainer.style.marginLeft = '240px';
        } else {
            mainContainer.style.marginLeft = '100px';
        }

        btnExp.addEventListener('click', () => {
            menuSide.classList.toggle('expandir');
            if (menuSide.classList.contains('expandir')) {
                mainContainer.style.marginLeft = '240px';
            } else {
                mainContainer.style.marginLeft = '100px';
            }
        });
    }

    const botaoCor = document.querySelector('.item-cor');
    if (botaoCor) {
        botaoCor.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const modoAtual = document.body.classList.contains('dark-mode');
            localStorage.setItem('modo-escuro', modoAtual ? 'ativado' : 'desativado');
        });
    }

    const menuItems = document.querySelectorAll('.item-menu');
    menuItems.forEach((item) =>
        item.addEventListener('click', function () {
            menuItems.forEach((el) => el.classList.remove('ativo'));
            this.classList.add('ativo');
        })
    );

    // Marcar o item "Comunidade" como ativo
    const linkComunidade = Array.from(menuItems).find(item => item.querySelector('span.txt-link')?.textContent.trim() === 'Comunidade');
    if (linkComunidade) {
        linkComunidade.classList.add('ativo');
    }
}

// Carregar o menu.html
fetch("menu.html")
    .then(response => response.text())
    .then(data => {
        const menuContainer = document.getElementById("menu-container");
        if (menuContainer) {
            menuContainer.innerHTML = data;
            inicializarMenuComunidade(); // Chamar para inicializar o menu e ajustar margens
        } else {
            console.error("Elemento 'menu-container' não encontrado.");
        }
    })
    .catch(error => console.error("Erro ao carregar o menu:", error));


document.addEventListener('DOMContentLoaded', () => {
    // 1. Obter o username da URL
    const params = new URLSearchParams(window.location.search);
    const username = params.get('username');

    const cabecalhoPerfil = document.getElementById('cabecalho-perfil');
    const materiaisGrid = document.getElementById('materiais-grid');
    const mensagemVazio = document.getElementById('mensagem-vazio');
    const AVATAR_DEFAULT_PATH = 'assets/img/avatares/default_avatar.png'; // Caminho default

    if (!username) {
        document.body.innerHTML = '<h1>Erro: Nome de utilizador não fornecido.</h1>';
        return;
    }

    // Carregar menu lateral
    fetch("menu.html")
        .then(response => response.text())
        .then(data => {
            const menuContainer = document.getElementById("menu-container");
            if (menuContainer) {
                menuContainer.innerHTML = data;
                // Aqui você pode chamar uma função para inicializar o menu se necessário
            }
        });

    // 2. Buscar as informações do utilizador
    async function carregarInfoUtilizador() {
        try {
            const response = await fetch(`http://localhost:3000/utilizador/${username}`);
            if (!response.ok) throw new Error('Utilizador não encontrado.');
            
            const user = await response.json();
            renderizarInfoPerfil(user);

        } catch (error) {
            console.error("Erro ao carregar informações do perfil:", error);
            cabecalhoPerfil.innerHTML = `<p>Não foi possível carregar o perfil de ${username}.</p>`;
        }
    }

    // 3. Buscar os materiais públicos do utilizador
    async function carregarMateriaisPublicos() {
        try {
            const response = await fetch(`http://localhost:3000/materiais/publicos/${username}`);
            if (!response.ok) throw new Error('Falha ao carregar materiais.');

            const materiais = await response.json();
            renderizarMateriais(materiais);

        } catch (error) {
            console.error("Erro ao carregar materiais públicos:", error);
            materiaisGrid.innerHTML = '';
            mensagemVazio.textContent = 'Ocorreu um erro ao carregar os materiais.';
            mensagemVazio.style.display = 'block';
        }
    }

    // Função para renderizar as informações do cabeçalho
    function renderizarInfoPerfil(user) {
        let avatarSrc = user.avatarPath ? `http://localhost:3000${user.avatarPath}` : AVATAR_DEFAULT_PATH;
        
        cabecalhoPerfil.innerHTML = `
            <img src="${avatarSrc}" alt="Avatar de ${user.username}" class="avatar-grande-perfil" onerror="this.onerror=null;this.src='${AVATAR_DEFAULT_PATH}';">
            <div class="info-texto-perfil">
                <h1>${user.username}</h1>
                <p><i class="bi bi-building"></i> ${user.instituicao || 'Instituição não especificada'}</p>
                <p><i class="bi bi-envelope"></i> ${user.email}</p>
            </div>
        `;
    }

    // Função para renderizar os materiais na grelha
    function renderizarMateriais(materiais) {
        materiaisGrid.innerHTML = '';

        if (materiais.length === 0) {
            mensagemVazio.style.display = 'block';
            return;
        }

        mensagemVazio.style.display = 'none';
        materiais.forEach(material => {
            const materialCard = document.createElement('div');
            materialCard.className = 'material-card';
            
            materialCard.innerHTML = `
                <div class="material-icon-wrapper">
                    <img src="https://img.icons8.com/?size=100&id=YH5Gx1l6EcfY&format=png&color=000000" alt="Ícone de PDF" class="pdf-icon">
                </div>
                <p class="material-titulo" title="${material.Titulo}">${material.Titulo}</p>
                <div class="material-acoes">
                    <button class="btn-acao btn-ver" title="Ver"><i class="bi bi-eye"></i></button>
                    <button class="btn-acao btn-download" title="Download"><i class="bi bi-download"></i></button>
                </div>
            `;

            // Adicionar eventos aos novos botões
            const btnVer = materialCard.querySelector('.btn-ver');
            const btnDownload = materialCard.querySelector('.btn-download');

            btnVer.addEventListener('click', (e) => {
                e.stopPropagation(); // Impede que o clique no botão ative outros eventos do card
                verPDF(material);
            });

            btnDownload.addEventListener('click', (e) => {
                e.stopPropagation();
                fazerDownload(material);
            });

            materiaisGrid.appendChild(materialCard);
        });
    }

    function fazerDownload(material) {
        const link = document.createElement('a');
        link.href = `http://localhost:3000/uploads/materiais/${material.Caminho_Ficheiro}`;
        link.download = material.Titulo.endsWith('.pdf') ? material.Titulo : `${material.Titulo}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // Funções do Modal (reutilizadas de outras páginas)
    const modal = document.getElementById("modal-pdf");
    const spanFechar = document.getElementById("fechar-pdf");

    function verPDF(material) {
        document.getElementById("pdf-titulo").textContent = material.Titulo;
        const pdfViewer = document.getElementById("pdf-viewer");
        pdfViewer.src = `http://localhost:3000/uploads/materiais/${material.Caminho_Ficheiro}`;
        modal.style.display = "flex";
    }

    spanFechar.onclick = () => {
        modal.style.display = "none";
        document.getElementById("pdf-viewer").src = "";
    };
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
            document.getElementById("pdf-viewer").src = "";
        }
    };
    
    // Iniciar o carregamento dos dados
    carregarInfoUtilizador();
    carregarMateriaisPublicos();
});