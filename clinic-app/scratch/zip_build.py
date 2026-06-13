import zipfile
import os

def zipdir(path, ziph):
    # ziph is zipfile handle
    for root, dirs, files in os.walk(path):
        for file in files:
            ziph.write(os.path.join(root, file), 
                       os.path.relpath(os.path.join(root, file), 
                                       os.path.join(path, '..')))

zip_path = '/home/zyad/clinic-app/Clinic_Manager_V3_2_0_BLUE_Final.zip'
zipf = zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED)
zipf.comment = b"Evolve Clinic Enterprise Suite v3.2.0-BLUE - Pure Clinical Edition"
zipdir('/home/zyad/clinic-app/dist-electron/win-unpacked', zipf)
zipf.close()
print(f"Successfully created {zip_path}")
