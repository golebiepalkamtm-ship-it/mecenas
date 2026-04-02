import os

path = r'c:\Users\Marcin_Palka\moj prawnik\frontend\src\components\Chat\index.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the merged lines on line 464
merged_src = '</div>            <div className="flex-1 overflow-y-auto px-4 space-y-1 py-4 custom-scrollbar">'
merged_dst = '</div>\n            <div className="flex-1 overflow-y-auto px-4 space-y-1 py-4 custom-scrollbar">'
content = content.replace(merged_src, merged_dst)

# Add the RotateCcw button
old_button_pattern = """                <button 
                   onClick={() => setShowModels(false)}
                   className="p-2 text-slate-500 hover:text-white transition-all rounded-lg hover:bg-white/5"
                >
                   <X size={20} />
                </button>"""

new_button_pattern = """                <div className="flex items-center gap-2">
                   <button 
                      onClick={() => window.dispatchEvent(new CustomEvent('prawnik_models_updated'))}
                      className="p-2 text-slate-500 hover:text-gold-primary transition-all rounded-lg hover:bg-white/5 active:scale-95 transition-all"
                      title="Szybka Aktualizacja Modeli"
                   >
                      <RotateCcw size={16} />
                   </button>
                   <button 
                      onClick={() => setShowModels(false)}
                      className="p-2 text-slate-500 hover:text-white transition-all rounded-lg hover:bg-white/5"
                   >
                      <X size={20} />
                   </button>
                </div>"""

# Since exact string matching failed repeatedly, let's use a simpler replacement for the button part
# We look for Silnik Kongnitywny and replace up to the next </div>
import re
pattern = re.compile(r'(Silnik Kongnitywny\s*</h3>\s*)<button.*?onClick=\{\(\) => setShowModels\(false\)\}.*?</button>', re.DOTALL)
replacement = r'\1' + new_button_pattern

content = re.sub(pattern, replacement, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: File Chat/index.tsx fixed.")
