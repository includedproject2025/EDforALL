// Aplica o modo escuro se estiver guardado no localStorage
if (localStorage.getItem('modo-escuro') === 'ativado') {
    document.body.classList.add('dark-mode');
}

// --- PONTO DE ENTRADA PRINCIPAL ---
fetch("menu.html")
    .then(response => {
        if (!response.ok) {
            throw new Error(`Erro ao carregar menu.html: ${response.statusText}`);
        }
        return response.text();
    })
    .then(data => {
        document.getElementById("menu-container").innerHTML = data;

        inicializarMenu(); // Chama a função global de menu.js
        atualizarExibicaoAvatarGlobal(); // Chama a função global de globalAvatarUpdater.js

        // 3. Inicializa o listener para o upload de ficheiros
        const uploadInput = document.getElementById("uploadInput");
        if (uploadInput) {
            uploadInput.addEventListener("change", async () => {
                const file = uploadInput.files[0];
                if (file && file.type === "application/pdf") {
                    const formData = new FormData();
                    formData.append("materialFile", file);

                    const criadorUser = localStorage.getItem('userIdentifier');
                    if (!criadorUser) {
                        alert("Erro: Utilizador não identificado. Faça login novamente.");
                        return;
                    }
                    formData.append("criadorUser", criadorUser);

                    try {
                        const response = await fetch('http://localhost:3001/materiais/upload', {
                            method: 'POST',
                            body: formData
                        });
                        const result = await response.json();
                        if (response.ok) {
                            alert("Material enviado com sucesso! " + (result.message || ''));
                        } else {
                            alert("Erro ao enviar material: " + (result.message || 'Erro desconhecido do servidor.'));
                        }
                    } catch (error) {
                        console.error('Erro na requisição de upload:', error);
                        alert("Ocorreu um erro de rede ao tentar enviar o material.");
                    }
                } else {
                    alert("Por favor seleciona um ficheiro PDF.");
                    uploadInput.value = '';
                }
            });
        }

        const criarBtn = document.getElementById('criarbtn');
        const modalCriar = document.getElementById('modalCriar');
        const checkBtn = document.getElementById('checkbtn');
        const cancelBtn = document.getElementById("cancelBtn");
        const tituloInput = document.getElementById("titulo");

        if (criarBtn && modalCriar && checkBtn && cancelBtn && tituloInput) {
            criarBtn.addEventListener('click', () => {
                modalCriar.style.display = 'flex';
            });

            cancelBtn.addEventListener("click", () => {
                modalCriar.style.display = "none";
                tituloInput.value = "";
                document.getElementById("radio-vertical").checked = true;
                document.getElementById("tamanho").value = "A4";
            });

            checkBtn.addEventListener("click", () => {
                const titulo = tituloInput.value.trim();
                if (!titulo) {
                    alert("Por favor, insira um título para o material.");
                    return;
                }
                const materialConfig = {
                    titulo: titulo,
                    orientacao: document.querySelector('input[name="orientacao"]:checked').value,
                    tamanho: document.getElementById("tamanho").value,
                    timestamp: new Date().toISOString(),
                };
                localStorage.setItem("materialConfig", JSON.stringify(materialConfig));
                modalCriar.style.display = "none";
                window.location.href = "CreatematerialDD.html";
            });

            window.addEventListener('click', (e) => {
                if (e.target === modalCriar) {
                    modalCriar.style.display = 'none';
                }
            });

            tituloInput.addEventListener("input", function () {
                const isTituloValido = this.value.trim().length > 0;
                checkBtn.style.opacity = isTituloValido ? "1" : "0.5";
                checkBtn.style.cursor = isTituloValido ? "pointer" : "not-allowed";
            });
        } else {
             console.warn("Aviso: Um ou mais elementos do modal (criarbtn, modalCriar, etc.) não foram encontrados após carregar o menu.");
        }
    })
    .catch(error => {
        console.error("Falha crítica ao carregar o menu:", error);
        document.getElementById("menu-container").innerHTML = "<p style='color: red; text-align: center;'>Não foi possível carregar o menu. Verifique a consola para mais detalhes.</p>";
    });