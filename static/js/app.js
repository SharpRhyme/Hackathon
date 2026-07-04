document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const connectionBadge = document.getElementById('connection-badge');
    const badgeText = document.getElementById('badge-text');
    const gcpProjectId = document.getElementById('gcp-project-id');
    const authStatusDetail = document.getElementById('auth-status-detail');
    const unauthAlert = document.getElementById('unauthenticated-alert');
    const authAlert = document.getElementById('authenticated-alert');
    const copyProjectIdBtn = document.getElementById('copy-project-id-btn');
    
    // Buckets Elements
    const refreshBucketsBtn = document.getElementById('refresh-buckets-btn');
    const openCreateBucketBtn = document.getElementById('open-create-bucket-btn');
    const bucketSearch = document.getElementById('bucket-search');
    const bucketsLoader = document.getElementById('buckets-loader');
    const bucketsEmpty = document.getElementById('buckets-empty');
    const bucketsError = document.getElementById('buckets-error');
    const bucketsErrorMsg = document.getElementById('buckets-error-msg');
    const bucketsGrid = document.getElementById('buckets-list-container');
    
    // Create Bucket Panel Elements
    const createBucketPanel = document.getElementById('create-bucket-panel');
    const closeCreateBucketBtn = document.getElementById('close-create-bucket-btn');
    const createBucketForm = document.getElementById('create-bucket-form');
    const newBucketNameInput = document.getElementById('new-bucket-name');
    
    // File Upload Panel Elements
    const uploadPanel = document.getElementById('upload-panel');
    const closeUploadBtn = document.getElementById('close-upload-btn');
    const uploadTargetBucket = document.getElementById('upload-target-bucket');
    const uploadForm = document.getElementById('upload-form');
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const selectedFileInfo = document.getElementById('selected-file-info');
    const fileNameText = document.getElementById('file-name-text');
    const removeFileBtn = document.getElementById('remove-file-btn');
    const submitUploadBtn = document.getElementById('submit-upload-btn');
    const uploadProgressWrapper = document.getElementById('upload-progress-wrapper');
    const uploadProgressBar = document.getElementById('upload-progress-bar');
    const uploadProgressStatus = document.getElementById('upload-progress-status');

    let allBuckets = [];
    let isGcpAuthenticated = false;

    // Toast Notification System
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconClass = 'fa-solid fa-circle-info';
        if (type === 'success') iconClass = 'fa-solid fa-circle-check';
        if (type === 'error') iconClass = 'fa-solid fa-circle-exclamation';
        
        toast.innerHTML = `
            <i class="${iconClass} toast-icon"></i>
            <span class="toast-message">${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Remove toast after 4s
        setTimeout(() => {
            toast.style.animation = 'toast-in 0.3s reverse forwards cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            toast.addEventListener('animationend', () => toast.remove());
        }, 4000);
    }

    // Copy Project ID
    copyProjectIdBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(gcpProjectId.textContent)
            .then(() => showToast('Project ID copied to clipboard!', 'success'))
            .catch(() => showToast('Failed to copy text', 'error'));
    });

    // Check GCP Auth Status
    async function checkGcpStatus() {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            
            isGcpAuthenticated = data.authenticated;
            gcpProjectId.textContent = data.project_id;
            
            if (isGcpAuthenticated) {
                // Update Badge
                connectionBadge.className = 'badge connected';
                badgeText.textContent = 'GCP Connected';
                authStatusDetail.textContent = 'Authenticated via Application Default Credentials.';
                
                // Show alerts
                authAlert.classList.remove('hidden');
                unauthAlert.classList.add('hidden');
                
                // Load Buckets
                loadBuckets();
            } else {
                // Update Badge
                connectionBadge.className = 'badge disconnected';
                badgeText.textContent = 'GCP Offline';
                authStatusDetail.textContent = `Offline. Local machine lacks default authorization.`;
                
                // Show alerts
                unauthAlert.classList.remove('hidden');
                authAlert.classList.add('hidden');
                
                // Show empty state for buckets
                bucketsEmpty.classList.remove('hidden');
                bucketsGrid.innerHTML = '';
            }
        } catch (err) {
            console.error(err);
            connectionBadge.className = 'badge disconnected';
            badgeText.textContent = 'Connection Error';
            authStatusDetail.textContent = 'Failed to connect to local Flask server.';
            showToast('Unable to check GCP connection status', 'error');
        }
    }

    // Load Buckets
    async function loadBuckets() {
        bucketsLoader.classList.remove('hidden');
        bucketsEmpty.classList.add('hidden');
        bucketsError.classList.add('hidden');
        bucketsGrid.innerHTML = '';
        allBuckets = [];

        try {
            const res = await fetch('/api/buckets');
            const data = await res.json();
            
            bucketsLoader.classList.add('hidden');

            if (data.success) {
                allBuckets = data.buckets;
                renderBuckets(allBuckets);
            } else {
                bucketsError.classList.remove('hidden');
                bucketsErrorMsg.textContent = data.error || 'Unknown error occurred while listing buckets.';
                showToast('Failed to fetch GCS buckets', 'error');
            }
        } catch (err) {
            console.error(err);
            bucketsLoader.classList.add('hidden');
            bucketsError.classList.remove('hidden');
            bucketsErrorMsg.textContent = 'Network error communicating with the backend.';
        }
    }

    // Render Buckets List
    function renderBuckets(buckets) {
        bucketsGrid.innerHTML = '';
        
        if (buckets.length === 0) {
            bucketsEmpty.classList.remove('hidden');
            return;
        }

        bucketsEmpty.classList.add('hidden');

        buckets.forEach(bucketName => {
            const card = document.createElement('div');
            card.className = 'bucket-item-card';
            card.innerHTML = `
                <div class="bucket-info">
                    <i class="fa-solid fa-box-archive bucket-icon"></i>
                    <div>
                        <div class="bucket-name">${bucketName}</div>
                        <div class="bucket-meta">Google Cloud Storage</div>
                    </div>
                </div>
                <div class="bucket-actions">
                    <button class="icon-btn upload-to-bucket-btn" data-bucket="${bucketName}" title="Upload File">
                        <i class="fa-solid fa-cloud-arrow-up"></i>
                    </button>
                </div>
            `;
            bucketsGrid.appendChild(card);
        });

        // Add upload click listeners
        document.querySelectorAll('.upload-to-bucket-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-bucket');
                openUploadPanel(target);
            });
        });
    }

    // Filter Buckets by Search
    bucketSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = allBuckets.filter(b => b.toLowerCase().includes(query));
        renderBuckets(filtered);
    });

    // Refresh buckets
    refreshBucketsBtn.addEventListener('click', () => {
        if (isGcpAuthenticated) {
            loadBuckets();
            showToast('Refreshed GCS buckets list', 'info');
        } else {
            checkGcpStatus();
        }
    });

    // Create Bucket Panels toggle
    openCreateBucketBtn.addEventListener('click', () => {
        if (!isGcpAuthenticated) {
            showToast('Authenticate to GCP to create buckets', 'error');
            return;
        }
        createBucketPanel.classList.remove('hidden');
        newBucketNameInput.focus();
    });

    closeCreateBucketBtn.addEventListener('click', () => {
        createBucketPanel.classList.add('hidden');
        createBucketForm.reset();
    });

    // Handle Create Bucket Submit
    createBucketForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bucketName = newBucketNameInput.value.trim();
        if (!bucketName) return;

        showToast(`Creating bucket '${bucketName}'...`, 'info');

        try {
            const res = await fetch('/api/buckets/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bucket_name: bucketName })
            });
            const data = await res.json();

            if (data.success) {
                showToast(data.message, 'success');
                createBucketPanel.classList.add('hidden');
                createBucketForm.reset();
                loadBuckets(); // Reload list
            } else {
                showToast(data.error || 'Failed to create bucket', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Network error during bucket creation', 'error');
        }
    });

    // File Upload Logic
    function openUploadPanel(bucketName) {
        uploadTargetBucket.textContent = bucketName;
        uploadPanel.classList.remove('hidden');
        resetUploadForm();
    }

    closeUploadBtn.addEventListener('click', () => {
        uploadPanel.classList.add('hidden');
        resetUploadForm();
    });

    function resetUploadForm() {
        uploadForm.reset();
        fileInput.value = '';
        selectedFileInfo.classList.add('hidden');
        submitUploadBtn.disabled = true;
        submitUploadBtn.classList.add('disabled');
        uploadProgressWrapper.classList.add('hidden');
        uploadProgressBar.style.width = '0%';
        dropArea.classList.remove('hidden');
    }

    // File Selection Handlers
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // Drag and Drop
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropArea.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropArea.classList.remove('dragover');
        }, false);
    });

    dropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect(files[0]);
        }
    });

    function handleFileSelect(file) {
        fileNameText.textContent = file.name;
        selectedFileInfo.classList.remove('hidden');
        dropArea.classList.add('hidden');
        submitUploadBtn.disabled = false;
        submitUploadBtn.classList.remove('disabled');
    }

    removeFileBtn.addEventListener('click', () => {
        resetUploadForm();
    });

    // Submit File Upload Form via AJAX
    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const file = fileInput.files[0];
        const bucketName = uploadTargetBucket.textContent;

        if (!file || !bucketName) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket_name', bucketName);

        submitUploadBtn.disabled = true;
        submitUploadBtn.classList.add('disabled');
        uploadProgressWrapper.classList.remove('hidden');
        uploadProgressStatus.textContent = 'Starting upload...';

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/buckets/upload', true);

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                uploadProgressBar.style.width = `${percent}%`;
                uploadProgressStatus.textContent = `Uploading: ${percent}%`;
            }
        });

        xhr.onload = function() {
            if (xhr.status === 200) {
                const res = JSON.parse(xhr.responseText);
                if (res.success) {
                    showToast(res.message, 'success');
                    setTimeout(() => {
                        uploadPanel.classList.add('hidden');
                        resetUploadForm();
                    }, 1000);
                } else {
                    showToast(res.error || 'Upload failed', 'error');
                    submitUploadBtn.disabled = false;
                    submitUploadBtn.classList.remove('disabled');
                }
            } else {
                showToast('Server error during upload', 'error');
                submitUploadBtn.disabled = false;
                submitUploadBtn.classList.remove('disabled');
            }
        };

        xhr.onerror = function() {
            showToast('Network error during upload', 'error');
            submitUploadBtn.disabled = false;
            submitUploadBtn.classList.remove('disabled');
        };

        xhr.send(formData);
    });

    // Run Initial GCP Check
    checkGcpStatus();
});
