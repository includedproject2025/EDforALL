// ===============================
// MODO ESCURO
// ===============================
if (localStorage.getItem('modo-escuro') === 'ativado') {
    document.body.classList.add('dark-mode');
}

// ===============================
// PONTO DE ENTRADA PRINCIPAL
// ===============================
fetch("menu.html")
    .then(response => {
        if (!response.ok) {
            throw new Error(`Erro ao carregar menu.html: ${response.statusText}`);
        }
        return response.text();
    })
    .then(data => {
        document.getElementById("menu-container").innerHTML = data;

        inicializarMenu();
        atualizarExibicaoAvatarGlobal();

        // ===============================
        // UPLOAD DE MATERIAL (PDF)
        // ===============================
        const uploadInput = document.getElementById("uploadInput");

        if (uploadInput) {
            uploadInput.addEventListener("change", async () => {
                const file = uploadInput.files[0];

                if (!file || file.type !== "application/pdf") {
                    alert("Por favor seleciona um ficheiro PDF.");
                    uploadInput.value = '';
                    return;
                }

                const criadorUser = localStorage.getItem('userIdentifier');
                if (!criadorUser) {
                    alert("Erro: Utilizador não identificado. Faça login novamente.");
                    return;
                }

                const formData = new FormData();
                formData.append("materialFile", file);
                formData.append("criadorUser", criadorUser);

                try {
                    const response = await fetch("http://localhost:3001/materiais/upload", {
                        method: "POST",
                        body: formData
                    });

                    const result = await response.json();

                    if (response.ok) {
                        alert("Material enviado com sucesso!");
                    } else {
                        alert("Erro ao enviar material: " + (result.message || "Erro desconhecido."));
                    }
                } catch (error) {
                    console.error("Erro no upload:", error);
                    alert("Erro de rede ao enviar o material.");
                }
            });
        }

        // ===============================
        // MODAL CRIAR MATERIAL
        // ===============================
        const criarBtn = document.getElementById("criarbtn");
        const modalCriar = document.getElementById("modalCriar");
        const checkBtn = document.getElementById("checkbtn");
        const cancelBtn = document.getElementById("cancelBtn");
        const tituloInput = document.getElementById("titulo");

        if (criarBtn && modalCriar && checkBtn && cancelBtn && tituloInput) {

            criarBtn.addEventListener("click", () => {
                modalCriar.style.display = "flex";
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
                    titulo,
                    orientacao: document.querySelector('input[name="orientacao"]:checked').value,
                    tamanho: document.getElementById("tamanho").value,
                    timestamp: new Date().toISOString()
                };

                localStorage.setItem("materialConfig", JSON.stringify(materialConfig));
                modalCriar.style.display = "none";
                window.location.href = "CreatematerialDD.html";
            });

            tituloInput.addEventListener("input", () => {
                const valido = tituloInput.value.trim().length > 0;
                checkBtn.style.opacity = valido ? "1" : "0.5";
                checkBtn.style.cursor = valido ? "pointer" : "not-allowed";
            });

            window.addEventListener("click", e => {
                if (e.target === modalCriar) {
                    modalCriar.style.display = "none";
                }
            });
        }

        // ===============================
        // MODAL CONVERTER PARA ÁUDIO
        // ===============================
        const abrirModalAudio = document.getElementById("abrirModalAudio");
        const modalAudio = document.getElementById("modalAudio");
        const cancelAudioBtn = document.getElementById("cancelAudioBtn");
        const confirmAudioBtn = document.getElementById("confirmAudioBtn");

        if (abrirModalAudio && modalAudio) {
            abrirModalAudio.addEventListener("click", () => {
                modalAudio.style.display = "flex";
            });
        }

        if (cancelAudioBtn) {
            cancelAudioBtn.addEventListener("click", () => {
                modalAudio.style.display = "none";
            });
        }

        if (confirmAudioBtn) {
            confirmAudioBtn.addEventListener("click", () => {
                const pdf = document.getElementById("audioPdf").files[0];
                const voz = document.getElementById("voz").value;
                const velocidade = document.querySelector('input[name="velocidade"]:checked').value;

                if (!pdf) {
                    alert("Por favor, selecione um ficheiro PDF.");
                    return;
                }

                console.log("PDF:", pdf.name);
                console.log("Voz:", voz);
                console.log("Velocidade:", velocidade);

                // FUTURO: enviar para backend (TTS)
                modalAudio.style.display = "none";
            });
        }

    })
    .catch(error => {
        console.error("Falha crítica ao carregar o menu:", error);
        document.getElementById("menu-container").innerHTML =
            "<p style='color:red;text-align:center'>Erro ao carregar o menu.</p>";
    });
