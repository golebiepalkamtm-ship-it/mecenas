import os

prompts_dir = r"e:\moj prawnik\prompts"
out_file = r"e:\moj prawnik\all_prompts.md"

with open(out_file, "w", encoding="utf-8") as f:
    for filename in os.listdir(prompts_dir):
        if filename.endswith(".txt"):
            f.write(f"# {filename}\n\n")
            filepath = os.path.join(prompts_dir, filename)
            with open(filepath, "r", encoding="utf-8") as pf:
                content = pf.read()
                f.write("```\n")
                f.write(content)
                f.write("\n```\n\n")
print("Done")
