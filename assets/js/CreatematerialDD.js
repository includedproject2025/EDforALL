//================MENU=========================
// Aplica o modo escuro se estiver guardado no localStorage
if (localStorage.getItem('modo-escuro') === 'ativado') {
    document.body.classList.add('dark-mode');
}

// Carrega o menu e depois inicializa os eventos
fetch("menu.html")
    .then(response => response.text())
    .then(data => {
        document.getElementById("menu-container").innerHTML = data;

        // Depois de carregar o menu no DOM, ativa os eventos
        inicializarMenu(); // Chama a função global de menu.js
        atualizarExibicaoAvatarGlobal(); // Chama a função global de globalAvatarUpdater.js

        // Define a margem inicial com base no estado do menu (esta lógica deve vir de inicializarMenu no menu.js)
        const menuSide = document.querySelector('.menu-lateral');
        const mainContainer = document.querySelector('.converter-container');
        if (menuSide && mainContainer) {
            if (menuSide.classList.contains('expandir')) {
                mainContainer.style.marginLeft = '240px';
            } else {
                mainContainer.style.marginLeft = '100px';
            }
        }
    });

 
//===========Variáveis globais=================
let selectedElement = null;
let activeCategory = null;
let currentPropertiesPanel = 'text-properties';
let materialConfig = null; 
 
//====================Variaveis Zoom========================
let currentZoom = 1.0;
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.2;
let userHasManuallyZoomed = false; 

//=================Configuração do Material=================
function applyMaterialConfig() {
  // Recuperar configurações do localStorage
  const configData = localStorage.getItem("materialConfig")

  if (configData) {
    materialConfig = JSON.parse(configData)

    // Atualizar título na barra superior
    const titleElement = document.getElementById("material-title")
    if (titleElement && materialConfig.titulo) {
      titleElement.textContent = materialConfig.titulo
    }

    // Aplicar dimensões e orientação ao canvas
    const canvas = document.getElementById("canvas")
    if (canvas) {
      
      canvas.classList.remove(
        "a4-vertical", "a4-horizontal", "a5-vertical",
        "a5-horizontal", "a3-vertical", "a3-horizontal",
      );
      adjustCanvasScale()
    }

    console.log("Configurações aplicadas:", materialConfig)
  } else {
    console.log("Nenhuma configuração encontrada, usando valores padrão")
    adjustCanvasScale(); // Chamar adjustCanvasScale para aplicar o tamanho padrão
  }
  userHasManuallyZoomed = false; // Resetar o estado do zoom manual ao aplicar novas configurações
}

//====================Ajustar escala do canvas==============
function adjustCanvasScale() {
  const canvas = document.getElementById("canvas");
  const contentArea = document.querySelector(".content-area");
  const toolbox = document.querySelector(".toolbox");

  if (!canvas || !contentArea || !toolbox) {
      console.warn("Canvas, contentArea, or toolbox not found for adjustCanvasScale.");
      return;
  }

  
  const availableWidth = contentArea.offsetWidth - toolbox.offsetWidth - 20; 
  const availableHeight = contentArea.offsetHeight;

  let baseCanvasWidth = 595; // Default A4 vertical
  let baseCanvasHeight = 842; // Default A4 vertical

  
  if (materialConfig) {
      switch (materialConfig.tamanho) {
          case "A4":
              if (materialConfig.orientacao === "vertical") {
                  baseCanvasWidth = 595;
                  baseCanvasHeight = 842;
              } else { // horizontal
                  baseCanvasWidth = 842;
                  baseCanvasHeight = 595;
              }
              break;
          case "A5":
              if (materialConfig.orientacao === "vertical") {
                  baseCanvasWidth = 420;
                  baseCanvasHeight = 595;
              } else { // horizontal
                  baseCanvasWidth = 595;
                  baseCanvasHeight = 420;
              }
              break;
          case "A3":
              if (materialConfig.orientacao === "vertical") {
                  baseCanvasWidth = 842;
                  baseCanvasHeight = 1191;
              } else { // horizontal
                  baseCanvasWidth = 1191;
                  baseCanvasHeight = 842;
              }
              break;
          default:
              
              break;
      }
  }

  
  canvas.style.width = baseCanvasWidth + "px";
  canvas.style.height = baseCanvasHeight + "px";

  
  const maxFitScaleX = availableWidth / baseCanvasWidth;
  const maxFitScaleY = availableHeight / baseCanvasHeight;
  const maxFitScale = Math.min(maxFitScaleX, maxFitScaleY);

  if (!userHasManuallyZoomed && currentZoom > maxFitScale) {
    currentZoom = maxFitScale; 
  }

  
  currentZoom = Math.max(currentZoom, MIN_ZOOM);

  
  applyZoom();

  if (currentZoom < 1.0) {
      canvas.classList.add("scaled");
  } else {
      canvas.classList.remove("scaled");
  }
}

//======================Salvar Material=====================
async function saveMaterial() {
    const canvasOriginal = document.getElementById("canvas");
    const username = localStorage.getItem('userIdentifier');

    // 1. Validações iniciais
    if (!materialConfig || !materialConfig.titulo) {
        alert("Falha: Título do material não encontrado. Por favor, crie um novo material a partir da página de materiais para definir um título.");
        return;
    }

    if (!username) {
        alert("Falha: Utilizador não identificado. Por favor, faça login novamente.");
        return;
    }

    // --- LÓGICA DE GERAÇÃO E UPLOAD DO PDF ---
    try {
        alert("A gerar o PDF... Por favor, aguarde.");

        // 2. Clonar o canvas para não incluir controlos de seleção no PDF
        const canvasClone = canvasOriginal.cloneNode(true);
        // Remove a classe 'selected' e os 'resizers' do clone
        canvasClone.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        canvasClone.querySelectorAll('.resizer').forEach(el => el.remove());
        
        canvasClone.style.transform = 'scale(1)';
        canvasClone.style.margin = '0';
        canvasClone.style.boxShadow = 'none';

        // 3. Configurar as opções do html2pdf com base no materialConfig
        const opt = {
            margin: 0,
            filename: `${materialConfig.titulo.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: {
                unit: 'pt', // Pontos, que é o padrão do CSS para px (1px = 1pt em 96 DPI)
                format: materialConfig.tamanho.toLowerCase(), // 'a4', 'a5', 'a3'
                orientation: materialConfig.orientacao === 'vertical' ? 'portrait' : 'landscape'
            }
        };

        // 4. Gerar o PDF como um Blob (objeto de ficheiro binário)
        const pdfBlob = await html2pdf().from(canvasClone).set(opt).output('blob');
        const pdfFile = new File([pdfBlob], opt.filename, { type: 'application/pdf' });

        // 5. Criar FormData para enviar o ficheiro e os metadados
        const formData = new FormData();
        formData.append('materialFile', pdfFile); // O ficheiro PDF
        formData.append('titulo', materialConfig.titulo);
        formData.append('descricao', materialConfig.descricao || '');
        formData.append('tamanho', materialConfig.tamanho);
        formData.append('orientacao', materialConfig.orientacao);
        formData.append('criadorUser', username);
        formData.append('tipo', '2'); // Tipo 2 para material criado no editor

        // 6. Enviar para o servidor
        alert("PDF gerado. A guardar no servidor...");
        const response = await fetch('http://localhost:3000/materiais/criar', {
            method: 'POST',
            body: formData, 
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Material "${materialConfig.titulo}" guardado com sucesso no seu ambiente privado!`);
        } else {
            throw new Error(result.message || 'Ocorreu um erro desconhecido no servidor.');
        }

    } catch (error) {
        console.error("Erro ao gerar ou guardar o material:", error);
        alert(`Falha ao guardar o material: ${error.message}`);
    }
}
 //====================Inicialização==================
document.addEventListener('DOMContentLoaded', function() {
    applyMaterialConfig();
    window.addEventListener("resize", adjustCanvasScale);
    document.getElementById('zoom-in-btn').addEventListener('click', zoomIn);
    document.getElementById('zoom-out-btn').addEventListener('click', zoomOut);
    document.getElementById('delete-btn').addEventListener('click', deleteSelectedElement);
    const formasTool = document.querySelector('[data-type="formas"]');
    if (formasTool) {
        formasTool.addEventListener('click', e => { e.preventDefault(); toggleShapesPanel(); });
    }
    document.querySelectorAll('.tool').forEach(tool => {
        tool.addEventListener('click', function() {
            const type = this.dataset.type;
            if (type === 'text') createTextElement();
            else if (type === 'line') createLineElement();
        });
    });
    document.getElementById('shapes-panel').addEventListener('click', e => {
        const symbol = e.target.closest('.symbol');
        if (symbol && symbol.dataset.type) createShape(symbol.dataset.type);
    });
    document.getElementById('canvas').addEventListener('click', e => {
        if (e.target === e.currentTarget) deselectAll();
    });
    document.getElementById('symbol-search').addEventListener('input', function() {
        filterSymbols(this.value);
    });
    loadSymbolCategories();
});

function createTextElement() {
    const canvas = document.getElementById("canvas");
    const centerX = canvas.offsetWidth / 2;
    const centerY = canvas.offsetHeight / 2;
    
    const newText = document.createElement("div");
    newText.className = "canvas-item";
    newText.dataset.type = "text";
    newText.style.position = "absolute";
    newText.style.left = (centerX - 50) + "px";
    newText.style.top = (centerY - 10) + "px";
    newText.style.minWidth = "100px";
    newText.style.minHeight = "20px";
    newText.innerText = "Texto exemplo";
    newText.contentEditable = true;
    newText.style.whiteSpace = "pre-wrap";

    newText.addEventListener("mousedown", handleElementMouseDown);
    
    canvas.appendChild(newText);
    selectElement(newText);
    setTimeout(() => newText.focus(), 100);
}

function createLineElement() {
    const canvas = document.getElementById("canvas");
    const centerX = canvas.offsetWidth / 2;
    const centerY = canvas.offsetHeight / 2;
    
    const newLine = document.createElement("div");
    newLine.className = "canvas-item";
    newLine.dataset.type = "line";
    newLine.style.position = "absolute";
    newLine.style.left = (centerX - 50) + "px";
    newLine.style.top = (centerY) + "px";
    newLine.style.width = "100px";
    newLine.style.height = "1px";
    newLine.style.backgroundColor = "black";
    
    newLine.addEventListener("mousedown", handleElementMouseDown);
    
    canvas.appendChild(newLine);
    selectElement(newLine);
}
//====================Funções de Zoom========================
function zoomIn() {
    currentZoom += ZOOM_STEP;
    userHasManuallyZoomed = true; 
    applyZoom();
}

function zoomOut() {
    if (currentZoom > MIN_ZOOM) {
        currentZoom -= ZOOM_STEP;
        userHasManuallyZoomed = true; 
        applyZoom();
    }
}

function applyZoom() {
    const canvas = document.getElementById('canvas');
    canvas.style.transformOrigin = 'center center'; // Garante que o zoom é a partir do centro
    canvas.style.transform = `scale(${currentZoom})`;
}

//=================Carregar categorias e símbolos=================
// Toggle entre abas
function toggleTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab[onclick="toggleTab('${tabId}')"]`).classList.add('active');
    if (tabId === 'simbolos') {
        document.getElementById('shapes-panel').style.display = 'none';
    }
}

// Toggle painel de formas
function toggleShapesPanel() {
    event.preventDefault();
    const panel = document.getElementById('shapes-panel');
    panel.style.display = panel.style.display === 'none' || panel.style.display === '' ? 'block' : 'none';
}

// Funções de drag and drop
function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    let targetElement = ev.target.closest('[data-type]');
    if (!targetElement) return;

    const type = targetElement.dataset.type;
    ev.dataTransfer.setData("type", type);

    // Se for um símbolo, guardar informações extra
    if (type === 'symbol') {
        const symbolPath = targetElement.dataset.symbolPath;
        const symbolName = targetElement.dataset.symbolName;
        if (symbolPath && symbolName) {
            ev.dataTransfer.setData("symbolPath", symbolPath);
            ev.dataTransfer.setData("symbolName", symbolName); // Guardar o nome
        }
    }
}

function drop(ev) {
    ev.preventDefault();

    const type = ev.dataTransfer.getData("type");
    const canvas = document.getElementById("canvas");

    // Se o tipo não for válido, não faz nada
    if (!type) {
        console.warn("Tentativa de drop com um tipo de dados inválido.");
        return;
    }
    
    let finalLeft = ev.offsetX - 40;
    let finalTop = ev.offsetY - 40;

    // Criar o novo elemento que será adicionado ao canvas
    const newElement = document.createElement("div");
    newElement.classList.add("canvas-item");
    newElement.dataset.type = type;
    newElement.style.position = "absolute";


    switch (type) {
        case "symbol":

            const symbolPath = ev.dataTransfer.getData("symbolPath");
            const symbolName = ev.dataTransfer.getData("symbolName");

            // Verifica se temos toda a informação necessária
            if (!symbolPath || !symbolName) {
                console.error("Informação do símbolo (caminho ou nome) em falta no drop.");
                return; // Aborta a função se faltar informação
            }
            
            // Define o tamanho inicial do container do símbolo no canvas
            newElement.style.width = "80px";
            // A altura é automática para que o texto caiba por baixo da imagem
            newElement.style.height = "auto"; 
            
            // 1. Cria a imagem
            const img = document.createElement('img');
            img.src = symbolPath;
            img.alt = symbolName;
            img.style.width = '100%';
            img.style.height = 'auto'; // Altura da imagem também automática
            img.style.objectFit = 'contain';
            img.style.pointerEvents = 'none'; // Impede que a imagem intercepte cliques/drags
            newElement.appendChild(img);

            // 2. Cria o texto por baixo da imagem
            const textDiv = document.createElement('div');
            textDiv.className = 'symbol-text-on-canvas';
            textDiv.textContent = symbolName;
            newElement.appendChild(textDiv);
            break;

        case "text":
            newElement.innerText = "Texto exemplo";
            newElement.contentEditable = true;
            newElement.style.minWidth = "100px";
            newElement.style.minHeight = "20px";
            newElement.style.whiteSpace = "pre-wrap";
            break;

        case "rect":
            newElement.style.width = "100px";
            newElement.style.height = "80px";
            newElement.style.border = "1px solid black";
            newElement.style.backgroundColor = "transparent";
            break;

        case "circle":
            newElement.style.width = "80px";
            newElement.style.height = "80px";
            newElement.style.borderRadius = "50%";
            newElement.style.border = "1px solid black";
            newElement.style.backgroundColor = "transparent";
            break;

        case "triangle":
            newElement.style.width = "0";
            newElement.style.height = "0";
            newElement.style.borderLeft = "50px solid transparent";
            newElement.style.borderRight = "50px solid transparent";
            newElement.style.borderBottom = "100px solid black";
            break;
            
        case "diamond":
            newElement.style.width = "80px";
            newElement.style.height = "80px";
            newElement.style.border = "1px solid black";
            newElement.style.transform = "rotate(45deg)";
            break;

        case "line":
            newElement.style.width = "100px";
            newElement.style.height = "1px";
            newElement.style.backgroundColor = "black";
            newElement.style.transformOrigin = "left center";
            break;
            
        default:
            console.warn(`Tipo de elemento "${type}" desconhecido para o drop.`);
            return; // Se o tipo não for reconhecido, não faz nada
    }


    // Posiciona o elemento no canvas, garantindo que não sai dos limites
    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.offsetHeight;
    const elementWidth = parseInt(newElement.style.width) || 80;
    const elementHeight = parseInt(newElement.style.height) || 80;

    newElement.style.left = Math.max(0, Math.min(finalLeft, canvasWidth - elementWidth)) + "px";
    newElement.style.top = Math.max(0, Math.min(finalTop, canvasHeight - elementHeight)) + "px";

    // Adiciona o listener para tornar o elemento arrastável e selecionável
    newElement.addEventListener("mousedown", handleElementMouseDown);

    // Adiciona o elemento finalizado ao canvas
    canvas.appendChild(newElement);

    // Seleciona o novo elemento
    selectElement(newElement);

    // Se for texto, foca para edição imediata
    if (type === "text") {
        setTimeout(() => newElement.focus(), 100);
    }
}

function createShape(type, x = null, y = null) {
    const canvas = document.getElementById("canvas");
    x = x ?? canvas.offsetWidth / 2 - 40;
    y = y ?? canvas.offsetHeight / 2 - 40;
    
    const newShape = document.createElement("div");
    newShape.className = "canvas-item";
    newShape.dataset.type = type;
    newShape.style.position = "absolute";
    newShape.style.left = x + "px";
    newShape.style.top = y + "px";
    // Define um tamanho base para o container do ícone
    newShape.style.width = "80px";
    newShape.style.height = "80px";
    
    switch (type) {
        case "rect": newShape.style.cssText += "border: 1px solid black;"; break;
        case "circle": newShape.style.cssText += "border-radius: 50%; border: 1px solid black;"; break;
        case "triangle": newShape.style.cssText += "width: 0; height: 0; border-left: 50px solid transparent; border-right: 50px solid transparent; border-bottom: 100px solid black;"; break;
        case "diamond": newShape.style.cssText += "border: 1px solid black; transform: rotate(45deg);"; break;
        case "pentagon": 
        case "hexagon":
            // Estilo comum para os ícones dentro do container
            const iconStyle = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; font-size: inherit;";
            
            // Ícone de preenchimento (camada de trás)
            const fillIcon = `<i class="bi bi-${type}-fill shape-fill" style="${iconStyle} color: #ffffff;"></i>`;
            // Ícone de contorno (camada da frente)
            const outlineIcon = `<i class="bi bi-${type} shape-outline" style="${iconStyle} color: #000000;"></i>`;
            
            newShape.innerHTML = fillIcon + outlineIcon;
            newShape.style.fontSize = "60px"; // Controla o tamanho dos ícones
            break;
    }
    
    newShape.addEventListener("mousedown", handleElementMouseDown);
    canvas.appendChild(newShape);
    selectElement(newShape);
}
// Manipular clique em elementos
function handleElementMouseDown(e) {
    // Se o clique for dentro de um redimensionador, iniciar redimensionamento
    if (e.target.classList.contains('resizer')) {
        startResize(e);
        return;
    }

    const element = this;
    selectElement(element);

    // Se for contentEditable, permitir edição e não iniciar movimento imediatamente
    if (element.contentEditable === 'true') {
        let isDragging = false;
        const initialX = e.clientX;
        const initialY = e.clientY;
        const startLeft = parseInt(element.style.left) || 0;
        const startTop = parseInt(element.style.top) || 0;
        const canvas = document.getElementById("canvas");

        const moveCheckThreshold = 5; // Distância mínima para considerar arrasto

        function checkMove(moveEvent) {
            const dx = moveEvent.clientX - initialX;
            const dy = moveEvent.clientY - initialY;

            if (Math.abs(dx) > moveCheckThreshold || Math.abs(dy) > moveCheckThreshold) {
                isDragging = true;
                // Remove este listener e adiciona o listener de movimento real
                document.removeEventListener('mousemove', checkMove);
                document.addEventListener('mousemove', moveElement);
            }
        }

        function moveElement(moveEvent) {
            const dx = moveEvent.clientX - initialX;
            const dy = moveEvent.clientY - initialY;

            let newLeft = startLeft + dx;
            let newTop = startTop + dy;

            // Limitar o movimento dentro do canvas
            newLeft = Math.max(0, Math.min(newLeft, canvas.offsetWidth - element.offsetWidth));
            newTop = Math.max(0, Math.min(newTop, canvas.offsetHeight - element.offsetHeight));

            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
        }

        function stopMoving(upEvent) {
            // Se não houve arrasto (apenas clique), focar no elemento para edição
            if (!isDragging && element.contentEditable === 'true') {
            }
            document.removeEventListener('mousemove', checkMove); // Remover sempre
            document.removeEventListener('mousemove', moveElement);
            document.removeEventListener('mouseup', stopMoving);
        }

        document.addEventListener('mousemove', checkMove); // Primeiro verifica se é arrasto
        document.addEventListener('mouseup', stopMoving);
        e.stopPropagation(); // Impede que o evento se propague para o canvas e o deselecione
        return; // Não continua com a lógica de movimento padrão se for contentEditable
    }


    // Lógica de movimento para elementos NÃO contentEditable
    const initialX = e.clientX;
    const initialY = e.clientY;
    const startLeft = parseInt(element.style.left) || 0;
    const startTop = parseInt(element.style.top) || 0;
    const canvas = document.getElementById("canvas");

    function moveElement(moveEvent) {
        const dx = moveEvent.clientX - initialX;
        const dy = moveEvent.clientY - initialY;

        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        // Limitar o movimento dentro do canvas
        newLeft = Math.max(0, Math.min(newLeft, canvas.offsetWidth - element.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, canvas.offsetHeight - element.offsetHeight));

        element.style.left = newLeft + 'px';
        element.style.top = newTop + 'px';
    }

    function stopMoving() {
        document.removeEventListener('mousemove', moveElement);
        document.removeEventListener('mouseup', stopMoving);
    }

    document.addEventListener('mousemove', moveElement);
    document.addEventListener('mouseup', stopMoving);

    e.preventDefault(); // Impedir seleção de texto
}

// Selecionar elemento
function selectElement(element) {
    // Deselecionar elemento anterior
    deselectAll();
    
    // Selecionar o novo elemento
    selectedElement = element;
    element.classList.add('selected');
    
    // Adicionar redimensionadores para elementos de texto, formas e símbolos
    const resizableTypes = ['text', 'rect', 'circle', 'triangle', 'diamond', 'pentagon', 'hexagon', 'line', 'symbol'];
    if (resizableTypes.includes(element.dataset.type)) {
        addResizers(element);
    } else {
        removeResizers(element);
    }


    // Mostrar painel de propriedades adequado
    showPropertiesForElement(element);
}

// Deselecionar todos os elementos
function deselectAll() {
    if (selectedElement) {
        selectedElement.classList.remove('selected');
        // Remover redimensionadores ao deselecionar
        removeResizers(selectedElement);
    }
    
    document.querySelectorAll('.canvas-item').forEach(item => {
        item.classList.remove('selected');
        // Garantir remoção de redimensionadores de todos os itens
        removeResizers(item);
    });
    
    selectedElement = null;

    // Ocultar todos os painéis de propriedades ao deselecionar tudo
    document.getElementById('text-properties').style.display = 'none';
    document.getElementById('shape-properties').style.display = 'none';
    document.getElementById('line-properties').style.display = 'none';
}

// Mostrar painel de propriedades para o elemento selecionado
function showPropertiesForElement(element) {
    // Ocultar todos os painéis de propriedades
    document.getElementById('text-properties').style.display = 'none';
    document.getElementById('shape-properties').style.display = 'none';
    document.getElementById('line-properties').style.display = 'none';

    // Mostrar o painel adequado com base no tipo do elemento
    const type = element.dataset.type;
    
    if (type === 'text') {
        document.getElementById('text-properties').style.display = 'block';
        currentPropertiesPanel = 'text-properties';
        
        // Preencher os campos com os valores do elemento
        document.getElementById('font-size').value = element.style.fontSize || '14px';
        document.getElementById('text-color').value = rgbToHex(element.style.color) || '#000000';
        // Adicionar listeners para input/change para atualizar propriedades em tempo real
        document.getElementById('font-size').onchange = updateTextProperties;
        document.getElementById('text-color').oninput = updateTextProperties; // Usar oninput para cor
    } 
    else if (type === 'line') {
        document.getElementById('line-properties').style.display = 'block';
        currentPropertiesPanel = 'line-properties';
        
        // Preencher os campos com os valores do elemento
        document.getElementById('line-color').value = rgbToHex(element.style.backgroundColor) || '#000000';

        let scaleY = 1; // Valor padrão
        const transform = element.style.transform;
        if (transform) {
            const scaleMatch = transform.match(/scaleY\(([-+]?\d*\.?\d+)\)/);
            if (scaleMatch && scaleMatch[1]) {
                scaleY = scaleMatch[1];
            }
        }
        document.getElementById('line-width').value = scaleY;

        // Calcular ângulo da linha (código existente)
        let rotation = element.style.transform || '';
        let angle = '0deg'; // Usar valor com 'deg' para consistência
        if (rotation) {
            const match = rotation.match(/rotate\(([-+]?\d*\.?\d+deg)\)/);
            if (match && match[1]) angle = match[1];
        }
        document.getElementById('line-orientation').value = angle;

        // Adicionar listeners (código existente)
        document.getElementById('line-color').oninput = updateLineProperties;
        document.getElementById('line-width').onchange = updateLineProperties;
        document.getElementById('line-orientation').onchange = updateLineProperties;
    }
    else if (['rect', 'circle', 'triangle', 'diamond', 'pentagon', 'hexagon'].includes(type)) {
        document.getElementById('shape-properties').style.display = 'block';
        currentPropertiesPanel = 'shape-properties';
        
        // Preencher os campos com os valores do elemento
        document.getElementById('shape-color').value = rgbToHex(element.style.backgroundColor) || '#ffffff';
        document.getElementById('border-color').value = rgbToHex(element.style.borderColor) || '#000000';
        document.getElementById('border-width').value = element.style.borderWidth || '2px';

        // Preencher o campo de orientação
        let rotation = element.style.transform || '';
        let angle = '0'; // Usar apenas o número para o input
        if (rotation) {
            const match = rotation.match(/rotate\(([-+]?\d*\.?\d+)(?:deg)?\)/);
            if (match && match[1]) angle = match[1];
        }
        document.getElementById('shape-orientation').value = angle;

        // Adicionar listeners para input/change para atualizar propriedades em tempo real
        document.getElementById('shape-color').oninput = updateShapeProperties;
        document.getElementById('border-color').oninput = updateShapeProperties;
        document.getElementById('border-width').onchange = updateShapeProperties;
        document.getElementById('shape-orientation').oninput = updateShapeProperties;
    }
}

// Atualizar propriedades de texto
function updateTextProperties() {
    if (!selectedElement || selectedElement.dataset.type !== 'text') return;
    
    selectedElement.style.fontSize = document.getElementById('font-size').value;
    selectedElement.style.color = document.getElementById('text-color').value;
}

// Aplicar formatação de texto
function formatText(command) {
    if (!selectedElement || selectedElement.dataset.type !== 'text') return;
    document.execCommand(command, false, null);
}

// Alinhar texto
function alignText(alignment) {
    if (!selectedElement || selectedElement.dataset.type !== 'text') return;
    selectedElement.style.textAlign = alignment;
}

// Atualizar propriedades de forma
function updateShapeProperties() {
    if (!selectedElement) return;

    const type = selectedElement.dataset.type;
    const isIconShape = ['pentagon', 'hexagon'].includes(type);
    const borderWidth = parseInt(document.getElementById('border-width').value);

    if (isIconShape) {
        // ---- LÓGICA PARA PENTÁGONO E HEXÁGONO ----
        const fillColor = document.getElementById('shape-color').value;
        const borderColor = document.getElementById('border-color').value;

        const fillElement = selectedElement.querySelector('.shape-fill');
        const outlineElement = selectedElement.querySelector('.shape-outline');

        if (fillElement) fillElement.style.color = fillColor;
        if (outlineElement) {
            outlineElement.style.color = borderColor;
            // Aplicar text-shadow para simular espessura da borda em ícones
            if (borderWidth > 1) {
                let shadow = '';
                for (let i = 1; i <= borderWidth; i++) {
                    shadow += `${borderColor} ${i}px ${i}px 0, ${borderColor} -${i}px -${i}px 0, ${borderColor} ${i}px -${i}px 0, ${borderColor} -${i}px ${i}px 0, `;
                    shadow += `${borderColor} ${i}px 0 0, ${borderColor} -${i}px 0 0, ${borderColor} 0 ${i}px 0, ${borderColor} 0 -${i}px 0`;
                    if (i < borderWidth) shadow += ', ';
                }
                outlineElement.style.textShadow = shadow;
            } else {
                outlineElement.style.textShadow = ''; // Remover sombra se espessura for 1
            }
        }


    } else if (type === 'triangle') {
        const fillColor = document.getElementById('shape-color').value;
        const borderColor = document.getElementById('border-color').value;

        selectedElement.style.borderBottomColor = fillColor; // A cor de preenchimento do triângulo
        selectedElement.style.borderLeftColor = borderColor;   // Cor das bordas laterais
        selectedElement.style.borderRightColor = borderColor;  // Cor das bordas laterais

        const baseMultiplier = 1; // Base inicial para a espessura original
        const initialBorderLeftRightWidth = 50;
        const initialBorderBottomWidth = 100;

        selectedElement.style.borderLeftWidth = (initialBorderLeftRightWidth * borderWidth / baseMultiplier) + 'px';
        selectedElement.style.borderRightWidth = (initialBorderLeftRightWidth * borderWidth / baseMultiplier) + 'px';
        selectedElement.style.borderBottomWidth = (initialBorderBottomWidth * borderWidth / baseMultiplier) + 'px';

    } else if (['rect', 'circle', 'diamond'].includes(type)) {
        selectedElement.style.backgroundColor = document.getElementById('shape-color').value;
        selectedElement.style.borderColor = document.getElementById('border-color').value;
        selectedElement.style.borderWidth = borderWidth + 'px'; // Aplica a espessura diretamente com a unidade 'px'
    }

    // Lógica de orientação (comum a todos, exceto talvez o triângulo, dependendo do efeito desejado)
    const orientationInput = document.getElementById('shape-orientation');
    const angle = parseFloat(orientationInput.value) || 0;
    selectedElement.style.transform = `rotate(${angle}deg)`;
}

// Atualizar propriedades de linha
function updateLineProperties() {
    if (!selectedElement || selectedElement.dataset.type !== 'line') return;

    const color = document.getElementById('line-color').value;
    const thickness = document.getElementById('line-width').value; // Agora é um número limpo: "1", "2", etc.
    const rotation = document.getElementById('line-orientation').value; // "0deg", "45deg", etc.

    selectedElement.style.backgroundColor = color;
    selectedElement.style.height = '1px';
    selectedElement.style.transform = `rotate(${rotation}) scaleY(${thickness})`;
}

// Mostrar categoria de símbolos
async function showCategory(category) {
    activeCategory = category;
    const container = document.getElementById('symbol-container');
    const categoriesContainer = document.getElementById('symbol-categories-container');
    container.innerHTML = ''; // Limpar símbolos anteriores

    // Limpar o campo de busca e mostrar categorias ao mudar de categoria
    document.getElementById('symbol-search').value = '';
    categoriesContainer.style.display = 'block';

    const categoryPath = `spcs/${category}`; // Caminho para a pasta da categoria

    try {
        const categoryImagePaths = imagePaths.filter(path => path.startsWith(category + '/'));

        if (categoryImagePaths.length === 0) {
            container.innerHTML = '<p>Nenhuma imagem encontrada nesta categoria.</p>';
            container.style.display = 'block'; // Mostrar mensagem
            return;
        }

        container.style.display = 'grid'; // Garantir que é grid
        container.innerHTML = ''; // Limpar antes de adicionar novos

        categoryImagePaths.forEach(symbolPath => {
            const symbolElement = createSymbolElement(symbolPath);
            container.appendChild(symbolElement);
        });

    } catch (error) {
        console.error(`Erro ao carregar símbolos da categoria ${category}:`, error);
        container.innerHTML = '<p>Erro ao carregar símbolos.</p>';
        container.style.display = 'block'; // Mostrar mensagem de erro
    }

    // Certifique-se de que o painel de formas está oculto
    document.getElementById('shapes-panel').style.display = 'none';
}
// Adiciona redimensionadores ao elemento
function addResizers(element) {
    // Remover redimensionadores existentes primeiro
    removeResizers(element);

    // Adiciona redimensionadores apenas para tipos suportados
    const resizableTypes = ['text', 'rect', 'circle', 'triangle', 'diamond', 'pentagon', 'hexagon', 'line', 'symbol']; // Incluir todos os tipos redimensionáveis
    if (!resizableTypes.includes(element.dataset.type)) {
        return;
    }

    const types = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    types.forEach(type => {
        const resizer = document.createElement('div');
        resizer.classList.add('resizer', type);
        element.appendChild(resizer);
    });
}

// Remove redimensionadores do elemento
function removeResizers(element) {
    element.querySelectorAll('.resizer').forEach(resizer => {
        resizer.remove();
    });
}

function startResize(e) {
    const resizer = e.target;
    const element = resizer.parentElement;
    const initialX = e.clientX;
    const initialY = e.clientY;
    const startWidth = parseInt(getComputedStyle(element).width);
    const startHeight = parseInt(getComputedStyle(element).height);
    const startLeft = parseInt(getComputedStyle(element).left);
    const startTop = parseInt(getComputedStyle(element).top);

    function resize(moveEvent) {
    let dx = moveEvent.clientX - initialX;
    let dy = moveEvent.clientY - initialY;
    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    if (resizer.classList.contains('bottom-right')) {
        newWidth = startWidth + dx; newHeight = startHeight + dy;
    } else if (resizer.classList.contains('bottom-left')) {
        newWidth = startWidth - dx; newHeight = startHeight + dy; newLeft = startLeft + dx;
    } else if (resizer.classList.contains('top-right')) {
        newWidth = startWidth + dx; newHeight = startHeight - dy; newTop = startTop + dy;
    } else if (resizer.classList.contains('top-left')) {
        newWidth = startWidth - dx; newHeight = startHeight - dy; newLeft = startLeft + dx; newTop = startTop + dy;
    }
    
    // Posiciona o elemento
    element.style.left = newLeft + 'px';
    element.style.top = newTop + 'px';

    if (element.dataset.type === 'triangle') {
        // Para o triângulo, redimensionamos as bordas, não a largura/altura do div.
        const baseWidth = Math.max(newWidth, 20);
        const triangleHeight = Math.max(newHeight, 20);

        element.style.borderLeftWidth = (baseWidth / 2) + 'px';
        element.style.borderRightWidth = (baseWidth / 2) + 'px';
        element.style.borderBottomWidth = triangleHeight + 'px';
        
        // Garantimos que a largura e altura do div permanecem 0.
        element.style.width = '0';
        element.style.height = '0';

    } else {
        // Lógica para todos os outros elementos
        element.style.width = Math.max(newWidth, 20) + 'px';

        if (element.dataset.type !== 'symbol' && element.dataset.type !== 'line') {
             element.style.height = Math.max(newHeight, 20) + 'px';
        } else {
            element.style.height = 'auto'; // Símbolos têm altura automática
        }
    }

    // Lógica para ícones (pentágono, hexágono, etc.)
    if (element.dataset.type === 'pentagon' || element.dataset.type === 'hexagon') {
        const newIconSize = Math.min(newWidth, newHeight);
        element.style.fontSize = Math.max(newIconSize, 10) + 'px';
    }
    
    if (element.dataset.type === 'symbol') {
        const textDiv = element.querySelector('.symbol-text-on-canvas');
        if (textDiv) {
            const newFontSize = Math.max(8, Math.min(24, newWidth / 6));
            textDiv.style.fontSize = newFontSize + 'px';
        }
    }
    }function resize(moveEvent) {
        let dx = moveEvent.clientX - initialX;
        let dy = moveEvent.clientY - initialY;
        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        if (resizer.classList.contains('bottom-right')) {
            newWidth = startWidth + dx; newHeight = startHeight + dy;
        } else if (resizer.classList.contains('bottom-left')) {
            newWidth = startWidth - dx; newHeight = startHeight + dy; newLeft = startLeft + dx;
        } else if (resizer.classList.contains('top-right')) {
            newWidth = startWidth + dx; newHeight = startHeight - dy; newTop = startTop + dy;
        } else if (resizer.classList.contains('top-left')) {
            newWidth = startWidth - dx; newHeight = startHeight - dy; newLeft = startLeft + dx; newTop = startTop + dy;
        }
        
        // Posiciona o elemento
        element.style.left = newLeft + 'px';
        element.style.top = newTop + 'px';

        if (element.dataset.type === 'triangle') {
            // Para o triângulo, redimensionamos as bordas, não a largura/altura do div.
            const baseWidth = Math.max(newWidth, 20);
            const triangleHeight = Math.max(newHeight, 20);

            element.style.borderLeftWidth = (baseWidth / 2) + 'px';
            element.style.borderRightWidth = (baseWidth / 2) + 'px';
            element.style.borderBottomWidth = triangleHeight + 'px';
            
            // Garantimos que a largura e altura do div permanecem 0.
            element.style.width = '0';
            element.style.height = '0';

        } else {
            // Lógica para todos os outros elementos
            element.style.width = Math.max(newWidth, 20) + 'px';

            if (element.dataset.type !== 'symbol' && element.dataset.type !== 'line') {
                element.style.height = Math.max(newHeight, 20) + 'px';
            } else {
                element.style.height = 'auto'; // Símbolos têm altura automática
            }
        }

        // Lógica para ícones (pentágono, hexágono, etc.)
        if (element.dataset.type === 'pentagon' || element.dataset.type === 'hexagon') {
            const newIconSize = Math.min(newWidth, newHeight);
            element.style.fontSize = Math.max(newIconSize, 10) + 'px';
        }
        
        if (element.dataset.type === 'symbol') {
            const textDiv = element.querySelector('.symbol-text-on-canvas');
            if (textDiv) {
                const newFontSize = Math.max(8, Math.min(24, newWidth / 6));
                textDiv.style.fontSize = newFontSize + 'px';
            }
        }
    }
    function stopResize() {
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
    }

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    e.preventDefault();
    e.stopPropagation();
}

// Função para criar um item de símbolo para a toolbox
function createSymbolToolboxItem(symbolPath) {
    const fullImagePath = `spcs/${symbolPath}`;
    const fileName = symbolPath.split('/').pop();
    const symbolName = fileName.replace(/\.png$/i, '');

    const container = document.createElement('div');
    container.className = 'symbol-item-container';

    const symbolDiv = document.createElement('div');
    symbolDiv.className = 'symbol';
    symbolDiv.draggable = true;
    symbolDiv.dataset.type = 'symbol';
    symbolDiv.dataset.symbolPath = fullImagePath;
    symbolDiv.dataset.symbolName = symbolName; // Guardar nome para o drop
    symbolDiv.addEventListener('dragstart', drag);

    const img = document.createElement('img');
    img.src = fullImagePath;
    img.alt = symbolName;
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; pointer-events: none;';
    symbolDiv.appendChild(img);
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'symbol-name-in-toolbox';
    nameDiv.textContent = symbolName;

    container.appendChild(symbolDiv);
    container.appendChild(nameDiv);

    return container;
}

// Carrega as categorias e prepara o sistema de acordeão
async function loadSymbolCategories() {
    const categoriesContainer = document.getElementById('symbol-categories-container');
    categoriesContainer.innerHTML = ''; 

    // Lista de categorias (pode ser obtida dinamicamente no futuro)
    const categories = [
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
        'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5',
        '6', '7', '8', '9', '!', 'À', 'Á', 'Â', 'Ç', 'É', 'Ê', 'Í', 'Ñ', 'Ó', 'Ö', 'Ő',
        'Ú', 'Ü', 'Ű', '¡', '¿'
    ].sort();
    
    categories.forEach(categoryName => {
        // NOVO: Wrapper para cada categoria
        const wrapper = document.createElement('div');
        wrapper.className = 'category-wrapper';

        // Categoria clicável (a "pasta")
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category';
        categoryElement.dataset.category = categoryName;
        categoryElement.innerHTML = `
            <div class="category-color" style="background-color: ${getCategoryColor(categoryName)};"></div>
            <span>${categoryName}</span>
        `;
        
        // Container de símbolos (inicialmente oculto)
        const symbolsGrid = document.createElement('div');
        symbolsGrid.className = 'symbols-in-category-grid';
        symbolsGrid.style.display = 'none'; // Começa oculto
        symbolsGrid.dataset.loaded = 'false'; // Marcar como não carregado

        categoryElement.addEventListener('click', () => {
            const isOpening = symbolsGrid.style.display === 'none';

            // Primeiro, fecha todas as outras categorias abertas para um efeito de acordeão limpo
            document.querySelectorAll('.symbols-in-category-grid').forEach(grid => {
                grid.style.display = 'none';
            });
            document.querySelectorAll('.category').forEach(cat => {
                cat.classList.remove('active');
            });

            if (isOpening) {
                // Se estava fechado, abre este
                categoryElement.classList.add('active');
                symbolsGrid.style.display = 'grid';
                
                // Carrega os símbolos apenas na primeira vez que a categoria é aberta
                if (symbolsGrid.dataset.loaded === 'false') {
                    symbolsGrid.innerHTML = ''; // Limpa qualquer conteúdo anterior
                    const categoryImagePaths = imagePaths.filter(path => path.startsWith(categoryName + '/'));
                    
                    if (categoryImagePaths.length > 0) {
                        categoryImagePaths.forEach(path => {
                            symbolsGrid.appendChild(createSymbolToolboxItem(path));
                        });
                    } else {
                        symbolsGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #888;">Nenhum símbolo.</p>';
                    }
                    symbolsGrid.dataset.loaded = 'true'; // Marca como carregado para não recarregar
                }
            }
        });
        
        // Adiciona a categoria e a sua grelha ao wrapper
        wrapper.appendChild(categoryElement);
        wrapper.appendChild(symbolsGrid);
        
        // Adiciona o wrapper completo ao container principal
        categoriesContainer.appendChild(wrapper);
    });
}

//Filtra símbolos (modo de pesquisa)
function filterSymbols(term) {
    const categoriesContainer = document.getElementById('symbol-categories-container');
    const searchResultsContainer = document.getElementById('symbol-container'); // Usamos o container antigo para resultados
    const searchTerm = term.toLowerCase().trim();

    if (searchTerm === '') {
        // Se a pesquisa estiver vazia, mostrar as categorias e esconder os resultados
        categoriesContainer.style.display = 'flex';
        searchResultsContainer.style.display = 'none';
        searchResultsContainer.innerHTML = '';
        return;
    }
    
    // Se estiver a pesquisar, esconder as categorias e mostrar os resultados
    categoriesContainer.style.display = 'none';
    searchResultsContainer.style.display = 'grid';
    searchResultsContainer.innerHTML = '';
    
    const filteredPaths = imagePaths.filter(path => {
        const fileName = path.split('/').pop().replace(/\.png$/i, '');
        return fileName.toLowerCase().includes(searchTerm);
    });
    
    if (filteredPaths.length > 0) {
        filteredPaths.forEach(path => {
            searchResultsContainer.appendChild(createSymbolToolboxItem(path));
        });
    } else {
        searchResultsContainer.style.display = 'block';
        searchResultsContainer.innerHTML = '<p>Nenhum símbolo encontrado.</p>';
    }
}

// Converte RGB para formato Hex
function rgbToHex(rgb) {
    if (!rgb || rgb === '') return '#000000';
    
    // Se já for um hex
    if (rgb.startsWith('#')) return rgb;
    
    // Para formato rgb(r,g,b)
    const match = rgb.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (match) {
        return "#" + 
            ("0" + parseInt(match[1],10).toString(16)).slice(-2) +
            ("0" + parseInt(match[2],10).toString(16)).slice(-2) +
            ("0" + parseInt(match[3],10).toString(16)).slice(-2);
    }
    
    return '#000000';
}

// Retorna a cor da categoria
function getCategoryColor(category) {
    const colorMap = {
        'pessoas': '#FFD700',
        'lugares': '#90EE90',
        'verbos': '#87CEFA',
        'adjetivos': '#E0FFFF',
        'pronomes': '#DDA0DD',
        'expressoes': '#FFC0CB',
        'tempo': '#ADD8E6',
        'conectores': '#F5DEB3',
        'preposicoes': '#D3D3D3',
        'negacao': '#FF6347'
    };
    
    return colorMap[category] || '#CCCCCC';
}

let imagePaths = [];
async function loadNomesSpcCSV() {
    try {
        const response = await fetch('nomes_spc.csv');
        const text = await response.text();
        imagePaths = text.split('\n').map(line => line.trim().replace(/\\/g, '/')).filter(Boolean);
        console.log(`Loaded ${imagePaths.length} image paths.`);
    } catch (error) {
        console.error('Error loading nomes_spc.csv:', error);
    }
}
// Call the load function when the script loads
loadNomesSpcCSV();

function deleteSelectedElement() {
    if (selectedElement) {
        selectedElement.remove();
        selectedElement = null;
        deselectAll();
    } else {
        alert("Por favor, selecione um elemento para apagar.");
    }
}

// Nova função para carregar o avatar do utilizador (copiada de pageInit.js)
async function carregarAvatarUtilizador() {
    const avatarImg = document.getElementById('user-avatar');
    if (!avatarImg) return;

    const username = localStorage.getItem('userIdentifier'); // Obtém o username do utilizador logado
    if (!username) {
        // Se não houver username, mostra o avatar default ou esconde
        avatarImg.src = '/uploads/avatars/default_avatar.png';
        return;
    }

    try {
        // Faz um fetch para obter os dados do utilizador específico (incluindo o Avatar)
        const response = await fetch(`http://localhost:3000/api/utilizador/${username}`); // Assume que tens um endpoint para isto
        if (!response.ok) throw new Error("Falha ao carregar dados do utilizador.");

        const userData = await response.json();
        const avatarFileName = userData.Avatar; // Obtém o nome do ficheiro da BD

        if (avatarFileName && avatarFileName !== 'null') {
            avatarImg.src = `/uploads/avatars/${avatarFileName}`;
        } else {
            avatarImg.src = '/uploads/avatars/default_avatar.png';
        }
    } catch (error) {
        console.error("Erro ao carregar avatar do utilizador:", error);
        avatarImg.src = '/uploads/avatars/default_avatar.png'; // Em caso de erro, mostra o default
    }
}