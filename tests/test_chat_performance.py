import json, time, requests
from datetime import datetime
API_BASE = 'http://127.0.0.1:8003'
CHAT_ENDPOINT = API_BASE + '/chat'
MOA_ENDPOINT = API_BASE + '/chat-consensus'

def test_simple():
    result = {'test': 'simple_chat'}
    try:
        payload = {'message': 'Cześć', 'history': [], 'model': 'qwen/qwen3.6-plus:free', 'use_rag': False}
        start = time.perf_counter()
        response = requests.post(CHAT_ENDPOINT, json=payload, timeout=60)
        result['latency_ms'] = int((time.perf_counter() - start) * 1000)
        result['success'] = response.status_code == 200
        print('Simple: ' + str(result['latency_ms']) + 'ms - ' + str(response.status_code))
    except Exception as e:
        result['error'] = str(e)
        result['success'] = False
    return result

def test_legal():
    result = {'test': 'legal_chat'}
    try:
        payload = {'message': 'Co to jest art. 61 KPA?', 'history': [], 'model': 'qwen/qwen3.6-plus:free', 'use_rag': True}
        start = time.perf_counter()
        response = requests.post(CHAT_ENDPOINT, json=payload, timeout=90)
        result['latency_ms'] = int((time.perf_counter() - start) * 1000)
        result['success'] = response.status_code == 200
        print('Legal: ' + str(result['latency_ms']) + 'ms - ' + str(response.status_code))
    except Exception as e:
        result['error'] = str(e)
        result['success'] = False
    return result

if __name__ == '__main__':
    print('Starting tests...')
    results = {'timestamp': datetime.now().isoformat(), 'tests': {}}
    results['tests']['simple'] = test_simple()
    results['tests']['legal'] = test_legal()
    print('Done!')

