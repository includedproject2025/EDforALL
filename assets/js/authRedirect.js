document.addEventListener('DOMContentLoaded', function() {
    const userIdentifier = localStorage.getItem('userIdentifier');
    const currentPage = window.location.pathname.split('/').pop();

    // Lista de páginas que DEVEM ser acedidas apenas por utilizadores AUTENTICADOS
    const authenticatedPages = [
        'Dashboard.html',
        'CreatematerialDD.html',
        'Convertmaterial.html',
        'Community.html',
        'Ajudas.html',
        'pageEditprofile.html',
        'userProfile.html',
        'Editpass.html'
    ];

    // Se o utilizador NÃO estiver autenticado e a página atual REQUER autenticação
    if (!userIdentifier && authenticatedPages.includes(currentPage)) {
        // Redireciona para a página de não autenticação
        window.location.href = 'pageNoAutentication.html';
    }

    // Se o utilizador ESTIVER autenticado e estiver na página de login/registo, redireciona para o dashboard
    if (userIdentifier && (currentPage === 'RegistoLogin.html' || currentPage === 'index.js')) {
        window.location.href = 'Dashboard.html'; 
    }
}); 