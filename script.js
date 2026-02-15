import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as pdfjsLib from 'pdfjs-dist';
import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();

const input = document.getElementById('pdfInput');
const button = document.getElementById('processBtn');
const status = document.getElementById('status');

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

    // 🔥 REGISTRA FONTKIT
    newPdf.registerFontkit(fontkit);

    // 🔥 Carrega fonte Unicode real
    const fontBytes = await fetch('/NotoSans-Regular.ttf').then((res) =>
      res.arrayBuffer(),
    );

    const unicodeFont = await newPdf.embedFont(fontBytes);

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

        // 🔥 Remove rodapé estruturalmente
        if (y < FOOTER_THRESHOLD) return;

        try {
          newPage.drawText(item.str, {
            x,
            y,
            size: fontSize,
            font: unicodeFont,
            color: rgb(0, 0, 0),
          });
        } catch {
          // ignora caracteres impossíveis
        }
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
