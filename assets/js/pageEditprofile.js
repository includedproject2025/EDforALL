document.addEventListener('DOMContentLoaded', () => {
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarFileInput = document.getElementById('avatarFile');
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const editProfileForm = document.getElementById('editProfileForm');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const instituicaoInput = document.getElementById('instituicao');
    const profileMessageContainer = document.getElementById('profileMessageContainer');
    const AVATAR_BASE_PATH_FRONTEND = '/uploads/avatars/';
    const DEFAULT_AVATAR_SRC = `${AVATAR_BASE_PATH_FRONTEND}default_avatar.png`;

    function showMessage(message, type = 'info') {
        if (!profileMessageContainer) return;
        profileMessageContainer.textContent = message;
        profileMessageContainer.className = `message-container ${type}`
        setTimeout(() => {
            profileMessageContainer.textContent = '';
            profileMessageContainer.className = 'message-container';
        }, 5000);
    }

    async function carregarDadosPerfil() {
        const userIdentifier = localStorage.getItem('userIdentifier');
        if (!userIdentifier) {
            showMessage('Utilizador não identificado. Faça login novamente.', 'error');
            setTimeout(() => { window.location.href = 'RegistoLogin.html'; }, 2000);
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/utilizador/${userIdentifier}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro ${response.status} ao buscar dados do perfil.`);
            }
            const userData = await response.json();

            usernameInput.value = userData.username;
            emailInput.value = userData.email;
            instituicaoInput.value = userData.instituicao || '';

            let avatarSrcToDisplay = DEFAULT_AVATAR_SRC;

            if (userData.avatarPath && userData.avatarPath !== 'null') {
                avatarSrcToDisplay = `http://localhost:3000${userData.avatarPath}`;
                localStorage.setItem('userAvatarPath', userData.avatarPath); // Guardar o caminho relativo
            } else {
                // Se não houver avatarPath, ou se for explicitamente 'null' do backend
                localStorage.setItem('userAvatarPath', 'null');
            }

            avatarPreview.src = avatarSrcToDisplay;
            avatarPreview.onerror = () => { // Fallback se a imagem principal não carregar
                avatarPreview.src = DEFAULT_AVATAR_SRC;
            };

            if (typeof atualizarExibicaoAvatarGlobal === "function") {
                atualizarExibicaoAvatarGlobal();
            }

        } catch (error) {
            console.error("Erro ao carregar dados do perfil:", error);
            showMessage(`Erro ao carregar dados: ${error.message}`, 'error');
            avatarPreview.src = DEFAULT_AVATAR_SRC;
            if (typeof atualizarExibicaoAvatarGlobal === "function") {
                atualizarExibicaoAvatarGlobal();
            }
        }
    }

    changeAvatarBtn.addEventListener('click', () => {
        avatarFileInput.click();
    });

    avatarFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                avatarPreview.src = e.target.result;
            }
            reader.readAsDataURL(file);
        } else if (file) {
            showMessage("Selecione um ficheiro de imagem válido (JPEG, PNG, etc.).", 'error');
            avatarFileInput.value = '';
        }
    });

    editProfileForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const userIdentifier = localStorage.getItem('userIdentifier');
        if (!userIdentifier) {
            showMessage('Sessão inválida. Faça login novamente.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('email', emailInput.value);
        formData.append('instituicao', instituicaoInput.value);
        formData.append('loggedInUserIdentifier', userIdentifier);


        if (avatarFileInput.files[0]) {
            formData.append('avatarFile', avatarFileInput.files[0]);
        }

        const saveButton = editProfileForm.querySelector('.save-btn');
        const originalButtonHTML = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="bi bi-hourglass-split"></i> A Guardar...';
        showMessage('A guardar alterações...', 'info');

        try {
            const response = await fetch(`http://localhost:3000/utilizador/${userIdentifier}/update`, {
                method: 'PUT',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                showMessage(result.message || 'Perfil atualizado com sucesso!', 'success');
                
                if (result.user && result.user.avatarPath && result.user.avatarPath !== 'null') {
                    avatarPreview.src = `http://localhost:3000${result.user.avatarPath}`;
                    localStorage.setItem('userAvatarPath', result.user.avatarPath);
                } else {
                    localStorage.setItem('userAvatarPath', 'null');
                    avatarPreview.src = DEFAULT_AVATAR_SRC;
                }
                avatarFileInput.value = '';

                if (typeof atualizarExibicaoAvatarGlobal === "function") {
                    atualizarExibicaoAvatarGlobal();
                }

            } else {
                throw new Error(result.message || `Erro ${response.status} ao atualizar perfil.`);
            }

        } catch (error) {
            console.error("Erro ao atualizar perfil:", error);
            showMessage(`Erro: ${error.message}`, 'error');
            if (typeof atualizarExibicaoAvatarGlobal === "function") {
                atualizarExibicaoAvatarGlobal();
            }
        } finally {
            saveButton.disabled = false;
            saveButton.innerHTML = originalButtonHTML;
        }
    });

    carregarDadosPerfil();

    if (localStorage.getItem('modo-escuro') === 'ativado') {
        document.body.classList.add('dark-mode');
    }
});