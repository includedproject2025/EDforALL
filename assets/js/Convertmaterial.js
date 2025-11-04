//================MENU=========================
// Aplica o modo escuro se estiver guardado no localStorage
if (localStorage.getItem('modo-escuro') === 'ativado') {
    document.body.classList.add('dark-mode');
}

fetch("menu.html")
    .then(response => response.text())
    .then(data => {
        const menuContainer = document.getElementById("menu-container");
        if (menuContainer) {
            menuContainer.innerHTML = data;
            inicializarMenu(); // Chama a função global de menu.js
            atualizarExibicaoAvatarGlobal(); // Chama a função global de globalAvatarUpdater.js
            
            const menuSide = document.querySelector('.menu-lateral');
            const mainContainer = document.querySelector('.converter-container');
            if (menuSide && mainContainer) {
                if (menuSide.classList.contains('expandir')) {
                    mainContainer.style.marginLeft = '240px';
                } else {
                    mainContainer.style.marginLeft = '100px';
                }
            }
        }
    });

//================pdf=========================
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

if (typeof synonyms === 'undefined') {
    window.synonyms = {};
}
let verbosData = {};

async function loadVerbosCSV() {
    try {
        const response = await fetch('Verbos.csv');
        const text = await response.text();
        const lines = text.split('\n');
        for (let i = 3; i < lines.length; i++) {
            const line = lines[i];
            const columns = line.split(';');
            if (columns.length > 0) {
                const infinitivo = columns[0].trim();
                if (infinitivo) {
                    for (let j = 2; j < columns.length; j++) {
                        const formaConjugada = columns[j].trim();
                        if (formaConjugada) {
                            verbosData[formaConjugada.toLowerCase()] = infinitivo.toLowerCase();
                        }
                    }
                }
            }
        }
        console.log('CSV de verbos carregado.');
    } catch (error) {
        console.error('Erro ao carregar CSV de verbos:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadVerbosCSV(); 

    const fileInput = document.getElementById('fileInput');
    const convertButton = document.querySelector('.btn-converter');
    const contentContainer = document.getElementById('content-container');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = progressContainer.querySelector('.progress-bar');
    const progressText = document.getElementById('progress-text');
    const optionsContainer = document.getElementById('options-container');

    let originalSelectedFile = null; 

    const infinitiveCache = new Map();
    const normalizeCache = new Map();
    const verbCache = new Map();
    const irregularPlurals = new Map([
        ['mãos', 'mão'], ['pães', 'pão'], ['cães', 'cão'], ['cidadãos', 'cidadão'],
        ['cristãos', 'cristão'], ['alemães', 'alemão'], ['capitães', 'capitão']
    ]);

    function removeAccents(str) {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function capitalizeFirstLetter(string) {
        if (typeof string !== 'string' || !string) return string;
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function normalizeVerb(word) {
        if (!word || typeof word !== 'string') return word;
        const wordLower = word.toLowerCase();
        if (verbCache.has(wordLower)) return verbCache.get(wordLower);
        
        let result = wordLower;
        const wordCleaned = wordLower.replace(/-(l[oa]s?|n[oa]s?|me|te|se|nos|vos)$/, '');

        if (verbosData[wordCleaned]) {
            result = verbosData[wordCleaned];
        } else if (verbosData[wordLower]) {
            result = verbosData[wordLower];
        }
        
        const finalResult = /^[A-Z]/.test(word) ? capitalizeFirstLetter(result) : result;
        verbCache.set(wordLower, finalResult);
        return finalResult;
    }

    function normalizeToSingular(word) {
        if (!word || typeof word !== 'string') return word;
        const wordLower = word.toLowerCase();
        if (irregularPlurals.has(wordLower)) return irregularPlurals.get(wordLower);
        if (wordLower.endsWith('s')) return wordLower.slice(0, -1);
        return word;
    }

    function normalizeWord(word) {
        if (typeof word !== 'string' || !word.trim()) return { original: '', clean: '' };
        const cacheKey = word.toLowerCase().trim();
        if (normalizeCache.has(cacheKey)) return normalizeCache.get(cacheKey);

        const lowerWord = word.toLowerCase().trim();
        const wordWithoutPunctuation = lowerWord.replace(/[.,!?;:]+$/, '');
        let normalizedWord = '';

        const potentialVerbInfinitive = normalizeVerb(wordWithoutPunctuation);
        if (potentialVerbInfinitive.toLowerCase() !== wordWithoutPunctuation.toLowerCase()) {
             normalizedWord = potentialVerbInfinitive;
        } else {
            normalizedWord = normalizeToSingular(wordWithoutPunctuation);
        }
        
        const cleanNormalized = removeAccents(normalizedWord);
        const result = { original: normalizedWord, clean: cleanNormalized };
        normalizeCache.set(cacheKey, result);
        return result;
    }
    
    function findInfinitive(word) {
        if (!word || typeof word !== 'string') return word;
        const wordLower = word.toLowerCase();
        if (infinitiveCache.has(wordLower)) return infinitiveCache.get(wordLower);
        const result = normalizeVerb(word); 
        infinitiveCache.set(wordLower, result);
        return result;
    }

    const TextUtils = {
        splitIntoWords(text) {
            if (typeof text !== 'string') return [];
            const cleanText = text.replace(/[^\p{L}\p{N}\s.,!?'‘'""„‟«»‹›‚‛\u002D\u058A\u2010-\u2015\u2212\uFE58\uFE63\uFF0D-]/gu, '');
            const words = cleanText.split(/\s+/).filter(word => word.length > 0);
            return words;
        },
        isPunctuation(word) { return /^[.,!?;:]+$/.test(word); },
        cleanFileName(word) {
            const infinitive = findInfinitive(word);
            return infinitive.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[.,!?:]+$/, "");
        },
    };

    const ImageFinder = {
        cache: new Map(),
        async checkImageExists(path) { 
            return new Promise(resolve => {
                const timeoutId = setTimeout(() => resolve(false), 300);
                const img = new Image();
                img.onload = () => { clearTimeout(timeoutId); resolve(true); };
                img.onerror = () => { clearTimeout(timeoutId); resolve(false); };
                img.src = path;
            });
        },
        async findImage(phrase) {  
            if (TextUtils.isPunctuation(phrase)) return null;
            if (this.cache.has(phrase)) return this.cache.get(phrase);
            
            const wordWithoutPunctuation = phrase.replace(/[.,!?;:]+$/, '');
            if (TextUtils.isPunctuation(wordWithoutPunctuation) || !wordWithoutPunctuation.trim() || wordWithoutPunctuation.split(/\s+/).length > 3) {
                this.cache.set(phrase, null); return null;
            }
            
            const normalized = normalizeWord(wordWithoutPunctuation);
            const extensions = ['.png', '.jpg', '.jpeg', '.svg'];
            const firstLetterOrig = wordWithoutPunctuation.charAt(0).toUpperCase();
            const firstLetterNorm = normalized.original.charAt(0).toUpperCase();

            const variations = [...new Set([
                wordWithoutPunctuation.toLowerCase(),
                normalized.original.toLowerCase(),
                normalized.clean.toLowerCase(),
                TextUtils.cleanFileName(wordWithoutPunctuation),
            ].filter(Boolean))];

            for (const variation of variations) {
                for (const letter of new Set([firstLetterOrig, firstLetterNorm])) { 
                    for (const ext of extensions) {
                        const path = `spcs/${letter}/${variation}${ext}`; 
                        if (await this.checkImageExists(path)) {
                            this.cache.set(phrase, path); return path;
                        }
                    }
                }
            }
            this.cache.set(phrase, null); return null;
        }
    };

    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            originalSelectedFile = e.target.files[0]; 
            if (originalSelectedFile.type !== 'application/pdf') {
                alert('Por favor, selecione um arquivo PDF.');
                fileInput.value = '';
                originalSelectedFile = null;
                convertButton.disabled = true;
                convertButton.textContent = 'Selecione um PDF';
                return;
            }
            convertButton.textContent = 'Converter PDF';
            convertButton.disabled = false;
            document.querySelector('.area-upload .upload-text').textContent = originalSelectedFile.name;

        } else {
            originalSelectedFile = null;
            convertButton.disabled = true;
            convertButton.textContent = 'Selecione um PDF';
            document.querySelector('.area-upload .upload-text').textContent = 'Carregar Ficheiro PDF';
        }
    });

    convertButton.addEventListener('click', async function () {
        if (!originalSelectedFile) {
            alert('Por favor, selecione um ficheiro PDF primeiro.');
            return;
        }
        convertButton.disabled = true;
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = 'A processar PDF original...';
        console.log("[ConvertButton] Starting PDF processing.");

        try {
            const pagesHtmlArray = await processPDF(originalSelectedFile); 
            console.log("[ConvertButton] Pages HTML from processPDF:", JSON.stringify(pagesHtmlArray)); 
            progressBar.style.width = '50%';
            progressText.textContent = 'A renderizar conteúdo SPC...';
            await renderContent(pagesHtmlArray); 
            progressBar.style.width = '100%';
            progressText.textContent = 'Conversão visual concluída. Pode guardar ou descarregar.';
            optionsContainer.style.display = 'flex'; 
            console.log("[ConvertButton] Visual conversion complete. Options displayed.");
        } catch (error) { // Corrected: Removed the 'M'
            console.error('Erro ao processar o PDF:', error);
            alert('Ocorreu um erro ao processar o PDF: ' + error.message);
            progressText.textContent = 'Erro na conversão.';
            console.log("[ConvertButton] Error during PDF processing:", error);
        } 
    });
    
    document.getElementById('btn-private').addEventListener('click', function() {
        saveConvertedMaterialToServer(); 
    });

    document.getElementById('btn-download-final').addEventListener('click', function() {
        generateAndDownloadClientSidePDF();
    });
    
    async function processPDF(file) {
        console.log("[processPDF] Started for file:", file.name);
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
        console.log(`[processPDF] PDF loaded with ${pdfDoc.numPages} pages`); 
        let allPagesHtml = []; 

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            console.log(`[processPDF] Processing page ${pageNum}`); 
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });
            const pageHeight = viewport.height;
            const textContent = await page.getTextContent();

            let mainContentItems = [];
            let headerItems = [];
            let footerItems = [];

            const headerMarginBottom = pageHeight * 0.12; 
            const footerMarginTop = pageHeight * 0.88;    


            for (const item of textContent.items) {
                const y = item.transform[5]; 

                if (y > footerMarginTop) { 
                    headerItems.push(item);
                } else if (y < headerMarginBottom) { 
                    footerItems.push(item);
                } else {
                    mainContentItems.push(item);
                }
            }


            const buildTextFromItems = (items) => {
                if (!items.length) return "";
                const linesMap = new Map();
                items.forEach(item => {
                    const yKey = Math.round(item.transform[5] / 7) * 7; 
                    if (!linesMap.has(yKey)) linesMap.set(yKey, []);
                    linesMap.get(yKey).push(item);
                });

                const sortedYKeys = [...linesMap.keys()].sort((a, b) => b - a); 
                let textBlock = "";
                sortedYKeys.forEach(yKey => {
                    const lineItems = linesMap.get(yKey).sort((a,b) => a.transform[4] - b.transform[4]); 
                    const lineText = lineItems.map(it => it.str).join(' ').trim();
                    if (lineText) {
                        textBlock += lineText + "\n"; 
                    }
                });
                return textBlock.trim();
            };

            const headerText = buildTextFromItems(headerItems);
            const mainText = buildTextFromItems(mainContentItems);
            const footerText = buildTextFromItems(footerItems);

            let pageHtml = "";
            if (headerText) pageHtml += `<header>${headerText.replace(/\n/g, '<br>')}</header>`;
            if (mainText) pageHtml += `<p>${mainText.replace(/\n/g, '<br>')}</p>`;
            if (footerText) pageHtml += `<footer>${footerText.replace(/\n/g, '<br>')}</footer>`;
            
            if (pageHtml.trim()) {
                allPagesHtml.push(pageHtml);
            } else if (textContent.items.length > 0) {
                allPagesHtml.push("<p class='empty-page-placeholder'><!-- Page content was present but no text extracted or all filtered --></p>");
            } else {
                allPagesHtml.push("<p class='empty-page-placeholder'><!-- Empty Page --></p>");
            }
        }
        console.log("[processPDF] Finished. allPagesHtml to be returned:", JSON.stringify(allPagesHtml));
        return allPagesHtml;
    }

    async function createWordElement(word) { 
        const container = document.createElement('div');
        container.className = 'word-container';
        container.dataset.word = word;
        
        const hasPunctuation = /[.,!?;:]$/.exec(word); 
        const punctuationSuffix = hasPunctuation ? hasPunctuation[0] : '';
        const cleanWord = punctuationSuffix ? word.slice(0, -punctuationSuffix.length) : word;

        if (TextUtils.isPunctuation(word) || !cleanWord.trim()) { 
            container.classList.add('punctuation');
            container.textContent = word;
            return container;
        }
        
        const imagePath = await ImageFinder.findImage(cleanWord);
        
        if (imagePath) {
            const img = document.createElement('img');
            img.src = imagePath;
            img.alt = cleanWord;
            img.className = 'word-image';
            container.appendChild(img);
            
            const label = document.createElement('span');
            label.className = 'word-text';
            label.textContent = cleanWord + punctuationSuffix;
            container.appendChild(label);
        } else {
            container.textContent = word; 
            container.classList.add('no-image');
        }
        return container;
    }

    async function renderContent(pagesHtmlArray) {
        contentContainer.innerHTML = ''; 
        console.log("[renderContent] Starting. Number of pages from processPDF:", pagesHtmlArray.length);
        if (pagesHtmlArray.length === 0) {
            console.warn("[renderContent] No pages to render.");
            contentContainer.innerHTML = "<p>Nenhum conteúdo foi extraído do PDF para renderização.</p>";
            return;
        }

        for (let i = 0; i < pagesHtmlArray.length; i++) {
            const pageHtml = pagesHtmlArray[i]; 

            const pageWrapperDiv = document.createElement('div'); 
            pageWrapperDiv.className = 'spc-document-page';
            pageWrapperDiv.innerHTML = pageHtml; 

            const elementsToConvert = pageWrapperDiv.querySelectorAll('header, p, footer');

            for (const element of elementsToConvert) { 
                const elementText = element.textContent || '';

                if (!elementText.trim()) {
                    continue; 
                }

                const words = TextUtils.splitIntoWords(elementText);

                if (words.length === 0) {
                    const plainTextDiv = document.createElement('div');
                    plainTextDiv.className = 'linha no-spc-translation';
                    plainTextDiv.textContent = elementText; 
                    element.innerHTML = ''; 
                    element.appendChild(plainTextDiv); 
                    continue;
                }

                const spcBlockForElement = document.createElement('div');
                spcBlockForElement.className = 'linha spc-converted-block'; 

                for (let j = 0; j < words.length; j++) {
                    let word = words[j];
                    const wordElement = await createWordElement(word);
                    spcBlockForElement.appendChild(wordElement);
                    if (j < words.length - 1) { 
                        const space = document.createElement('span');
                        space.className = 'word-space';
                        space.textContent = ' '; 
                        spcBlockForElement.appendChild(space);
                    }
                }
                element.innerHTML = ''; 
                element.appendChild(spcBlockForElement); 
            }
            contentContainer.appendChild(pageWrapperDiv); 
        }
        
        if (!document.getElementById('spc-render-styles')) {
            const style = document.createElement('style');
            style.id = 'spc-render-styles';
            style.textContent = `
                .spc-document-page { border: 1px solid #eee; margin-bottom: 20px; padding: 15px; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                .spc-document-page header { font-weight: bold; border-bottom: 1px solid #ccc; margin-bottom: 10px; padding-bottom: 8px; }
                .spc-document-page p { margin-bottom:10px; }
                .spc-document-page footer { font-size: 0.8em; color: #666; border-top: 1px solid #ccc; margin-top: 10px; padding-top: 8px; }
                .linha { display: flex; flex-wrap: wrap; align-items: flex-end; line-height: 1.6; }
                .spc-converted-block { /* Specific styling for blocks of SPC, if needed */ }
                .word-container { display: inline-flex; flex-direction: column; align-items: center; margin: 0 2px 8px; vertical-align: bottom; text-align: center; }
                .word-image { max-height: 45px; margin-bottom: 3px; }
                .word-text { font-size: 0.78em; word-break: break-word; line-height: 1.2; }
                .punctuation { display: inline-block; margin: 0 2px 8px; vertical-align: bottom; }
                .word-space { display: inline-block; width: 0.4em; }
                .no-spc-translation { color: #555; font-style: italic; padding: 5px 0; line-height:1.4; }
                .empty-page-placeholder { color: #aaa; text-align: center; font-style: italic; padding: 20px;}
            `; 
            document.head.appendChild(style);
        }
        console.log("[renderContent] Finished. Final contentContainer.innerHTML (first 500 chars):", contentContainer.innerHTML.substring(0, 500) + "...");
        contentContainer.scrollTop = 0;
    }

    async function generateAndDownloadClientSidePDF() {
        const element = document.getElementById('content-container');
        console.log("[DownloadPDF] Attempting download. Content container has children:", element.children.length > 0); 
        
        if (!element || element.children.length === 0 || !element.innerHTML.trim()) {
            alert('Não há conteúdo para gerar PDF. O contêiner de visualização está vazio.');
            console.warn("[DownloadPDF] Content container is empty or only whitespace.");
            return;
        }
        const downloadButton = document.getElementById('btn-download-final');
        const originalButtonText = downloadButton.innerHTML;
        downloadButton.disabled = true;
        downloadButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Gerando...';

        try {
            const opt = {
                margin: [15, 12, 15, 12], filename: 'convertido_spc.pdf',
                image: { type: 'jpeg', quality: 0.92 }, 
                html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0, windowWidth: element.scrollWidth, windowHeight: element.scrollHeight },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'], before: '.spc-document-page' } 
            };
            console.log("[DownloadPDF] html2pdf options:", opt);
            await html2pdf().set(opt).from(element).save();
            downloadButton.innerHTML = '<i class="bi bi-check-circle"></i> Download Concluído!';
            console.log("[DownloadPDF] PDF generation and save successful.");
        } catch (error) {
            console.error('Erro ao gerar PDF para download:', error);
            alert('Erro ao gerar PDF: ' + error.message);
            downloadButton.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Erro!';
        } finally {
            setTimeout(() => {
                downloadButton.disabled = false;
                downloadButton.innerHTML = originalButtonText;
            }, 3000);
        }
    }

    async function saveConvertedMaterialToServer() {
        // A verificação do ficheiro original ainda é útil para sabermos o nome
        if (!originalSelectedFile) {
            alert("Nenhum ficheiro original foi selecionado para conversão.");
            return;
        }
        const contentElement = document.getElementById('content-container');
        if (!contentElement || !contentElement.innerHTML.trim()) {
            alert('Não há conteúdo convertido para salvar.');
            return;
        }
        const criadorUser = localStorage.getItem('userIdentifier');
        if (!criadorUser) {
            alert("Utilizador não identificado. Faça login.");
            return;
        }

        const saveButton = document.getElementById('btn-private');
        const originalButtonText = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = '<i class="bi bi-hourglass-split"></i> A Guardar...';

        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = 'A preparar ficheiro convertido...';

        try {
            // 1. Gerar o Blob do PDF convertido
            const opt = {
                margin: [15, 12, 15, 12],
                image: { type: 'jpeg', quality: 0.92 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0, windowWidth: contentElement.scrollWidth, windowHeight: contentElement.scrollHeight },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'], before: '.spc-document-page' }
            };
            const convertedPdfBlob = await html2pdf().set(opt).from(contentElement).output('blob');
            
            progressBar.style.width = '33%';
            progressText.textContent = 'Ficheiro convertido gerado. A enviar para o servidor...';

            if (!convertedPdfBlob || convertedPdfBlob.size === 0) {
                throw new Error('Falha ao gerar o PDF convertido (blob vazio).');
            }

            // 2. Criar o FormData APENAS com o ficheiro convertido
            const formData = new FormData();
            const nomeFicheiroConvertido = `Convertido - ${originalSelectedFile.name}`;
            
            
            formData.append('materialFile', convertedPdfBlob, nomeFicheiroConvertido); 
            formData.append('criadorUser', criadorUser);
            formData.append('titulo', nomeFicheiroConvertido); 
            formData.append('tipo', '1'); 

            
            console.log("[SaveToServer] FormData preparado. Enviando para o endpoint de upload único...");
            const response = await fetch('http://localhost:3000/materiais/upload', {
                method: 'POST',
                body: formData
            });
            
            progressBar.style.width = '66%';
            progressText.textContent = 'Processamento no servidor...';

            const result = await response.json();
            console.log("[SaveToServer] Resposta do servidor:", result);

            if (response.ok) {
                progressBar.style.width = '100%';
                progressText.textContent = 'Guardado com sucesso!';
                alert(result.message || 'Material guardado com sucesso no servidor!');
                saveButton.innerHTML = '<i class="bi bi-check-circle"></i> Guardado!';
                setTimeout(() => {
                    window.location.href = 'pageInit.html';
                }, 1500);
            } else {
                throw new Error(result.message || `Erro do servidor: ${response.status}`);
            }

        } catch (error) {
            console.error('Erro ao salvar material convertido no servidor:', error);
            alert('Falha ao salvar material: ' + error.message);
            saveButton.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Falha ao Guardar';
            progressBar.style.width = '100%';
            progressText.textContent = 'Erro ao guardar no servidor.';
        } finally {
            if (!saveButton.innerHTML.includes('Guardado!')) {
                setTimeout(() => {
                    saveButton.disabled = false;
                    saveButton.innerHTML = originalButtonText;
                }, 3000);
            }
        }
    }
});

// Nova função para carregar o avatar do utilizador (copiada de pageInit.js)
function carregarAvatarUtilizador() {
    const avatarImg = document.getElementById('user-avatar');
    if (avatarImg) {
        const userAvatarPath = localStorage.getItem('userAvatarPath');
        if (userAvatarPath && userAvatarPath !== 'null') {
            avatarImg.src = userAvatarPath;
        } else {
            // Define o avatar padrão se não houver um avatar guardado
            avatarImg.src = '/uploads/avatars/default_avatar.png';
        }
    }
}