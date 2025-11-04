// Verifica o contraste guardado
if (localStorage.getItem('modo-escuro') === 'ativado') {
    document.body.classList.add('dark-mode');
}

fetch("menu.html")
    .then(response => {
        console.log("menu.html fetched successfully.");
        return response.text();
    })
    .then(data => {
        document.getElementById("menu-container").innerHTML = data;
        console.log("menu.html content injected into menu-container.");
        // Chamar inicializarMenu() aqui para garantir que os event listeners são anexados ao menu carregado
        inicializarMenu();
        console.log("inicializarMenu() called from pageInit.js.");
    }).catch(error => console.error("Erro ao carregar o menu:", error));

let materialSelecionadoId = null;
let materialSelecionadoInfo = {};

async function carregarMateriais() {
    const listaPrivado = document.getElementById("privado-lista");
    const mensagemPrivado = document.getElementById("mensagem-vazio-privado");
    const listaPublico = document.getElementById("publico-lista");
    const mensagemPublico = document.getElementById("mensagem-vazio-publico");

    listaPrivado.innerHTML = '';
    listaPublico.innerHTML = '';
    mensagemPrivado.style.display = "none";
    mensagemPublico.style.display = "none";

    const username = localStorage.getItem('userIdentifier');
    if (!username) {
        mensagemPrivado.textContent = "Utilizador não identificado. Faça login.";
        mensagemPrivado.style.display = "block";
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/materiais/${username}`);
        if (!response.ok) throw new Error("Falha ao carregar materiais.");
        
        const materiais = await response.json();
        let temPrivado = false;
        let temPublico = false;

        materiais.forEach(material => {
            const div = document.createElement("div");
            div.className = "pdf-item";
            
            // Usamos sempre o ícone de PDF para consistência
            const iconSrc = 'https://img.icons8.com/?size=100&id=YH5Gx1l6EcfY&format=png&color=000000';

            div.innerHTML = `
                <img src="${iconSrc}" alt="ícone de PDF">
                <p title="${material.Titulo}">${material.Titulo}</p>
                <input type="checkbox" class="pdf-check" 
                       data-id="${material.ID_Material}"
                       data-caminho-servidor="${material.Caminho_Ficheiro || ''}"
                       data-titulo="${material.Titulo}"
                       data-estado="${material.Estado}"
                       data-tipo="${material.Tipo}">
            `;

            if (material.Estado == 0) {
                listaPrivado.appendChild(div);
                temPrivado = true;
            } else {
                listaPublico.appendChild(div);
                temPublico = true;
            }
        });

        if (!temPrivado) mensagemPrivado.style.display = "block";
        if (!temPublico) mensagemPublico.style.display = "block";

        adicionarListenersAosCheckboxes();

    } catch (error) {
        console.error("Erro ao carregar materiais:", error);
    }
}

function adicionarListenersAosCheckboxes() {
    document.querySelectorAll(".pdf-check").forEach(check => {
        check.addEventListener("change", function() {
            document.querySelectorAll(".pdf-check").forEach(c => {
                if (c !== this) c.checked = false;
            });

            if (this.checked) {
                materialSelecionadoId = this.getAttribute("data-id");
                materialSelecionadoInfo = {
                    id: this.getAttribute("data-id"),
                    caminhoServidor: this.getAttribute("data-caminho-servidor"),
                    titulo: this.getAttribute("data-titulo"),
                    estado: parseInt(this.getAttribute("data-estado")),
                    tipo: parseInt(this.getAttribute("data-tipo"))
                };
                const tipoLista = materialSelecionadoInfo.estado === 0 ? "privado" : "publico";
                document.getElementById("priv-acoes").style.display = tipoLista === "privado" ? "flex" : "none";
                document.getElementById("pub-acoes").style.display = tipoLista === "publico" ? "flex" : "none";
            } else {
                materialSelecionadoId = null;
                materialSelecionadoInfo = {};
                document.getElementById("priv-acoes").style.display = "none";
                document.getElementById("pub-acoes").style.display = "none";
            }
        });
    });
}

// ------ FUNÇÕES DE AÇÃO SIMPLIFICADAS ------

function verPDF() { // Agora funciona para TODOS os tipos de material
    if (!materialSelecionadoInfo.caminhoServidor) {
        alert("Este material não tem um ficheiro associado para visualização.");
        return;
    }
    const modal = document.getElementById("modal-pdf");
    document.getElementById("pdf-titulo").textContent = materialSelecionadoInfo.titulo;
    const iframe = document.getElementById("pdf-viewer");

    // A lógica é a mesma para PDFs e HTMLs, o browser sabe como renderizar!
    iframe.src = `http://localhost:3000/uploads/materiais/${materialSelecionadoInfo.caminhoServidor}`;
    
    modal.style.display = "flex";
    document.getElementById("fechar-pdf").onclick = () => {
        modal.style.display = "none";
        iframe.src = ""; // Limpa o src para parar o carregamento
    };
}

async function fazerDownload() {
    if (!materialSelecionadoInfo || !materialSelecionadoInfo.caminhoServidor) {
        alert("Este material não tem um ficheiro associado para download.");
        return;
    }

    const downloadFileName = `${materialSelecionadoInfo.titulo}.pdf`;

    // Cria um link temporário para iniciar o download.
    const downloadLink = document.createElement('a');
    
    // Aponta o link para o ficheiro no servidor.
    downloadLink.href = `http://localhost:3000/uploads/materiais/${materialSelecionadoInfo.caminhoServidor}`;
    
    // Define o nome que o ficheiro terá no computador do utilizador.
    downloadLink.download = downloadFileName; 
    
    // Adiciona o link ao corpo da página, clica nele programaticamente e remove-o.
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}


// ------ RESTANTE DAS FUNÇÕES (SEM ALTERAÇÕES) ------
document.addEventListener("DOMContentLoaded", () => {
    carregarMateriais();
});
// (As funções moverParaPublico, moverParaPrivado, editarPDF, eliminarPDF continuam iguais)

async function moverParaPublico() {
    if (!materialSelecionadoId) return;
    const modal = document.getElementById("modal-confirmacao");
    modal.style.display = "flex";
    document.getElementById("botao-sim").onclick = async () => {
        modal.style.display = "none";
        try {
            const username = localStorage.getItem('userIdentifier');
            const response = await fetch(`http://localhost:3000/materiais/${materialSelecionadoId}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ novoEstado: 1, criadorUser: username })
            });
            const result = await response.json();
            alert(result.message);
            if (response.ok) carregarMateriais();
        } catch (error) { alert("Erro de rede."); }
    };
    document.getElementById("botao-nao").onclick = () => modal.style.display = "none";
}

async function moverParaPrivado() {
    if (!materialSelecionadoId) return;
    const modal = document.getElementById("modal-privado");
    modal.style.display = "flex";
    document.getElementById("botao-sim-privado").onclick = async () => {
        modal.style.display = "none";
        try {
            const username = localStorage.getItem('userIdentifier');
            const response = await fetch(`http://localhost:3000/materiais/${materialSelecionadoId}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ novoEstado: 0, criadorUser: username })
            });
            const result = await response.json();
            alert(result.message);
            if (response.ok) carregarMateriais();
        } catch (error) { alert("Erro de rede."); }
    };
    document.getElementById("botao-nao-privado").onclick = () => modal.style.display = "none";
}

async function eliminarPDF() {
    if (!materialSelecionadoId) return;
    const modal = document.getElementById("modal-eliminar");
    modal.style.display = "flex";
    document.getElementById("botao-sim-eliminar").onclick = async () => {
        modal.style.display = "none";
        try {
            const username = localStorage.getItem('userIdentifier');
            const response = await fetch(`http://localhost:3000/materiais/${materialSelecionadoId}?criadorUser=${encodeURIComponent(username)}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            alert(result.message);
            if (response.ok) carregarMateriais();
        } catch (error) { alert("Erro de rede."); }
    };
    document.getElementById("botao-nao-eliminar").onclick = () => modal.style.display = "none";
}