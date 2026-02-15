import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';

// Configura worker corretamente no Vite
pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

const input = document.getElementById('pdfInput');
const button = document.getElementById('processBtn');
const status = document.getElementById('status');

button.addEventListener('click', async () => {
  if (!input.files.length) {
    alert('Selecione um PDF.');
    return;
  }

  try {
    status.textContent = 'Processando...';

    const file = input.files[0];
    const arrayBuffer = await file.arrayBuffer();

    // Carrega PDF com pdf.js
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    // Carrega PDF uma única vez com pdf-lib
    const srcDoc = await PDFDocument.load(arrayBuffer);
    const newPdf = await PDFDocument.create();

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const viewport = page.getViewport({ scale: 1 });
      const pageHeight = viewport.height;

      // Detecta o texto mais baixo (provável rodapé)
      let minY = pageHeight;

      textContent.items.forEach((item) => {
        const y = item.transform[5];
        if (y < minY) {
          minY = y;
        }
      });

      const footerThreshold = minY + 10;

      // Copia página original
      const [copiedPage] = await newPdf.copyPages(srcDoc, [i - 1]);

      const { width } = copiedPage.getSize();

      // Reduz altura removendo área do rodapé
      copiedPage.setSize(width, footerThreshold);

      newPdf.addPage(copiedPage);
    }

    const pdfBytes = await newPdf.save();

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'sem_rodape.pdf';
    a.click();

    URL.revokeObjectURL(url);

    status.textContent = 'Pronto!';
  } catch (error) {
    console.error(error);
    status.textContent = 'Erro ao processar PDF.';
    alert('Ocorreu um erro. Veja o console (F12).');
  }
});
