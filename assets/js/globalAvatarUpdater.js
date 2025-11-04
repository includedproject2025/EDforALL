const DEFAULT_AVATAR_SRC = '/uploads/avatars/default_avatar.png';

function atualizarExibicaoAvatarGlobal() {
    const avatarImg = document.getElementById('user-avatar');
    if (avatarImg) {
        const userAvatarPath = localStorage.getItem('userAvatarPath');
        if (userAvatarPath && userAvatarPath !== 'null') {
            avatarImg.src = `http://localhost:3000${userAvatarPath}`;
        } else {
            avatarImg.src = DEFAULT_AVATAR_SRC;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    atualizarExibicaoAvatarGlobal();
}); 