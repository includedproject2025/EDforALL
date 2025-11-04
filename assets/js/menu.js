// Aplica o modo escuro no arranque
if (localStorage.getItem('modo-escuro') === 'ativado') {
    document.body.classList.add('dark-mode');
}

// Apenas a lógica de inicialização do menu e logout permanece aqui
function inicializarMenu() {
    console.log("inicializarMenu() called.");
    // Expandir/contrair o menu
    const btnExp = document.getElementById('btn-exp');
    const menuSide = document.querySelector('.menu-lateral');

    if (btnExp && menuSide) {
        console.log("btnExp and menuSide found.");
        btnExp.addEventListener('click', () => {
            menuSide.classList.toggle('expandir');
            const mainContent = document.querySelector('.main-area-wrapper');
            if (mainContent) {
                if (menuSide.classList.contains('expandir')) {
                    mainContent.style.marginLeft = '240px';
                } else {
                    mainContent.style.marginLeft = '140px';
                }
            }
        });
    } else {
        console.warn("Elementos .btn-expandir ou .menu-lateral não encontrados no DOM ao inicializar o menu.");
    }

    // Modo escuro / claro
    const botaoCor = document.querySelector('.item-cor');
    if (botaoCor) {
        botaoCor.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const modoAtual = document.body.classList.contains('dark-mode');
            localStorage.setItem('modo-escuro', modoAtual ? 'ativado' : 'desativado');
        });
    }


    // Define o item ativo com base na página atual
    const pathAtual = window.location.pathname.split('/').pop(); 

    document.querySelectorAll('.item-menu').forEach(item => {
        const link = item.querySelector('a');
        if (link) {
            const href = link.getAttribute('href');
            if (href === pathAtual) {
                item.classList.add('ativo');
            } else {
                item.classList.remove('ativo');
            }
        }
    });



    // Item ativo no menu e lógica de logout (usando delegation de eventos)
    const menuLateral = document.querySelector('.menu-lateral');
    if (menuLateral) {
        console.log("menuLateral found for event delegation.");
        menuLateral.addEventListener('click', function(event) {
            let targetItem = event.target.closest('.item-menu');
            if (targetItem) {
                console.log("Clicked on a menu item: ", targetItem.querySelector('.txt-link')?.textContent.trim());
                // Remover 'ativo' de todos os itens do menu e adicionar ao clicado
                document.querySelectorAll('.item-menu').forEach(i => i.classList.remove('ativo'));
                targetItem.classList.add('ativo');

                const linkText = targetItem.querySelector('.txt-link')?.textContent.trim();
                if (linkText === 'Sair') {
                    event.preventDefault(); // Previne a ação padrão do link
                    logout();
                }
            }
        });
    } else {
        console.warn("Elemento '.menu-lateral' não encontrado para anexar listeners de menu.");
    }
}

// Listener para mudanças no localStorage (para o modo escuro)
window.addEventListener('storage', function(event) {
    if (event.key === 'modo-escuro') {
        if (localStorage.getItem('modo-escuro') === 'ativado') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }
});

// Função de logout global
function logout() {
    localStorage.removeItem('userIdentifier');
    localStorage.removeItem('userAvatarPath');
    localStorage.removeItem('modo-escuro');
    window.location.href = 'pageNoAutentication.html';
}
