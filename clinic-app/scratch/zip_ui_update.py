import os
import zipfile

def zip_directory(dir_path, zip_path):
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(dir_path):
            for file in files:
                file_path = os.path.join(root, file)
                # Create relative path for the zip file
                rel_path = os.path.relpath(file_path, dir_path)
                zipf.write(file_path, rel_path)

if __name__ == "__main__":
    source_dir = "dist-electron/win-unpacked"
    output_zip = "EVOLVE_Suite_v3.5.0_UI_Update_Windows.zip"
    if os.path.exists(source_dir):
        print(f"Zipping {source_dir} to {output_zip}...")
        zip_directory(source_dir, output_zip)
        print("Done!")
    else:
        print(f"Error: {source_dir} not found.")
