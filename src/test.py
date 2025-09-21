from huggingface_hub import HfApi

repo_id = "OmarHosny/Nover-Gears"
hf = HfApi()
info = hf.repo_info(repo_id, revision=None, token=None, timeout=None, files_metadata=True)

output_path = "files_list.txt"
with open(output_path, "w", encoding="utf-8") as f:
    for file_meta in info.siblings:
        path = file_meta.rfilename
        url = f"https://huggingface.co/{repo_id}/resolve/main/{path}?download=true"
        f.write(f"Name: {path}\n")
        f.write(f"Download URL: {url}\n")
        f.write("-----\n")

print(f"Written file metadata and download URLs to {output_path}")
