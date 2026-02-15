import json
import base64
from io import BytesIO
import pikepdf
from requests_toolbelt.multipart import decoder # Adicione isso no topo

def handler(event, context):
    if event['httpMethod'] != 'POST':
        return {'statusCode': 405, 'body': 'Method Not Allowed'}

    try:
        # Pega o corpo da requisição (tratando base64 do Netlify)
        body = event['body']
        if event.get('isBase64Encoded', False):
            body = base64.b64decode(body)
        else:
            body = body.encode('utf-8')

        # Extrai o arquivo do FormData usando o Content-Type
        content_type = event['headers'].get('content-type') or event['headers'].get('Content-Type')
        multipart_data = decoder.MultipartDecoder(body, content_type)
        
        # O PDF é o primeiro item do formulário
        pdf_content = multipart_data.parts[0].content
        footer_height = int(event['headers'].get('x-footer-height', 50))

        with pikepdf.open(BytesIO(pdf_content)) as pdf:
            for page in pdf.pages:
                width = page.MediaBox[2]
                height = page.MediaBox[3]
                
                # Aplica o corte técnico (MediaBox e CropBox)
                page.MediaBox = [0, footer_height, width, height]
                page.CropBox = [0, footer_height, width, height]

            out_buffer = BytesIO()
            pdf.save(out_buffer)
            out_buffer.seek(0)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': 'attachment; filename="limpo.pdf"'
                },
                'body': base64.b64encode(out_buffer.read()).decode('utf-8'),
                'isBase64Encoded': True
            }

    except Exception as e:
        return {'statusCode': 500, 'body': str(e)}