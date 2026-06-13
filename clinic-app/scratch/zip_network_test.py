import zipfile
import os

def zipdir(path, ziph):
    # ziph is zipfile handle
    for root, dirs, files in os.walk(path):
        for file in files:
            file_path = os.path.join(root, file)
            # Create a relative path for the file in the zip archive
            arcname = os.path.relpath(file_path, os.path.join(path, '..'))
            ziph.write(file_path, arcname)

zip_path = '/home/zyad/clinic-app/Clinic_Manager_v3.5.0_Windows_Portable_NetworkTest.zip'
source_dir = '/home/zyad/clinic-app/dist-electron/win-unpacked'

if os.path.exists(source_dir):
    zipf = zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED)
    zipf.comment = b"Evolve Clinic Enterprise Suite v3.5.0 - Network Test Edition (192.168.1.29)"
    zipdir(source_dir, zipf)
    zipf.close()
    print(f"Successfully created {zip_path}")
else:
    print(f"Error: Source directory {source_dir} not found. Build might have failed.")
