import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

const input = document.getElementById('pdfInput');
const button = document.getElementById('processBtn');
const status = document.getElementById('status');

// Ajuste fino do limite do rodapé
const FOOTER_THRESHOLD = 80;

button.addEventListener('click', async () => {
  if (!input.files.length) {
    alert('Selecione um PDF.');
    return;
  }

  try {
    status.textContent = 'Processando...';

    const file = input.files[0];
    const buffer = await file.arrayBuffer();
    const bufferForPdfJs = buffer.slice(0);

    const loadingTask = pdfjsLib.getDocument({ data: bufferForPdfJs });
    const pdf = await loadingTask.promise;

    const newPdf = await PDFDocument.create();
    const font = await newPdf.embedFont(StandardFonts.Helvetica);

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1 });

      const pageWidth = viewport.width;
      const pageHeight = viewport.height;

      const newPage = newPdf.addPage([pageWidth, pageHeight]);

      textContent.items.forEach((item) => {
        const x = item.transform[4];
        const y = item.transform[5];
        const fontSize = item.height;

        // 🔥 Ignora textos dentro da faixa de rodapé
        if (y < FOOTER_THRESHOLD) return;

        newPage.drawText(item.str, {
          x: x,
          y: y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      });
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
  } catch (err) {
    console.error(err);
    status.textContent = 'Erro ao processar PDF.';
    alert('Erro ao processar PDF. Veja F12.');
  }
});
