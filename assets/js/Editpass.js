// Aplica o modo escuro se estiver guardado no localStorage
if (localStorage.getItem('modo-escuro') === 'ativado') {
    document.body.classList.add('dark-mode');
}

// Carregar o menu.html e inicializar funções
fetch("menu.html")
    .then(response => response.text())
    .then(data => {
        const menuContainer = document.getElementById("menu-container");
        if (menuContainer) {
            menuContainer.innerHTML = data;
            inicializarMenu(); // Chamar a função global de menu.js
            atualizarExibicaoAvatarGlobal(); // Chamar a função global de globalAvatarUpdater.js

            // Define a margem inicial para o container principal da página
            const menuSide = document.querySelector('.menu-lateral');
            const profileContainer = document.querySelector('.profile-container');
            if (menuSide && profileContainer) {
                // Certifica-se de que a margem é aplicada ao container principal de Editpass
                if (menuSide.classList.contains('expandir')) {
                    profileContainer.style.marginLeft = '240px';
                } else {
                    profileContainer.style.marginLeft = '100px';
                }
            }
        }
    })
    .catch(error => console.error("Erro ao carregar o menu:", error));

document.addEventListener('DOMContentLoaded', () => {
    const changePasswordForm = document.getElementById('changePasswordForm');
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    const passwordMessageContainer = document.getElementById('passwordMessageContainer');
    const avatarPreview = document.getElementById('avatarPreview');

    const DEFAULT_AVATAR_SRC = '/uploads/avatars/default_avatar.png';

    function showMessage(message, type = 'info') {
        if (!passwordMessageContainer) return;
        passwordMessageContainer.textContent = message;
        passwordMessageContainer.className = `message-container ${type}`;
        setTimeout(() => {
            passwordMessageContainer.textContent = '';
            passwordMessageContainer.className = 'message-container';
        }, 5000);
    }

    changePasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const userIdentifier = localStorage.getItem('userIdentifier');
        if (!userIdentifier) {
            showMessage('Sessão inválida. Faça login novamente.', 'error');
            return;
        }

        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmNewPassword = confirmNewPasswordInput.value;

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            showMessage('Por favor, preencha todos os campos.', 'error');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showMessage('A nova palavra-passe e a confirmação não correspondem.', 'error');
            return;
        }

        if (newPassword.length < 6) { // Exemplo de validação de força da senha
            showMessage('A nova palavra-passe deve ter pelo menos 6 caracteres.', 'error');
            return;
        }

        const saveButton = changePasswordForm.querySelector('.save-btn');
        const originalButtonHTML = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="bi bi-hourglass-split"></i> A Alterar...';
        showMessage('A alterar palavra-passe...', 'info');

        try {
            const response = await fetch(`http://localhost:3000/utilizador/${userIdentifier}/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ currentPassword, newPassword, loggedInUserIdentifier: userIdentifier })
            });

            const result = await response.json();

            if (response.ok) {
                showMessage(result.message || 'Palavra-passe alterada com sucesso!', 'success');
                // Limpar campos após sucesso
                currentPasswordInput.value = '';
                newPasswordInput.value = '';
                confirmNewPasswordInput.value = '';
            } else {
                throw new Error(result.message || `Erro ${response.status} ao alterar palavra-passe.`);
            }

        } catch (error) {
            console.error("Erro ao alterar palavra-passe:", error);
            showMessage(`Erro: ${error.message}`, 'error');
        } finally {
            saveButton.disabled = false;
            saveButton.innerHTML = originalButtonHTML;
        }
    });
}); 