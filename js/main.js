// main.js - Public Landing Page Booking Wizard Interactivity

import { 
    initDatabase, 
    getReferences, 
    getBookings, 
    addBooking 
} from './database.js';

// Initialize database
initDatabase();

// DOM Elements
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');
const referencesGrid = document.getElementById('references-grid');

// Wizard Panels
const stepCalendarContainer = document.getElementById('step-calendar-container');
const stepFormContainer = document.getElementById('step-form-container');
const btnContinueToForm = document.getElementById('btn-continue-to-form');
const btnBackToCalendar = document.getElementById('btn-back-to-calendar');
const formDateSummary = document.getElementById('form-date-summary');

// Calendar & Selector Elements
const durationSelect = document.getElementById('booking-duration');
const calendarMonthYear = document.getElementById('calendar-month-year');
const calendarDaysContainer = document.getElementById('calendar-days-container');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const selectedRangeSummary = document.getElementById('selected-range-summary');
const selectionFeedbackBar = selectedRangeSummary.parentElement;

// Booking Form & Fields
const bookingForm = document.getElementById('booking-form');
const bookingDateInput = document.getElementById('booking-date');
const bookingCallbackCheckbox = document.getElementById('booking-callback');

// Image Uploader elements
const workspaceUploadArea = document.getElementById('workspace-upload-area');
const bookingFilesInput = document.getElementById('booking-files');
const workspaceImagesPreview = document.getElementById('workspace-images-preview');

// State Variables
let currentMonthDate = new Date(2026, 5, 1); // June 2026 default starting view
const systemToday = new Date(2026, 5, 23); // Baseline today
let selectedStartDateStr = "";
let selectedEndDateStr = "";
let uploadedImages = []; // Stores Base64 strings of workspace photos

const HUNGARIAN_MONTHS = [
    "Január", "Február", "Március", "Április", "Május", "Június",
    "Július", "Augusztus", "Szeptember", "Október", "November", "December"
];

// Document Ready
document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Navigation
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    // 2. Navbar Scroll Effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 3. Render References Section
    renderReferences();

    // 4. Render Calendar
    renderCalendar();

    // 5. Setup Calendar Navigation
    prevMonthBtn.addEventListener('click', () => {
        currentMonthDate.setMonth(currentMonthDate.getMonth() - 1);
        renderCalendar();
        clearRangeSelection();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
        renderCalendar();
        clearRangeSelection();
    });

    // 6. Handle Duration Select Change
    durationSelect.addEventListener('change', () => {
        renderCalendar();
        clearRangeSelection();
    });

    // 7. Wizard Step Transitions
    btnContinueToForm.addEventListener('click', () => {
        if (!selectedStartDateStr) return;
        
        // Show Form, Hide Calendar
        stepCalendarContainer.style.display = 'none';
        stepFormContainer.style.display = 'block';
        
        // Set Banner Text
        const formattedStart = selectedStartDateStr.replace(/-/g, '. ');
        const formattedEnd = selectedEndDateStr.replace(/-/g, '. ');
        const days = durationSelect.value;
        formDateSummary.innerHTML = `<strong>${formattedStart}</strong> és <strong>${formattedEnd}</strong> között (${days} nap)`;
        
        // Populate hidden input
        bookingDateInput.value = selectedStartDateStr;
        
        // Scroll to form top
        document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
    });

    btnBackToCalendar.addEventListener('click', () => {
        stepFormContainer.style.display = 'none';
        stepCalendarContainer.style.display = 'block';
        document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
    });

    // 8. Image Uploader setup
    setupImageUploader();

    // 9. Handle Booking Submission
    bookingForm.addEventListener('submit', handleBookingSubmit);

    // Sync database updates in other tabs
    window.addEventListener('storage', () => {
        renderReferences();
        renderCalendar();
    });
});

// Render References Grid
function renderReferences() {
    const references = getReferences();
    referencesGrid.innerHTML = '';
    
    if (references.length === 0) {
        referencesGrid.innerHTML = '<p class="section-desc" style="grid-column: 1/-1; text-align: center;">Jelenleg nincs megjeleníthető referencia munka.</p>';
        return;
    }
    
    references.forEach(ref => {
        const card = document.createElement('div');
        card.className = 'ref-card';
        card.innerHTML = `
            <div class="ref-img-wrapper">
                <img src="${ref.image || 'assets/hero.png'}" alt="${ref.title}" class="ref-img">
                <div class="ref-badge"><i class="fa-solid fa-piggy-bank"></i> Megtakarítás: <span>${ref.savings || 'N/A'}</span></div>
            </div>
            <div class="ref-content">
                <h3>${ref.title}</h3>
                <p>${ref.description}</p>
                <div class="ref-meta">
                    <div class="ref-meta-item">
                        <span class="ref-meta-label">Munkaidő</span>
                        <span class="ref-meta-val">${ref.duration || 'N/A'}</span>
                    </div>
                    <div class="ref-meta-item" style="text-align: right;">
                        <span class="ref-meta-label">Megrendelői segítség</span>
                        <span class="ref-meta-val">${ref.clientInvolvement || 'Segédmunka'}</span>
                    </div>
                </div>
            </div>
        `;
        referencesGrid.appendChild(card);
    });
}

// Helper to format date objects to key
function formatDateKey(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Render Calendar Grid
function renderCalendar() {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    
    calendarMonthYear.textContent = `${HUNGARIAN_MONTHS[month]} ${year}`;
    calendarDaysContainer.innerHTML = '';
    
    const firstDay = new Date(year, month, 1);
    let startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
    const totalDays = new Date(year, month + 1, 0).getDate();
    const bookings = getBookings();
    
    // Render Empty Cells
    for (let i = 0; i < startOffset; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendarDaysContainer.appendChild(emptyCell);
    }
    
    // Render Day Cells
    for (let day = 1; day <= totalDays; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.textContent = day;
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dayCell.setAttribute('data-date', dateStr);
        
        const cellDate = new Date(year, month, day);
        const booking = bookings.find(b => b.date === dateStr);
        const isPast = cellDate < new Date(systemToday.getFullYear(), systemToday.getMonth(), systemToday.getDate());
        
        if (isPast) {
            dayCell.classList.add('disabled');
        } else if (booking) {
            if (booking.status === 'accepted') {
                dayCell.classList.add('booked');
                dayCell.title = "Már foglalt nap";
            } else if (booking.status === 'pending') {
                dayCell.classList.add('pending');
                dayCell.title = "Függőben lévő foglalás";
            } else {
                // Rejected bookings behave as free
                setupClickableDay(dayCell, dateStr, cellDate);
            }
        } else {
            setupClickableDay(dayCell, dateStr, cellDate);
        }
        
        calendarDaysContainer.appendChild(dayCell);
    }
    
    // Re-highlight if range is already selected
    if (selectedStartDateStr) {
        highlightSelectedRange();
    }
}

// Setup Day Cells Hover & Click Interactivity
function setupClickableDay(dayCell, dateStr, cellDate) {
    // 1. Mouse Enter (Hover Range Preview)
    dayCell.addEventListener('mouseenter', () => {
        clearHoverRange();
        
        const duration = parseInt(durationSelect.value, 10);
        const range = getConsecutiveDaysRange(cellDate, duration);
        let hasConflict = false;
        
        range.forEach((dStr, idx) => {
            const el = calendarDaysContainer.querySelector(`[data-date="${dStr}"]`);
            if (!el || el.classList.contains('booked') || el.classList.contains('pending') || el.classList.contains('disabled')) {
                hasConflict = true;
            }
        });
        
        range.forEach((dStr) => {
            const el = calendarDaysContainer.querySelector(`[data-date="${dStr}"]`);
            if (el) {
                el.classList.add('hover-range');
                if (hasConflict) {
                    el.classList.add('hover-invalid');
                }
            }
        });
    });
    
    // 2. Mouse Leave
    dayCell.addEventListener('mouseleave', clearHoverRange);
    
    // 3. Click (Range Selection)
    dayCell.addEventListener('click', () => {
        const duration = parseInt(durationSelect.value, 10);
        const range = getConsecutiveDaysRange(cellDate, duration);
        let hasConflict = false;
        
        range.forEach((dStr) => {
            const el = calendarDaysContainer.querySelector(`[data-date="${dStr}"]`);
            if (!el || el.classList.contains('booked') || el.classList.contains('pending') || el.classList.contains('disabled')) {
                hasConflict = true;
            }
        });
        
        if (hasConflict) {
            // Show error feedback
            selectedRangeSummary.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Kijelölési hiba! A választott ${duration} napos időszakban már foglalt vagy inaktív napok vannak.`;
            selectionFeedbackBar.className = "selection-feedback-bar error";
            btnContinueToForm.setAttribute('disabled', 'true');
            
            // Clear selection state
            selectedStartDateStr = "";
            selectedEndDateStr = "";
            dehighlightSelectedRange();
            return;
        }
        
        // Select range successfully
        selectedStartDateStr = dateStr;
        selectedEndDateStr = range[range.length - 1];
        
        // Highlight range cells
        highlightSelectedRange();
        
        // Update feedback
        const formattedStart = selectedStartDateStr.replace(/-/g, '. ');
        const formattedEnd = selectedEndDateStr.replace(/-/g, '. ');
        selectedRangeSummary.innerHTML = `<i class="fa-solid fa-circle-check"></i> Sikeres kijelölés: <strong>${formattedStart}</strong> és <strong>${formattedEnd}</strong> között (${duration} nap)`;
        selectionFeedbackBar.className = "selection-feedback-bar success";
        btnContinueToForm.removeAttribute('disabled');
    });
}

// Compute N consecutive days from a start date
function getConsecutiveDaysRange(startDate, daysCount) {
    const range = [];
    for (let i = 0; i < daysCount; i++) {
        const nextDate = new Date(startDate);
        nextDate.setDate(startDate.getDate() + i);
        range.push(formatDateKey(nextDate));
    }
    return range;
}

// Clear Hover Range effects
function clearHoverRange() {
    document.querySelectorAll('.calendar-day').forEach(el => {
        el.classList.remove('hover-range', 'hover-invalid');
    });
}

// Clear selected range classes
function dehighlightSelectedRange() {
    document.querySelectorAll('.calendar-day').forEach(el => {
        el.classList.remove('selected-start', 'selected-end', 'selected-range');
    });
}

// Highlight range selections
function highlightSelectedRange() {
    dehighlightSelectedRange();
    
    if (!selectedStartDateStr) return;
    
    const startParts = selectedStartDateStr.split('-');
    const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const duration = parseInt(durationSelect.value, 10);
    const range = getConsecutiveDaysRange(startDate, duration);
    
    range.forEach((dStr, idx) => {
        const el = calendarDaysContainer.querySelector(`[data-date="${dStr}"]`);
        if (el) {
            if (idx === 0) {
                el.classList.add('selected-start');
            } else if (idx === range.length - 1) {
                el.classList.add('selected-end');
            } else {
                el.classList.add('selected-range');
            }
        }
    });
}

// Clear selection state entirely
function clearRangeSelection() {
    selectedStartDateStr = "";
    selectedEndDateStr = "";
    dehighlightSelectedRange();
    selectedRangeSummary.innerHTML = `<i class="fa-solid fa-circle-info"></i> Kérjük, válassz egy szabad kezdőnapot a naptárban!`;
    selectionFeedbackBar.className = "selection-feedback-bar";
    btnContinueToForm.setAttribute('disabled', 'true');
}

/* ========================================== */
/* IMAGE UPLOADER & PREVIEW LOGIC             */
/* ========================================== */
function setupImageUploader() {
    workspaceUploadArea.addEventListener('click', () => {
        bookingFilesInput.click();
    });
    
    workspaceUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        workspaceUploadArea.style.borderColor = 'var(--primary)';
        workspaceUploadArea.style.backgroundColor = 'var(--primary-glow)';
    });
    
    workspaceUploadArea.addEventListener('dragleave', () => {
        workspaceUploadArea.style.borderColor = '#cbd5e1';
        workspaceUploadArea.style.backgroundColor = '#f8fafc';
    });
    
    workspaceUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        workspaceUploadArea.style.borderColor = '#cbd5e1';
        workspaceUploadArea.style.backgroundColor = '#f8fafc';
        
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        handleUploadedFiles(files);
    });
    
    bookingFilesInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleUploadedFiles(files);
    });
}

function handleUploadedFiles(files) {
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = e.target.result;
            uploadedImages.push(base64Data);
            renderUploadedPreviews();
        };
        reader.readAsDataURL(file);
    });
}

function renderUploadedPreviews() {
    workspaceImagesPreview.innerHTML = '';
    
    uploadedImages.forEach((imgBase64, index) => {
        const container = document.createElement('div');
        container.className = 'preview-thumb-container';
        
        container.innerHTML = `
            <img src="${imgBase64}" alt="Workspace Preview" class="preview-thumb-img">
            <button type="button" class="btn-remove-preview" data-index="${index}">&times;</button>
        `;
        
        container.querySelector('.btn-remove-preview').addEventListener('click', () => {
            uploadedImages.splice(index, 1);
            renderUploadedPreviews();
        });
        
        workspaceImagesPreview.appendChild(container);
    });
}

function clearUploadedImages() {
    uploadedImages = [];
    workspaceImagesPreview.innerHTML = '';
    bookingFilesInput.value = '';
}

/* ========================================== */
/* BOOKING WIZARD FORM SUBMISSION             */
/* ========================================== */
function handleBookingSubmit(e) {
    e.preventDefault();
    
    const duration = parseInt(durationSelect.value, 10);
    const bookingData = {
        name: document.getElementById('booking-name').value,
        phone: document.getElementById('booking-phone').value,
        email: document.getElementById('booking-email').value,
        location: document.getElementById('booking-location').value,
        date: selectedStartDateStr,
        daysCount: duration,
        callbackRequested: bookingCallbackCheckbox.checked,
        workspaceImages: uploadedImages, // Array of base64 workspace photos
        description: document.getElementById('booking-description').value
    };
    
    // Add to Database (localStorage)
    addBooking(bookingData);
    
    // Show success dialog
    showSuccessNotification(selectedStartDateStr, selectedEndDateStr, duration);
    
    // Reset Form, images, range, and transition back to step 1
    bookingForm.reset();
    clearUploadedImages();
    clearRangeSelection();
    renderCalendar();
    
    // Slide back to Calendar step
    stepFormContainer.style.display = 'none';
    stepCalendarContainer.style.display = 'block';
}

function showSuccessNotification(startStr, endStr, days) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(26, 37, 47, 0.9)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '9999';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    
    const card = document.createElement('div');
    card.style.background = '#fff';
    card.style.padding = '40px';
    card.style.borderRadius = '16px';
    card.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.3)';
    card.style.textAlign = 'center';
    card.style.maxWidth = '460px';
    card.style.width = '90%';
    card.style.transform = 'scale(0.8)';
    card.style.transition = 'transform 0.3s ease';
    
    const fmtStart = startStr.replace(/-/g, '. ');
    const fmtEnd = endStr.replace(/-/g, '. ');
    
    card.innerHTML = `
        <div style="font-size: 4rem; color: #2ecc71; margin-bottom: 20px;">
            <i class="fa-solid fa-circle-check"></i>
        </div>
        <h2 style="color: #2c3e50; margin-bottom: 12px; font-family: 'Outfit', sans-serif;">Foglalási kérelem rögzítve!</h2>
        <p style="color: #475569; font-size: 0.95rem; margin-bottom: 25px; line-height: 1.5;">
            Lefoglaltad Sean mestert a <strong>${fmtStart}</strong> és <strong>${fmtEnd}</strong> közötti <strong>${days} napos</strong> időszakra. <br><br>
            A kérelem "Függőben" státuszba került. A Mester hamarosan keresni fog egyeztetés céljából!
        </p>
        <button id="success-close-btn" class="btn btn-primary" style="width: 100%;">Rendben</button>
    `;
    
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        overlay.style.opacity = '1';
        card.style.transform = 'scale(1)';
    }, 10);
    
    card.querySelector('#success-close-btn').addEventListener('click', () => {
        overlay.style.opacity = '0';
        card.style.transform = 'scale(0.8)';
        setTimeout(() => {
            overlay.remove();
        }, 300);
    });
}
