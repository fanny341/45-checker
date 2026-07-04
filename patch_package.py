"""Patch AndroidManifest.xml, classes.dex, and resources.arsc for new package name"""
import zipfile
import os
import shutil
import re

OLD_PKG = 'moorspangalila.gp45dbpro'
NEW_PKG = 'com.moritzu1'

def patch_utf16(data, old_str, new_str):
    """Replace UTF-16 encoded string, padding to match length"""
    old_utf16 = old_str.encode('utf-16-le')
    new_utf16 = new_str.encode('utf-16-le')
    
    # Also try with null terminator
    for haystack, needle, replacement in [
        (data, old_utf16, new_utf16),
        (data, old_utf16 + b'\x00\x00', new_utf16 + b'\x00\x00'),
    ]:
        idx = data.find(needle)
        if idx >= 0:
            # Pad replacement to match original length
            padded = replacement + b'\x00' * (len(needle) - len(replacement))
            data = data[:idx] + padded + data[idx+len(needle):]
            return data, True
    return data, False

def patch_apk(template_apk):
    """Patch the template APK in-place"""
    
    # Read all files from APK
    with zipfile.ZipFile(template_apk, 'r') as z:
        files = {}
        for name in z.namelist():
            files[name] = z.read(name)
    
    # Patch AndroidManifest.xml
    if 'AndroidManifest.xml' in files:
        data, ok = patch_utf16(files['AndroidManifest.xml'], OLD_PKG, NEW_PKG)
        if ok:
            files['AndroidManifest.xml'] = data
            print("  Patched AndroidManifest.xml")
        else:
            print("  WARNING: Could not patch AndroidManifest.xml")
    
    # Patch resources.arsc
    if 'resources.arsc' in files:
        data, ok = patch_utf16(files['resources.arsc'], OLD_PKG, NEW_PKG)
        if ok:
            files['resources.arsc'] = data
            print("  Patched resources.arsc")
        else:
            print("  WARNING: Could not patch resources.arsc")
    
    # Rebuild APK without signatures
    tmp_dir = '/tmp/apk_patch_rebuild'
    if os.path.exists(tmp_dir):
        shutil.rmtree(tmp_dir)
    os.makedirs(tmp_dir)
    
    # Extract and replace
    with zipfile.ZipFile(template_apk, 'r') as z:
        z.extractall(tmp_dir)
    
    for name, data in files.items():
        path = os.path.join(tmp_dir, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'wb') as f:
            f.write(data)
    
    # Remove signatures
    meta_inf = os.path.join(tmp_dir, 'META-INF')
    if os.path.exists(meta_inf):
        shutil.rmtree(meta_inf)
    
    # Also remove backup files
    for root, dirs, fnames in os.walk(tmp_dir):
        for fn in fnames:
            if fn.endswith('.bak') or fn.endswith('~'):
                os.remove(os.path.join(root, fn))
                print(f"  Removed backup: {fn}")
    
    # Repack - use ZIP_STORED for everything
    if os.path.exists(template_apk):
        os.remove(template_apk)
    
    with zipfile.ZipFile(template_apk, 'w', zipfile.ZIP_STORED) as zout:
        for root, dirs, fnames in os.walk(tmp_dir):
            for fn in sorted(fnames):  # sort for deterministic order
                file_path = os.path.join(root, fn)
                arcname = os.path.relpath(file_path, tmp_dir)
                zout.write(file_path, arcname)
    
    shutil.rmtree(tmp_dir)
    print(f"  Template updated: {template_apk}")
    return True

if __name__ == '__main__':
    import sys
    apk = sys.argv[1] if len(sys.argv) > 1 else '/root/Documents/projects/GP45/template/template.apk'
    patch_apk(apk)
    print("Done")
