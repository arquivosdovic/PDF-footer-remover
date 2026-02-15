import json
import base64
from io import BytesIO
import pikepdf

def handler(event, context):
    if event['httpMethod'] != 'POST':
        return {'statusCode': 405, 'body': 'Method Not Allowed'}

    try:
        is_base64 = event.get('isBase64Encoded', False)
        body = base64.b64decode(event['body']) if is_base64 else event['body'].encode('utf-8')

        # Recupera a altura do rodapé enviada pelo usuário (ou usa 60 como padrão)
        footer_height = int(event.get('headers', {}).get('x-footer-height', 60))

        with pikepdf.open(BytesIO(body)) as pdf:
            for page in pdf.pages:
                # 1. Limpeza de Anotações (links e ícones clicáveis no rodapé)
                if '/Annots' in page:
                    page.Annots = [a for a in page.Annots if a.get('/Rect') and a['/Rect'][1] > footer_height]

                # 2. Redefinição da área de conteúdo (CropBox/MediaBox interna)
                # O pikepdf permite ajustar a 'view' sem destruir o arquivo
                # Para remover o "copiar e colar", vamos "limpar" os objetos daquela área
                
                # Definimos a área útil (do topo até o início do rodapé)
                width = page.MediaBox[2]
                height = page.MediaBox[3]
                
                # Aplicamos um 'clip' de visualização que remove a interação com a borda
                page.MediaBox = [0, footer_height, width, height]
                page.CropBox = [0, footer_height, width, height]

            out_buffer = BytesIO()
            pdf.save(out_buffer)
            out_buffer.seek(0)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': 'attachment; filename="pdf_limpo.pdf"'
                },
                'body': base64.b64encode(out_buffer.read()).decode('utf-8'),
                'isBase64Encoded': True
            }

    except Exception as e:
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}