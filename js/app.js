/**
 * Pix2PDF — Modern JPG to PDF Converter
 * High-performance, client-side, 100% private.
 */

(function () {
  'use strict';

  // --- App State ---
  const state = {
    images: [], // Array of { id, file, name, size, width, height, rotation, dataUrl }
    settings: {
      pageSize: 'a4',
      orientation: 'auto',
      margin: 'none',
      fitMode: 'contain',
      quality: 'high',
      filename: 'converted_document'
    },
    draggedItemIndex: null,
    currentPdfBlobUrl: null,
    isGenerating: false
  };

  // --- Standard Dimensions (mm) ---
  const PAGE_FORMATS = {
    a4: { width: 210, height: 297 },
    letter: { width: 215.9, height: 279.4 },
    legal: { width: 215.9, height: 355.6 }
  };

  const MARGINS_MM = {
    none: 0,
    small: 5,
    standard: 12,
    large: 20
  };

  const QUALITY_VALUES = {
    original: 0.98,
    high: 0.92,
    medium: 0.80,
    low: 0.60
  };

  // --- DOM Elements ---
  const elements = {
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    btnBrowse: document.getElementById('btn-browse'),
    btnLoadSample: document.getElementById('btn-load-sample'),
    gallerySection: document.getElementById('gallery-section'),
    emptyFeatures: document.getElementById('empty-features'),
    imageGrid: document.getElementById('image-grid'),
    pageCountBadge: document.getElementById('page-count-badge'),
    btnAddMore: document.getElementById('btn-add-more'),
    btnRotateAll: document.getElementById('btn-rotate-all'),
    btnSortName: document.getElementById('btn-sort-name'),
    btnClearAll: document.getElementById('btn-clear-all'),

    // Sidebar settings
    settingPageSize: document.getElementById('setting-page-size'),
    orientationBtns: document.querySelectorAll('.segmented-control[aria-label="Page Orientation"] .segment-btn'),
    marginBtns: document.querySelectorAll('.segmented-control[aria-label="Page Margins"] .segment-btn'),
    settingFitMode: document.getElementById('setting-fit-mode'),
    settingQuality: document.getElementById('setting-quality'),
    qualityLabel: document.getElementById('quality-label'),
    outputFilename: document.getElementById('output-filename'),
    btnAddDate: document.getElementById('btn-add-date'),

    summaryCount: document.getElementById('summary-count'),
    summarySize: document.getElementById('summary-size'),

    progressContainer: document.getElementById('progress-container'),
    progressFill: document.getElementById('progress-fill'),
    progressStatus: document.getElementById('progress-status'),

    btnConvertDownload: document.getElementById('btn-convert-download'),
    btnPreviewPdf: document.getElementById('btn-preview-pdf'),

    // Preview Modal
    previewModal: document.getElementById('preview-modal'),
    modalBtnClose: document.getElementById('modal-btn-close'),
    modalBtnDownload: document.getElementById('modal-btn-download'),
    previewIframe: document.getElementById('preview-iframe'),
    previewMeta: document.getElementById('preview-meta'),

    // Toasts
    toastContainer: document.getElementById('toast-container')
  };

  // --- Initialization ---
  function init() {
    setupEventListeners();
    updateUIState();
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Dropzone & File browse
    elements.btnBrowse.addEventListener('click', (e) => {
      e.stopPropagation();
      elements.fileInput.click();
    });

    elements.dropzone.addEventListener('click', () => {
      elements.fileInput.click();
    });

    elements.fileInput.addEventListener('change', handleFileInput);

    // Drag and drop onto main dropzone
    elements.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.dropzone.classList.add('dragover');
    });

    elements.dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      elements.dropzone.classList.remove('dragover');
    });

    elements.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      elements.dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(Array.from(e.dataTransfer.files));
      }
    });

    // Prevent default drag over document to avoid accidental browser opens
    window.addEventListener('dragover', (e) => e.preventDefault(), false);
    window.addEventListener('drop', (e) => e.preventDefault(), false);

    // Add more button
    elements.btnAddMore.addEventListener('click', () => {
      elements.fileInput.click();
    });

    // Demo images
    elements.btnLoadSample.addEventListener('click', loadDemoImages);

    // Gallery Toolbar Actions
    elements.btnRotateAll.addEventListener('click', rotateAllImages);
    elements.btnSortName.addEventListener('click', sortImagesAlphabetically);
    elements.btnClearAll.addEventListener('click', clearAllImages);

    // Setting: Page size
    elements.settingPageSize.addEventListener('change', (e) => {
      state.settings.pageSize = e.target.value;
      updateFitContainerVisibility();
      showToast(`Page format set to ${e.target.options[e.target.selectedIndex].text.split('(')[0].trim()}`, 'info');
    });

    // Setting: Orientation pills
    elements.orientationBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        elements.orientationBtns.forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        state.settings.orientation = btn.dataset.orientation;
      });
    });

    // Setting: Margins pills
    elements.marginBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        elements.marginBtns.forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        state.settings.margin = btn.dataset.margin;
      });
    });

    // Setting: Fit mode
    elements.settingFitMode.addEventListener('change', (e) => {
      state.settings.fitMode = e.target.value;
    });

    // Setting: Quality
    elements.settingQuality.addEventListener('change', (e) => {
      state.settings.quality = e.target.value;
      const labels = {
        original: 'Original (100%)',
        high: 'High (92%)',
        medium: 'Balanced (80%)',
        low: 'Compact (60%)'
      };
      elements.qualityLabel.textContent = labels[state.settings.quality] || 'Standard';
      updateSummary();
    });

    // Output filename
    elements.outputFilename.addEventListener('input', (e) => {
      const sanitized = e.target.value.replace(/[/\\?%*:|"<>]/g, '').trim();
      state.settings.filename = sanitized || 'converted_document';
    });

    elements.btnAddDate.addEventListener('click', () => {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const base = elements.outputFilename.value.replace(/_\d{4}-\d{2}-\d{2}$/, '');
      elements.outputFilename.value = `${base}_${dateStr}`;
      state.settings.filename = elements.outputFilename.value;
      showToast('Date appended to filename', 'info');
    });

    // Primary Actions
    elements.btnConvertDownload.addEventListener('click', () => generatePdf(true));
    elements.btnPreviewPdf.addEventListener('click', () => generatePdf(false));

    // Modal
    elements.modalBtnClose.addEventListener('click', closePreviewModal);
    elements.previewModal.querySelector('.modal-backdrop').addEventListener('click', closePreviewModal);
    elements.modalBtnDownload.addEventListener('click', downloadCurrentPdf);

    // Escape key to close modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !elements.previewModal.classList.contains('hidden')) {
        closePreviewModal();
      }
    });
  }

  function updateFitContainerVisibility() {
    const fitContainer = document.getElementById('fit-container');
    if (state.settings.pageSize === 'fit') {
      fitContainer.style.opacity = '0.5';
      fitContainer.style.pointerEvents = 'none';
    } else {
      fitContainer.style.opacity = '1';
      fitContainer.style.pointerEvents = 'auto';
    }
  }

  // --- File Handling ---
  function handleFileInput(e) {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
      e.target.value = ''; // Reset input to allow re-selecting same files
    }
  }

  function processFiles(files) {
    const validFiles = files.filter((file) => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];
      return validTypes.includes(file.type) || /\.(jpe?g|png|webp|bmp)$/i.test(file.name);
    });

    if (validFiles.length === 0) {
      showToast('Please select valid JPG, PNG, WEBP, or BMP images.', 'error');
      return;
    }

    let loadedCount = 0;
    const totalToLoad = validFiles.length;

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        const img = new Image();
        img.onload = () => {
          const item = {
            id: 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
            file: file,
            name: file.name,
            size: file.size,
            width: img.naturalWidth,
            height: img.naturalHeight,
            rotation: 0,
            dataUrl: dataUrl
          };
          state.images.push(item);
          loadedCount++;

          if (loadedCount === totalToLoad) {
            renderGallery();
            updateUIState();
            showToast(`Added ${loadedCount} image${loadedCount > 1 ? 's' : ''} to queue.`, 'success');
          }
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === totalToLoad) {
            renderGallery();
            updateUIState();
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  // --- Demo Images Loader ---
  async function loadDemoImages() {
    try {
      showToast('Loading sample images...', 'info');

      if (window.DEMO_IMAGES && window.DEMO_IMAGES.length > 0) {
        let loaded = 0;
        window.DEMO_IMAGES.forEach((sample) => {
          const img = new Image();
          img.onload = () => {
            const item = {
              id: 'img_demo_' + Math.random().toString(36).substring(2, 8),
              file: null,
              name: sample.name,
              size: Math.round(sample.dataUrl.length * 0.75),
              width: img.naturalWidth,
              height: img.naturalHeight,
              rotation: 0,
              dataUrl: sample.dataUrl
            };
            state.images.push(item);
            loaded++;
            if (loaded === window.DEMO_IMAGES.length) {
              renderGallery();
              updateUIState();
              showToast(`Loaded ${loaded} demo images. Ready to convert!`, 'success');
            }
          };
          img.src = sample.dataUrl;
        });
        return;
      }

      // Fallback to fetch if DEMO_IMAGES not present
      const samples = [
        { path: 'assets/sample1.jpg', name: 'sample1_landscape.jpg' },
        { path: 'assets/sample2.jpg', name: 'sample2_portrait.jpg' }
      ];

      for (const sample of samples) {
        const response = await fetch(sample.path);
        const blob = await response.blob();
        const file = new File([blob], sample.name, { type: 'image/jpeg' });
        processFiles([file]);
      }
    } catch (err) {
      console.error('Failed to load demo images:', err);
      showToast('Could not load sample images.', 'error');
    }
  }

  // --- UI State & Summary ---
  function updateUIState() {
    const hasImages = state.images.length > 0;

    if (hasImages) {
      elements.gallerySection.classList.remove('hidden');
      elements.emptyFeatures.classList.add('hidden');
      elements.btnConvertDownload.removeAttribute('disabled');
      elements.btnPreviewPdf.removeAttribute('disabled');
    } else {
      elements.gallerySection.classList.add('hidden');
      elements.emptyFeatures.classList.remove('hidden');
      elements.btnConvertDownload.setAttribute('disabled', 'true');
      elements.btnPreviewPdf.setAttribute('disabled', 'true');
    }

    elements.pageCountBadge.textContent = state.images.length;
    updateSummary();
  }

  function updateSummary() {
    const count = state.images.length;
    elements.summaryCount.textContent = `${count} page${count === 1 ? '' : 's'}`;

    if (count === 0) {
      elements.summarySize.textContent = '0 KB';
      return;
    }

    const totalRawSize = state.images.reduce((acc, curr) => acc + curr.size, 0);
    const qMult = QUALITY_VALUES[state.settings.quality] || 0.9;
    const estimatedSize = Math.round(totalRawSize * qMult);
    elements.summarySize.textContent = formatBytes(estimatedSize);
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // --- Gallery Rendering ---
  function renderGallery() {
    elements.imageGrid.innerHTML = '';

    state.images.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'image-card';
      card.dataset.index = index;
      card.draggable = true;

      // Effective rotated dimensions
      const isRotated90 = item.rotation % 180 !== 0;
      const displayW = isRotated90 ? item.height : item.width;
      const displayH = isRotated90 ? item.width : item.height;

      card.innerHTML = `
        <div class="card-preview-area" title="Drag to rearrange order">
          <span class="page-badge">#${index + 1}</span>
          <img class="card-thumbnail" src="${item.dataUrl}" alt="${escapeHtml(item.name)}" style="transform: rotate(${item.rotation}deg);" />
        </div>
        <div class="card-info">
          <span class="card-filename" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
          <div class="card-meta">
            <span>${displayW} &times; ${displayH} px</span>
            <span>${formatBytes(item.size)}</span>
          </div>
        </div>
        <div class="card-actions">
          <div class="card-action-group">
            <button type="button" class="card-btn btn-move-left" title="Move page earlier" ${index === 0 ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button type="button" class="card-btn btn-move-right" title="Move page later" ${index === state.images.length - 1 ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
            <button type="button" class="card-btn btn-rotate" title="Rotate clockwise 90°">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
              </svg>
            </button>
          </div>
          <button type="button" class="card-btn btn-delete" title="Delete page">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;

      // Card event listeners
      const btnMoveLeft = card.querySelector('.btn-move-left');
      const btnMoveRight = card.querySelector('.btn-move-right');
      const btnRotate = card.querySelector('.btn-rotate');
      const btnDelete = card.querySelector('.btn-delete');

      if (btnMoveLeft) {
        btnMoveLeft.addEventListener('click', (e) => {
          e.stopPropagation();
          moveImage(index, index - 1);
        });
      }

      if (btnMoveRight) {
        btnMoveRight.addEventListener('click', (e) => {
          e.stopPropagation();
          moveImage(index, index + 1);
        });
      }

      btnRotate.addEventListener('click', (e) => {
        e.stopPropagation();
        rotateSingleImage(index);
      });

      btnDelete.addEventListener('click', (e) => {
        e.stopPropagation();
        removeSingleImage(index);
      });

      // Drag & Drop Card Reordering
      setupCardDragAndDrop(card, index);

      elements.imageGrid.appendChild(card);
    });
  }

  function setupCardDragAndDrop(card, index) {
    card.addEventListener('dragstart', (e) => {
      state.draggedItemIndex = index;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.image-card').forEach((c) => c.classList.remove('drag-over'));
      state.draggedItemIndex = null;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (state.draggedItemIndex !== null && state.draggedItemIndex !== index) {
        card.classList.add('drag-over');
      }
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      if (state.draggedItemIndex !== null && state.draggedItemIndex !== index) {
        const movedItem = state.images.splice(state.draggedItemIndex, 1)[0];
        state.images.splice(index, 0, movedItem);
        renderGallery();
      }
    });
  }

  // --- Image Manipulations ---
  function moveImage(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= state.images.length) return;
    const item = state.images.splice(fromIndex, 1)[0];
    state.images.splice(toIndex, 0, item);
    renderGallery();
  }

  function rotateSingleImage(index) {
    state.images[index].rotation = (state.images[index].rotation + 90) % 360;
    renderGallery();
  }

  function rotateAllImages() {
    if (state.images.length === 0) return;
    state.images.forEach((img) => {
      img.rotation = (img.rotation + 90) % 360;
    });
    renderGallery();
    showToast('All pages rotated 90° clockwise', 'info');
  }

  function sortImagesAlphabetically() {
    if (state.images.length < 2) return;
    state.images.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    renderGallery();
    showToast('Pages sorted alphabetically', 'info');
  }

  function removeSingleImage(index) {
    state.images.splice(index, 1);
    renderGallery();
    updateUIState();
    showToast('Image removed from document', 'info');
  }

  function clearAllImages() {
    if (state.images.length === 0) return;
    state.images = [];
    renderGallery();
    updateUIState();
    showToast('Cleared all pages', 'info');
  }

  // --- Image Processing & Canvas Transform ---
  function getProcessedImage(imgItem, qualityMultiplier) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const rotation = (imgItem.rotation % 360 + 360) % 360;
        const isRotated90 = rotation === 90 || rotation === 270;

        const canvas = document.createElement('canvas');
        canvas.width = isRotated90 ? img.naturalHeight : img.naturalWidth;
        canvas.height = isRotated90 ? img.naturalWidth : img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

        const dataUrl = canvas.toDataURL('image/jpeg', qualityMultiplier);
        resolve({
          dataUrl: dataUrl,
          width: canvas.width,
          height: canvas.height
        });
      };
      img.onerror = () => reject(new Error('Failed to load image for rendering'));
      img.src = imgItem.dataUrl;
    });
  }

  // --- PDF Generation Engine ---
  async function generatePdf(triggerDownload = true) {
    if (state.images.length === 0 || state.isGenerating) return;

    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast('Error: PDF engine not loaded. Please refresh.', 'error');
      return;
    }

    const { jsPDF } = window.jspdf;
    state.isGenerating = true;

    // Show Progress
    elements.progressContainer.classList.remove('hidden');
    elements.progressFill.style.width = '0%';
    elements.btnConvertDownload.setAttribute('disabled', 'true');
    elements.btnPreviewPdf.setAttribute('disabled', 'true');

    try {
      const qualityMult = QUALITY_VALUES[state.settings.quality] || 0.92;
      const marginMm = MARGINS_MM[state.settings.margin] || 0;
      const total = state.images.length;
      let doc = null;

      for (let i = 0; i < total; i++) {
        const percent = Math.round(((i) / total) * 100);
        elements.progressFill.style.width = `${percent}%`;
        elements.progressStatus.textContent = `Processing page ${i + 1} of ${total}...`;

        const processed = await getProcessedImage(state.images[i], qualityMult);
        const imgW = processed.width;
        const imgH = processed.height;

        let pageW, pageH, orientation;

        if (state.settings.pageSize === 'fit') {
          // Fit mode: each page exactly matches the image's dimensions
          const pxToMm = 0.264583;
          const pageW = Math.max(10, imgW * pxToMm);
          const pageH = Math.max(10, imgH * pxToMm);
          const orientation = pageW >= pageH ? 'landscape' : 'portrait';

          if (i === 0) {
            doc = new jsPDF({
              orientation: orientation,
              unit: 'mm',
              format: [pageW, pageH]
            });
          } else {
            doc.addPage([pageW, pageH], orientation);
          }

          // Borderless direct fill
          doc.addImage(processed.dataUrl, 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
        } else {
          // Standard page formats (a4, letter, legal)
          const stdFormat = state.settings.pageSize;

          // Determine page orientation
          if (state.settings.orientation === 'auto') {
            orientation = imgW >= imgH ? 'landscape' : 'portrait';
          } else {
            orientation = state.settings.orientation;
          }

          if (i === 0) {
            doc = new jsPDF({
              orientation: orientation,
              unit: 'mm',
              format: stdFormat
            });
          } else {
            doc.addPage(stdFormat, orientation);
          }

          const actualW = doc.internal.pageSize.getWidth();
          const actualH = doc.internal.pageSize.getHeight();

          // Calculate printable area inside margins
          const usableW = Math.max(1, actualW - (marginMm * 2));
          const usableH = Math.max(1, actualH - (marginMm * 2));

          let drawW, drawH, drawX, drawY;

          if (state.settings.fitMode === 'cover') {
            const scale = Math.max(usableW / imgW, usableH / imgH);
            drawW = imgW * scale;
            drawH = imgH * scale;
            drawX = marginMm + (usableW - drawW) / 2;
            drawY = marginMm + (usableH - drawH) / 2;
          } else {
            // 'contain' (default)
            const scale = Math.min(usableW / imgW, usableH / imgH);
            drawW = imgW * scale;
            drawH = imgH * scale;
            drawX = marginMm + (usableW - drawW) / 2;
            drawY = marginMm + (usableH - drawH) / 2;
          }

          doc.addImage(processed.dataUrl, 'JPEG', drawX, drawY, drawW, drawH, undefined, 'FAST');
        }
      }

      elements.progressFill.style.width = '100%';
      elements.progressStatus.textContent = 'Finalizing document...';

      // Create PDF Blob
      const pdfBlob = doc.output('blob');

      // Revoke old URL to free memory
      if (state.currentPdfBlobUrl) {
        URL.revokeObjectURL(state.currentPdfBlobUrl);
      }
      state.currentPdfBlobUrl = URL.createObjectURL(pdfBlob);

      if (triggerDownload) {
        downloadCurrentPdf();
        showToast('PDF created and downloaded successfully!', 'success');
      } else {
        openPreviewModal(state.currentPdfBlobUrl, pdfBlob.size);
      }
    } catch (err) {
      console.error('PDF Generation failed:', err);
      showToast('Error generating PDF: ' + err.message, 'error');
    } finally {
      state.isGenerating = false;
      setTimeout(() => {
        elements.progressContainer.classList.add('hidden');
        elements.btnConvertDownload.removeAttribute('disabled');
        elements.btnPreviewPdf.removeAttribute('disabled');
      }, 500);
    }
  }

  // --- Download & Preview ---
  function downloadCurrentPdf() {
    if (!state.currentPdfBlobUrl) {
      generatePdf(true);
      return;
    }

    const link = document.createElement('a');
    link.href = state.currentPdfBlobUrl;
    const filename = (state.settings.filename || 'converted_document').replace(/\.pdf$/i, '') + '.pdf';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function openPreviewModal(blobUrl, blobSize) {
    elements.previewIframe.src = blobUrl;
    const count = state.images.length;
    elements.previewMeta.textContent = `${count} Page${count === 1 ? '' : 's'} &bull; ${formatBytes(blobSize)}`;
    elements.previewModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closePreviewModal() {
    elements.previewModal.classList.add('hidden');
    elements.previewIframe.src = 'about:blank';
    document.body.style.overflow = '';
  }

  // --- Toasts ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '✕';

    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Boot
  document.addEventListener('DOMContentLoaded', init);
})();
