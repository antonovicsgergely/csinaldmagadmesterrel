// database.js - Data management layer using localStorage

// Initial default references
const DEFAULT_REFERENCES = [
    {
        id: "ref-1",
        title: "Rusztikus Kerti Téglafal",
        description: "Egyedi tervezésű kerti válaszfal bontott téglából. A tulajdonos végezte az anyagmozgatást és a habarcskeverést, Sean pedig a falazást irányította és végezte a precíziós munkát. Munkaidő: 2 nap. Megtakarítás: kb. 120 000 Ft.",
        image: "assets/ref_brick_wall.png",
        savings: "120 000 Ft",
        duration: "2 nap",
        clientInvolvement: "Habarcskeverés, tégla hordás"
    },
    {
        id: "ref-2",
        title: "Kerti Grillező és Kemence",
        description: "Beépített kerti sütő és pult bazaltkő és dísztégla burkolattal. A család besegített a kövek mosásában és a betonalap előkészítésében. Munkaidő: 4 nap. Megtakarítás: kb. 250 000 Ft.",
        image: "assets/ref_fireplace.png",
        savings: "250 000 Ft",
        duration: "4 nap",
        clientInvolvement: "Alapozás, kő tisztítás, segédkezés"
    },
    {
        id: "ref-3",
        title: "Modern Terasz Burkolás",
        description: "60x60-as fagyálló porcelán lapok lehelyezése kültéri teraszra szintező rendszerrel. A megrendelő gondoskodott a régi burkolat felveréséről és a ragasztó vödrök keveréséről. Munkaidő: 3 nap. Megtakarítás: kb. 180 000 Ft.",
        image: "assets/ref_tiling.png",
        savings: "180 000 Ft",
        duration: "3 nap",
        clientInvolvement: "Bontás, ragasztó keverés, takarítás"
    }
];

// Helper to generate date strings in YYYY-MM-DD relative to today (June 23, 2026)
function getFutureDate(daysAhead) {
    const d = new Date(2026, 5, 23); // June is month 5 (0-indexed)
    d.setDate(d.getDate() + daysAhead);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

const DEFAULT_BOOKINGS = [
    {
        id: "book-1",
        name: "Kovács János",
        phone: "+36 30 123 4567",
        email: "kovacs.janos@example.hu",
        location: "Budapest, XVII. kerület",
        date: getFutureDate(2), // June 25, 2026
        daysCount: 2,
        callbackRequested: true,
        workspaceImages: [],
        description: "Kerti kerítés építése zsalukőből és dísztéglából. Az anyagot már megvettem, a fiammal ketten lennénk segéderőnek.",
        status: "accepted",
        createdAt: new Date(2026, 5, 20, 14, 30).toISOString()
    },
    {
        id: "book-2",
        name: "Nagy Péter",
        phone: "+36 20 987 6543",
        email: "peter.nagy@gmail.com",
        location: "Érd",
        date: getFutureDate(4), // June 27, 2026
        daysCount: 1,
        callbackRequested: false,
        workspaceImages: [],
        description: "Egy meglévő kerti sütő mellé szeretnék tégla pultot építtetni. Segítség kellene a pontos anyagszükséglet kiszámolásában is.",
        status: "pending",
        createdAt: new Date(2026, 5, 22, 9, 15).toISOString()
    },
    {
        id: "book-3",
        name: "Szabó Mária",
        phone: "+36 70 333 4444",
        email: "szabo.mari@freemail.hu",
        location: "Debrecen",
        date: getFutureDate(6), // June 29, 2026
        daysCount: 3,
        callbackRequested: true,
        workspaceImages: [],
        description: "Teljes fürdőszoba újra-burkolása és válaszfal bontás-építés. A távolság miatt megbeszélés szükséges.",
        status: "rejected",
        createdAt: new Date(2026, 5, 21, 18, 0).toISOString()
    }
];

const DEFAULT_SETTINGS = {
    googleCalendarSync: false,
    googleApiKey: "",
    googleCalendarId: "",
    adminPassword: "admin" // Plaintext for local demo simplicity
};

// Database Initialization
export function initDatabase() {
    if (!localStorage.getItem("mester_references_v3")) {
        localStorage.setItem("mester_references_v3", JSON.stringify(DEFAULT_REFERENCES));
    }
    if (!localStorage.getItem("mester_bookings_v3")) {
        localStorage.setItem("mester_bookings_v3", JSON.stringify(DEFAULT_BOOKINGS));
    }
    if (!localStorage.getItem("mester_settings_v3")) {
        localStorage.setItem("mester_settings_v3", JSON.stringify(DEFAULT_SETTINGS));
    }
}

// References CRUD
export function getReferences() {
    initDatabase();
    return JSON.parse(localStorage.getItem("mester_references_v3"));
}

export function saveReferences(references) {
    localStorage.setItem("mester_references_v3", JSON.stringify(references));
    // Trigger storage event manually for same-window updates
    window.dispatchEvent(new Event('storage'));
}

export function addReference(reference) {
    const references = getReferences();
    reference.id = "ref-" + Date.now();
    references.push(reference);
    saveReferences(references);
    return reference;
}

export function updateReference(id, updatedRef) {
    let references = getReferences();
    references = references.map(ref => ref.id === id ? { ...ref, ...updatedRef } : ref);
    saveReferences(references);
}

export function deleteReference(id) {
    let references = getReferences();
    references = references.filter(ref => ref.id !== id);
    saveReferences(references);
}

// Bookings Actions
export function getBookings() {
    initDatabase();
    return JSON.parse(localStorage.getItem("mester_bookings_v3"));
}

export function saveBookings(bookings) {
    localStorage.setItem("mester_bookings_v3", JSON.stringify(bookings));
    window.dispatchEvent(new Event('storage'));
}

export function addBooking(booking) {
    const bookings = getBookings();
    booking.id = "book-" + Date.now();
    booking.status = "pending";
    booking.createdAt = new Date().toISOString();
    bookings.push(booking);
    saveBookings(bookings);
    return booking;
}

export function updateBookingStatus(id, status) {
    let bookings = getBookings();
    bookings = bookings.map(b => b.id === id ? { ...b, status } : b);
    saveBookings(bookings);
}

export function deleteBooking(id) {
    let bookings = getBookings();
    bookings = bookings.filter(b => b.id !== id);
    saveBookings(bookings);
}

// Settings & Auth
export function getSettings() {
    initDatabase();
    return JSON.parse(localStorage.getItem("mester_settings_v3"));
}

export function saveSettings(settings) {
    const current = getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem("mester_settings_v3", JSON.stringify(updated));
}

export function login(password) {
    const settings = getSettings();
    if (password === settings.adminPassword) {
        sessionStorage.setItem("mester_session", "logged_in_" + Date.now());
        return true;
    }
    return false;
}

export function isLoggedIn() {
    const session = sessionStorage.getItem("mester_session");
    return session && session.startsWith("logged_in_");
}

export function logout() {
    sessionStorage.removeItem("mester_session");
}
