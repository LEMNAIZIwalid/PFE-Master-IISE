import os

sketch_dir = r"c:\Users\user\Desktop\display_touch-tft\sketch"

# 1. Fix Smooth_font.h
sf_h_path = os.path.join(sketch_dir, "Smooth_font.h")
with open(sf_h_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if 3 <= i <= 60: # lines 4 to 61 (0-indexed)
        if line.startswith("// "):
            new_lines.append(line[3:])
        elif line.startswith("//"):
            new_lines.append(line[2:])
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)

# Remove the user's manual fix at the end to prevent duplicate definition
final_lines = []
skip = False
for line in new_lines:
    if line.strip() == "#ifndef _SMOOTH_FONT_H_":
        skip = True
    if not skip:
        final_lines.append(line)
    if skip and line.strip() == "#endif":
        # we skip until the #endif of the user's block, wait no, there's only one #endif at the end.
        pass

# Wait, if we just keep lines 0 to 62 (which is 63 lines) and drop the rest.
final_lines = new_lines[:62]

with open(sf_h_path, "w", encoding="utf-8") as f:
    f.writelines(final_lines)

# 2. Add #define _TFT_eSPI_CPP_ to TFT_eSPI.cpp
tft_cpp_path = os.path.join(sketch_dir, "TFT_eSPI.cpp")
with open(tft_cpp_path, "r", encoding="utf-8") as f:
    tft_cpp_content = f.read()

if "#define _TFT_eSPI_CPP_" not in tft_cpp_content:
    with open(tft_cpp_path, "w", encoding="utf-8") as f:
        f.write("#define _TFT_eSPI_CPP_\n")
        f.write(tft_cpp_content)

# 3. Wrap the .cpp extensions in #ifdef _TFT_eSPI_CPP_
cpp_exts = ["Smooth_font.cpp", "Sprite.cpp", "Touch.cpp", "Button.cpp"]
for ext in cpp_exts:
    ext_path = os.path.join(sketch_dir, ext)
    if os.path.exists(ext_path):
        with open(ext_path, "r", encoding="utf-8") as f:
            ext_content = f.read()
        if "#ifdef _TFT_eSPI_CPP_" not in ext_content:
            with open(ext_path, "w", encoding="utf-8") as f:
                f.write("#ifdef _TFT_eSPI_CPP_\n\n")
                f.write(ext_content)
                f.write("\n\n#endif // _TFT_eSPI_CPP_\n")

# Same for .c files? Or they can compile standalone? 
# Usually .c files don't have C++ scope issues, but they might have multiple definition issues.
# Let's wrap them too, except Font files which are static const or PROGMEM.
c_exts = [
    "TFT_eSPI_ESP32.c", "TFT_eSPI_ESP32_C3.c", "TFT_eSPI_ESP32_S3.c", 
    "TFT_eSPI_ESP8266.c", "TFT_eSPI_Generic.c", "TFT_eSPI_RP2040.c", "TFT_eSPI_STM32.c"
]
for ext in c_exts:
    ext_path = os.path.join(sketch_dir, ext)
    if os.path.exists(ext_path):
        with open(ext_path, "r", encoding="utf-8") as f:
            ext_content = f.read()
        if "#ifdef _TFT_eSPI_CPP_" not in ext_content:
            with open(ext_path, "w", encoding="utf-8") as f:
                f.write("#ifdef _TFT_eSPI_CPP_\n\n")
                f.write(ext_content)
                f.write("\n\n#endif // _TFT_eSPI_CPP_\n")

print("Done fixing files.")
