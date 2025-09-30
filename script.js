let uploadedImage = null;
let cropper = null;
let croppedImageData = null;
let logoImage = null;
let logoSettings = null;

const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');
const sidebarCanvas = document.getElementById('sidebarCanvas');
const sidebarCtx = sidebarCanvas.getContext('2d');

const CBSE_WIDTH_CM = 3.5;
const CBSE_HEIGHT_CM = 4.5;
const DPI = 600;
const CM_TO_PX = DPI / 2.54;

const fileInput = document.getElementById('fileInput');
const uploadSection = document.querySelector('.upload-zone');

// Load DPS logo on page load
const logo = new Image();
logo.onload = () => {
    logoImage = logo;
};
logo.src = 'DPS_logo.png';

fileInput.addEventListener('change', handleFileSelect);

uploadSection.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadSection.classList.add('dragover');
});

uploadSection.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('dragover');
});

uploadSection.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

document.getElementById('nameFontSizeRange').addEventListener('input', updateControls);
document.getElementById('dateFontSizeRange').addEventListener('input', updateControls);
document.getElementById('textPositionRange').addEventListener('input', updateControls);

function updateControls() {
    const nameFontSize = document.getElementById('nameFontSizeRange').value;
    const dateFontSize = document.getElementById('dateFontSizeRange').value;
    const textPosition = document.getElementById('textPositionRange').value;

    document.getElementById('nameFontSizeValue').textContent = nameFontSize + 'px';
    document.getElementById('dateFontSizeValue').textContent = dateFontSize + 'px';
    document.getElementById('textPositionValue').textContent = textPosition + '%';

    if (canGeneratePhoto()) {
        generatePhotoSafe();
    }
}

function canGeneratePhoto() {
    const name = document.getElementById('nameInput').value.trim();
    const date = document.getElementById('dateInput').value.trim();
    return uploadedImage && name.length > 0 && date.length > 0;
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (JPG, PNG).');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('File size too large. Please select an image under 10MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            uploadedImage = img;
            croppedImageData = null;
            document.getElementById('controlsSection').style.display = 'block';
            document.getElementById('cropToggleBtn').style.display = 'inline-block';
            document.getElementById('logoBtn').style.display = 'inline-block';
            updatePreviewStatus('Image uploaded');

            if (canGeneratePhoto()) {
                generatePhotoSafe();
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function updatePreviewStatus(status) {
    const statusElement = document.getElementById('previewStatus');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

function generatePhotoSafe() {
    try {
        if (canGeneratePhoto()) {
            generatePhoto();
        }
    } catch (error) {
        console.error('Error generating photo:', error);
        updatePreviewStatus('Error');
    }
}

function generatePhoto() {
    if (!canGeneratePhoto()) {
        return;
    }

    const name = document.getElementById('nameInput').value.trim().toUpperCase();
    const date = document.getElementById('dateInput').value.trim().toUpperCase();

    const nameFontSize = parseInt(document.getElementById('nameFontSizeRange').value);
    const dateFontSize = parseInt(document.getElementById('dateFontSizeRange').value);
    const textPosition = parseInt(document.getElementById('textPositionRange').value);

    const canvasWidth = Math.round(CBSE_WIDTH_CM * CM_TO_PX);
    const canvasHeight = Math.round(CBSE_HEIGHT_CM * CM_TO_PX);

    updateCanvasHighQuality(canvas, ctx, canvasWidth, canvasHeight, name, date, nameFontSize, dateFontSize, textPosition);
    updateCanvasHighQuality(sidebarCanvas, sidebarCtx, canvasWidth, canvasHeight, name, date, nameFontSize, dateFontSize, textPosition);

    canvas.style.display = 'block';
    sidebarCanvas.style.display = 'block';
    document.getElementById('previewEmptyState').style.display = 'none';
    document.getElementById('sidebarPreviewContainer').classList.add('has-image');

    document.getElementById('cropToggleBtn').style.display = 'inline-block';
    document.getElementById('logoBtn').style.display = 'inline-block';
    document.getElementById('downloadBtn').style.display = 'inline-block';
    updatePreviewStatus('Generated');
}

function updateCanvasHighQuality(targetCanvas, targetCtx, canvasWidth, canvasHeight, name, date, nameFontSize, dateFontSize, textPosition) {
    targetCanvas.width = canvasWidth;
    targetCanvas.height = canvasHeight;

    targetCtx.imageSmoothingEnabled = true;
    targetCtx.imageSmoothingQuality = 'high';

    targetCtx.fillStyle = '#ffffff';
    targetCtx.fillRect(0, 0, canvasWidth, canvasHeight);

    const textAreaHeight = Math.round(canvasHeight * 0.15);
    const photoHeight = canvasHeight - textAreaHeight;

    const imageToUse = croppedImageData || uploadedImage;

    if (croppedImageData) {
        targetCtx.drawImage(croppedImageData, 0, 0, canvasWidth, photoHeight);
    } else {
        const widthRatio = canvasWidth / imageToUse.width;
        const heightRatio = photoHeight / imageToUse.height;
        const ratio = Math.min(widthRatio, heightRatio);

        const scaledWidth = imageToUse.width * ratio;
        const scaledHeight = imageToUse.height * ratio;

        const offsetX = (canvasWidth - scaledWidth) / 2;
        const offsetY = (photoHeight - scaledHeight) / 2;

        targetCtx.save();
        targetCtx.imageSmoothingEnabled = true;
        targetCtx.imageSmoothingQuality = 'high';
        targetCtx.drawImage(imageToUse, offsetX, offsetY, scaledWidth, scaledHeight);
        targetCtx.restore();
    }

    // Draw logo if settings exist
    if (logoSettings && logoImage) {
        const logoWidth = canvasWidth * logoSettings.width;
        const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
        const logoX = canvasWidth * logoSettings.x;
        const logoY = photoHeight * logoSettings.y;

        targetCtx.save();
        targetCtx.globalAlpha = logoSettings.opacity;
        targetCtx.imageSmoothingEnabled = true;
        targetCtx.imageSmoothingQuality = 'high';
        targetCtx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);
        targetCtx.restore();
    }

    const scaledNameFontSize = Math.round(nameFontSize * (canvasWidth / 400));
    const scaledDateFontSize = Math.round(dateFontSize * (canvasWidth / 400));

    targetCtx.fillStyle = '#000000';
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';

    const textAreaStart = photoHeight;
    const textY = textAreaStart + (textAreaHeight * textPosition / 100);
    const centerX = canvasWidth / 2;

    targetCtx.font = `bold ${scaledNameFontSize}px Inter, Arial, sans-serif`;
    targetCtx.fillText(name, centerX, textY - scaledDateFontSize/2);

    targetCtx.font = `bold ${scaledDateFontSize}px Inter, Arial, sans-serif`;
    targetCtx.fillText(date, centerX, textY + scaledNameFontSize/2);
}

function toggleCropMode() {
    if (!uploadedImage) {
        alert('Please upload an image first.');
        return;
    }

    const cropModal = document.getElementById('cropModal');
    cropModal.classList.add('active');
    updatePreviewStatus('Cropping...');

    document.body.style.overflow = 'hidden';
    setupCropper();
}

function setupCropper() {
    const cropImage = document.getElementById('cropImage');
    cropImage.src = uploadedImage.src;

    const photoAreaHeight = 0.85;
    const actualAspectRatio = CBSE_WIDTH_CM / (CBSE_HEIGHT_CM * photoAreaHeight);

    cropImage.onload = () => {
        if (cropper) {
            cropper.destroy();
        }

        cropper = new Cropper(cropImage, {
            aspectRatio: actualAspectRatio,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.9,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            background: true,
            modal: true,
            responsive: true,
            scalable: true,
            zoomable: true,
            zoomOnTouch: true,
            zoomOnWheel: false
        });
    };
}

function applyCrop() {
    if (!cropper) return;

    const canvasWidth = Math.round(CBSE_WIDTH_CM * CM_TO_PX);
    const photoAreaHeight = Math.round(CBSE_HEIGHT_CM * CM_TO_PX * 0.85);

    const croppedCanvas = cropper.getCroppedCanvas({
        width: canvasWidth,
        height: photoAreaHeight,
        fillColor: '#ffffff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });

    const croppedImg = new Image();
    croppedImg.onload = () => {
        croppedImageData = croppedImg;
        cancelCrop();
        if (canGeneratePhoto()) {
            generatePhotoSafe();
        }
        updatePreviewStatus('Cropped');
    };
    croppedImg.src = croppedCanvas.toDataURL('image/png', 1.0);
}

function cancelCrop() {
    const cropModal = document.getElementById('cropModal');
    cropModal.classList.remove('active');
    document.body.style.overflow = '';

    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    updatePreviewStatus('Ready');
}

function resetCrop() {
    if (cropper) {
        cropper.reset();
    }
}

function rotateCrop() {
    if (cropper) {
        cropper.rotate(90);
    }
}

// Logo functionality
let logoPositionX = 0.05;
let logoPositionY = 0.05;
let logoSize = 0.15;
let logoOpacity = 1.0;
let isDragging = false;
let isResizing = false;
let dragStartX, dragStartY;

function toggleLogoMode() {
    if (!uploadedImage) {
        alert('Please upload an image first.');
        return;
    }

    if (!logoImage) {
        alert('Logo is loading... Please try again in a moment.');
        return;
    }

    const logoModal = document.getElementById('logoModal');
    logoModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setupLogoEditor();
    updatePreviewStatus('Adding logo...');
}

function setupLogoEditor() {
    const logoCanvas = document.getElementById('logoCanvas');
    const logoCtx = logoCanvas.getContext('2d');

    const actualWidth = Math.round(CBSE_WIDTH_CM * CM_TO_PX);
    const actualPhotoHeight = Math.round(CBSE_HEIGHT_CM * CM_TO_PX * 0.85);
    const aspectRatio = actualWidth / actualPhotoHeight;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const maxWidth = Math.min(viewportWidth * 0.85, 500);
    const maxHeight = Math.min(viewportHeight * 0.40, 600);

    // Fit to available space while maintaining aspect ratio
    let canvasWidth, photoAreaHeight;
    if (maxWidth / aspectRatio <= maxHeight) {
        canvasWidth = maxWidth;
        photoAreaHeight = maxWidth / aspectRatio;
    } else {
        photoAreaHeight = maxHeight;
        canvasWidth = maxHeight * aspectRatio;
    }
    logoCanvas.width = canvasWidth;
    logoCanvas.height = photoAreaHeight;

    function drawLogoPreview() {
        logoCtx.clearRect(0, 0, logoCanvas.width, logoCanvas.height);

        logoCtx.imageSmoothingEnabled = true;
        logoCtx.imageSmoothingQuality = 'high';

        const imageToUse = croppedImageData || uploadedImage;

        if (croppedImageData) {
            logoCtx.drawImage(imageToUse, 0, 0, logoCanvas.width, logoCanvas.height);
        } else {
            const widthRatio = logoCanvas.width / imageToUse.width;
            const heightRatio = logoCanvas.height / imageToUse.height;
            const ratio = Math.min(widthRatio, heightRatio);

            const scaledWidth = imageToUse.width * ratio;
            const scaledHeight = imageToUse.height * ratio;
            const offsetX = (logoCanvas.width - scaledWidth) / 2;
            const offsetY = (logoCanvas.height - scaledHeight) / 2;

            logoCtx.drawImage(imageToUse, offsetX, offsetY, scaledWidth, scaledHeight);
        }

        const logoWidth = logoCanvas.width * logoSize;
        const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
        const logoX = logoCanvas.width * logoPositionX;
        const logoY = logoCanvas.height * logoPositionY;

        logoCtx.save();
        logoCtx.globalAlpha = logoOpacity;
        logoCtx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);
        logoCtx.restore();

        logoCtx.strokeStyle = '#6366f1';
        logoCtx.lineWidth = 3;
        logoCtx.strokeRect(logoX, logoY, logoWidth, logoHeight);

        const handleSize = 15;
        logoCtx.fillStyle = '#6366f1';
        logoCtx.fillRect(logoX + logoWidth - handleSize/2, logoY + logoHeight - handleSize/2, handleSize, handleSize);
    }

    drawLogoPreview();

    logoCanvas.addEventListener('mousedown', (e) => {
        const rect = logoCanvas.getBoundingClientRect();
        const scaleX = logoCanvas.width / rect.width;
        const scaleY = logoCanvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const logoWidth = logoCanvas.width * logoSize;
        const logoHeight = logoSize * (logoImage.height / logoImage.width) * logoCanvas.width;
        const logoX = logoCanvas.width * logoPositionX;
        const logoY = logoCanvas.height * logoPositionY;

        const handleSize = 15;
        const handleX = logoX + logoWidth - handleSize/2;
        const handleY = logoY + logoHeight - handleSize/2;

        if (x >= handleX && x <= handleX + handleSize &&
            y >= handleY && y <= handleY + handleSize) {
            isResizing = true;
        } else if (x >= logoX && x <= logoX + logoWidth &&
                   y >= logoY && y <= logoY + logoHeight) {
            isDragging = true;
            dragStartX = x - logoX;
            dragStartY = y - logoY;
        }
    });

    logoCanvas.addEventListener('mousemove', (e) => {
        const rect = logoCanvas.getBoundingClientRect();
        const scaleX = logoCanvas.width / rect.width;
        const scaleY = logoCanvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        if (isDragging) {
            const newX = (x - dragStartX) / logoCanvas.width;
            const newY = (y - dragStartY) / logoCanvas.height;
            const maxX = 1 - logoSize;
            const maxY = 1 - (logoSize * (logoImage.height / logoImage.width));
            logoPositionX = Math.max(0, Math.min(maxX, newX));
            logoPositionY = Math.max(0, Math.min(maxY, newY));
            drawLogoPreview();
        } else if (isResizing) {
            const logoX = logoCanvas.width * logoPositionX;
            const newWidth = (x - logoX) / logoCanvas.width;
            logoSize = Math.max(0.05, Math.min(0.5, newWidth));
            drawLogoPreview();
        }
    });

    logoCanvas.addEventListener('mouseup', () => {
        isDragging = false;
        isResizing = false;
    });

    logoCanvas.addEventListener('mouseleave', () => {
        isDragging = false;
        isResizing = false;
    });

    // Touch events with proper scaling
    logoCanvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = logoCanvas.getBoundingClientRect();
        const scaleX = logoCanvas.width / rect.width;
        const scaleY = logoCanvas.height / rect.height;
        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;

        const logoWidth = logoCanvas.width * logoSize;
        const logoHeight = logoSize * (logoImage.height / logoImage.width) * logoCanvas.width;
        const logoX = logoCanvas.width * logoPositionX;
        const logoY = logoCanvas.height * logoPositionY;

        if (x >= logoX && x <= logoX + logoWidth &&
            y >= logoY && y <= logoY + logoHeight) {
            isDragging = true;
            dragStartX = x - logoX;
            dragStartY = y - logoY;
        }
    });

    logoCanvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (isDragging) {
            const touch = e.touches[0];
            const rect = logoCanvas.getBoundingClientRect();
            const scaleX = logoCanvas.width / rect.width;
            const scaleY = logoCanvas.height / rect.height;
            const x = (touch.clientX - rect.left) * scaleX;
            const y = (touch.clientY - rect.top) * scaleY;

            const newX = (x - dragStartX) / logoCanvas.width;
            const newY = (y - dragStartY) / logoCanvas.height;
            const maxX = 1 - logoSize;
            const maxY = 1 - (logoSize * (logoImage.height / logoImage.width));
            logoPositionX = Math.max(0, Math.min(maxX, newX));
            logoPositionY = Math.max(0, Math.min(maxY, newY));
            drawLogoPreview();
        }
    });

    logoCanvas.addEventListener('touchend', () => {
        isDragging = false;
        isResizing = false;
    });

    document.getElementById('logoSizeRange').value = logoSize * 100;
    document.getElementById('logoSizeValue').textContent = Math.round(logoSize * 100) + '%';
    document.getElementById('logoOpacityRange').value = logoOpacity * 100;
    document.getElementById('logoOpacityValue').textContent = Math.round(logoOpacity * 100) + '%';

    document.getElementById('logoSizeRange').oninput = (e) => {
        logoSize = e.target.value / 100;
        document.getElementById('logoSizeValue').textContent = e.target.value + '%';
        drawLogoPreview();
    };

    document.getElementById('logoOpacityRange').oninput = (e) => {
        logoOpacity = e.target.value / 100;
        document.getElementById('logoOpacityValue').textContent = e.target.value + '%';
        drawLogoPreview();
    };
}

function applyLogo() {
    logoSettings = {
        x: logoPositionX,
        y: logoPositionY,
        width: logoSize,
        opacity: logoOpacity
    };
    cancelLogo();
    if (canGeneratePhoto()) {
        generatePhotoSafe();
    }
    updatePreviewStatus('Logo added');
}

function removeLogo() {
    logoSettings = null;
    cancelLogo();
    if (canGeneratePhoto()) {
        generatePhotoSafe();
    }
    updatePreviewStatus('Logo removed');
}

function cancelLogo() {
    const logoModal = document.getElementById('logoModal');
    logoModal.classList.remove('active');
    document.body.style.overflow = '';
    updatePreviewStatus('Ready');
}

async function compressImageToSize(sourceCanvas, maxSizeKB = 40) {
    const maxBytes = maxSizeKB * 1024;
    let quality = 1.0;
    let blob = null;
    let bestBlob = null;
    let attempts = 0;
    const maxAttempts = 20;

    let minQuality = 0.1;
    let maxQuality = 1.0;

    while (attempts < maxAttempts) {
        quality = (minQuality + maxQuality) / 2;

        blob = await new Promise(resolve => {
            sourceCanvas.toBlob(resolve, 'image/jpeg', quality);
        });

        if (blob.size <= maxBytes) {
            bestBlob = blob;
            minQuality = quality;
        } else {
            maxQuality = quality;
        }

        if (maxQuality - minQuality < 0.01) {
            break;
        }

        attempts++;
    }

    if (!bestBlob || bestBlob.size > maxBytes) {
        const scaleFactor = Math.sqrt(maxBytes / blob.size) * 0.95;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = Math.round(sourceCanvas.width * scaleFactor);
        tempCanvas.height = Math.round(sourceCanvas.height * scaleFactor);
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.drawImage(sourceCanvas, 0, 0, tempCanvas.width, tempCanvas.height);

        quality = 1.0;
        bestBlob = await new Promise(resolve => {
            tempCanvas.toBlob(resolve, 'image/jpeg', quality);
        });

        if (bestBlob.size > maxBytes) {
            quality = Math.sqrt(maxBytes / bestBlob.size) * 0.95;
            bestBlob = await new Promise(resolve => {
                tempCanvas.toBlob(resolve, 'image/jpeg', quality);
            });
        }
    }

    return bestBlob;
}

async function downloadPhoto() {
    if (!canGeneratePhoto()) {
        alert('Please upload an image and enter both name and date first.');
        return;
    }

    if (!canvas.width || !canvas.height) {
        generatePhotoSafe();
        setTimeout(() => downloadPhoto(), 200);
        return;
    }

    try {
        updatePreviewStatus('Compressing...');

        const blob = await compressImageToSize(canvas, 40);
        const fileSizeKB = (blob.size / 1024).toFixed(2);

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `CBSETextPro_${timestamp}.jpg`;

        link.href = url;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
        updatePreviewStatus(`Downloaded (${fileSizeKB}KB)`);
    } catch (error) {
        console.error('Download error:', error);
        alert('Download failed. Please try generating the photo again.');
        updatePreviewStatus('Error');
    }
}

document.getElementById('nameInput').addEventListener('input', function(e) {
    e.target.value = e.target.value.toUpperCase();
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
        if (canGeneratePhoto()) {
            generatePhotoSafe();
        }
    }, 500);
});

document.getElementById('dateInput').addEventListener('input', function(e) {
    e.target.value = e.target.value.toUpperCase();
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
        if (canGeneratePhoto()) {
            generatePhotoSafe();
        }
    }, 500);
});

document.getElementById('cropModal').addEventListener('click', function(e) {
    if (e.target === this) {
        cancelCrop();
    }
});

const logoModalElement = document.getElementById('logoModal');
if (logoModalElement) {
    logoModalElement.addEventListener('click', function(e) {
        if (e.target === this) {
            cancelLogo();
        }
    });
}
