// admin.js - Admin Dashboard Interactivity & CMS Logic

import {
    initDatabase,
    isLoggedIn,
    login,
    logout,
    getBookings,
    updateBookingStatus,
    deleteBooking,
    getReferences,
    addReference,
    updateReference,
    deleteReference,
    getSettings,
    saveSettings
} from './database.js';

// Init DB
initDatabase();

// DOM Elements
const loginContainer = document.getElementById('login-container');
const adminLayout = document.getElementById('admin-layout');
const loginForm = document.getElementById('login-form');
const adminPasswordInput = document.getElementById('admin-password');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

// Menu & Panels
const menuItems = document.querySelectorAll('.admin-menu-item[data-panel]');
const panels = document.querySelectorAll('.admin-panel');
const adminPanelTitle = document.getElementById('admin-panel-title');

// Bookings elements
const bookingsTableBody = document.getElementById('bookings-table-body');
const filterBtns = document.querySelectorAll('.filter-btn');

// References CMS elements
const cmsItemsContainer = document.getElementById('cms-items-container');
const referenceForm = document.getElementById('reference-form');
const refIdInput = document.getElementById('ref-id');
const refTitleInput = document.getElementById('ref-title');
const refDescInput = document.getElementById('ref-description');
const refSavingsInput = document.getElementById('ref-savings');
const refDurationInput = document.getElementById('ref-duration');
const refInvolvementInput = document.getElementById('ref-involvement');
const imageUploadArea = document.getElementById('image-upload-area');
const refFileInput = document.getElementById('ref-file-input');
const refImageDataInput = document.getElementById('ref-image-data');
const uploadPreview = document.getElementById('upload-preview');
const cmsFormTitle = document.getElementById('cms-form-title');
const refSubmitBtn = document.getElementById('ref-submit-btn');
const refCancelBtn = document.getElementById('ref-cancel-btn');

// Sync elements
const syncSettingsForm = document.getElementById('sync-settings-form');
const syncEnableToggle = document.getElementById('sync-enable-toggle');
const syncApiKeyInput = document.getElementById('sync-api-key');
const syncCalendarIdInput = document.getElementById('sync-calendar-id');
const syncStatusBox = document.getElementById('sync-status-box');
const syncStatusText = document.getElementById('sync-status-text');

// State Variables
let currentFilter = 'all';

// Startup Check
document.addEventListener('DOMContentLoaded', () => {
    if (isLoggedIn()) {
        showDashboard();
    } else {
        showLogin();
    }

    // Login Action
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pwd = adminPasswordInput.value;
        if (login(pwd)) {
            showDashboard();
            loginForm.reset();
            loginError.style.display = 'none';
        } else {
            loginError.style.display = 'block';
            adminPasswordInput.value = '';
        }
    });

    // Logout Action
    logoutBtn.addEventListener('click', () => {
        logout();
        showLogin();
    });

    // Panel Navigation
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPanel = item.getAttribute('data-panel');
            
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
            
            panels.forEach(p => p.classList.remove('active'));
            document.getElementById(`panel-${targetPanel}`).classList.add('active');
            
            // Set Panel Title
            if (targetPanel === 'bookings') adminPanelTitle.textContent = "Foglalások Kezelése";
            if (targetPanel === 'references') adminPanelTitle.textContent = "Referenciák Tartalomkezelése (CMS)";
            if (targetPanel === 'sync') adminPanelTitle.textContent = "Google Naptár Szinkronizáció";
        });
    });

    // Setup Bookings panel
    setupBookingsPanel();

    // Setup References CMS panel
    setupCMSPanel();

    // Setup Sync settings panel
    setupSyncPanel();

    // Setup Lightbox Close
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxClose = document.getElementById('lightbox-close');
    if (lightboxClose && lightboxModal) {
        lightboxClose.addEventListener('click', () => {
            lightboxModal.style.display = 'none';
        });
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) {
                lightboxModal.style.display = 'none';
            }
        });
    }
});

// Switch Views
function showLogin() {
    loginContainer.style.display = 'flex';
    adminLayout.style.display = 'none';
}

function showDashboard() {
    loginContainer.style.display = 'none';
    adminLayout.style.display = 'grid';
    
    // Initial Loads
    renderBookings();
    renderCMSReferences();
    loadSyncSettings();
}

/* ========================================== */
/* BOOKING MANAGEMENT LOGIC                   */
/* ========================================== */
function setupBookingsPanel() {
    // Filter click handlers
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderBookings();
        });
    });
}

function renderBookings() {
    const bookings = getBookings();
    bookingsTableBody.innerHTML = '';

    // Sort bookings: pending first, then newest date
    const sortedBookings = bookings.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.date) - new Date(a.date);
    });

    const filtered = sortedBookings.filter(b => {
        if (currentFilter === 'all') return true;
        return b.status === currentFilter;
    });

    if (filtered.length === 0) {
        bookingsTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">Nincs megjeleníthető foglalás ebben a státuszban.</td></tr>';
        return;
    }

    filtered.forEach(b => {
        const row = document.createElement('tr');
        
        // Formatted date
        const formattedDate = b.date.replace(/-/g, '. ');
        
        // Status string translation
        let HungarianStatus = 'Függőben';
        if (b.status === 'accepted') HungarianStatus = 'Elfogadva';
        if (b.status === 'rejected') HungarianStatus = 'Elutasítva';

        // Check if there are workspace photos
        let photosMarkup = '';
        if (b.workspaceImages && b.workspaceImages.length > 0) {
            photosMarkup = `
                <div class="booking-thumbs-row">
                    ${b.workspaceImages.map(img => `<img src="${img}" class="booking-thumb-img" alt="Munkaterület">`).join('')}
                </div>
            `;
        }

        row.innerHTML = `
            <td style="font-weight:600; white-space: nowrap;">
                <div>${formattedDate}</div>
                <span class="badge-duration">${b.daysCount || 1} nap</span>
            </td>
            <td style="font-weight:600;">${escapeHtml(b.name)}</td>
            <td>
                <div>
                    <i class="fa-solid fa-phone" style="font-size:0.8rem;"></i> ${escapeHtml(b.phone)}
                    ${b.callbackRequested ? `<span class="badge-callback" title="Visszahívást kér"><i class="fa-solid fa-phone-volume phone-ringing"></i> Visszahívás</span>` : ''}
                </div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-top: 4px;">
                    <i class="fa-solid fa-envelope" style="font-size:0.75rem;"></i> ${escapeHtml(b.email)}
                </div>
            </td>
            <td>${escapeHtml(b.location)}</td>
            <td style="max-width: 250px; font-size: 0.85rem;">
                <div>${escapeHtml(b.description)}</div>
                ${photosMarkup}
            </td>
            <td><span class="status-badge ${b.status}">${HungarianStatus}</span></td>
            <td class="actions-cell">
                ${b.status !== 'accepted' ? `<button class="action-btn accept" data-id="${b.id}" title="Elfogad"><i class="fa-solid fa-check"></i></button>` : ''}
                ${b.status !== 'rejected' ? `<button class="action-btn reject" data-id="${b.id}" title="Elutasít"><i class="fa-solid fa-xmark"></i></button>` : ''}
                <button class="action-btn delete" data-id="${b.id}" title="Töröl"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;

        // Add event listeners for thumbnails to trigger Lightbox Modal
        const thumbs = row.querySelectorAll('.booking-thumb-img');
        thumbs.forEach(thumb => {
            thumb.addEventListener('click', () => {
                const lightboxModal = document.getElementById('lightbox-modal');
                const lightboxImg = document.getElementById('lightbox-img');
                if (lightboxModal && lightboxImg) {
                    lightboxImg.src = thumb.src;
                    lightboxModal.style.display = 'flex';
                }
            });
        });

        // Event listeners for action buttons
        const acceptBtn = row.querySelector('.accept');
        const rejectBtn = row.querySelector('.reject');
        const deleteBtn = row.querySelector('.delete');

        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                updateBookingStatus(b.id, 'accepted');
                renderBookings();
            });
        }
        if (rejectBtn) {
            rejectBtn.addEventListener('click', () => {
                updateBookingStatus(b.id, 'rejected');
                renderBookings();
            });
        }
        
        deleteBtn.addEventListener('click', () => {
            if (confirm(`Biztosan törölni szeretnéd ${b.name} foglalását?`)) {
                deleteBooking(b.id);
                renderBookings();
            }
        });

        bookingsTableBody.appendChild(row);
    });
}

/* ========================================== */
/* REFERENCES CMS LOGIC                       */
/* ========================================== */
function setupCMSPanel() {
    // 1. File Upload Interaction
    imageUploadArea.addEventListener('click', () => {
        refFileInput.click();
    });

    imageUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageUploadArea.style.borderColor = 'var(--primary)';
        imageUploadArea.style.backgroundColor = 'var(--primary-glow)';
    });

    imageUploadArea.addEventListener('dragleave', () => {
        imageUploadArea.style.borderColor = '#cbd5e1';
        imageUploadArea.style.backgroundColor = '#f8fafc';
    });

    imageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        imageUploadArea.style.borderColor = '#cbd5e1';
        imageUploadArea.style.backgroundColor = '#f8fafc';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            processFile(file);
        }
    });

    refFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    });

    // Cancel Button
    refCancelBtn.addEventListener('click', resetCMSForm);

    // Form Submit
    referenceForm.addEventListener('submit', handleCMSSubmit);
}

function processFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const base64Data = e.target.result;
        refImageDataInput.value = base64Data;
        uploadPreview.src = base64Data;
        uploadPreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function renderCMSReferences() {
    const references = getReferences();
    cmsItemsContainer.innerHTML = '';

    if (references.length === 0) {
        cmsItemsContainer.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">Nincs még feltöltve referencia munka.</p>';
        return;
    }

    references.forEach(ref => {
        const card = document.createElement('div');
        card.className = 'cms-item-card';
        card.innerHTML = `
            <img src="${ref.image || 'assets/hero.png'}" alt="Thumb" class="cms-item-thumb">
            <div class="cms-item-info">
                <h4>${escapeHtml(ref.title)}</h4>
                <p>${escapeHtml(ref.description)}</p>
                <div style="font-size:0.75rem; color:var(--primary); font-weight:600; margin-top:5px;">
                    Megtakarítás: ${escapeHtml(ref.savings)} | Idő: ${escapeHtml(ref.duration)}
                </div>
            </div>
            <div class="cms-item-actions">
                <button class="action-btn accept edit-ref-btn" style="background-color: var(--secondary);" title="Szerkeszt"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="action-btn reject delete-ref-btn" title="Töröl"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;

        // Action events
        card.querySelector('.edit-ref-btn').addEventListener('click', () => {
            editReferenceMode(ref);
        });

        card.querySelector('.delete-ref-btn').addEventListener('click', () => {
            if (confirm(`Biztosan törölni szeretnéd a "${ref.title}" referenciát?`)) {
                deleteReference(ref.id);
                renderCMSReferences();
            }
        });

        cmsItemsContainer.appendChild(card);
    });
}

function editReferenceMode(ref) {
    refIdInput.value = ref.id;
    refTitleInput.value = ref.title;
    refDescInput.value = ref.description;
    refSavingsInput.value = ref.savings;
    refDurationInput.value = ref.duration;
    refInvolvementInput.value = ref.clientInvolvement;
    refImageDataInput.value = ref.image;
    
    // Set preview
    uploadPreview.src = ref.image;
    uploadPreview.style.display = 'block';

    cmsFormTitle.textContent = "Referencia Szerkesztése";
    refSubmitBtn.textContent = "Mentés";
    refCancelBtn.style.display = 'inline-flex';
    
    // Scroll form into view for mobile users
    referenceForm.scrollIntoView({ behavior: 'smooth' });
}

function resetCMSForm() {
    referenceForm.reset();
    refIdInput.value = '';
    refImageDataInput.value = '';
    uploadPreview.src = '';
    uploadPreview.style.display = 'none';

    cmsFormTitle.textContent = "Új Referencia Hozzáadása";
    refSubmitBtn.textContent = "Hozzáadás";
    refCancelBtn.style.display = 'none';
}

function handleCMSSubmit(e) {
    e.preventDefault();

    const title = refTitleInput.value;
    const description = refDescInput.value;
    const savings = refSavingsInput.value;
    const duration = refDurationInput.value;
    const clientInvolvement = refInvolvementInput.value;
    const image = refImageDataInput.value;

    if (!image) {
        alert("Kérjük, tölts fel egy képet a referenciához!");
        return;
    }

    const refData = {
        title,
        description,
        savings,
        duration,
        clientInvolvement,
        image
    };

    const id = refIdInput.value;
    if (id) {
        // Edit Mode
        updateReference(id, refData);
        alert("Referencia sikeresen frissítve!");
    } else {
        // Add Mode
        addReference(refData);
        alert("Új referencia sikeresen hozzáadva!");
    }

    resetCMSForm();
    renderCMSReferences();
}

/* ========================================== */
/* GOOGLE CALENDAR SYNC PANEL LOGIC           */
/* ========================================== */
function setupSyncPanel() {
    syncSettingsForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const enable = syncEnableToggle.checked;
        const key = syncApiKeyInput.value;
        const calId = syncCalendarIdInput.value;

        saveSettings({
            googleCalendarSync: enable,
            googleApiKey: key,
            googleCalendarId: calId
        });

        updateSyncStatusUI(enable, key, calId);
        alert("Google Naptár szinkronizációs beállítások mentve!");
    });
}

function loadSyncSettings() {
    const settings = getSettings();
    
    syncEnableToggle.checked = settings.googleCalendarSync;
    syncApiKeyInput.value = settings.googleApiKey;
    syncCalendarIdInput.value = settings.googleCalendarId;

    updateSyncStatusUI(settings.googleCalendarSync, settings.googleApiKey, settings.googleCalendarId);
}

function updateSyncStatusUI(enabled, key, calId) {
    if (enabled && key && calId) {
        syncStatusBox.className = "sync-status connected";
        syncStatusText.innerHTML = "<strong>Állapot: Kétirányú szinkron aktív</strong> (Google Naptár sikeresen összekapcsolva)";
    } else if (enabled) {
        syncStatusBox.className = "sync-status";
        syncStatusBox.style.borderLeftColor = "var(--status-pending)";
        syncStatusText.innerHTML = "<strong>Állapot: Szinkronizáció bekapcsolva, de hiányos adatok</strong> (Add meg az API kulcsot és Naptár ID-t)";
    } else {
        syncStatusBox.className = "sync-status";
        syncStatusBox.style.borderLeftColor = "#94a3b8";
        syncStatusText.innerHTML = "<strong>Állapot: Nincs összekapcsolva</strong> (Naptár integráció kikapcsolva)";
    }
}

/* Helper to prevent XSS in dynamic DOM inserts */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
