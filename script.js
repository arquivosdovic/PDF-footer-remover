import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';

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
    const originalBuffer = await file.arrayBuffer();

    // Clona para pdf.js
    const bufferForPdfJs = originalBuffer.slice(0);

    const loadingTask = pdfjsLib.getDocument({ data: bufferForPdfJs });
    const pdf = await loadingTask.promise;

    // 🔥 Carrega o documento original (sem recriar páginas)
    const pdfDoc = await PDFDocument.load(originalBuffer);

    const pages = pdfDoc.getPages();

    for (let i = 0; i < pdf.numPages; i++) {
      const page = await pdf.getPage(i + 1);
      const textContent = await page.getTextContent();

      const viewport = page.getViewport({ scale: 1 });
      const pageHeight = viewport.height;

      let minY = pageHeight;

      textContent.items.forEach((item) => {
        const y = item.transform[5];
        if (y < minY) {
          minY = y;
        }
      });

      // 🔥 Mantém margem inferior bonita
      const bottomMargin = 50;
      const footerHeight = minY + bottomMargin;

      const pdfLibPage = pages[i];
      const { width, height } = pdfLibPage.getSize();

      // 🔥 Apenas recorta — NÃO recria página
      pdfLibPage.setCropBox(0, footerHeight, width, height - footerHeight);
    }

    const pdfBytes = await pdfDoc.save();

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
    alert('Erro ao processar PDF. Veja F12.');
  }
});
