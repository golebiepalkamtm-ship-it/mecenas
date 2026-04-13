import os
old = "local_storage/knowledge_base/Kodeks roddzinny i opiekunczy.pdf"
new = "local_storage/knowledge_base/Kodeks rodzinny i opiekunczy.pdf"
if os.path.exists(old):
    os.rename(old, new)
    print("Renamed successfully!")
else:
    print("Old file not found.")
