# Pix2PDF — Studio-Grade JPG to PDF Converter

**Pix2PDF** is a client-side web application for converting JPG, PNG, WEBP, and BMP images into high-definition PDF documents. It runs completely in your web browser with zero server uploads, keeping your documents 100% private and secure.

---

## Key Features

- **🔒 100% Private & Client-Side**: All processing is done locally via JavaScript canvas and `jsPDF`. No files are ever sent to the cloud.
- **⚡ Zero Setup / Offline Capable**: Standalone bundle with local `jsPDF`. No Node.js, Python, or server required. Double-click `index.html` to run anywhere.
- **🖼️ Multi-Format Support**: Handles JPG, JPEG, PNG, WEBP, and BMP.
- **🔄 Visual Page Organizer**:
  - Drag-and-drop card reordering
  - Left / Right move buttons
  - 90° clockwise rotation per page or batch rotation
  - Alphabetical sorting & quick clear
- **⚙️ Flexible PDF Settings**:
  - **Page Sizes**: A4, US Letter, US Legal, or **Fit to Image Size** (borderless)
  - **Orientation**: Smart Auto-Detection (landscape/portrait based on image aspect ratio), Forced Portrait, or Forced Landscape
  - **Margins**: None (0mm), Small (5mm), Standard (12mm), Wide (20mm)
  - **Fit Modes**: Contain (centered, ratio preserved) or Cover (full-bleed)
  - **Compression & Quality**: High (92%), Original (100%), Balanced (80%), Compact (60%)
  - **Custom Filename**: Output naming with 1-click `+ Date` tag
- **👁️ Live PDF Preview**: View your generated document in an interactive viewer before downloading.
- **🎨 Glassmorphic Dark UI**: Modern dark theme with glowing accents, smooth transitions, and responsive layout.

---

## How to Use

1. **Open the App**:
   - Double-click `index.html` in this folder, or open it in any modern browser (Chrome, Microsoft Edge, Firefox, Brave, Safari).
2. **Add Images**:
   - Drag & drop your images into the upload area, or click **Browse Images**.
   - You can also click **Try Demo Images** in the top bar to test immediately with sample images.
3. **Customize Layout**:
   - Reorder images by dragging the cards or using the ◀ ▶ arrows.
   - Rotate any misoriented photos with the 🔄 button.
   - Adjust paper format, margins, and compression in the right sidebar.
4. **Generate & Download**:
   - Click **Live PDF Preview** to inspect the pages.
   - Click **Convert & Download PDF** to save your PDF instantly.
