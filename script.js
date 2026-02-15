import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

const input = document.getElementById('pdfInput');
const button = document.getElementById('processBtn');
const status = document.getElementById('status');

// 🔥 margem de segurança acima do rodapé
const SAFE_PADDING = 10;

button.addEventListener('click', async () => {
  if (!input.files.length) {
    alert('Selecione um PDF.');
    return;
  }

  try {
    status.textContent = 'Processando...';

    const file = input.files[0];
    const originalBuffer = await file.arrayBuffer();

    const bufferForPdfJs = originalBuffer.slice(0);
    const bufferForPdfLib = originalBuffer.slice(0);

    // ===== Detecta posição do rodapé com pdf.js =====
    const loadingTask = pdfjsLib.getDocument({ data: bufferForPdfJs });
    const pdf = await loadingTask.promise;

    const srcDoc = await PDFDocument.load(bufferForPdfLib);
    const newPdf = await PDFDocument.create();

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
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

      const footerTop = minY + SAFE_PADDING;

      const [copiedPage] = await newPdf.copyPages(srcDoc, [i - 1]);
      const { width, height } = copiedPage.getSize();

      // 🔥 Desenha retângulo branco cobrindo o rodapé
      copiedPage.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: footerTop,
        color: rgb(1, 1, 1),
      });

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
    alert('Erro ao processar PDF. Veja F12.');
  }
});
