import os
import sys
import uvicorn
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'core'))

from core.api_server import app

@app.get('/')
def root():
    return {'service': 'Wanderix AI Engine', 'version': '1.0.0', 'status': 'running'}

if __name__ == '__main__':
    port = 5009
    host = '0.0.0.0'
    print(f'Wanderix AI Engine running on http://{host}:{port}')
    print(f'API Docs: http://{host}:{port}/docs')
    uvicorn.run('main:app', host=host, port=port, reload=True, log_level='info')
