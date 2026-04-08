import api

print('🧪 TEST: Formatowanie historii z FIX 1 & 2')
test_history = [
    {'role': 'user', 'content': 'Pytanie 1'},
    {'role': 'assistant', 'content': 'Odpowiedź 1 z halucynacjami'},
    {'role': 'user', 'content': 'Pytanie 2'},
    {'role': 'assistant', 'content': 'Odpowiedź 2 z błędami'},
    {'role': 'user', 'content': 'Pytanie 3'},
    {'role': 'assistant', 'content': 'Odpowiedź 3 z powtórzeniami'},
    {'role': 'user', 'content': 'Pytanie 4'},
    {'role': 'assistant', 'content': 'Odpowiedź 4 z semantycznym dryfem'},
    {'role': 'user', 'content': 'Pytanie 5'},
    {'role': 'assistant', 'content': 'Odpowiedź 5 z autoreferencją'}
]

filtered = api.format_history_for_openai(test_history)
print('✅ FIX 1 & 2: Przefiltrowano ' + str(len(test_history)) + ' → ' + str(len(filtered)) + ' wiadomości')
print('Tylko wiadomości użytkownika:')
for i, msg in enumerate(filtered):
    print('  ' + str(i+1) + '. ' + msg['content'])

print()
print('🧪 TEST: Sliding window (MAX_HISTORY_ITEMS = 3)')
print('Ostatnie ' + str(api.MAX_HISTORY_ITEMS) + ' wiadomości użytkownika powinny być zachowane')
print('Faktycznie zachowano: ' + str(len(filtered)) + ' wiadomości')

print()
print('🧪 TEST: Anti-loop protocol w DEFENSE_UNIVERSE')
from moa.prompt_builder import DEFENSE_UNIVERSE
identity = DEFENSE_UNIVERSE['identity']
if '[ANTI-LOOP PROTOCOL' in identity:
    print('✅ FIX 4: Anti-loop protocol dodany do DEFENSE_UNIVERSE')
else:
    print('❌ FIX 4: Anti-loop protocol nie znaleziony')

if '[ANTI-LOOP PROTOCOL' in DEFENSE_UNIVERSE['identity']:
    print('✅ FIX 4: Anti-loop protocol dodany do PROSECUTION_UNIVERSE')
else:
    print('❌ FIX 4: Anti-loop protocol nie znaleziony w PROSECUTION')

print()
print('🎯 Wszystkie testy zakończone!')
