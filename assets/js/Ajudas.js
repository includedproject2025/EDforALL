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

            // Define a margem inicial com base no estado do menu para a página de ajudas
            const menuSide = document.querySelector('.menu-lateral');
            const mainContent = document.querySelector('.conteudo-ajudas');
            if (menuSide && mainContent) {
                if (menuSide.classList.contains('expandir')) {
                    mainContent.style.marginLeft = '240px';
                } else {
                    mainContent.style.marginLeft = '100px';
                }
            }

        } else {
            console.error("Elemento 'menu-container' não encontrado.");
        }
    })
    .catch(error => console.error("Erro ao carregar o menu:", error)); 