document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.crm-nav-link');
    const pages = document.querySelectorAll('.crm-page');
    const storageKey = 'owner-crm-v3-active-page';
    let onVenuesPageDeactivated = null;

    function activatePage(pageId) {
        if (!pageId) {
            return;
        }
        let pageFound = false;
        pages.forEach(page => {
            const isMatch = page.dataset.page === pageId;
            page.classList.toggle('is-active', isMatch);
            if (isMatch) {
                pageFound = true;
                if (pageId !== 'record-detail') {
                    localStorage.setItem(storageKey, pageId);
                }
            } else if (page.dataset.page === 'venues' && typeof onVenuesPageDeactivated === 'function') {
                onVenuesPageDeactivated();
            }
        });
        navLinks.forEach(link => {
            link.classList.toggle('is-active', link.dataset.pageTarget === pageId);
        });
        if (pageFound) {
            if (window.location.hash !== `#${pageId}`) {
                history.pushState({ page: pageId }, '', `#${pageId}`);
            }
            window.scrollTo(0, 0);
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetPage = link.dataset.pageTarget;
            if (targetPage === 'venues') {
                closeVenueForm({ restoreFocus: false });
            }
            activatePage(targetPage);
        });
    });

    window.addEventListener('popstate', (event) => {
        const pageId = event.state ? event.state.page : (window.location.hash.replace('#', '') || 'venues');
        activatePage(pageId);
    });

    let storedPage = localStorage.getItem(storageKey);
    if (storedPage === 'record-detail') {
        storedPage = 'venues';
    }
    const initialPage = window.location.hash.replace('#', '') || storedPage || 'venues';
    activatePage(initialPage);

    const today = new Date();
    const addDays = (days) => {
        const d = new Date(today);
        d.setDate(d.getDate() + days);
        return d;
    };
    const monthNames = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'noi', 'dec'];
    const formatDate = (date) => `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    const formatTime = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const formatDateTime = (date) => `${formatDate(date)} · ${formatTime(date)}`;
    const normalizeSlotDate = (value) => {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            const normalized = new Date(value.getTime());
            normalized.setSeconds(0, 0);
            return normalized;
        }
        if (typeof value === 'string') {
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) {
                parsed.setSeconds(0, 0);
                return parsed;
            }
        }
        return null;
    };
    const createSlotObject = (value) => {
        const normalized = normalizeSlotDate(value);
        if (!normalized) {
            return null;
        }
        return {
            date: normalized,
            iso: normalized.toISOString(),
            label: formatDateTime(normalized)
        };
    };
    const mapSlots = (slots) => {
        if (!Array.isArray(slots)) {
            return [];
        }
        return slots
            .map(slot => {
                if (slot instanceof Date) {
                    return createSlotObject(slot);
                }
                if (slot?.date instanceof Date) {
                    return createSlotObject(slot.date);
                }
                if (typeof slot?.iso === 'string') {
                    return createSlotObject(slot.iso);
                }
                return null;
            })
            .filter(Boolean);
    };
    const toTimestamp = (value) => {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value.getTime();
        }
        if (typeof value === 'string') {
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed.getTime();
            }
        }
        return Number.NEGATIVE_INFINITY;
    };
    const resolveLatestViewingSlots = (viewing, clientSlots, ownerSlots) => {
        const hasClient = Array.isArray(clientSlots) && clientSlots.length > 0;
        const hasOwner = Array.isArray(ownerSlots) && ownerSlots.length > 0;
        if (!hasClient && !hasOwner) {
            return null;
        }
        const clientTimestamp = hasClient ? toTimestamp(viewing?.clientSlotsUpdatedAt) : Number.NEGATIVE_INFINITY;
        const ownerTimestamp = hasOwner ? toTimestamp(viewing?.ownerSlotsUpdatedAt) : Number.NEGATIVE_INFINITY;
        if (hasClient && hasOwner) {
            if (ownerTimestamp > clientTimestamp) {
                return { source: 'owner', slots: ownerSlots };
            }
            if (clientTimestamp > ownerTimestamp) {
                return { source: 'client', slots: clientSlots };
            }
            if (viewing?.status === 'viewing_request') {
                return { source: 'client', slots: clientSlots };
            }
            return { source: 'owner', slots: ownerSlots };
        }
        return hasOwner
            ? { source: 'owner', slots: ownerSlots }
            : { source: 'client', slots: clientSlots };
    };
    const getPrimaryViewingSlot = (viewing) => {
        if (!viewing) {
            return null;
        }
        const confirmed = mapSlots([viewing.confirmedSlot])[0];
        if (confirmed) {
            return confirmed;
        }
        const ownerSuggestion = mapSlots(viewing.rescheduleSuggestions)[0];
        if (ownerSuggestion) {
            return ownerSuggestion;
        }
        const clientOption = mapSlots(viewing.clientSlots)[0];
        if (clientOption) {
            return clientOption;
        }
        const parsedDate = parseFormattedDate(viewing.date);
        if (parsedDate) {
            if (typeof viewing.hour === 'string' && viewing.hour.includes(':')) {
                const [hours, minutes] = viewing.hour.split(':').map(Number);
                parsedDate.setHours(Number.isFinite(hours) ? hours : 12, Number.isFinite(minutes) ? minutes : 0, 0, 0);
            }
            return createSlotObject(parsedDate);
        }
        return null;
    };
    const buildSlot = (daysOffset, hours, minutes) => {
        const base = addDays(daysOffset);
        base.setHours(hours, minutes, 0, 0);
        return createSlotObject(base);
    };
    const parseFormattedDate = (formatted) => {
        const parts = formatted.split(' ');
        if (parts.length < 3) {
            return null;
        }
        const day = parseInt(parts[0], 10);
        const monthIndex = monthNames.indexOf(parts[1].toLowerCase());
        const year = parseInt(parts[2], 10);
        if (!Number.isFinite(day) || monthIndex === -1 || !Number.isFinite(year)) {
            return null;
        }
        return new Date(year, monthIndex, day);
    };

    const availabilityStorageKey = 'owner-crm-availability-blocks';
    const manualAvailabilityBlocks = new Map();
    let activeAvailabilityMenu = null;
    let activeBookingsDateFilter = null;

    const buildIsoDate = (year, monthIndex, day) => `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const createDateFromISO = (iso) => {
        const [year, month, day] = iso.split('-').map(Number);
        return new Date(year, (month || 1) - 1, day || 1);
    };

    try {
        const storedBlocks = JSON.parse(localStorage.getItem(availabilityStorageKey) || '[]');
        if (Array.isArray(storedBlocks)) {
            storedBlocks.forEach(([dateKey, storedValue]) => {
                if (typeof dateKey !== 'string') {
                    return;
                }
                const entryMap = new Map();
                if (typeof storedValue === 'string') {
                    entryMap.set('*', storedValue);
                } else if (storedValue && typeof storedValue === 'object') {
                    Object.entries(storedValue).forEach(([venueKey, statusValue]) => {
                        if (typeof statusValue === 'string') {
                            entryMap.set(venueKey, statusValue);
                        }
                    });
                }
                if (entryMap.size > 0) {
                    manualAvailabilityBlocks.set(dateKey, entryMap);
                }
            });
        }
    } catch (error) {
        console.warn('Nu s-au putut încărca blocările de disponibilitate.', error);
    }

    const bookings = [
        {
            id: 1,
            client: 'Andrei Popescu',
            event: 'Nuntă',
            venue: 'Forest Lodge',
            date: formatDate(addDays(8)),
            guests: 120,
            status: 'availability_request',
            email: 'andrei.popescu@email.com',
            phone: '+40 723 123 456',
            details: '',
            lastUpdate: addDays(-1)
        },
        {
            id: 2,
            client: 'Studio Creativ',
            event: 'Eveniment Corporate',
            venue: 'Urban Loft',
            date: formatDate(addDays(4)),
            guests: 80,
            status: 'offer_sent',
            autoGenerated: true,
            email: 'office@studiocreativ.ro',
            phone: '+40 721 987 654',
            details: '',
            lastUpdate: addDays(-3)
        },
        {
            id: 3,
            client: 'Mihaela & Vlad',
            event: 'Botez',
            venue: 'Casa Miraval',
            date: formatDate(addDays(15)),
            guests: 60,
            status: 'offer_requested',
            email: 'mihaela.vlad@gmail.com',
            phone: '+40 744 555 121',
            details: '',
            lastUpdate: addDays(-2)
        },
        {
            id: 4,
            client: 'Tech Horizon',
            event: 'Petrecere Privată',
            venue: 'Hub Creativ',
            date: formatDate(addDays(21)),
            guests: 150,
            status: 'pre_booked',
            email: 'events@techhorizon.com',
            phone: '+44 20 1234 5678',
            details: '',
            lastUpdate: addDays(-5)
        },
        {
            id: 5,
            client: 'EMEA Sales Team',
            event: 'Conferință',
            venue: 'Villa Lac',
            date: formatDate(addDays(28)),
            guests: 220,
            status: 'confirmed',
            email: 'sales-emea@company.com',
            phone: '+44 7700 900123',
            details: '',
            lastUpdate: addDays(-7)
        },
        {
            id: 6,
            client: 'Digital Nomads',
            event: 'Eveniment Corporate',
            venue: 'Urban Loft',
            date: formatDate(addDays(12)),
            guests: 40,
            status: 'viewing_request',
            email: 'hello@digitalnomads.io',
            phone: '+1 415 555 0198',
            details: '',
            lastUpdate: addDays(-4)
        },
        {
            id: 7,
            client: 'Laura & Dan',
            event: 'Cununie Civilă',
            venue: 'Forest Lodge',
            date: formatDate(addDays(45)),
            guests: 50,
            status: 'availability_confirmed',
            email: 'laura.dan@email.com',
            phone: '+40 722 888 321',
            details: '',
            lastUpdate: addDays(-6)
        },
        {
            id: 8,
            client: 'Art Gallery',
            event: 'Petrecere Privată',
            venue: 'Hub Creativ',
            date: formatDate(addDays(35)),
            guests: 100,
            status: 'viewing_rescheduled',
            email: 'contact@artgallery.ro',
            phone: '+40 728 654 321',
            details: '',
            lastUpdate: addDays(-8)
        },
        {
            id: 9,
            client: 'Familia Ionescu',
            event: 'Cununie Civilă',
            venue: 'Forest Lodge',
            date: formatDate(addDays(60)),
            guests: 30,
            status: 'cancelled',
            email: 'ionescu.family@yahoo.com',
            phone: '+40 726 000 321',
            details: '',
            lastUpdate: addDays(-9)
        }
    ];

    const viewings = [
        (() => {
            const confirmedSlot = buildSlot(2, 11, 0);
            return {
                id: 1,
                client: 'Ioana Matei',
                venue: 'Villa Lac',
                status: 'viewing_scheduled',
                email: 'ioana.matei@gmail.com',
                phone: '+40 726 456 789',
                notes: '',
                lastUpdate: addDays(-1),
                clientSlots: [],
                rescheduleSuggestions: [],
                clientSlotsUpdatedAt: null,
                ownerSlotsUpdatedAt: null,
                confirmedSlot,
                date: formatDate(confirmedSlot.date),
                hour: formatTime(confirmedSlot.date)
            };
        })(),
        (() => {
            const slotA = buildSlot(4, 9, 30);
            const slotB = buildSlot(5, 11, 0);
            return {
                id: 2,
                client: 'Căsătorim.ro',
                venue: 'Forest Lodge',
                status: 'viewing_request',
                email: 'contact@casatorim.ro',
                phone: '+40 723 111 222',
                notes: '',
                lastUpdate: addDays(-2),
                clientSlots: [slotA, slotB],
                rescheduleSuggestions: [],
                clientSlotsUpdatedAt: addDays(-2),
                ownerSlotsUpdatedAt: null,
                confirmedSlot: null,
                date: formatDate(slotA.date),
                hour: formatTime(slotA.date)
            };
        })(),
        (() => {
            const clientSlotA = buildSlot(6, 14, 30);
            const clientSlotB = buildSlot(7, 16, 0);
            const ownerProposalA = buildSlot(8, 10, 0);
            const ownerProposalB = buildSlot(8, 18, 0);
            return {
                id: 3,
                client: 'Eventify',
                venue: 'Urban Loft',
                status: 'viewing_rescheduled',
                email: 'hello@eventify.ro',
                phone: '+40 735 222 111',
                notes: '',
                lastUpdate: addDays(-3),
                clientSlots: [clientSlotA, clientSlotB],
                rescheduleSuggestions: [ownerProposalA, ownerProposalB],
                clientSlotsUpdatedAt: addDays(-4),
                ownerSlotsUpdatedAt: addDays(-3),
                confirmedSlot: null,
                date: formatDate(ownerProposalA.date),
                hour: formatTime(ownerProposalA.date)
            };
        })(),
        (() => {
            const slotA = buildSlot(5, 17, 0);
            const slotB = buildSlot(6, 12, 30);
            return {
                id: 4,
                client: 'Alex & Ruxandra',
                venue: 'Casa Miraval',
                status: 'viewing_request',
                email: 'alexandrux@gmail.com',
                phone: '+40 725 888 654',
                notes: 'Preferă după ora 16:00 dacă este posibil.',
                lastUpdate: addDays(-4),
                clientSlots: [slotA, slotB],
                rescheduleSuggestions: [],
                clientSlotsUpdatedAt: addDays(-4),
                ownerSlotsUpdatedAt: null,
                confirmedSlot: null,
                date: formatDate(slotA.date),
                hour: formatTime(slotA.date)
            };
        })(),
        (() => {
            const confirmedSlot = buildSlot(10, 10, 30);
            return {
                id: 5,
                client: 'Art Expo Team',
                venue: 'Hub Creativ',
                status: 'viewing_scheduled',
                email: 'team@artexpo.ro',
                phone: '+40 733 654 987',
                notes: '',
                lastUpdate: addDays(-5),
                clientSlots: [],
                rescheduleSuggestions: [],
                clientSlotsUpdatedAt: null,
                ownerSlotsUpdatedAt: null,
                confirmedSlot,
                date: formatDate(confirmedSlot.date),
                hour: formatTime(confirmedSlot.date)
            };
        })()
    ];

    let teamMembers = [
        { id: 1, name: 'Andreea Ionescu', email: 'andreea@ouidoevents.ro', status: 'active' },
        { id: 2, name: 'Paul Radu', email: 'paul.radu@ouidoevents.ro', status: 'active' },
        { id: 3, name: 'Ana Dobre', email: 'ana.dobre@ouidoevents.ro', status: 'pending', invitedAt: addDays(-3) }
    ];
    let teamMemberIdCounter = teamMembers.length;

    let selectedBookingId = null;
    let selectedViewingId = null;
    let pendingViewingFocusId = null;
    let pendingViewingDetailRecord = null;

    let autoOfferEnabled = true;
    let automationToastTimeout = null;

    const bookingStatusOrder = [
        'availability_request',
        'availability_confirmed',
        'offer_requested',
        'offer_sent',
        'viewing_request',
        'viewing_rescheduled',
        'viewing_scheduled',
        'pre_booked',
        'confirmed',
        'rejected',
        'cancelled'
    ];

    const bookingStatusMeta = {
        availability_request: {
            label: 'Cerere disponibilitate',
            className: 'availability_request',
            color: '#b45309',
            owner: {
                description: 'Venue-ul a primit o cerere de disponibilitate.',
                actions: ['Confirmă disponibilitatea', 'Respinge'],
                nextStep: 'Confirmă disponibilitatea'
            },
            client: {
                label: 'Cerere disponibilitate trimisă',
                description: 'Locația a primit cererea ta și verifică disponibilitatea pentru data selectată.',
                actions: ['Anulează cererea']
            }
        },
        availability_confirmed: {
            label: 'Disponibilitate confirmată',
            className: 'availability_confirmed',
            color: '#2563eb',
            owner: {
                description: 'Data este liberă.',
                actions: ['Așteaptă cererea clientului (ofertă sau vizionare)'],
                nextStep: 'Așteaptă cererea clientului (ofertă sau vizionare)'
            },
            client: {
                label: 'Dată disponibilă – poți cere ofertă',
                description: 'Locația a confirmat că data este liberă.',
                actions: ['Cere ofertă', 'Cere vizionare', 'Anulează cererea']
            }
        },
        offer_requested: {
            label: 'Ofertă solicitată',
            className: 'offer_requested',
            color: '#a855f7',
            owner: {
                description: 'Clientul a cerut o ofertă.',
                actions: ['Trimite ofertă', 'Respinge cererea'],
                nextStep: 'Trimite ofertă'
            },
            client: {
                label: 'Ofertă cerută',
                description: 'Ai solicitat o ofertă personalizată, așteptând răspunsul locației.',
                actions: ['Anulează cererea']
            }
        },
        offer_sent: {
            label: 'Ofertă trimisă',
            className: 'offer_sent',
            color: '#7c3aed',
            owner: {
                description: 'Oferta a fost transmisă clientului.',
                actions: ['Pre-rezervă data (la cererea clientului)', 'Respinge'],
                nextStep: 'Pre-rezervă data (la cererea clientului)'
            },
            client: {
                label: 'Ofertă primită',
                description: 'Locația ți-a trimis o ofertă personalizată.',
                actions: ['Vezi ofertă', 'Pune întrebări', 'Cere vizionare', 'Anulează cererea']
            }
        },
        viewing_request: {
            label: 'Cerere vizionare',
            className: 'viewing_request',
            color: '#0ea5e9',
            owner: {
                description: 'Clientul a cerut o vizionare.',
                actions: ['Confirmă vizionarea', 'Propune altă dată', 'Respinge'],
                nextStep: 'Confirmă vizionarea'
            },
            client: {
                label: 'Cerere vizionare trimisă',
                description: 'Ai cerut o vizionare a locației.',
                actions: ['Anulează vizionarea']
            }
        },
        viewing_rescheduled: {
            label: 'Vizionare reprogramată',
            className: 'viewing_rescheduled',
            color: '#0284c7',
            owner: {
                description: 'O nouă dată de vizionare a fost propusă.',
                actions: ['Confirmă vizionarea', 'Anulează vizionarea'],
                nextStep: 'Confirmă vizionarea'
            },
            client: {
                label: 'Vizionare reprogramată',
                description: 'Locația a propus o altă dată pentru vizionare.',
                actions: ['Acceptă noua dată', 'Refuză vizionarea']
            }
        },
        viewing_scheduled: {
            label: 'Vizionare programată',
            className: 'viewing_scheduled',
            color: '#2563eb',
            owner: {
                description: 'Vizionarea a fost confirmată.',
                actions: ['(după tur) Trimite ofertă actualizată', '(opțional) Pre-rezervă data'],
                nextStep: 'Trimite ofertă actualizată după tur'
            },
            client: {
                label: 'Vizionare confirmată',
                description: 'Vizionarea este programată la o dată și oră stabilite.',
                actions: ['Adaugă în calendar', 'Anulează vizionarea']
            }
        },
        pre_booked: {
            label: 'Pre-rezervat',
            className: 'pre_booked',
            color: '#0d9488',
            owner: {
                description: 'Data este blocată temporar (hold).',
                actions: ['Confirmă rezervarea (după avans)', 'Respinge'],
                nextStep: 'Confirmă rezervarea (după avans)'
            },
            client: {
                label: 'Dată blocată temporar (Pre-rezervat)',
                description: 'Locația a blocat data provizoriu.',
                actions: ['Renunță la rezervare']
            }
        },
        confirmed: {
            label: 'Rezervat',
            className: 'confirmed',
            color: '#15803d',
            owner: {
                description: 'Rezervarea a fost confirmată și avansul încasat.',
                actions: ['Adaugă notă internă', 'Vezi detalii'],
                nextStep: 'Adaugă notă internă'
            },
            client: {
                label: 'Rezervat',
                description: 'Rezervarea a fost confirmată de locație (după avans).',
                actions: ['Lasă feedback după eveniment']
            }
        },
        rejected: {
            label: 'Respins',
            className: 'rejected',
            color: '#b91c1c',
            owner: {
                description: 'Cererea a fost refuzată.',
                actions: ['Vezi detalii', 'Adaugă notă internă'],
                nextStep: 'Vezi detalii'
            },
            client: {
                label: 'Indisponibil / Refuzat',
                description: 'Locația nu este disponibilă sau a refuzat cererea.',
                actions: ['Vezi mesajul locației', 'Trimite o nouă cerere']
            }
        },
        cancelled: {
            label: 'Anulat',
            className: 'cancelled',
            color: '#dc2626',
            owner: {
                description: 'Clientul a anulat cererea.',
                actions: ['Vezi detalii', 'Adaugă notă internă'],
                nextStep: 'Vezi detalii'
            },
            client: {
                label: 'Anulat de client',
                description: 'Ai anulat cererea înainte de confirmare.',
                actions: ['Retrimite cererea']
            }
        }
    };

    const bookingActionLibrary = {
        confirm_availability: {
            key: 'confirm_availability',
            label: 'Confirmă disponibilitatea',
            title: 'Data este liberă. Poți trimite automat oferta dacă ai activată opțiunea din setări.'
        },
        send_offer: {
            key: 'send_offer',
            label: 'Trimite ofertă',
            title: 'Trimite propunerea de preț și pachet către client.'
        },
        send_updated_offer: {
            key: 'send_updated_offer',
            label: 'Trimite ofertă actualizată',
            title: 'Trimite oferta actualizată după vizionare.'
        },
        schedule_viewing: {
            key: 'schedule_viewing',
            label: 'Confirmă vizionarea',
            title: 'Confirmă intervalul de vizionare cu clientul.'
        },
        viewing_details: {
            key: 'viewing_details',
            label: 'Vezi detalii vizionare',
            title: 'Deschide programul de vizionări pentru această cerere.'
        },
        propose_new_date: {
            key: 'propose_new_date',
            label: 'Propune altă dată',
            title: 'Propune un nou interval pentru vizionare.'
        },
        pre_reserve: {
            key: 'pre_reserve',
            label: 'Pre-rezervă data',
            title: 'Blochează provizoriu data pentru client.'
        },
        mark_confirmed: {
            key: 'mark_confirmed',
            label: 'Confirmă rezervarea',
            title: 'Marchează rezervarea ca fiind confirmată după avans.'
        },
        reject: {
            key: 'reject',
            label: 'Respinge',
            title: 'Respinge această cerere.'
        },
        cancel_viewing: {
            key: 'cancel_viewing',
            label: 'Anulează vizionarea',
            title: 'Anulează vizionarea programată.'
        },
        log_viewing: {
            key: 'log_viewing',
            label: 'Notează după tur',
            title: 'Adaugă notițe interne după vizionare.'
        },
        add_note: {
            key: 'add_note',
            label: 'Adaugă notă internă',
            title: 'Adaugă o notă internă pentru echipă.'
        },
        open_details: {
            key: 'open_details',
            label: 'Vezi detalii',
            title: 'Deschide detaliile rezervării.'
        }
    };

    const bookingActionsByStatus = {
        availability_request: ['confirm_availability', 'reject'],
        availability_confirmed: ['send_offer', 'open_details'],
        offer_requested: ['send_offer', 'reject'],
        offer_sent: ['pre_reserve', 'reject'],
        viewing_request: ['viewing_details'],
        viewing_rescheduled: ['viewing_details'],
        viewing_scheduled: ['send_updated_offer', 'pre_reserve'],
        pre_booked: ['mark_confirmed', 'reject'],
        confirmed: ['add_note', 'open_details'],
        rejected: ['open_details', 'add_note'],
        cancelled: ['open_details', 'add_note'],
        default: ['open_details']
    };

    const viewingActionsByStatus = {
        viewing_request: [
            { key: 'confirm-slot', label: 'Confirmă intervalul' },
            { key: 'reschedule', label: 'Propune alte intervale' },
            { key: 'reject', label: 'Respinge' }
        ],
        viewing_rescheduled: [
            { key: 'confirm-slot', label: 'Confirmă intervalul' },
            { key: 'reschedule', label: 'Editează propunerile' },
            { key: 'reject', label: 'Respinge' }
        ],
        viewing_scheduled: [
            { key: 'reschedule', label: 'Reprogramează' },
            { key: 'cancel-viewing', label: 'Anulează' }
        ],
        viewing_rejected: [
            { key: 'reschedule', label: 'Propune altă vizionare' }
        ],
        viewing_cancelled: [
            { key: 'reschedule', label: 'Propune altă vizionare' }
        ]
    };

    const viewingStatusMeta = {
        viewing_request: {
            label: 'Cerere vizionare primită',
            clientLabel: 'Cerere vizionare trimisă',
            className: 'viewing_request',
            color: '#0ea5e9',
            description: 'Clientul a propus intervale pentru vizionare. Confirmă sau propune alternative.'
        },
        viewing_rescheduled: {
            label: 'Vizionare reprogramată',
            clientLabel: 'Vizionare reprogramată',
            className: 'viewing_rescheduled',
            color: '#0284c7',
            description: 'Ai trimis variante noi. Așteaptă confirmarea clientului sau ajustează propunerile.'
        },
        viewing_scheduled: {
            label: 'Vizionare programată',
            clientLabel: 'Vizionare confirmată',
            className: 'viewing_scheduled',
            color: '#2563eb',
            description: 'Vizionarea este confirmată în calendar.'
        },
        viewing_rejected: {
            label: 'Vizionare respinsă',
            clientLabel: 'Vizionare respinsă',
            className: 'viewing_rejected',
            color: '#b91c1c',
            description: 'Vizionarea a fost refuzată. Trimite notificarea și oferă alternative.'
        },
        viewing_cancelled: {
            label: 'Vizionare anulată',
            clientLabel: 'Vizionare anulată',
            className: 'viewing_cancelled',
            color: '#ef4444',
            description: 'Vizionarea a fost anulată de client sau de echipă.'
        }
    };

    const statusCatalog = {
        booking: bookingStatusMeta,
        viewing: viewingStatusMeta
    };

    function getClientStatusLabel(statusKey) {
        return bookingStatusMeta[statusKey]?.client?.label || '';
    }

    function ensureBookingTimelineStructure(booking) {
        if (!booking) {
            return [];
        }
        if (!Array.isArray(booking.timeline)) {
            booking.timeline = [];
        }
        return booking.timeline;
    }

    function initializeBookingTimelines() {
        bookings.forEach(booking => {
            const timeline = ensureBookingTimelineStructure(booking);
            booking.clientStatus = booking.clientStatus || getClientStatusLabel(booking.status);
            const hasInitialEntry = timeline.some(entry => entry?.initial);
            if (!hasInitialEntry) {
                const timestamp = booking.lastUpdate instanceof Date ? booking.lastUpdate : new Date();
                timeline.push({
                    id: `init-${booking.id}`,
                    status: booking.status,
                    statusLabel: bookingStatusMeta[booking.status]?.label || booking.status,
                    clientStatusLabel: booking.clientStatus || '',
                    user: 'Sistem CRM',
                    timestamp,
                    reason: 'Status inițial sincronizat',
                    initial: true
                });
            }
        });
    }

    initializeBookingTimelines();

    function logBookingStatusChange(booking, {
        status,
        user,
        reason,
        manual = false,
        previousStatus
    } = {}) {
        if (!booking || !status) {
            return;
        }
        const timeline = ensureBookingTimelineStructure(booking);
        const timestamp = new Date();
        const statusMeta = bookingStatusMeta[status] || {};
        const previousMeta = previousStatus ? bookingStatusMeta[previousStatus] : null;
        timeline.push({
            id: `${booking.id}-${timestamp.getTime()}`,
            status,
            statusLabel: statusMeta.label || status,
            clientStatusLabel: getClientStatusLabel(status),
            user: user || (manual ? 'Owner CRM' : 'Sistem CRM'),
            timestamp,
            reason: reason || '',
            manual,
            previousStatus: previousStatus || null,
            previousStatusLabel: previousMeta?.label || previousStatus || null
        });
    }

    const venues = [
        {
            name: 'Villa Lac',
            city: 'Snagov',
            address: 'Șoseaua Snagov 1',
            description: 'Complex premium pe malul lacului, cu pavilioane elegante și ponton privat.',
            status: 'activ',
            minCapacity: 120,
            maxCapacity: 220,
            pricePerGuest: 180,
            image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=60',
            menuPdfs: ['villa-lac-meniu-standard-2024.pdf', 'villa-lac-bar-selection.pdf'],
            styles: ['Elegant', 'Exclusivist', 'Panoramic'],
            eventTypes: ['Nuntă', 'Eveniment Corporate', 'Petrecere Privată'],
            amenities: ['Event planner dedicat', 'Parcare privată', 'Vedere lac', 'Wi-Fi gratuit de mare viteză', 'Ponton']
        },
        {
            name: 'Forest Lodge',
            city: 'Brașov',
            address: 'Strada Poienelor 12',
            description: 'Refugiu în mijlocul pădurii cu zonă de ceremonie în aer liber.',
            status: 'activ',
            minCapacity: 80,
            maxCapacity: 160,
            pricePerGuest: 145,
            image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=60',
            menuPdfs: ['forest-lodge-meniu-de-baza.pdf'],
            styles: ['Natură', 'Rustic', 'Boho-Chic'],
            eventTypes: ['Nuntă', 'Botez', 'Petrecere Privată'],
            amenities: ['Ceremonie in aer liber', 'Cazare invitati', 'Kids corner', 'Terasă / Grădină']
        },
        {
            name: 'Urban Loft',
            city: 'București',
            address: 'Strada Fabricii 25',
            description: 'Spațiu industrial modern cu vedere panoramică asupra orașului.',
            status: 'activ',
            minCapacity: 50,
            maxCapacity: 120,
            pricePerGuest: 160,
            image: 'https://images.unsplash.com/photo-1529429617124-aee711a52795?auto=format&fit=crop&w=900&q=60',
            menuPdfs: ['urban-loft-meniu-urban.pdf', 'urban-loft-drink-list.pdf'],
            styles: ['Modern', 'Minimalist', 'Central'],
            eventTypes: ['Eveniment Corporate', 'Nuntă', 'Petrecere Privată'],
            amenities: ['Bar (serviciu complet)', 'Servicii de catering personalizate', 'Sistem de sunet și lumini profesional', 'Spațiu lounge', 'Wi-Fi gratuit de mare viteză']
        },
        {
            name: 'Casa Miraval',
            city: 'Cluj-Napoca',
            address: 'Strada Viilor 8',
            description: 'Vilă boutique înconjurată de grădini mediteraneene.',
            status: 'în onboarding',
            minCapacity: 40,
            maxCapacity: 90,
            pricePerGuest: 120,
            image: 'https://images.unsplash.com/photo-1590490359854-dfba19688d97?auto=format&fit=crop&w=900&q=60',
            menuPdfs: [],
            styles: ['Elegant', 'Rustic'],
            eventTypes: ['Botez', 'Cununie Civilă', 'Nuntă'],
            amenities: ['Terasă / Grădină', 'Cameră miri', 'Decor (servicii de amenajare)']
        }
    ];

    const venuePageContent = document.getElementById('venue-page-content');
    const venueManagementPanel = document.getElementById('venue-management-panel');
    const venueForm = document.getElementById('venue-management-form');
    const venueFormTitle = venueManagementPanel?.querySelector('[data-venue-form-title]');
    const venueFormSubtitle = venueManagementPanel?.querySelector('[data-venue-form-subtitle]');
    const venueFormSubmitButton = venueManagementPanel?.querySelector('[data-venue-form-submit]');
    const venueMenuPdfInput = document.getElementById('venue-menu-pdfs');
    const venueMenuPdfList = document.getElementById('venue-menu-pdfs-list');
    const venueMenuPdfEmpty = venueManagementPanel?.querySelector('[data-menu-pdfs-empty]');
    const venueCardsGrid = document.getElementById('venue-cards');
    const venueAddButton = document.querySelector('[data-venue-add-trigger]');
    const venueBackButton = document.querySelector('[data-venue-back-trigger]');
    const venuesTitleEl = document.querySelector('[data-venues-title]');
    const venuesSubtitleEl = document.querySelector('[data-venues-subtitle]');
    const venuesContextEl = document.querySelector('[data-venues-context]');
    const openVenueButtons = document.querySelectorAll('[data-venue-form-open]');
    const defaultVenuesTitle = venuesTitleEl?.textContent?.trim() || '';
    const defaultVenuesSubtitle = venuesSubtitleEl?.textContent?.trim() || '';
    const contextInitiallyHidden = venuesContextEl?.hasAttribute('hidden') || false;
    const venueNameInput = document.getElementById('venue-name');
    const venueCityInput = document.getElementById('venue-city');
    const venueAddressInput = document.getElementById('venue-address');
    const venueStatusSelect = document.getElementById('venue-status');
    const venueDescriptionInput = document.getElementById('venue-description');
    const capacityMinInput = document.getElementById('capacity-min');
    const capacityMaxInput = document.getElementById('capacity-max');
    const priceStartInput = document.getElementById('price-start');

    let venueMenuPdfNames = [];
    let currentVenueFormMode = 'create';
    let currentVenueIndex = null;

    function updateVenueMenuPdfsList() {
        if (!venueMenuPdfList) {
            return;
        }
        venueMenuPdfList.innerHTML = '';
        venueMenuPdfNames.forEach((fileName, index) => {
            const item = document.createElement('li');
            const nameSpan = document.createElement('span');
            nameSpan.textContent = fileName;
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'document-upload-remove';
            removeBtn.textContent = 'Șterge';
            removeBtn.setAttribute('aria-label', `Șterge ${fileName}`);
            removeBtn.addEventListener('click', () => {
                venueMenuPdfNames.splice(index, 1);
                updateVenueMenuPdfsList();
            });
            item.append(nameSpan, removeBtn);
            venueMenuPdfList.appendChild(item);
        });
        if (venueMenuPdfEmpty) {
            venueMenuPdfEmpty.hidden = venueMenuPdfNames.length > 0;
        }
    }

    function populateVenueCheckboxGroup(name, values) {
        if (!venueForm) {
            return;
        }
        const checkboxes = venueForm.querySelectorAll(`input[name="${name}"]`);
        checkboxes.forEach(input => {
            input.checked = Array.isArray(values) ? values.includes(input.value) : false;
        });
    }

    function openVenueForm(mode = 'create', index = null) {
        if (!venueManagementPanel || !venueForm) {
            return;
        }
        const isEdit = mode === 'edit' && Number.isInteger(index) && index >= 0 && index < venues.length;
        currentVenueFormMode = isEdit ? 'edit' : 'create';
        currentVenueIndex = isEdit ? index : null;

        venueForm.reset();
        populateVenueCheckboxGroup('venue-styles', []);
        populateVenueCheckboxGroup('venue-events', []);
        populateVenueCheckboxGroup('venue-amenities', []);
        venueMenuPdfNames = [];

        if (isEdit) {
            const venue = venues[index];
            if (venueNameInput) {
                venueNameInput.value = venue.name || '';
            }
            if (venueCityInput) {
                venueCityInput.value = venue.city || '';
            }
            if (venueAddressInput) {
                venueAddressInput.value = venue.address || '';
            }
            if (venueStatusSelect) {
                venueStatusSelect.value = venue.status || 'activ';
            }
            if (venueDescriptionInput) {
                venueDescriptionInput.value = venue.description || '';
            }
            if (capacityMinInput) {
                capacityMinInput.value = Number.isFinite(venue.minCapacity) ? venue.minCapacity : '';
            }
            if (capacityMaxInput) {
                capacityMaxInput.value = Number.isFinite(venue.maxCapacity) ? venue.maxCapacity : '';
            }
            if (priceStartInput) {
                priceStartInput.value = Number.isFinite(venue.pricePerGuest) ? venue.pricePerGuest : '';
            }
            populateVenueCheckboxGroup('venue-styles', Array.isArray(venue.styles) ? venue.styles : []);
            populateVenueCheckboxGroup('venue-events', Array.isArray(venue.eventTypes) ? venue.eventTypes : []);
            populateVenueCheckboxGroup('venue-amenities', Array.isArray(venue.amenities) ? venue.amenities : []);
            venueMenuPdfNames = Array.isArray(venue.menuPdfs) ? [...venue.menuPdfs] : [];
        } else if (venueStatusSelect) {
            venueStatusSelect.value = 'activ';
        }

        if (venueMenuPdfInput) {
            venueMenuPdfInput.value = '';
        }
        updateVenueMenuPdfsList();

        const titleText = isEdit ? 'Editează locație' : 'Creează locație';
        const subtitleText = isEdit
            ? 'Actualizează informațiile locației selectate.'
            : 'Completează detaliile de mai jos pentru a adăuga o locație nouă.';

        if (venueFormTitle) {
            venueFormTitle.textContent = titleText;
        }
        if (venueFormSubtitle) {
            venueFormSubtitle.textContent = subtitleText;
        }
        if (venueFormSubmitButton) {
            venueFormSubmitButton.textContent = isEdit ? 'Salvează modificările' : 'Salvează locația';
        }
        if (venuesTitleEl) {
            venuesTitleEl.textContent = titleText;
        }
        if (venuesSubtitleEl) {
            venuesSubtitleEl.textContent = subtitleText;
        }
        if (venuesContextEl) {
            venuesContextEl.hidden = true;
        }
        venueAddButton?.setAttribute('hidden', 'true');
        venueBackButton?.removeAttribute('hidden');
        if (venueCardsGrid) {
            venueCardsGrid.hidden = true;
        }
        venuePageContent?.classList.add('is-form-active');
        venueManagementPanel.hidden = false;
        window.requestAnimationFrame(() => {
            venueManagementPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            venueNameInput?.focus();
        });
    }

    function closeVenueForm(options = {}) {
        const { restoreFocus = true } = options;
        if (!venueManagementPanel || !venueForm) {
            return;
        }
        venueForm.reset();
        populateVenueCheckboxGroup('venue-styles', []);
        populateVenueCheckboxGroup('venue-events', []);
        populateVenueCheckboxGroup('venue-amenities', []);
        venueMenuPdfNames = [];
        if (venueMenuPdfInput) {
            venueMenuPdfInput.value = '';
        }
        updateVenueMenuPdfsList();
        currentVenueFormMode = 'create';
        currentVenueIndex = null;
        venueManagementPanel.hidden = true;
        if (venueCardsGrid) {
            venueCardsGrid.hidden = false;
        }
        venuePageContent?.classList.remove('is-form-active');
        if (venuesTitleEl) {
            venuesTitleEl.textContent = defaultVenuesTitle;
        }
        if (venuesSubtitleEl) {
            venuesSubtitleEl.textContent = defaultVenuesSubtitle;
        }
        if (venuesContextEl) {
            venuesContextEl.hidden = contextInitiallyHidden;
        }
        venueAddButton?.removeAttribute('hidden');
        venueBackButton?.setAttribute('hidden', 'true');
        if (restoreFocus) {
            window.requestAnimationFrame(() => venueAddButton?.focus());
        }
    }

    onVenuesPageDeactivated = () => closeVenueForm({ restoreFocus: false });

    openVenueButtons.forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.venueFormOpen === 'edit' ? 'edit' : 'create';
            const indexValue = Number.parseInt(button.dataset.venueIndex || '', 10);
            openVenueForm(mode, Number.isInteger(indexValue) ? indexValue : null);
        });
    });

    venueMenuPdfInput?.addEventListener('change', (event) => {
        const files = Array.from(event.target.files || []);
        files.forEach(file => {
            if (file && file.name && !venueMenuPdfNames.includes(file.name)) {
                venueMenuPdfNames.push(file.name);
            }
        });
        if (venueMenuPdfInput) {
            venueMenuPdfInput.value = '';
        }
        updateVenueMenuPdfsList();
    });

    venueForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(venueForm);
        const nameValue = (formData.get('venue-name') || '').toString().trim();
        if (!nameValue) {
            window.alert('Numele locației este obligatoriu.');
            venueNameInput?.focus();
            return;
        }
        const cityValue = (formData.get('venue-city') || '').toString().trim();
        if (!cityValue) {
            window.alert('Orașul este obligatoriu.');
            venueCityInput?.focus();
            return;
        }
        const addressValue = (formData.get('venue-address') || '').toString().trim();
        const descriptionValue = (formData.get('venue-description') || '').toString().trim();
        const statusValue = (formData.get('venue-status') || 'activ').toString();
        const minCapacityValue = Number.parseInt(formData.get('capacity-min'), 10);
        const maxCapacityValue = Number.parseInt(formData.get('capacity-max'), 10);
        const priceValue = Number.parseFloat(formData.get('price-start'));

        const normalizedMin = Number.isFinite(minCapacityValue) ? minCapacityValue : null;
        const normalizedMax = Number.isFinite(maxCapacityValue) ? maxCapacityValue : null;
        if (normalizedMin !== null && normalizedMax !== null && normalizedMin > normalizedMax) {
            window.alert('Capacitatea minimă nu poate fi mai mare decât capacitatea maximă.');
            capacityMinInput?.focus();
            return;
        }
        const normalizedPrice = Number.isFinite(priceValue) ? Math.round(priceValue) : null;
        const styles = formData.getAll('venue-styles');
        const eventTypes = formData.getAll('venue-events');
        const amenities = formData.getAll('venue-amenities');

        const baseVenueData = {
            name: nameValue,
            city: cityValue,
            address: addressValue,
            description: descriptionValue,
            status: statusValue || 'activ',
            minCapacity: normalizedMin,
            maxCapacity: normalizedMax,
            pricePerGuest: normalizedPrice,
            menuPdfs: [...venueMenuPdfNames],
            styles: Array.from(new Set(styles)),
            eventTypes: Array.from(new Set(eventTypes)),
            amenities: Array.from(new Set(amenities))
        };

        if (currentVenueFormMode === 'edit' && Number.isInteger(currentVenueIndex) && venues[currentVenueIndex]) {
            venues[currentVenueIndex] = {
                ...venues[currentVenueIndex],
                ...baseVenueData
            };
        } else {
            venues.push(baseVenueData);
        }

        renderVenueCards();
        closeVenueForm();
    });

    const venueCancelButtons = document.querySelectorAll('[data-venue-form-cancel]');
    venueCancelButtons.forEach(button => {
        button.addEventListener('click', () => {
            closeVenueForm();
        });
    });

    updateVenueMenuPdfsList();

    function getVenueMenuPdfs(venueName) {
        const venue = venues.find(entry => entry.name === venueName);
        if (!venue || !Array.isArray(venue.menuPdfs) || venue.menuPdfs.length === 0) {
            return null;
        }
        return venue.menuPdfs;
    }

    function buildMenuDeliveryMessage(menuPdfs, clientName) {
        if (!menuPdfs || menuPdfs.length === 0) {
            return '';
        }
        const label = menuPdfs.length > 1 ? 'Meniurile PDF' : 'Meniul PDF';
        const fileSummary = menuPdfs.join(', ');
        const recipient = clientName ? `către ${clientName}` : 'către client';
        return `${label} (${fileSummary}) au fost trimise automat ${recipient}.`;
    }

    const monthlyOccupancyData = Array.from({ length: 12 }).map((_, i) => {
        const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear().toString().slice(-2);
        return {
            month: `${month.charAt(0).toUpperCase() + month.slice(1)} '${year}`,
            occupancy: Math.floor(Math.random() * 71) + 20
        };
    });

    const eventTypeDistributionData = [
        { type: 'Nuntă', count: 45, color: '#8b5cf6' },
        { type: 'Eveniment Corporate', count: 25, color: '#22c55e' },
        { type: 'Botez', count: 18, color: '#f59e0b' },
        { type: 'Petrecere Privată', count: 12, color: '#f43f5e' }
    ];

    function populateSelect(selectEl, options, includeAll = true, allText = 'Toate locațiile') {
        if (!selectEl) {
            return;
        }
        selectEl.innerHTML = '';
        if (includeAll) {
            const opt = document.createElement('option');
            opt.value = 'all';
            opt.textContent = allText;
            selectEl.appendChild(opt);
        }
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            selectEl.appendChild(opt);
        });
    }

    const venuesSelect = new Set(venues.map(item => item.name));
    bookings.forEach(item => venuesSelect.add(item.venue));
    viewings.forEach(item => venuesSelect.add(item.venue));
    const hasMultipleVenues = venuesSelect.size > 1;

    function getManualVenueKey(venue) {
        if (!hasMultipleVenues) {
            return '*';
        }
        if (!venue || venue === 'all') {
            return null;
        }
        return venue;
    }

    function getManualStatusesForDate(dateISO, venue) {
        const entry = manualAvailabilityBlocks.get(dateISO);
        if (!entry) {
            return [];
        }
        if (!hasMultipleVenues) {
            const status = entry.get('*');
            return status ? [{ status, venue: null }] : [];
        }
        if (venue && venue !== 'all') {
            const specific = entry.get(venue);
            if (specific) {
                return [{ status: specific, venue }];
            }
            const wildcard = entry.get('*');
            return wildcard ? [{ status: wildcard, venue }] : [];
        }
        const results = [];
        entry.forEach((status, venueKey) => {
            if (venueKey === '*') {
                venuesSelect.forEach(name => {
                    results.push({ status, venue: name });
                });
            } else {
                results.push({ status, venue: venueKey });
            }
        });
        return results;
    }

    function getManualStatusForVenue(dateISO, venue) {
        const entry = manualAvailabilityBlocks.get(dateISO);
        if (!entry) {
            return null;
        }
        if (!hasMultipleVenues) {
            return entry.get('*') || null;
        }
        if (venue && venue !== 'all') {
            return entry.get(venue) || entry.get('*') || null;
        }
        return null;
    }

    function setManualStatusFor(dateISO, venue, status) {
        const venueKey = getManualVenueKey(venue);
        if (venueKey === null) {
            return;
        }
        const key = venueKey;
        let entry = manualAvailabilityBlocks.get(dateISO);
        if (!entry) {
            entry = new Map();
            manualAvailabilityBlocks.set(dateISO, entry);
        }
        if (hasMultipleVenues && entry.has('*') && key !== '*') {
            entry.delete('*');
        }
        if (!status) {
            if (!entry.delete(key) && hasMultipleVenues && entry.has('*')) {
                entry.delete('*');
            }
        } else {
            entry.set(key, status);
        }
        if (entry.size === 0) {
            manualAvailabilityBlocks.delete(dateISO);
        }
        saveAvailabilityBlocks();
    }

    populateSelect(document.getElementById('bookings-venue-filter'), Array.from(venuesSelect).sort(), true, 'Toate locațiile');
    populateSelect(document.getElementById('viewings-venue-filter'), Array.from(venuesSelect).sort(), true);
    populateSelect(document.getElementById('viewings-calendar-venue-filter'), Array.from(venuesSelect).sort(), true);
    populateSelect(document.getElementById('availability-venue-filter'), Array.from(venuesSelect).sort(), true);
    document.getElementById('availability-venue-filter')?.addEventListener('change', renderMonthlyCalendar);

    const bookingStatusFilter = document.getElementById('bookings-status-filter');
    if (bookingStatusFilter) {
        populateSelect(bookingStatusFilter, bookingStatusOrder, true, 'Toate statusurile');
        Array.from(bookingStatusFilter.options).forEach(option => {
            if (option.value !== 'all') {
                option.textContent = bookingStatusMeta[option.value]?.label || option.value;
            }
        });
    }

    function hexToRgba(hex, alpha = 1) {
        if (typeof hex !== 'string') {
            return null;
        }
        const normalized = hex.replace('#', '');
        if (![3, 6].includes(normalized.length)) {
            return null;
        }
        const full = normalized.length === 3 ? normalized.split('').map(char => char + char).join('') : normalized;
        const bigint = parseInt(full, 16);
        if (Number.isNaN(bigint)) {
            return null;
        }
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function createStatusChip(status, category = 'booking') {
        const catalogue = statusCatalog[category] || {};
        const meta = catalogue[status];
        const span = document.createElement('span');
        span.className = 'status-chip';
        const className = meta?.className || (typeof status === 'string' ? status : 'necunoscut');
        span.dataset.status = className;
        span.textContent = meta?.label || status || 'Necunoscut';
        if (meta?.color) {
            const backgroundColor = hexToRgba(meta.color, 0.18);
            if (backgroundColor) {
                span.style.backgroundColor = backgroundColor;
            }
            span.style.color = meta.color;
        }
        return span;
    }

    function showAutomationToast(message) {
        const toast = document.getElementById('automation-toast') || document.getElementById('availability-toast');
        if (!toast) {
            return;
        }
        toast.textContent = message;
        toast.classList.add('is-visible');
        if (automationToastTimeout) {
            clearTimeout(automationToastTimeout);
        }
        automationToastTimeout = setTimeout(() => {
            toast.classList.remove('is-visible');
            automationToastTimeout = null;
        }, 5000);
    }

    function hideAutomationToast() {
        const toast = document.getElementById('automation-toast');
        if (!toast) {
            return;
        }
        toast.classList.remove('is-visible');
        if (automationToastTimeout) {
            clearTimeout(automationToastTimeout);
            automationToastTimeout = null;
        }
    }

    function saveAvailabilityBlocks() {
        try {
            const serialized = JSON.stringify(Array.from(manualAvailabilityBlocks.entries()).map(([dateKey, map]) => {
                const obj = Object.fromEntries(map);
                return [dateKey, obj];
            }));
            localStorage.setItem(availabilityStorageKey, serialized);
        } catch (error) {
            console.warn('Nu s-au putut salva blocările de disponibilitate.', error);
        }
    }

    function hideAvailabilityQuickMenu() {
        if (!activeAvailabilityMenu) {
            return;
        }
        const { menu, dayCell } = activeAvailabilityMenu;
        menu.remove();
        dayCell.classList.remove('is-menu-open');
        activeAvailabilityMenu = null;
    }

    function formatFriendlyDateFromISO(dateISO) {
        const date = createDateFromISO(dateISO);
        if (Number.isNaN(date.getTime())) {
            return dateISO;
        }
        return formatDate(date);
    }

    function setAvailabilityStatus(dateISO, status, venue) {
        if (!dateISO || !status) {
            return;
        }
        const previousStatus = getManualStatusForVenue(dateISO, venue);
        const friendlyDate = formatFriendlyDateFromISO(dateISO);

        if (status === 'manual_free') {
            if (!previousStatus) {
                return;
            }
            setManualStatusFor(dateISO, venue, null);
            showAutomationToast(`Data ${friendlyDate} este din nou liberă.`);
            renderMonthlyCalendar();
            return;
        }

        if (previousStatus === status) {
            setManualStatusFor(dateISO, venue, null);
            showAutomationToast(`Blocarea pentru ${friendlyDate} a fost eliberată.`);
            renderMonthlyCalendar();
            return;
        }

        setManualStatusFor(dateISO, venue, status);
        if (status === 'manual_reserved') {
            showAutomationToast(`Data ${friendlyDate} a fost marcată ca rezervată manual ✅`);
        } else if (status === 'manual_pre_reserved') {
            showAutomationToast(`Data ${friendlyDate} a fost trecută în pre-rezervă manual 🔖`);
        }
        renderMonthlyCalendar();
    }

    function buildIsoDateFromBooking(formattedDate) {
        const parsed = parseFormattedDate(formattedDate);
        if (!parsed) {
            return null;
        }
        return buildIsoDate(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }

    function navigateToBookingsForDate(dateISO) {
        activeBookingsDateFilter = dateISO;
        const friendlyDate = formatFriendlyDateFromISO(dateISO);
        activatePage('bookings');
        renderBookingsTable();
        showAutomationToast(`Cererile pentru ${friendlyDate} sunt afișate în pagină.`);
    }

    function getInitialsFromName(name = '') {
        return name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0].toUpperCase())
            .join('') || 'OU';
    }

    function isValidEmail(email) {
        if (typeof email !== 'string') {
            return false;
        }
        const trimmed = email.trim();
        if (!trimmed) {
            return false;
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(trimmed);
    }

    function createTeamActionButton(label, action, variant = 'ghost') {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `crm-button ${variant} sm`;
        button.dataset.teamAction = action;
        button.textContent = label;
        return button;
    }

    function setTeamMemberEditing(targetId, isEditing) {
        teamMembers.forEach(member => {
            member.editing = member.id === targetId ? isEditing : false;
        });
    }

    function renderTeamAccessList() {
        if (!teamAccessListEl) {
            return;
        }
        teamAccessListEl.innerHTML = '';
        let focusInput = null;

        if (!teamMembers.length) {
            if (teamEmptyState) {
                teamEmptyState.hidden = false;
            }
            return;
        }

        if (teamEmptyState) {
            teamEmptyState.hidden = true;
        }

        teamMembers.forEach(member => {
            const memberEl = document.createElement('div');
            memberEl.className = 'team-member';
            memberEl.dataset.memberId = String(member.id);

            const headerEl = document.createElement('div');
            headerEl.className = 'team-member-header';

            const mainEl = document.createElement('div');
            mainEl.className = 'team-member-main';

            const avatarEl = document.createElement('div');
            avatarEl.className = 'team-member-avatar';
            avatarEl.textContent = getInitialsFromName(member.name);

            const infoEl = document.createElement('div');
            infoEl.className = 'team-member-info';

            const nameEl = document.createElement('span');
            nameEl.className = 'team-member-name';
            nameEl.textContent = member.name;
            infoEl.appendChild(nameEl);

            if (member.email) {
                const emailEl = document.createElement('span');
                emailEl.className = 'team-member-email';
                emailEl.textContent = member.email;
                infoEl.appendChild(emailEl);
            }

            const statusEl = document.createElement('span');
            statusEl.className = 'team-member-status';
            if (member.status === 'active') {
                statusEl.classList.add('is-active');
                statusEl.textContent = 'Activ';
            } else {
                statusEl.classList.add('is-pending');
                statusEl.textContent = 'Invitație trimisă';
            }
            infoEl.appendChild(statusEl);

            mainEl.append(avatarEl, infoEl);
            headerEl.appendChild(mainEl);

            const actionsEl = document.createElement('div');
            actionsEl.className = 'team-member-actions';

            if (member.editing) {
                actionsEl.append(
                    createTeamActionButton('Șterge', 'delete', 'danger')
                );
            } else {
                if (member.status === 'pending') {
                    actionsEl.append(createTeamActionButton('Retrimite invitație', 'resend', 'primary'));
                }
                actionsEl.append(
                    createTeamActionButton('Editează', 'edit'),
                    createTeamActionButton('Șterge', 'delete', 'danger')
                );
            }

            if (actionsEl.children.length) {
                headerEl.appendChild(actionsEl);
            }
            memberEl.appendChild(headerEl);

            if (member.editing) {
                const editWrapper = document.createElement('div');
                editWrapper.className = 'team-member-edit';

                const form = document.createElement('form');
                form.className = 'team-member-edit-form';
                form.dataset.memberId = String(member.id);

                const nameInput = document.createElement('input');
                nameInput.type = 'text';
                nameInput.name = 'name';
                nameInput.placeholder = 'Nume complet';
                nameInput.required = true;
                nameInput.value = member.name;

                const emailInput = document.createElement('input');
                emailInput.type = 'email';
                emailInput.name = 'email';
                emailInput.placeholder = 'Email colaborator';
                emailInput.required = true;
                emailInput.value = member.email;

                const editActions = document.createElement('div');
                editActions.className = 'edit-actions';

                const saveBtn = document.createElement('button');
                saveBtn.type = 'submit';
                saveBtn.className = 'crm-button primary sm';
                saveBtn.textContent = 'Salvează';

                const cancelBtn = createTeamActionButton('Renunță', 'cancel-edit');

                editActions.append(saveBtn, cancelBtn);
                form.append(nameInput, emailInput, editActions);
                editWrapper.appendChild(form);
                memberEl.appendChild(editWrapper);

                if (!focusInput) {
                    focusInput = nameInput;
                }
            }

            teamAccessListEl.appendChild(memberEl);
        });

        if (focusInput) {
            requestAnimationFrame(() => focusInput.focus());
        }
    }

    function showAvailabilityQuickMenu(dayCell, { dateISO }) {
        if (!(dayCell instanceof HTMLElement)) {
            return;
        }
        if (activeAvailabilityMenu?.dayCell === dayCell) {
            hideAvailabilityQuickMenu();
            return;
        }
        hideAvailabilityQuickMenu();

        const venueFilter = document.getElementById('availability-venue-filter');
        const currentVenueFilter = venueFilter ? venueFilter.value : 'all';
        let selectedVenue = currentVenueFilter && currentVenueFilter !== 'all'
            ? currentVenueFilter
            : null;
        if (!hasMultipleVenues) {
            selectedVenue = Array.from(venuesSelect)[0] || null;
        } else if (!selectedVenue) {
            selectedVenue = Array.from(venuesSelect).sort()[0] || null;
        }

        const menu = document.createElement('div');
        menu.className = 'availability-quick-menu';
        menu.setAttribute('role', 'menu');

        const title = document.createElement('h4');
        title.textContent = 'Blocare rapidă';
        const subtitle = document.createElement('span');
        subtitle.className = 'availability-quick-menu-date';
        const friendlyDate = formatFriendlyDateFromISO(dateISO);
        subtitle.textContent = friendlyDate;

        const venueSelectWrapper = document.createElement('div');
        let locationSelect = null;
        if (hasMultipleVenues) {
            venueSelectWrapper.style.display = 'flex';
            venueSelectWrapper.style.flexDirection = 'column';
            venueSelectWrapper.style.gap = '6px';

            const venueLabel = document.createElement('label');
            venueLabel.style.fontSize = '0.72rem';
            venueLabel.style.textTransform = 'uppercase';
            venueLabel.style.letterSpacing = '0.05em';
            venueLabel.style.color = 'var(--muted-color)';
            venueLabel.textContent = 'Pentru locația';

            locationSelect = document.createElement('select');
            locationSelect.style.padding = '6px 8px';
            locationSelect.style.borderRadius = '8px';
            locationSelect.style.border = '1px solid var(--border-color)';
            locationSelect.style.fontSize = '0.85rem';

            Array.from(venuesSelect).sort().forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                locationSelect.appendChild(option);
            });
            if (selectedVenue) {
                locationSelect.value = selectedVenue;
            }

            venueSelectWrapper.append(venueLabel, locationSelect);
        }

        const subtitleWrapper = document.createElement('div');
        subtitleWrapper.style.display = 'flex';
        subtitleWrapper.style.flexDirection = 'column';
        subtitleWrapper.style.gap = '4px';
        subtitleWrapper.append(subtitle);
        if (venueSelectWrapper.firstChild) {
            subtitleWrapper.append(venueSelectWrapper);
        }

        const getManualBlockState = () => Boolean(getManualStatusForVenue(dateISO, selectedVenue));

        const hasAutoBooking = dayCell.dataset.hasAuto === 'true';

        const reserveBtn = document.createElement('button');
        reserveBtn.type = 'button';
        reserveBtn.dataset.action = 'reserve';
        reserveBtn.textContent = 'Marchează rezervat';

        const preReserveBtn = document.createElement('button');
        preReserveBtn.type = 'button';
        preReserveBtn.dataset.action = 'pre-reserve';
        preReserveBtn.textContent = 'Marchează pre-rezervat';

        const freeBtn = document.createElement('button');
        freeBtn.type = 'button';
        freeBtn.dataset.action = 'free';
        freeBtn.textContent = 'Marchează liber';

        const viewBtn = document.createElement('button');
        viewBtn.type = 'button';
        viewBtn.dataset.action = 'view';
        viewBtn.textContent = 'Vezi cererile zilei';

        const updateButtonsState = () => {
            const hasManualBlock = getManualBlockState();
            if (!hasManualBlock) {
                freeBtn.hidden = true;
                freeBtn.title = '';
            } else {
                freeBtn.hidden = false;
                freeBtn.disabled = false;
                freeBtn.title = '';
            }
            if (hasAutoBooking && !hasManualBlock) {
                freeBtn.hidden = true;
            }
        };

        updateButtonsState();

        if (hasMultipleVenues && locationSelect) {
            locationSelect.addEventListener('change', () => {
                selectedVenue = locationSelect.value;
                subtitle.textContent = `${friendlyDate} · ${selectedVenue}`;
                updateButtonsState();
            });
            subtitle.textContent = `${friendlyDate} · ${selectedVenue}`;
        }

        menu.append(title, subtitleWrapper, reserveBtn, preReserveBtn, freeBtn, viewBtn);
        document.body.appendChild(menu);

        const rect = dayCell.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();

        let top = rect.bottom + 8;
        if (top + menuRect.height > window.innerHeight - 8) {
            top = rect.top - menuRect.height - 8;
        }
        if (top < 8) {
            top = 8;
        }

        let left = rect.left + (rect.width / 2) - (menuRect.width / 2);
        if (left + menuRect.width > window.innerWidth - 8) {
            left = window.innerWidth - menuRect.width - 8;
        }
        if (left < 8) {
            left = 8;
        }

        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;

        const handleAction = (action) => {
            hideAvailabilityQuickMenu();
            switch (action) {
                case 'reserve':
                    setAvailabilityStatus(dateISO, 'manual_reserved', selectedVenue);
                    break;
                case 'pre-reserve':
                    setAvailabilityStatus(dateISO, 'manual_pre_reserved', selectedVenue);
                    break;
                case 'free':
                    if (!getManualBlockState()) {
                        if (hasAutoBooking) {
                            showAutomationToast('Ziua conține deja rezervări sincronizate din CRM. Actualizează statusul din pagina „Rezervări”.');
                        } else {
                            showAutomationToast('Ziua este deja liberă.');
                        }
                        break;
                    }
                    setAvailabilityStatus(dateISO, 'manual_free', selectedVenue);
                    break;
                case 'view':
                    navigateToBookingsForDate(dateISO);
                    break;
                default:
                    break;
            }
        };

        reserveBtn.addEventListener('click', () => handleAction('reserve'));
        preReserveBtn.addEventListener('click', () => handleAction('pre-reserve'));
        freeBtn.addEventListener('click', () => handleAction('free'));
        viewBtn.addEventListener('click', () => handleAction('view'));
        menu.addEventListener('click', (event) => event.stopPropagation());

        dayCell.classList.add('is-menu-open');
        activeAvailabilityMenu = { menu, dayCell, dateISO };
        reserveBtn.focus();
    }

    function clearBookingsDateFilter() {
        if (!activeBookingsDateFilter) {
            return;
        }
        activeBookingsDateFilter = null;
        renderBookingsTable();
        showAutomationToast('Filtrul după dată a fost eliminat.');
    }

    function highlightBookingRow(bookingId, { scroll = false } = {}) {
        const tableBody = document.getElementById('bookings-table-body');
        if (!tableBody) {
            return null;
        }
        tableBody.querySelectorAll('.is-highlighted').forEach(row => row.classList.remove('is-highlighted'));
        const targetRow = tableBody.querySelector(`tr[data-identifier="${bookingId}"]`);
        if (targetRow) {
            targetRow.classList.add('is-highlighted');
            if (scroll) {
                targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        return targetRow;
    }

    function highlightViewingRow(viewingId, { scroll = false } = {}) {
        const tableBody = document.getElementById('viewings-table-body');
        if (!tableBody) {
            return null;
        }
        tableBody.querySelectorAll('.is-highlighted').forEach(row => row.classList.remove('is-highlighted'));
        const targetRow = tableBody.querySelector(`tr[data-identifier="${viewingId}"]`);
        if (targetRow) {
            targetRow.classList.add('is-highlighted');
            if (scroll) {
                targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        return targetRow;
    }

    function focusViewingRow(viewingId) {
        let attempts = 0;
        const maxAttempts = 6;
        const tryFocus = () => {
            const targetRow = document.querySelector(`#viewings-table-body tr[data-identifier="${viewingId}"]`);
            if (targetRow) {
                highlightViewingRow(viewingId, { scroll: true });
                targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (attempts < maxAttempts) {
                attempts += 1;
                requestAnimationFrame(tryFocus);
            }
        };
        tryFocus();
    }

    function createRecordInfoItem(label, value, { meta, isMissing } = {}) {
        const itemEl = document.createElement('div');
        itemEl.className = 'booking-row-item';

        const labelEl = document.createElement('span');
        labelEl.className = 'booking-row-label';
        labelEl.textContent = label;

        const valueEl = document.createElement('span');
        valueEl.className = 'booking-row-value';
        valueEl.textContent = value || '—';
        if (isMissing) {
            valueEl.classList.add('is-missing-value');
        }

        itemEl.append(labelEl, valueEl);

        if (meta) {
            const metaEl = document.createElement('span');
            metaEl.className = 'booking-row-meta';
            metaEl.textContent = meta;
            itemEl.appendChild(metaEl);
        }

        return itemEl;
    }

    const recordDetailFields = {
        client: document.querySelector('[data-detail-field="client"]'),
        status: document.querySelector('[data-detail-field="status"]'),
        email: document.querySelector('[data-detail-field="email"]'),
        phone: document.querySelector('[data-detail-field="phone"]'),
        event: document.querySelector('[data-detail-field="event"]'),
        guests: document.querySelector('[data-detail-field="guests"]'),
        venue: document.querySelector('[data-detail-field="venue"]'),
        date: document.querySelector('[data-detail-field="date"]'),
        viewingDate: document.querySelector('[data-detail-field="viewingDate"]'),
        viewingTime: document.querySelector('[data-detail-field="viewingTime"]'),
        updatedAt: document.querySelector('[data-detail-field="updatedAt"]')
    };
    const recordDetailDateLabel = document.querySelector('[data-detail-date-label]');
    const recordDetailViewingDateWrapper = document.querySelector('[data-detail-viewing-date-wrapper]');
    const recordDetailViewingTimeWrapper = document.querySelector('[data-detail-viewing-time-wrapper]');
    const recordDetailTimelineList = document.querySelector('[data-detail-timeline]');
    const recordDetailTimelineEmpty = document.querySelector('[data-detail-timeline-empty]');
    const recordDetailHeading = document.getElementById('record-detail-heading');
    const recordDetailSubtitle = document.getElementById('record-detail-subtitle');
    const recordDetailNoteInput = document.getElementById('record-detail-note');
    const recordDetailBackBtn = document.getElementById('record-detail-back');
    const recordDetailSaveBtn = document.getElementById('record-detail-save');
    const recordDetailQuickActions = document.querySelectorAll('[data-detail-action]');
    const teamAccessListEl = document.querySelector('[data-team-list]');
    const teamEmptyState = document.querySelector('[data-team-empty]');
    const teamInviteForm = document.getElementById('team-invite-form');
    const teamInviteNameInput = document.getElementById('team-invite-name');
    const teamInviteEmailInput = document.getElementById('team-invite-email');
    let showRescheduleModal = null;
    const recordDetailState = {
        type: null,
        id: null,
        sourcePage: 'bookings'
    };
    let recordDetailCurrentVenue = null;

    function populateDetailField(field, value, fallback = '—') {
        const target = recordDetailFields[field];
        if (target) {
            target.textContent = value || fallback;
        }
    }

    function renderRecordTimeline(type, record) {
        if (!recordDetailTimelineList || !recordDetailTimelineEmpty) {
            return;
        }
        recordDetailTimelineList.innerHTML = '';

        if (type !== 'booking' || !record) {
            recordDetailTimelineList.hidden = true;
            recordDetailTimelineEmpty.hidden = false;
            recordDetailTimelineEmpty.textContent = 'Timeline-ul este disponibil doar pentru rezervări.';
            return;
        }

        const timeline = ensureBookingTimelineStructure(record);
        if (!timeline.length) {
            recordDetailTimelineList.hidden = true;
            recordDetailTimelineEmpty.hidden = false;
            recordDetailTimelineEmpty.textContent = 'Nu există acțiuni înregistrate încă.';
            return;
        }

        const sortedEntries = timeline.slice().sort((a, b) => {
            const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
            const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
            return timeB - timeA;
        });

        sortedEntries.forEach(entry => {
            const itemEl = document.createElement('li');
            itemEl.className = 'detail-timeline-entry';

            const statusEl = document.createElement('div');
            statusEl.className = 'detail-timeline-status';
            statusEl.textContent = entry.statusLabel || entry.status || '—';

            const metaEl = document.createElement('div');
            metaEl.className = 'detail-timeline-meta';
            const metaParts = [];
            const timestamp = entry.timestamp instanceof Date
                ? entry.timestamp
                : (entry.timestamp ? new Date(entry.timestamp) : null);
            if (timestamp && !Number.isNaN(timestamp.getTime())) {
                metaParts.push(`${formatDate(timestamp)} · ${formatTime(timestamp)}`);
            }
            if (entry.user) {
                metaParts.push(entry.user);
            }
            if (entry.clientStatusLabel) {
                metaParts.push(`Client CRM: ${entry.clientStatusLabel}`);
            }
            if (entry.manual) {
                metaParts.push('Manual');
            } else if (entry.initial) {
                metaParts.push('Inițial');
            }
            metaEl.textContent = metaParts.join(' • ');

            itemEl.append(statusEl, metaEl);

            if (entry.previousStatusLabel && !entry.initial) {
                const transitionEl = document.createElement('div');
                transitionEl.className = 'detail-timeline-meta';
                transitionEl.textContent = `Din: ${entry.previousStatusLabel}`;
                itemEl.appendChild(transitionEl);
            }

            if (entry.reason) {
                const reasonEl = document.createElement('div');
                reasonEl.className = 'detail-timeline-reason';
                reasonEl.textContent = entry.reason;
                itemEl.appendChild(reasonEl);
            }

            recordDetailTimelineList.appendChild(itemEl);
        });

        recordDetailTimelineList.hidden = false;
        recordDetailTimelineEmpty.hidden = true;
    }

    function showRecordDetailPage(type, record, sourcePage = 'bookings') {
        if (!record) {
            return;
        }
        recordDetailState.type = type;
        recordDetailState.id = record.id;
        recordDetailState.sourcePage = sourcePage;
        recordDetailCurrentVenue = record.venue || null;
        if (type === 'viewing') {
            selectedViewingId = record.id;
        } else {
            selectedBookingId = record.id;
        }

        if (recordDetailHeading) {
            recordDetailHeading.textContent = type === 'viewing' ? 'Detalii vizionare' : 'Detalii rezervare';
        }
        if (recordDetailSubtitle) {
            recordDetailSubtitle.textContent = type === 'viewing'
                ? 'Confirmă informațiile despre vizionare și notează următorii pași pentru echipă.'
                : 'Revizuiește detaliile cererii și ține evidența discuțiilor interne.';
        }

        populateDetailField('client', record.client || '—');

        let relatedViewing = null;
        let relatedBooking = null;
        if (type === 'booking') {
            const viewingMatches = viewings
                .filter(viewing => viewing.client === record.client && viewing.venue === record.venue && viewing.status !== 'cancelled');
            if (viewingMatches.length) {
                viewingMatches.sort((a, b) => {
                    const dateA = parseBookingDate(a.date);
                    const dateB = parseBookingDate(b.date);
                    const timeA = dateA ? dateA.getTime() : Number.MAX_SAFE_INTEGER;
                    const timeB = dateB ? dateB.getTime() : Number.MAX_SAFE_INTEGER;
                    return timeA - timeB;
                });
                [relatedViewing] = viewingMatches;
            }
        } else if (type === 'viewing') {
            relatedBooking = bookings.find(booking =>
                booking.client === record.client && booking.venue === record.venue);
        }

        const statusMeta = type === 'viewing' ? viewingStatusMeta[record.status] : bookingStatusMeta[record.status];
        populateDetailField('status', statusMeta?.label || record.status || '—');
        populateDetailField('email', record.email || relatedBooking?.email || 'Nu a fost furnizat');
        populateDetailField('phone', record.phone || relatedBooking?.phone || 'Nu a fost furnizat');
        populateDetailField('event', record.event || relatedBooking?.event || '—');
        populateDetailField('venue', record.venue || relatedBooking?.venue || '—');

        const eventDateDisplay = type === 'viewing'
            ? (relatedBooking?.date || '—')
            : (record.date || '—');
        populateDetailField('date', eventDateDisplay);

        const guestsField = recordDetailFields.guests;
        if (guestsField) {
            const guestValue = Number.isFinite(record.guests)
                ? record.guests
                : (type === 'viewing' && Number.isFinite(relatedBooking?.guests) ? relatedBooking.guests : null);
            if (type === 'viewing') {
                const hasGuests = Number.isFinite(guestValue) && guestValue > 0;
                guestsField.textContent = hasGuests ? `${guestValue} invitați` : '—';
                guestsField.classList.remove('is-missing-value');
            } else {
                const hasGuests = Number.isFinite(guestValue) && guestValue > 0;
                guestsField.textContent = hasGuests ? `${guestValue} invitați` : 'Necesită completare';
                guestsField.classList.toggle('is-missing-value', !hasGuests);
            }
        }

        const rawLastUpdate = record.lastUpdate ?? relatedBooking?.lastUpdate ?? relatedViewing?.lastUpdate;
        const lastUpdateSource = rawLastUpdate instanceof Date
            ? rawLastUpdate
            : parseBookingDate(typeof rawLastUpdate === 'string' ? rawLastUpdate : '');
        populateDetailField('updatedAt', lastUpdateSource ? formatDate(lastUpdateSource) : formatDate(today));

        if (recordDetailDateLabel) {
            recordDetailDateLabel.textContent = 'Dată eveniment';
        }

        if (recordDetailViewingDateWrapper) {
            recordDetailViewingDateWrapper.hidden = true;
        }
        if (recordDetailViewingTimeWrapper) {
            recordDetailViewingTimeWrapper.hidden = true;
        }
        populateDetailField('viewingDate', '—');
        populateDetailField('viewingTime', '—');

        if (type === 'viewing') {
            if (recordDetailViewingDateWrapper) {
                recordDetailViewingDateWrapper.hidden = false;
            }
            if (recordDetailViewingTimeWrapper) {
                recordDetailViewingTimeWrapper.hidden = false;
            }
            populateDetailField('viewingDate', record.date || '—');
            populateDetailField('viewingTime', record.hour || 'Nu este stabilită');
        } else if (relatedViewing) {
            if (recordDetailViewingDateWrapper) {
                recordDetailViewingDateWrapper.hidden = false;
            }
            if (recordDetailViewingTimeWrapper) {
                recordDetailViewingTimeWrapper.hidden = false;
            }
            populateDetailField('viewingDate', relatedViewing.date || '—');
            populateDetailField('viewingTime', relatedViewing.hour || 'Nu este stabilită');
        }

        if (recordDetailNoteInput) {
            const noteValue = type === 'viewing' ? record.notes : record.details;
            recordDetailNoteInput.value = noteValue || '';
        }

        renderRecordTimeline(type, record);

        activatePage('record-detail');
    }

    function returnToListPage({ scroll = false } = {}) {
        const targetPage = recordDetailState.sourcePage || (recordDetailState.type === 'viewing' ? 'viewings' : 'bookings');
        const recordId = recordDetailState.id;
        activatePage(targetPage);
        if (!recordId) {
            return;
        }
        requestAnimationFrame(() => {
            if (recordDetailState.type === 'viewing') {
                highlightViewingRow(recordId, { scroll });
            } else {
                highlightBookingRow(recordId, { scroll });
            }
        });
    }

    function saveRecordDetailNote() {
        if (!recordDetailNoteInput) {
            return;
        }
        const { type, id } = recordDetailState;
        if (!type || !id) {
            showAutomationToast('Selectează o înregistrare înainte de a salva nota.');
            return;
        }
        const noteValue = recordDetailNoteInput.value.trim();
        if (type === 'viewing') {
            const viewing = viewings.find(item => item.id === id);
            if (!viewing) {
                return;
            }
            viewing.notes = noteValue;
            renderViewingsTable();
            renderViewingsCalendar();
            renderViewingsStatusChart();
            renderOverviewLists();
            highlightViewingRow(id);
            showAutomationToast('Nota internă a vizionării a fost salvată.');
        } else {
            const booking = bookings.find(item => item.id === id);
            if (!booking) {
                return;
            }
            booking.details = noteValue;
            renderBookingsTable();
            renderOverviewLists();
            renderMonthlyCalendar();
            highlightBookingRow(id);
            showAutomationToast('Nota internă a rezervării a fost salvată.');
        }
    }

    function renderOverviewLists() {
        const bookingsList = document.getElementById('overview-bookings-list');
        const eventsList = document.getElementById('overview-events-list');
        const viewingsList = document.getElementById('overview-viewings-list');

        const sortByDateAsc = (collection, dateKey = 'date') => collection.slice().sort((a, b) => {
            const dateA = parseBookingDate(a[dateKey]);
            const dateB = parseBookingDate(b[dateKey]);
            const timeA = dateA ? dateA.getTime() : Number.MAX_SAFE_INTEGER;
            const timeB = dateB ? dateB.getTime() : Number.MAX_SAFE_INTEGER;
            return timeA - timeB;
        });

        if (bookingsList) {
            bookingsList.innerHTML = '';
            const activeBookings = sortByDateAsc(bookings)
                .filter(item => !['cancelled', 'rejected'].includes(item.status))
                .slice(0, 3);

            activeBookings.forEach(item => {
                const row = document.createElement('div');
                row.className = 'list-item';
                const left = document.createElement('div');
                left.innerHTML = `<strong>${item.client}</strong> <span>${item.venue}</span>`;
                const chip = createStatusChip(item.status);
                row.append(left, chip);
                row.addEventListener('click', () => navigateToBooking(item.id));
                bookingsList.appendChild(row);
            });
        }

        if (eventsList) {
            eventsList.innerHTML = '';
            const upcomingConfirmed = sortByDateAsc(bookings)
                .filter(item => ['confirmed', 'pre_booked'].includes(item.status))
                .slice(0, 3);

            upcomingConfirmed.forEach(item => {
                const listItem = document.createElement('div');
                listItem.className = 'list-item';
                const detailsDiv = document.createElement('div');
                detailsDiv.innerHTML = `<strong>${item.event}</strong> <span>${item.venue} · ${item.date}</span>`;
                listItem.addEventListener('click', () => navigateToBooking(item.id));
                listItem.append(detailsDiv);
                eventsList.appendChild(listItem);
            });
        }

        if (viewingsList) {
            viewingsList.innerHTML = '';
            const upcomingViewings = sortByDateAsc(viewings)
                .slice(0, 3);

            upcomingViewings.forEach(item => {
                const listItem = document.createElement('div');
                listItem.className = 'list-item';
                const detailsDiv = document.createElement('div');
                detailsDiv.innerHTML = `<strong>${item.client}</strong> <span>${item.venue} · ${item.date}</span>`;
                const chip = createStatusChip(item.status, 'viewing');
                listItem.addEventListener('click', () => navigateToViewing(item.id));
                listItem.append(detailsDiv, chip);
                viewingsList.appendChild(listItem);
            });
        }
    }

    const overflowActionKeys = ['mark_confirmed', 'pre_reserve'];
    const allQuickActions = overflowActionKeys
        .map(key => bookingActionLibrary[key])
        .filter(action => action?.key);
    let activeActionsMenu = null;
    let actionsMenuBackdrop = null;

    function ensureActionsMenuBackdrop() {
        if (actionsMenuBackdrop) {
            return actionsMenuBackdrop;
        }
        actionsMenuBackdrop = document.createElement('div');
        actionsMenuBackdrop.className = 'actions-menu-backdrop';
        actionsMenuBackdrop.addEventListener('click', () => {
            closeActiveActionsMenu();
        });
        document.body.appendChild(actionsMenuBackdrop);
        return actionsMenuBackdrop;
    }

    function closeActiveActionsMenu() {
        if (!activeActionsMenu) {
            return;
        }
        const { trigger, menu, container, rowWrapper, rowElement } = activeActionsMenu;
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'false');
        }
        if (menu) {
            menu.classList.remove('is-open');
        }
        if (container) {
            container.classList.remove('has-open-menu');
        }
        if (rowWrapper) {
            rowWrapper.classList.remove('has-open-menu');
        }
        if (rowElement) {
            rowElement.classList.remove('has-open-menu');
        }
        ensureActionsMenuBackdrop().classList.remove('is-visible');
        activeActionsMenu = null;
    }

    function createOverflowActionsMenu(booking, hostElement) {
        if (!booking || !hostElement) {
            return null;
        }
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'actions-menu-trigger';
        trigger.setAttribute('aria-haspopup', 'menu');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.title = 'Mai multe actiuni';
        trigger.innerHTML = '<span aria-hidden="true">⋯</span><span class="sr-only">Mai multe actiuni</span>';

        const menu = document.createElement('div');
        menu.className = 'actions-menu';
        menu.setAttribute('role', 'menu');
        menu.dataset.bookingId = String(booking.id);

        trigger.addEventListener('click', (event) => {
            event.stopPropagation();
            if (activeActionsMenu && activeActionsMenu.menu !== menu) {
                closeActiveActionsMenu();
            }
            const isOpen = menu.classList.contains('is-open');
            if (isOpen) {
                closeActiveActionsMenu();
            } else {
                menu.classList.add('is-open');
                trigger.setAttribute('aria-expanded', 'true');
                hostElement.classList.add('has-open-menu');
                const rowWrapper = hostElement.closest('.booking-row');
                const rowElement = hostElement.closest('tr');
                if (rowWrapper) {
                    rowWrapper.classList.add('has-open-menu');
                }
                if (rowElement) {
                    rowElement.classList.add('has-open-menu');
                }
                ensureActionsMenuBackdrop().classList.add('is-visible');
                requestAnimationFrame(() => {
                    const menuRect = menu.getBoundingClientRect();
                    if (menuRect.bottom > window.innerHeight) {
                        menu.style.top = 'auto';
                        menu.style.bottom = 'calc(100% + 8px)';
                        menu.classList.add('is-open--top');
                    } else {
                        menu.style.bottom = '';
                        menu.style.top = 'calc(100% + 8px)';
                        menu.classList.remove('is-open--top');
                    }
                });
                activeActionsMenu = { trigger, menu, container: hostElement, rowWrapper, rowElement };
            }
        });

        menu.addEventListener('click', (event) => event.stopPropagation());

        allQuickActions.forEach(definition => {
            if (!definition) {
                return;
            }
            const optionBtn = document.createElement('button');
            optionBtn.type = 'button';
            optionBtn.setAttribute('role', 'menuitem');
            optionBtn.dataset.action = definition.key;
            const meta = definition.title ? `<span class="actions-menu-option-meta">${definition.title}</span>` : '';
            optionBtn.innerHTML = `<span>${definition.label}</span>${meta}`;
            optionBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                closeActiveActionsMenu();
                handleBookingAction(booking.id, definition.key);
            });
            menu.appendChild(optionBtn);
        });

        hostElement.appendChild(trigger);
        hostElement.appendChild(menu);

        return { trigger, menu };
    }

    function renderBookingsTable() {
        const body = document.getElementById('bookings-table-body');
        if (!body) {
            return;
        }
        closeActiveActionsMenu();
        const venueFilter = document.getElementById('bookings-venue-filter');
        const statusFilter = document.getElementById('bookings-status-filter');
        const clientFilter = document.getElementById('bookings-client-filter');
        const venueValue = venueFilter ? venueFilter.value : 'all';
        const statusValue = statusFilter ? statusFilter.value : 'all';
        body.innerHTML = '';

        const clientQuery = clientFilter ? clientFilter.value.trim().toLowerCase() : '';
        const filterTag = document.getElementById('bookings-date-filter-tag');
        const filterLabel = document.getElementById('bookings-date-filter-label');
        let activeDateDisplay = null;
        if (activeBookingsDateFilter) {
            const filterDate = createDateFromISO(activeBookingsDateFilter);
            if (!Number.isNaN(filterDate.getTime())) {
                activeDateDisplay = formatDate(filterDate);
            }
        }
        if (filterTag && filterLabel) {
            if (activeDateDisplay) {
                filterLabel.textContent = `Filtru dată: ${activeDateDisplay}`;
                filterTag.hidden = false;
                filterTag.style.display = 'inline-flex';
            } else {
                filterLabel.textContent = '';
                filterTag.hidden = true;
                filterTag.style.display = 'none';
            }
        }

        const filteredBookings = bookings
            .filter(item => venueValue === 'all' || item.venue === venueValue)
            .filter(item => statusValue === 'all' || item.status === statusValue)
            .filter(item => {
                if (!clientQuery) {
                    return true;
                }
                return item.client.toLowerCase().includes(clientQuery);
            })
            .filter(item => {
                if (!activeDateDisplay) {
                    return true;
                }
                return item.date === activeDateDisplay;
            })
            .slice()
            .sort((a, b) => {
                const dateA = parseBookingDate(a.date);
                const dateB = parseBookingDate(b.date);
                const timeA = dateA ? dateA.getTime() : Number.MAX_SAFE_INTEGER;
                const timeB = dateB ? dateB.getTime() : Number.MAX_SAFE_INTEGER;
                return timeA - timeB;
            });

        filteredBookings.forEach(item => {
            const row = body.insertRow();
            row.dataset.identifier = String(item.id);
            if (selectedBookingId === item.id) {
                row.classList.add('is-highlighted');
            }

            const cell = row.insertCell();

            const wrapper = document.createElement('div');
            wrapper.className = 'booking-row';

            const topRow = document.createElement('div');
            topRow.className = 'booking-row-top';

            topRow.appendChild(createRecordInfoItem('Client', item.client));
            const venueMeta = item.venue ? `Locație: ${item.venue}` : null;
            topRow.appendChild(createRecordInfoItem('Eveniment', item.event, { meta: venueMeta }));
            topRow.appendChild(createRecordInfoItem('Dată', item.date));

            const hasGuests = Number.isFinite(item.guests) && item.guests > 0;
            topRow.appendChild(createRecordInfoItem('Invitați', hasGuests ? `${item.guests} invitați` : 'Necesită completare', {
                isMissing: !hasGuests
            }));
            topRow.appendChild(createRecordInfoItem('Ultima actualizare', formatDate(item.lastUpdate || today)));

            wrapper.appendChild(topRow);

            const statusMeta = bookingStatusMeta[item.status];
            const bottomRow = document.createElement('div');
            bottomRow.className = 'booking-row-bottom';

            const statusContainer = document.createElement('div');
            statusContainer.className = 'booking-row-status';
            statusContainer.appendChild(createStatusChip(item.status));
            if (item.autoGenerated && item.status === 'offer_sent') {
                const autoBadge = document.createElement('span');
                autoBadge.className = 'status-secondary';
                autoBadge.textContent = 'Ofertă trimisă automat după confirmare';
                statusContainer.appendChild(autoBadge);
            }

            const ownerMeta = statusMeta?.owner;
            const nextStep = document.createElement('span');
            nextStep.className = 'booking-row-next-step';
            nextStep.textContent = `Pas următor: ${ownerMeta?.nextStep || '—'}`;
            statusContainer.appendChild(nextStep);

            bottomRow.appendChild(statusContainer);

            const actionsWrapper = document.createElement('div');
            actionsWrapper.className = 'table-actions booking-row-actions';
            const actionKeys = bookingActionsByStatus[item.status] || bookingActionsByStatus.default;
            actionKeys.forEach(actionKey => {
                const definition = bookingActionLibrary[actionKey];
                if (!definition) {
                    return;
                }
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.action = definition.key;
                button.title = definition.title || definition.label;
                button.textContent = definition.label;
                actionsWrapper.appendChild(button);
            });
            const controlsWrapper = document.createElement('div');
            controlsWrapper.className = 'booking-row-controls';
            if (actionsWrapper.children.length) {
                controlsWrapper.appendChild(actionsWrapper);
            }
            createOverflowActionsMenu(item, controlsWrapper);
            bottomRow.appendChild(controlsWrapper);

            wrapper.appendChild(bottomRow);
            cell.appendChild(wrapper);

            row.addEventListener('click', (event) => {
                if (event.target.closest('button')) {
                    return;
                }
                selectedBookingId = item.id;
                showRecordDetailPage('booking', item, 'bookings');
            });
        });
    }

    function renderViewingsTable() {
        const body = document.getElementById('viewings-table-body');
        if (!body) {
            return;
        }
        const venueFilter = document.getElementById('viewings-venue-filter');
        const clientFilter = document.getElementById('viewings-client-filter');
        const venueValue = venueFilter ? venueFilter.value : 'all';
        const clientQuery = clientFilter ? clientFilter.value.trim().toLowerCase() : '';
        body.innerHTML = '';

        const createActionButton = (label, action, { title = '' } = {}) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.action = action;
            btn.textContent = label;
            if (title) {
                btn.title = title;
            }
            return btn;
        };

        const buildSlotGroup = ({ title, name, source = 'client', slots }) => {
            const group = document.createElement('div');
            group.className = 'viewing-slot-group';
            const heading = document.createElement('span');
            heading.className = 'viewing-slot-group-title';
            heading.textContent = title;
            group.appendChild(heading);
            const options = document.createElement('div');
            options.className = 'viewing-slot-options';
            const syncSelectionState = () => {
                const optionLabels = options.querySelectorAll('.viewing-slot-option');
                optionLabels.forEach(label => {
                    const radio = label.querySelector('input[type="radio"]');
                    label.classList.toggle('is-selected', Boolean(radio?.checked));
                });
            };
            slots.forEach((slot, index) => {
                const option = document.createElement('label');
                option.className = 'viewing-slot-option';
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = name;
                input.value = slot.iso;
                input.dataset.label = slot.label;
                input.dataset.source = source;
                const badge = document.createElement('span');
                badge.className = 'viewing-slot-badge';
                badge.textContent = source === 'client' ? `Client · ${index + 1}` : `Locație · ${index + 1}`;
                const text = document.createElement('span');
                text.textContent = slot.label;
                option.append(input, badge, text);
                options.appendChild(option);
                option.addEventListener('click', (event) => {
                    if (event.target instanceof HTMLInputElement) {
                        return;
                    }
                    if (!input.checked) {
                        input.checked = true;
                    }
                    syncSelectionState();
                });
                input.addEventListener('change', syncSelectionState);
            });
            syncSelectionState();
            group.appendChild(options);
            return group;
        };

        const enhanced = viewings
            .map(viewing => {
                const clientSlots = mapSlots(viewing.clientSlots);
                const ownerSlots = mapSlots(viewing.rescheduleSuggestions);
                const confirmedSlot = mapSlots([viewing.confirmedSlot])[0] || null;
                const primarySlot = getPrimaryViewingSlot(viewing);
                const sortTime = primarySlot?.date ? primarySlot.date.getTime() : Number.MAX_SAFE_INTEGER;
                const latestSlotGroup = resolveLatestViewingSlots(viewing, clientSlots, ownerSlots);
                return { viewing, clientSlots, ownerSlots, confirmedSlot, primarySlot, sortTime, latestSlotGroup };
            })
            .filter(item => {
                const matchesVenue = venueValue === 'all' || item.viewing.venue === venueValue;
                const matchesClient = !clientQuery || item.viewing.client.toLowerCase().includes(clientQuery);
                return matchesVenue && matchesClient;
            })
            .sort((a, b) => a.sortTime - b.sortTime);

        if (!enhanced.length) {
            const emptyRow = body.insertRow();
            const emptyCell = emptyRow.insertCell();
            emptyCell.colSpan = 1;
            emptyCell.innerHTML = '<div class="empty-state">Nu există vizionări care să corespundă filtrului selectat.</div>';
            const event = new Event('viewings:rendered');
            document.dispatchEvent(event);
            return;
        }

        enhanced.forEach(({ viewing, clientSlots, ownerSlots, confirmedSlot, primarySlot, latestSlotGroup }) => {
            const row = body.insertRow();
            row.dataset.identifier = String(viewing.id);
            if (selectedViewingId === viewing.id) {
                row.classList.add('is-highlighted');
            }

            const cell = row.insertCell();
            const wrapper = document.createElement('div');
            wrapper.className = 'booking-row viewing-row';

            const topRow = document.createElement('div');
            topRow.className = 'booking-row-top';
            topRow.appendChild(createRecordInfoItem('Client', viewing.client));
            topRow.appendChild(createRecordInfoItem('Locație', viewing.venue));
            topRow.appendChild(createRecordInfoItem('Interval confirmat', primarySlot ? primarySlot.label : '—'));
            topRow.appendChild(createRecordInfoItem('Ultima actualizare', formatDate(viewing.lastUpdate)));
            wrapper.appendChild(topRow);

            if (latestSlotGroup && latestSlotGroup.slots.length) {
                const slotGroups = document.createElement('div');
                slotGroups.className = 'viewing-slot-groups';
                const radioName = `viewing-${viewing.id}-slot`;
                const slotTitle = latestSlotGroup.source === 'client'
                    ? 'Ultimele opțiuni trimise de client'
                    : 'Ultimele propuneri trimise clientului';
                slotGroups.appendChild(buildSlotGroup({
                    title: slotTitle,
                    name: radioName,
                    source: latestSlotGroup.source,
                    slots: latestSlotGroup.slots
                }));

                wrapper.appendChild(slotGroups);
            }

            const bottomRow = document.createElement('div');
            bottomRow.className = 'booking-row-bottom';

            const statusContainer = document.createElement('div');
            statusContainer.className = 'booking-row-status';
            statusContainer.appendChild(createStatusChip(viewing.status, 'viewing'));
            if (viewing.notes) {
                const noteEl = document.createElement('span');
                noteEl.className = 'booking-row-meta';
                noteEl.textContent = viewing.notes;
                statusContainer.appendChild(noteEl);
            }
            if (confirmedSlot) {
                const confirmedEl = document.createElement('span');
                confirmedEl.className = 'booking-row-meta';
                confirmedEl.textContent = `Interval confirmat: ${confirmedSlot.label}`;
                statusContainer.appendChild(confirmedEl);
            } else if (!latestSlotGroup) {
                const infoEl = document.createElement('span');
                infoEl.className = 'booking-row-meta';
                infoEl.textContent = 'Nu există intervale salvate pentru această vizionare.';
                statusContainer.appendChild(infoEl);
            }
            bottomRow.appendChild(statusContainer);

            const actions = document.createElement('div');
            actions.className = 'table-actions booking-row-actions';
            const actionDefs = viewingActionsByStatus[viewing.status] || [];
            actionDefs.forEach(def => {
                actions.appendChild(createActionButton(def.label, def.key));
            });
            if (actions.children.length) {
                bottomRow.appendChild(actions);
            }

            wrapper.appendChild(bottomRow);
            cell.appendChild(wrapper);

            row.addEventListener('click', (event) => {
                if (event.target.closest('button') || event.target.closest('input') || event.target.closest('.viewing-slot-option')) {
                    return;
                }
                selectedViewingId = viewing.id;
                showRecordDetailPage('viewing', viewing, 'viewings');
            });
        });

        const event = new Event('viewings:rendered');
        document.dispatchEvent(event);

        if (pendingViewingFocusId !== null) {
            const focusId = pendingViewingFocusId;
            const detailRecord = pendingViewingDetailRecord;
            pendingViewingFocusId = null;
            pendingViewingDetailRecord = null;
            requestAnimationFrame(() => {
                focusViewingRow(focusId);
                if (detailRecord && detailRecord.id === focusId) {
                    showRecordDetailPage('viewing', detailRecord, 'viewings');
                }
            });
        }
    }

    const monthMap = { 'ian': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mai': 4, 'iun': 5, 'iul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'noi': 10, 'dec': 11 };

    function parseBookingDate(dateString) {
        const parts = dateString.split(' ');
        if (parts.length < 3) {
            return null;
        }
        const day = parseInt(parts[0], 10);
        const month = monthMap[parts[1].toLowerCase()];
        const year = parseInt(parts[2], 10);
        if (Number.isNaN(day) || month === undefined || Number.isNaN(year)) {
            return null;
        }
        return new Date(year, month, day);
    }

    let currentMonthOffset = 0;

    function renderMonthlyCalendar() {
        const grid = document.getElementById('availability-calendar-grid');
        const monthYearEl = document.getElementById('availability-month-year');
        const venueFilter = document.getElementById('availability-venue-filter');
        if (!grid || !monthYearEl || !venueFilter) {
            return;
        }
        grid.innerHTML = '';
        hideAvailabilityQuickMenu();
        const currentDate = new Date();
        currentDate.setDate(1);
        currentDate.setMonth(currentDate.getMonth() + currentMonthOffset);
        const selectedVenue = venueFilter.value;
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const monthName = currentDate.toLocaleString('ro-RO', { month: 'long' });
        monthYearEl.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

        const dayNames = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
        dayNames.forEach(dayName => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = dayName;
            grid.appendChild(dayHeader);
        });

        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
        for (let i = 0; i < startDayOfWeek; i += 1) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day is-other-month';
            grid.appendChild(emptyCell);
        }

        const todayNormalized = new Date();
        todayNormalized.setHours(0, 0, 0, 0);

        for (let day = 1; day <= daysInMonth; day += 1) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            const thisDate = new Date(year, month, day);
            if (thisDate.getTime() === todayNormalized.getTime()) {
                dayCell.classList.add('is-today');
            }
            dayCell.innerHTML = `<span class="day-number">${day}</span>`;
            const dateKey = buildIsoDate(year, month, day);
            dayCell.dataset.dateIso = dateKey;
            dayCell.setAttribute('tabindex', '0');

            const manualStatuses = getManualStatusesForDate(dateKey, selectedVenue);
            manualStatuses.forEach(({ status, venue: manualVenue }) => {
                const manualEvent = document.createElement('div');
                manualEvent.className = 'calendar-event';
                manualEvent.dataset.status = status;
                const baseLabel = status === 'manual_reserved' ? 'Rezervat manual' : 'Pre-rezervă manuală';
                manualEvent.textContent = baseLabel;
                if (hasMultipleVenues && (!selectedVenue || selectedVenue === 'all') && manualVenue) {
                    manualEvent.textContent = `${manualVenue} · ${baseLabel}`;
                }
                dayCell.appendChild(manualEvent);
            });
            dayCell.dataset.hasManual = manualStatuses.length > 0 ? 'true' : 'false';

            const eventsForDay = bookings.filter(booking => {
                if (!['confirmed', 'pre_booked'].includes(booking.status)) {
                    return false;
                }
                if (selectedVenue !== 'all' && booking.venue !== selectedVenue) {
                    return false;
                }
                const bookingDate = parseBookingDate(booking.date);
                return bookingDate &&
                    bookingDate.getFullYear() === year &&
                    bookingDate.getMonth() === month &&
                    bookingDate.getDate() === day;
            });

            eventsForDay.forEach(event => {
                const eventDiv = document.createElement('div');
                eventDiv.className = 'calendar-event';
                const calendarStatus = event.status === 'confirmed' ? 'booked' : 'pre_booked';
                eventDiv.dataset.status = calendarStatus;
                eventDiv.textContent = selectedVenue === 'all'
                    ? `${event.event} - ${event.venue}`
                    : event.event;
                eventDiv.title = `${event.client} · ${event.event}`;
                eventDiv.dataset.bookingId = String(event.id);
                eventDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectedBookingId = event.id;
                    showRecordDetailPage('booking', event, 'availability');
                });
                dayCell.appendChild(eventDiv);
            });

            dayCell.dataset.hasAuto = eventsForDay.length > 0 ? 'true' : 'false';

            grid.appendChild(dayCell);
        }
    }

    let currentViewingsMonthOffset = 0;

    function renderViewingsCalendar() {
        const grid = document.getElementById('viewings-calendar-grid');
        const monthYearEl = document.getElementById('viewings-month-year');
        const venueFilter = document.getElementById('viewings-calendar-venue-filter');
        if (!grid || !monthYearEl || !venueFilter) {
            return;
        }
        grid.innerHTML = '';
        const baseDate = new Date();
        baseDate.setDate(1);
        baseDate.setMonth(baseDate.getMonth() + currentViewingsMonthOffset);
        const selectedVenue = venueFilter.value;
        const month = baseDate.getMonth();
        const year = baseDate.getFullYear();
        const monthName = baseDate.toLocaleString('ro-RO', { month: 'long' });
        monthYearEl.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

        const dayNames = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];
        dayNames.forEach(dayName => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = dayName;
            grid.appendChild(dayHeader);
        });

        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
        for (let i = 0; i < startDayOfWeek; i += 1) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day is-other-month';
            grid.appendChild(emptyCell);
        }

        const todayNormalized = new Date();
        todayNormalized.setHours(0, 0, 0, 0);

        for (let day = 1; day <= daysInMonth; day += 1) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            const thisDate = new Date(year, month, day);
            if (thisDate.getTime() === todayNormalized.getTime()) {
                dayCell.classList.add('is-today');
            }
            dayCell.innerHTML = `<span class="day-number">${day}</span>`;

            const viewingsForDay = viewings.filter(viewing => {
                if (selectedVenue !== 'all' && viewing.venue !== selectedVenue) {
                    return false;
                }
                const viewingDate = parseBookingDate(viewing.date);
                return viewingDate &&
                    viewingDate.getFullYear() === year &&
                    viewingDate.getMonth() === month &&
                    viewingDate.getDate() === day;
            });

            viewingsForDay.forEach(viewing => {
                const eventDiv = document.createElement('div');
                eventDiv.className = 'calendar-event';
                const statusMeta = viewingStatusMeta[viewing.status];
                const baseColor = statusMeta?.color || '#2563eb';
                const backgroundColor = typeof hexToRgba === 'function' ? hexToRgba(baseColor, 0.18) : null;
                if (backgroundColor) {
                    eventDiv.style.backgroundColor = backgroundColor;
                } else {
                    eventDiv.style.backgroundColor = 'rgba(37, 99, 235, 0.18)';
                }
                eventDiv.style.color = baseColor;
                eventDiv.dataset.status = viewing.status;
                eventDiv.textContent = `${viewing.client} - ${viewing.hour}`;
                eventDiv.title = `Click pentru a vedea detalii pentru ${viewing.client}`;
                eventDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    navigateToViewing(viewing.id);
                });
                dayCell.appendChild(eventDiv);
            });

            grid.appendChild(dayCell);
        }
    }

    function ensureViewingEntry(booking, { rescheduled = false } = {}) {
        const targetStatus = rescheduled ? 'viewing_rescheduled' : 'viewing_scheduled';
        const existing = viewings.find(viewing => viewing.client === booking.client);
        const parsedDate = parseBookingDate(booking.date) || addDays(3);
        const formattedDate = formatDate(parsedDate);
        const firstSuggestion = rescheduled && Array.isArray(booking?.rescheduleSuggestions)
            ? booking.rescheduleSuggestions.find(item => item?.date instanceof Date)
            : null;
        const updateMoment = new Date();
        if (existing) {
            existing.status = targetStatus;
            existing.date = firstSuggestion ? formatDate(firstSuggestion.date) : formattedDate;
            if (firstSuggestion) {
                existing.hour = formatTime(firstSuggestion.date);
            } else if (!rescheduled) {
                existing.hour = '12:00';
            }
            existing.venue = booking.venue;
            existing.email = booking.email || existing.email || '';
            existing.phone = booking.phone || existing.phone || '';
            if (!existing.notes && booking.details) {
                existing.notes = booking.details;
            }
            existing.lastUpdate = updateMoment;
            const hasRequestedSlots = Array.isArray(booking?.requestedSlots) && booking.requestedSlots.length > 0;
            if (hasRequestedSlots) {
                existing.clientSlots = mapSlots(booking.requestedSlots);
                existing.clientSlotsUpdatedAt = updateMoment;
            } else if (!Array.isArray(existing.clientSlots)) {
                existing.clientSlots = [];
                existing.clientSlotsUpdatedAt = null;
            }
            if (Array.isArray(booking.rescheduleSuggestions) && booking.rescheduleSuggestions.length) {
                existing.rescheduleSuggestions = booking.rescheduleSuggestions.map(item => ({
                    iso: item?.iso || null,
                    label: item?.label || '',
                    date: item?.date instanceof Date ? new Date(item.date.getTime()) : (item?.iso ? new Date(item.iso) : null)
                }));
                existing.ownerSlotsUpdatedAt = updateMoment;
            } else if (!Array.isArray(existing.rescheduleSuggestions)) {
                existing.rescheduleSuggestions = [];
                existing.ownerSlotsUpdatedAt = null;
            }
            if (targetStatus === 'viewing_scheduled') {
                const confirmedBase = firstSuggestion?.date instanceof Date
                    ? new Date(firstSuggestion.date.getTime())
                    : new Date(parsedDate.getTime());
                if (!firstSuggestion) {
                    confirmedBase.setHours(12, 0, 0, 0);
                }
                const confirmedSlot = createSlotObject(confirmedBase);
                existing.confirmedSlot = confirmedSlot;
                existing.rescheduleSuggestions = [];
                existing.ownerSlotsUpdatedAt = null;
            }
        } else {
            const nextId = viewings.reduce((max, viewing) => Math.max(max, viewing.id || 0), 0) + 1;
            const confirmedBase = firstSuggestion?.date instanceof Date
                ? new Date(firstSuggestion.date.getTime())
                : new Date(parsedDate.getTime());
            if (!firstSuggestion) {
                confirmedBase.setHours(12, 0, 0, 0);
            }
            const mappedRequestedSlots = Array.isArray(booking.requestedSlots) ? mapSlots(booking.requestedSlots) : [];
            const mappedRescheduleSuggestions = Array.isArray(booking.rescheduleSuggestions)
                ? booking.rescheduleSuggestions.map(item => ({
                    iso: item?.iso || null,
                    label: item?.label || '',
                    date: item?.date instanceof Date ? new Date(item.date.getTime()) : (item?.iso ? new Date(item.iso) : null)
                }))
                : [];
            viewings.push({
                id: nextId,
                client: booking.client,
                venue: booking.venue,
                date: firstSuggestion ? formatDate(firstSuggestion.date) : formattedDate,
                hour: firstSuggestion ? formatTime(firstSuggestion.date) : '12:00',
                status: targetStatus,
                email: booking.email || '',
                phone: booking.phone || '',
                notes: booking.details || '',
                lastUpdate: updateMoment,
                clientSlots: mappedRequestedSlots,
                rescheduleSuggestions: mappedRescheduleSuggestions,
                clientSlotsUpdatedAt: mappedRequestedSlots.length ? updateMoment : null,
                ownerSlotsUpdatedAt: mappedRescheduleSuggestions.length ? updateMoment : null,
                confirmedSlot: targetStatus === 'viewing_scheduled' ? createSlotObject(confirmedBase) : null
            });
        }
        renderViewingsTable();
        renderViewingsCalendar();
        renderViewingsStatusChart();
    }

    function handleBookingAction(bookingId, actionKey) {
        const booking = bookings.find(item => item.id === bookingId);
        if (!booking || !actionKey) {
            return;
        }
        hideAutomationToast();
        closeActiveActionsMenu();

        const previousStatus = booking.status;
        let didMutate = false;

        switch (actionKey) {
            case 'confirm_availability':
                {
                    const menuPdfs = getVenueMenuPdfs(booking.venue);
                    const menuMessage = buildMenuDeliveryMessage(menuPdfs, booking.client);
                    let toastMessage = '';

                    if (autoOfferEnabled) {
                        booking.status = 'offer_sent';
                        booking.autoGenerated = true;
                        toastMessage = `Locația ${booking.venue} a trimis automat oferta pentru ${booking.date}. Clientul vede „Ofertă primită”.`;
                    } else {
                        booking.status = 'availability_confirmed';
                        booking.autoGenerated = false;
                        toastMessage = `Disponibilitatea a fost confirmată pentru ${booking.date} la ${booking.venue}.`;
                    }

                    if (menuMessage) {
                        toastMessage = toastMessage ? `${toastMessage} ${menuMessage}` : menuMessage;
                    }

                    if (toastMessage) {
                        showAutomationToast(toastMessage);
                    }
                    didMutate = true;
                }
                break;
            case 'send_offer':
            case 'send_updated_offer':
                booking.status = 'offer_sent';
                booking.autoGenerated = false;
                didMutate = true;
                break;
            case 'schedule_viewing':
                booking.status = 'viewing_scheduled';
                booking.autoGenerated = false;
                ensureViewingEntry(booking);
                didMutate = true;
                break;
            case 'viewing_details':
                {
                    const relatedViewing = viewings.find(item =>
                        item.client === booking.client && item.venue === booking.venue);
                    const venueFilter = document.getElementById('viewings-venue-filter');
                    if (relatedViewing && venueFilter) {
                        const hasOption = Array.from(venueFilter.options).some(option => option.value === relatedViewing.venue);
                        venueFilter.value = hasOption ? relatedViewing.venue : 'all';
                    } else if (venueFilter) {
                        venueFilter.value = 'all';
                    }

                    if (relatedViewing) {
                        pendingViewingFocusId = relatedViewing.id;
                        pendingViewingDetailRecord = relatedViewing;
                        showAutomationToast(`Vizionarea pentru ${relatedViewing.client} este afișată în program.`);
                    } else {
                        pendingViewingFocusId = null;
                        pendingViewingDetailRecord = null;
                        showAutomationToast('Nu există încă o vizionare asociată. Creează una din program.');
                    }

                    activatePage('viewings');
                    renderViewingsTable();
                    renderViewingsStatusChart();
                    renderViewingsCalendar();
                    renderOverviewLists();
                }
                return;
            case 'propose_new_date':
                if (typeof showRescheduleModal === 'function') {
                    showRescheduleModal({ type: 'booking', record: booking });
                    return;
                }
                booking.status = 'viewing_rescheduled';
                booking.autoGenerated = false;
                ensureViewingEntry(booking, { rescheduled: true });
                didMutate = true;
                break;
            case 'cancel_viewing':
                booking.status = 'cancelled';
                booking.autoGenerated = false;
                didMutate = true;
                break;
            case 'pre_reserve':
                booking.status = 'pre_booked';
                booking.autoGenerated = false;
                didMutate = true;
                break;
            case 'mark_confirmed':
                booking.status = 'confirmed';
                booking.autoGenerated = false;
                didMutate = true;
                break;
            case 'reject':
                booking.status = 'rejected';
                booking.autoGenerated = false;
                didMutate = true;
                break;
            case 'add_note':
                showRecordDetailPage('booking', booking, 'bookings');
                if (recordDetailNoteInput) {
                    requestAnimationFrame(() => {
                        recordDetailNoteInput.focus();
                        const noteLength = recordDetailNoteInput.value.length;
                        recordDetailNoteInput.setSelectionRange(noteLength, noteLength);
                    });
                }
                return;
            case 'open_details':
                showRecordDetailPage('booking', booking, 'bookings');
                return;
            case 'log_viewing':
                window.alert('Notează feedback-ul după tur – funcționalitate în dezvoltare.');
                break;
            default:
                console.info('Acțiune neacoperită:', actionKey);
                break;
        }

        if (didMutate) {
            booking.lastUpdate = new Date();
            selectedBookingId = booking.id;
            if (booking.status !== previousStatus) {
                booking.clientStatus = getClientStatusLabel(booking.status);
                logBookingStatusChange(booking, {
                    status: booking.status,
                    user: 'Owner CRM',
                    previousStatus,
                    manual: true
                });
                if (recordDetailState.type === 'booking' && recordDetailState.id === booking.id) {
                    showRecordDetailPage('booking', booking, recordDetailState.sourcePage);
                }
            }
        }

        renderBookingsTable();
        renderOverviewLists();
        renderMonthlyCalendar();
        highlightBookingRow(booking.id);
    }

    function renderMonthlyOccupancyChart() {
        const container = document.getElementById('monthly-occupancy-chart');
        if (!container) {
            return;
        }
        container.innerHTML = '';
        const svgNs = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNs, 'svg');
        const width = container.clientWidth || 900;
        const height = Math.max(container.clientHeight || 320, 280);
        const padding = { top: 24, right: 28, bottom: 48, left: 48 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.maxWidth = 'none';

        const yAxis = document.createElementNS(svgNs, 'g');
        [0, 25, 50, 75, 100].forEach(tick => {
            const y = padding.top + chartHeight - (tick / 100) * chartHeight;
            const line = document.createElementNS(svgNs, 'line');
            line.setAttribute('x1', padding.left);
            line.setAttribute('y1', y);
            line.setAttribute('x2', width - padding.right);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', '#e5eaf1');
            line.setAttribute('stroke-dasharray', '3,3');
            yAxis.appendChild(line);
            const text = document.createElementNS(svgNs, 'text');
            text.setAttribute('x', padding.left - 10);
            text.setAttribute('y', y + 4);
            text.setAttribute('text-anchor', 'end');
            text.setAttribute('font-size', '10');
            text.setAttribute('fill', '#7a7f87');
            text.textContent = `${tick}%`;
            yAxis.appendChild(text);
        });
        svg.appendChild(yAxis);

        const points = monthlyOccupancyData.map((item, index) => {
            const x = padding.left + index * (chartWidth / Math.max(monthlyOccupancyData.length - 1, 1));
            const y = padding.top + chartHeight - (item.occupancy / 100) * chartHeight;
            return { x, y, data: item };
        });

        points.forEach(point => {
            const text = document.createElementNS(svgNs, 'text');
            text.setAttribute('x', point.x);
            text.setAttribute('y', height - padding.bottom + 15);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '10');
            text.setAttribute('fill', '#7a7f87');
            text.textContent = point.data.month;
            svg.appendChild(text);
        });

        const pathData = points.map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const linePath = document.createElementNS(svgNs, 'path');
        linePath.setAttribute('d', pathData);
        linePath.setAttribute('fill', 'none');
        linePath.setAttribute('stroke', '#4364F7');
        linePath.setAttribute('stroke-width', '2');
        svg.appendChild(linePath);

        const areaPath = document.createElementNS(svgNs, 'path');
        areaPath.setAttribute('d', `${pathData} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`);
        areaPath.setAttribute('fill', 'rgba(67, 100, 247, 0.15)');
        svg.appendChild(areaPath);

        points.forEach(point => {
            const circle = document.createElementNS(svgNs, 'circle');
            circle.setAttribute('cx', point.x);
            circle.setAttribute('cy', point.y);
            circle.setAttribute('r', '4');
            circle.setAttribute('fill', '#4364F7');
            svg.appendChild(circle);
        });

        container.appendChild(svg);
    }

    function renderEventTypeDistributionChart() {
        const container = document.getElementById('event-type-distribution-chart');
        if (!container) {
            return;
        }
        container.innerHTML = '';
        const chartContainer = document.createElement('div');
        chartContainer.className = 'pie-chart-container';
        const svgNs = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNs, 'svg');
        svg.setAttribute('viewBox', '0 0 36 36');
        svg.classList.add('pie-chart-svg');
        const legendContainer = document.createElement('div');
        legendContainer.className = 'pie-chart-legend';
        const total = eventTypeDistributionData.reduce((sum, item) => sum + item.count, 0);
        let accumulatedPercentage = 0;
        eventTypeDistributionData.forEach(item => {
            const percentage = (item.count / total) * 100;
            const slice = document.createElementNS(svgNs, 'circle');
            slice.classList.add('pie-slice');
            slice.setAttribute('cx', '18');
            slice.setAttribute('cy', '18');
            slice.setAttribute('r', '15.9154943092');
            slice.setAttribute('fill', 'transparent');
            slice.setAttribute('stroke', item.color);
            slice.setAttribute('stroke-width', '3.8');
            slice.setAttribute('stroke-dasharray', `${percentage} ${100 - percentage}`);
            slice.setAttribute('stroke-dashoffset', `-${accumulatedPercentage}`);
            const title = document.createElementNS(svgNs, 'title');
            title.textContent = `${item.type}: ${item.count} (${percentage.toFixed(1)}%)`;
            slice.appendChild(title);
            svg.appendChild(slice);

            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            const dot = document.createElement('div');
            dot.className = 'legend-dot';
            dot.style.backgroundColor = item.color;
            const label = document.createElement('span');
            label.textContent = `${item.type} (${item.count})`;
            legendItem.append(dot, label);
            legendContainer.appendChild(legendItem);

            legendItem.addEventListener('mouseenter', () => slice.style.transform = 'scale(1.05)');
            legendItem.addEventListener('mouseleave', () => slice.style.transform = 'scale(1)');
            slice.addEventListener('mouseenter', () => legendItem.style.fontWeight = '600');
            slice.addEventListener('mouseleave', () => legendItem.style.fontWeight = 'normal');

            accumulatedPercentage += percentage;
        });
        chartContainer.appendChild(svg);
        chartContainer.appendChild(legendContainer);
        container.appendChild(chartContainer);
    }

    function renderViewingsStatusChart() {
        const container = document.getElementById('viewings-status-chart');
        if (!container) {
            return;
        }
        const now = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(now.getDate() + 8);
        now.setHours(0, 0, 0, 0);
        const viewingsInNext7Days = viewings.filter(viewing => {
            const viewingDate = parseBookingDate(viewing.date);
            return viewingDate && viewingDate >= now && viewingDate <= sevenDaysFromNow;
        });
        const counts = viewingsInNext7Days.reduce((acc, viewing) => {
            acc[viewing.status] = (acc[viewing.status] || 0) + 1;
            return acc;
        }, {});
        const chartData = Object.entries(counts).map(([status, count]) => {
            const meta = viewingStatusMeta[status];
            return {
                type: meta?.label || status,
                count,
                color: meta?.color || '#cccccc'
            };
        });
        container.innerHTML = '';
        if (!chartData.length) {
            container.innerHTML = '<p style="text-align:center; color: var(--muted-color); padding: 20px 0;">Nicio vizionare în următoarele 7 zile.</p>';
            return;
        }
        const chartContainer = document.createElement('div');
        chartContainer.className = 'pie-chart-container';
        const svgNs = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNs, 'svg');
        svg.setAttribute('viewBox', '0 0 36 36');
        svg.classList.add('pie-chart-svg');
        const legendContainer = document.createElement('div');
        legendContainer.className = 'pie-chart-legend';
        const total = chartData.reduce((sum, item) => sum + item.count, 0);
        let accumulatedPercentage = 0;
        chartData.forEach(item => {
            const percentage = (item.count / total) * 100;
            const slice = document.createElementNS(svgNs, 'circle');
            slice.classList.add('pie-slice');
            slice.setAttribute('cx', '18');
            slice.setAttribute('cy', '18');
            slice.setAttribute('r', '15.9154943092');
            slice.setAttribute('fill', 'transparent');
            slice.setAttribute('stroke', item.color);
            slice.setAttribute('stroke-width', '3.8');
            slice.setAttribute('stroke-dasharray', `${percentage} ${100 - percentage}`);
            slice.setAttribute('stroke-dashoffset', `-${accumulatedPercentage}`);
            const title = document.createElementNS(svgNs, 'title');
            title.textContent = `${item.type}: ${item.count} (${percentage.toFixed(1)}%)`;
            slice.appendChild(title);
            svg.appendChild(slice);

            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            const dot = document.createElement('div');
            dot.className = 'legend-dot';
            dot.style.backgroundColor = item.color;
            const label = document.createElement('span');
            label.textContent = `${item.type} (${item.count})`;
            legendItem.append(dot, label);
            legendContainer.appendChild(legendItem);

            legendItem.addEventListener('mouseenter', () => slice.style.transform = 'scale(1.05)');
            legendItem.addEventListener('mouseleave', () => slice.style.transform = 'scale(1)');
            slice.addEventListener('mouseenter', () => legendItem.style.fontWeight = '600');
            slice.addEventListener('mouseleave', () => legendItem.style.fontWeight = 'normal');

            accumulatedPercentage += percentage;
        });
        chartContainer.appendChild(svg);
        chartContainer.appendChild(legendContainer);
        container.appendChild(chartContainer);
    }

    function navigateToAvailabilityForVenue(venueName) {
        activatePage('availability');
        const availabilityFilter = document.getElementById('availability-venue-filter');
        if (!availabilityFilter || !venueName) {
            return;
        }
        let option = Array.from(availabilityFilter.options).find(opt => opt.value === venueName);
        if (!option) {
            option = document.createElement('option');
            option.value = venueName;
            option.textContent = venueName;
            availabilityFilter.appendChild(option);
        }
        const shouldTriggerChange = availabilityFilter.value !== venueName;
        availabilityFilter.value = venueName;
        if (shouldTriggerChange) {
            availabilityFilter.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            renderMonthlyCalendar();
        }
        document.getElementById('availability-calendar-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    document.querySelector('[data-navigate-availability]')?.addEventListener('click', () => {
        navigateToAvailabilityForVenue('all');
    });

    function renderVenueCards() {
        const container = document.getElementById('venue-cards');
        if (!container) {
            return;
        }
        container.innerHTML = '';
        venues.forEach((venue, index) => {
            const card = document.createElement('article');
            card.className = 'venue-card';

            const image = document.createElement('div');
            image.className = 'venue-card-image';
            if (venue.image) {
                image.style.backgroundImage = `url('${venue.image}')`;
            }

            const content = document.createElement('div');
            content.className = 'venue-card-content';

            const header = document.createElement('div');
            header.className = 'venue-card-header';

            const titleWrapper = document.createElement('div');
            const title = document.createElement('h3');
            title.textContent = venue.name;
            const location = document.createElement('p');
            location.className = 'venue-card-location';
            location.textContent = `${venue.city}, România`;
            titleWrapper.append(title, location);

            const normalizedStatus = (venue.status || '').toLowerCase();
            const statusKey = normalizedStatus.includes('activ') ? 'confirmed' : 'availability_confirmed';
            const statusChip = createStatusChip(statusKey);
            statusChip.textContent = venue.status || '—';
            statusChip.dataset.status = statusKey;
            statusChip.classList.add('status-chip--compact');

            header.append(titleWrapper, statusChip);

            const meta = document.createElement('div');
            meta.className = 'venue-card-meta';
            const capacityItem = document.createElement('span');
            capacityItem.className = 'venue-meta-item';
            const minCapacity = Number.isFinite(venue.minCapacity) ? venue.minCapacity : null;
            const maxCapacity = Number.isFinite(venue.maxCapacity) ? venue.maxCapacity : null;
            let capacityLabel = 'Capacitate nespecificată';
            if (minCapacity !== null && maxCapacity !== null) {
                capacityLabel = `${minCapacity}-${maxCapacity} persoane`;
            } else if (minCapacity !== null) {
                capacityLabel = `de la ${minCapacity} persoane`;
            } else if (maxCapacity !== null) {
                capacityLabel = `până la ${maxCapacity} persoane`;
            } else if (venue.capacity) {
                capacityLabel = venue.capacity;
            }
            capacityItem.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg><span>Capacitate: ' + capacityLabel + '</span>';
            meta.appendChild(capacityItem);

            const footer = document.createElement('div');
            footer.className = 'venue-card-footer';
            if (typeof venue.pricePerGuest === 'number') {
                const price = document.createElement('span');
                price.className = 'venue-card-price';
                price.innerHTML = `de la <strong>${venue.pricePerGuest}€</strong>/pers`;
                footer.appendChild(price);
            }
            const actions = document.createElement('div');
            actions.className = 'venue-card-actions';
            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.className = 'crm-button ghost';
            editBtn.textContent = 'Editează detalii';
            const availabilityBtn = document.createElement('button');
            availabilityBtn.type = 'button';
            availabilityBtn.className = 'crm-button primary';
            availabilityBtn.textContent = 'Actualizează disponibilitate';
            editBtn.addEventListener('click', () => openVenueForm('edit', index));
            availabilityBtn.addEventListener('click', () => navigateToAvailabilityForVenue(venue.name));
            actions.append(editBtn, availabilityBtn);
            footer.appendChild(actions);

            content.append(header, meta, footer);
            card.append(image, content);
            container.appendChild(card);
        });
    }

    function setupBookingModal() {
        const modal = document.getElementById('add-booking-modal');
        const closeBtns = modal?.querySelectorAll('.modal-close-btn') || [];
        const form = document.getElementById('add-booking-form');
        const venueSelect = document.getElementById('booking-venue');
        const openButtons = Array.from(document.querySelectorAll('[data-open-booking-modal]'));
        if (!modal || !form || !venueSelect) {
            return;
        }
        modal.classList.remove('is-visible');
        populateSelect(venueSelect, Array.from(venuesSelect).sort(), false);
        if (typeof flatpickr === 'function') {
            const dateInput = document.getElementById('booking-date');
            flatpickr(dateInput, { dateFormat: 'Y-m-d', altInput: true, altFormat: 'd M Y', locale: 'ro' });
        }
        const openModal = () => modal.classList.add('is-visible');
        const closeModal = () => modal.classList.remove('is-visible');
        openButtons.forEach(btn => {
            btn.addEventListener('click', (event) => {
                if (btn.hasAttribute('disabled')) {
                    return;
                }
                event.preventDefault();
                openModal();
            });
        });
        const handleTriggerClick = (event) => {
            if (event.defaultPrevented) {
                return;
            }
            const trigger = event.target.closest('[data-open-booking-modal]');
            if (!trigger || trigger.hasAttribute('disabled')) {
                return;
            }
            event.preventDefault();
            openModal();
        };
        document.addEventListener('click', handleTriggerClick);
        closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const dateValue = formData.get('date');
            if (!dateValue) {
                window.alert('Te rugăm să selectezi o dată.');
                return;
            }
            const dateObject = new Date(dateValue);
            const guestsValue = parseInt(formData.get('guests'), 10);
            if (!Number.isFinite(guestsValue) || guestsValue < 1) {
                window.alert('Numărul de invitați este obligatoriu și trebuie să fie mai mare decât zero.');
                return;
            }
            const nextId = bookings.reduce((max, booking) => Math.max(max, booking.id), 0) + 1;
            const newBooking = {
                id: nextId,
                client: formData.get('client'),
                event: formData.get('event'),
                venue: formData.get('venue'),
                date: formatDate(dateObject),
                guests: guestsValue,
                status: 'confirmed',
                autoGenerated: false,
                email: formData.get('email'),
                phone: formData.get('phone'),
                details: formData.get('details'),
                lastUpdate: new Date()
            };
            bookings.push(newBooking);
            renderBookingsTable();
            renderOverviewLists();
            renderMonthlyCalendar();
            form.reset();
            closeModal();
            highlightBookingRow(newBooking.id, { scroll: true });
        });
    }

    function setupEditModal() {
        const modal = document.getElementById('view-booking-modal');
        const form = document.getElementById('edit-booking-form');
        if (!modal || !form) {
            return;
        }
        const closeBtns = modal.querySelectorAll('.modal-close-btn');
        const closeModal = () => modal.classList.remove('is-visible');
        closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const bookingId = parseInt(document.getElementById('edit-booking-id').value, 10);
            const bookingIndex = bookings.findIndex(b => b.id === bookingId);
            if (bookingIndex === -1) {
                closeModal();
                return;
            }
            const formData = new FormData(form);
            const guestsValue = parseInt(formData.get('guests'), 10);
            if (!Number.isFinite(guestsValue) || guestsValue < 1) {
                window.alert('Numărul de invitați este obligatoriu și trebuie să fie mai mare decât zero.');
                return;
            }
            bookings[bookingIndex].client = formData.get('client');
            bookings[bookingIndex].email = formData.get('email');
            bookings[bookingIndex].phone = formData.get('phone');
            bookings[bookingIndex].event = formData.get('event');
            bookings[bookingIndex].venue = formData.get('venue');
            bookings[bookingIndex].guests = guestsValue;
            bookings[bookingIndex].details = formData.get('details');
            bookings[bookingIndex].lastUpdate = new Date();
            renderBookingsTable();
            renderOverviewLists();
            highlightBookingRow(bookingId);
            closeModal();
        });
    }

    function openEditBookingModal(booking) {
        const modal = document.getElementById('view-booking-modal');
        if (!modal) {
            return;
        }
        document.getElementById('edit-booking-id').value = booking.id;
        document.getElementById('edit-booking-client').value = booking.client || '';
        document.getElementById('edit-booking-email').value = booking.email || '';
        document.getElementById('edit-booking-phone').value = booking.phone || '';
        document.getElementById('edit-booking-guests').value = booking.guests || '';
        document.getElementById('edit-booking-details').value = booking.details || '';
        const eventTypeSelect = document.getElementById('edit-booking-event-type');
        eventTypeSelect.innerHTML = document.getElementById('booking-event-type').innerHTML;
        eventTypeSelect.value = booking.event;
        const venueSelect = document.getElementById('edit-booking-venue');
        venueSelect.innerHTML = document.getElementById('booking-venue').innerHTML;
        venueSelect.value = booking.venue;
        modal.classList.add('is-visible');
    }

    function setupRescheduleModal() {
        const modal = document.getElementById('reschedule-viewing-modal');
        const form = document.getElementById('reschedule-viewing-form');
        if (!modal || !form) {
            showRescheduleModal = null;
            return;
        }
        const slotsContainer = form.querySelector('[data-reschedule-slots]');
        const addSlotBtn = form.querySelector('[data-add-reschedule-slot]');
        const counterEl = form.querySelector('[data-reschedule-slot-counter]');
        const closeButtons = modal.querySelectorAll('.modal-close-btn');
        const pickers = new Map();
        const maxSlots = 4;
        let activeContext = null;

        const resolveContext = (input) => {
            if (input && typeof input === 'object' && 'record' in input) {
                return {
                    type: input.type === 'viewing' ? 'viewing' : 'booking',
                    record: input.record,
                    relatedBooking: input.relatedBooking || null
                };
            }
            return { type: 'booking', record: input, relatedBooking: null };
        };

        const combineDateTime = (dateString, timeString) => {
            const base = parseBookingDate(dateString);
            if (!base) {
                return null;
            }
            if (typeof timeString === 'string') {
                const [hours, minutes] = timeString.split(':').map(Number);
                if (Number.isFinite(hours)) {
                    base.setHours(hours, Number.isFinite(minutes) ? minutes : 0, 0, 0);
                    return base;
                }
            }
            base.setHours(11, 0, 0, 0);
            return base;
        };

        const updateControls = () => {
            if (!slotsContainer) {
                return;
            }
            const rows = Array.from(slotsContainer.querySelectorAll('[data-slot-row]'));
            const total = rows.length;
            if (addSlotBtn) {
                addSlotBtn.disabled = total >= maxSlots;
            }
            if (counterEl) {
                if (total) {
                    counterEl.textContent = `${total}/${maxSlots} intervale`;
                    counterEl.hidden = false;
                } else {
                    counterEl.textContent = '';
                    counterEl.hidden = true;
                }
            }
            const removeButtons = slotsContainer.querySelectorAll('[data-remove-slot]');
            const hideRemove = total <= 1;
            removeButtons.forEach(btn => {
                btn.disabled = hideRemove;
                btn.hidden = hideRemove;
            });
        };

        const destroySlots = () => {
            pickers.forEach(config => {
                config?.datePicker?.destroy();
                config?.timePicker?.destroy();
            });
            pickers.clear();
            if (slotsContainer) {
                slotsContainer.innerHTML = '';
            }
            updateControls();
        };

        const createSlot = (initialDate = null) => {
            if (!slotsContainer || slotsContainer.children.length >= maxSlots) {
                return;
            }
            const wrapper = document.createElement('div');
            wrapper.className = 'reschedule-slot';
            wrapper.dataset.slotRow = 'true';

            const fields = document.createElement('div');
            fields.className = 'reschedule-slot-fields';

            const dateInput = document.createElement('input');
            dateInput.type = 'text';
            dateInput.placeholder = 'Selectează data';
            dateInput.required = true;
            dateInput.dataset.slotDate = 'true';

            const timeInput = document.createElement('input');
            timeInput.type = 'text';
            timeInput.placeholder = 'Selectează ora';
            timeInput.required = true;
            timeInput.dataset.slotTime = 'true';
            timeInput.inputMode = 'numeric';

            fields.append(dateInput, timeInput);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'crm-button ghost sm';
            removeBtn.dataset.removeSlot = 'true';
            removeBtn.textContent = 'Șterge';

            wrapper.append(fields, removeBtn);
            slotsContainer.appendChild(wrapper);

            let datePicker = null;
            let timePicker = null;
            if (typeof flatpickr === 'function') {
                datePicker = flatpickr(dateInput, {
                    enableTime: false,
                    altInput: true,
                    altFormat: 'd M Y',
                    dateFormat: 'Y-m-d',
                    locale: 'ro',
                    minDate: 'today',
                    allowInput: true
                });
                timePicker = flatpickr(timeInput, {
                    enableTime: true,
                    noCalendar: true,
                    time_24hr: true,
                    minuteIncrement: 15,
                    dateFormat: 'H:i',
                    defaultHour: 11,
                    defaultMinute: 0,
                    allowInput: true
                });
            }

            if (initialDate instanceof Date && !Number.isNaN(initialDate.getTime())) {
                const preset = new Date(initialDate.getTime());
                datePicker?.setDate(preset, true, 'Y-m-d');
                if (timePicker) {
                    timePicker.setDate(preset, true, 'H:i');
                } else {
                    timeInput.value = formatTime(preset);
                }
            }

            pickers.set(wrapper, {
                datePicker,
                timePicker,
                dateInput,
                timeInput
            });

            removeBtn.addEventListener('click', () => {
                const config = pickers.get(wrapper);
                config?.datePicker?.destroy();
                config?.timePicker?.destroy();
                pickers.delete(wrapper);
                wrapper.remove();
                updateControls();
            });

            updateControls();
            return wrapper;
        };

        const normalizeSuggestion = (value) => {
            if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
                return null;
            }
            const normalized = new Date(value.getTime());
            normalized.setSeconds(0, 0);
            return {
                date: normalized,
                iso: normalized.toISOString(),
                label: `${formatDate(normalized)} · ${formatTime(normalized)}`
            };
        };

        const closeModal = () => {
            modal.classList.remove('is-visible');
            destroySlots();
            activeContext = null;
        };

        const applyBookingSuggestions = (booking, suggestions, { toastMessage = null } = {}) => {
            const previousStatus = booking.status;
            booking.status = 'viewing_rescheduled';
            booking.autoGenerated = false;
            booking.rescheduleSuggestions = suggestions.map(item => ({
                iso: item.iso,
                label: item.label,
                date: new Date(item.date.getTime())
            }));
            booking.lastUpdate = new Date();
            booking.clientStatus = getClientStatusLabel(booking.status);
            logBookingStatusChange(booking, {
                status: booking.status,
                user: 'Owner CRM',
                previousStatus,
                manual: true,
                reason: `Sloturi propuse: ${suggestions.map(item => item.label).join('; ')}`
            });
            ensureViewingEntry(booking, { rescheduled: true });
            selectedBookingId = booking.id;
            renderBookingsTable();
            renderOverviewLists();
            renderMonthlyCalendar();
            if (recordDetailState.type === 'booking' && recordDetailState.id === booking.id) {
                showRecordDetailPage('booking', booking, recordDetailState.sourcePage);
            }
            highlightBookingRow(booking.id, { scroll: true });
            if (toastMessage) {
                showAutomationToast(toastMessage);
            }
        };

        const applyViewingSuggestions = (viewing, suggestions, relatedBooking, { toastMessage = null } = {}) => {
            viewing.status = 'viewing_rescheduled';
            viewing.lastUpdate = new Date();
            viewing.rescheduleSuggestions = suggestions.map(item => ({
                iso: item.iso,
                label: item.label,
                date: new Date(item.date.getTime())
            }));
            viewing.ownerSlotsUpdatedAt = viewing.lastUpdate;
            const first = suggestions[0];
            if (first) {
                viewing.date = formatDate(first.date);
                viewing.hour = formatTime(first.date);
            }
            const venueFilter = document.getElementById('viewings-venue-filter');
            if (venueFilter) {
                const hasOption = Array.from(venueFilter.options).some(option => option.value === viewing.venue);
                venueFilter.value = hasOption ? viewing.venue : 'all';
            }
            renderViewingsTable();
            renderViewingsStatusChart();
            renderViewingsCalendar();
            renderOverviewLists();
            selectedViewingId = viewing.id;
            requestAnimationFrame(() => focusViewingRow(viewing.id));
            if (relatedBooking) {
                applyBookingSuggestions(relatedBooking, suggestions, { toastMessage: null });
            }
            if (toastMessage) {
                showAutomationToast(toastMessage);
            }
        };

        const openModal = (input) => {
            const context = resolveContext(input);
            if (!context.record) {
                return;
            }
            if (context.type === 'viewing' && !context.relatedBooking) {
                context.relatedBooking = bookings.find(booking =>
                    booking.client === context.record.client &&
                    booking.venue === context.record.venue) || null;
            }
            activeContext = context;
            destroySlots();

            const { record, type, relatedBooking } = context;
            const existingSuggestions = Array.isArray(record?.rescheduleSuggestions) && record.rescheduleSuggestions.length
                ? record.rescheduleSuggestions.slice(0, maxSlots)
                : (relatedBooking?.rescheduleSuggestions
                    ? relatedBooking.rescheduleSuggestions.slice(0, maxSlots)
                    : []);

            existingSuggestions.forEach(item => {
                const parsed = item?.date instanceof Date
                    ? item.date
                    : (item?.iso ? new Date(item.iso) : null);
                if (parsed) {
                    createSlot(parsed);
                }
            });

            if (!slotsContainer.children.length) {
                const baseDate = type === 'viewing'
                    ? combineDateTime(record?.date, record?.hour)
                    : parseBookingDate(record?.date || '');
                const normalizedBase = baseDate || addDays(2);
                if (!baseDate || (normalizedBase.getHours() === 0 && normalizedBase.getMinutes() === 0)) {
                    normalizedBase.setHours(11, 0, 0, 0);
                }
                const first = new Date(normalizedBase.getTime());
                const second = new Date(first.getTime());
                second.setDate(second.getDate() + 1);
                createSlot(first);
                createSlot(second);
            }

            modal.classList.add('is-visible');
            updateControls();
            const firstInput = slotsContainer.querySelector('[data-slot-date]');
            if (firstInput) {
                requestAnimationFrame(() => firstInput.focus());
            }
        };

        closeButtons.forEach(btn => btn.addEventListener('click', closeModal));
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
        addSlotBtn?.addEventListener('click', () => createSlot());

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!slotsContainer || !activeContext?.record) {
                closeModal();
                return;
            }
            const rows = Array.from(slotsContainer.querySelectorAll('[data-slot-row]'));
            const suggestions = [];
            let hasInvalid = false;

            rows.forEach(row => {
                const config = pickers.get(row);
                if (!config) {
                    return;
                }
                const { datePicker, timePicker, dateInput, timeInput } = config;
                const selectedDate = datePicker?.selectedDates?.[0]
                    || (dateInput.value ? new Date(dateInput.value) : null);
                let baseDate = null;
                if (selectedDate instanceof Date && !Number.isNaN(selectedDate.getTime())) {
                    baseDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0);
                }
                const timeSelection = timePicker?.selectedDates?.[0];
                let hours = null;
                let minutes = 0;
                if (timeSelection instanceof Date && !Number.isNaN(timeSelection.getTime())) {
                    hours = timeSelection.getHours();
                    minutes = timeSelection.getMinutes();
                } else if (timeInput.value) {
                    const [hStr, mStr] = timeInput.value.split(':');
                    const parsedHours = Number.parseInt(hStr, 10);
                    const parsedMinutes = Number.parseInt(mStr, 10);
                    if (Number.isFinite(parsedHours)) {
                        hours = parsedHours;
                        minutes = Number.isFinite(parsedMinutes) ? parsedMinutes : 0;
                    }
                }
                if (!baseDate || !Number.isFinite(hours)) {
                    hasInvalid = true;
                    if (!baseDate) {
                        dateInput.classList.add('is-invalid');
                        setTimeout(() => dateInput.classList.remove('is-invalid'), 1500);
                    }
                    if (!Number.isFinite(hours)) {
                        timeInput.classList.add('is-invalid');
                        setTimeout(() => timeInput.classList.remove('is-invalid'), 1500);
                    }
                    return;
                }
                const combined = new Date(baseDate.getTime());
                combined.setHours(hours, minutes, 0, 0);
                const suggestion = normalizeSuggestion(combined);
                if (!suggestion) {
                    hasInvalid = true;
                    dateInput.classList.add('is-invalid');
                    timeInput.classList.add('is-invalid');
                    setTimeout(() => {
                        dateInput.classList.remove('is-invalid');
                        timeInput.classList.remove('is-invalid');
                    }, 1500);
                    return;
                }
                suggestions.push(suggestion);
            });

            if (hasInvalid || !suggestions.length) {
                showAutomationToast('Selectează cel puțin un interval valid pentru vizionare.');
                return;
            }

            const unique = [];
            const seen = new Set();
            suggestions.forEach(item => {
                if (!item.iso || seen.has(item.iso)) {
                    return;
                }
                seen.add(item.iso);
                unique.push(item);
            });

            const toastMessage = `Au fost propuse ${unique.length} intervale pentru vizionare.`;
            if (activeContext.type === 'viewing') {
                applyViewingSuggestions(activeContext.record, unique, activeContext.relatedBooking, { toastMessage });
            } else {
                applyBookingSuggestions(activeContext.record, unique, { toastMessage });
            }

            closeModal();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.classList.contains('is-visible')) {
                closeModal();
            }
        });

        showRescheduleModal = openModal;
    }

    function navigateToBooking(bookingId) {
        activatePage('bookings');
        setTimeout(() => {
            highlightBookingRow(bookingId, { scroll: true });
        }, 100);
    }

    function navigateToViewing(viewingId) {
        activatePage('viewings');
        setTimeout(() => {
            highlightViewingRow(viewingId, { scroll: true });
        }, 100);
    }

    function initializeDynamicContent() {
        const availabilityWeekEl = document.getElementById('availability-week-range');
        if (availabilityWeekEl) {
            availabilityWeekEl.textContent = `Intervale pentru ${formatDate(today)} - ${formatDate(addDays(6))}`;
        }
    }

    initializeDynamicContent();
    renderOverviewLists();
    renderBookingsTable();
    renderViewingsTable();
    renderMonthlyCalendar();
    renderViewingsCalendar();
    setupBookingModal();
    setupEditModal();
    setupRescheduleModal();
    renderVenueCards();
    renderMonthlyOccupancyChart();
    renderEventTypeDistributionChart();
    renderViewingsStatusChart();

    document.getElementById('bookings-venue-filter')?.addEventListener('change', renderBookingsTable);
    document.getElementById('bookings-status-filter')?.addEventListener('change', renderBookingsTable);
    document.getElementById('bookings-client-filter')?.addEventListener('input', () => {
        renderBookingsTable();
    });
    document.getElementById('bookings-date-filter-clear')?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearBookingsDateFilter();
    });
    document.getElementById('viewings-venue-filter')?.addEventListener('change', renderViewingsTable);
    document.getElementById('viewings-client-filter')?.addEventListener('input', renderViewingsTable);
    document.getElementById('viewings-calendar-venue-filter')?.addEventListener('change', renderViewingsCalendar);

    const availabilityCalendarGrid = document.getElementById('availability-calendar-grid');
    availabilityCalendarGrid?.addEventListener('click', (event) => {
        const dayCell = event.target.closest('.calendar-day');
        if (!dayCell || !availabilityCalendarGrid.contains(dayCell) || dayCell.classList.contains('is-other-month')) {
            return;
        }
        if (event.target.closest('.calendar-event')) {
            return;
        }
        const dateISO = dayCell.dataset.dateIso;
        if (!dateISO) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        showAvailabilityQuickMenu(dayCell, { dateISO });
    });

    availabilityCalendarGrid?.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }
        const dayCell = event.target.closest('.calendar-day');
        if (!dayCell || dayCell.classList.contains('is-other-month')) {
            return;
        }
        const dateISO = dayCell.dataset.dateIso;
        if (!dateISO) {
            return;
        }
        event.preventDefault();
        showAvailabilityQuickMenu(dayCell, { dateISO });
    });

    document.getElementById('prev-viewings-month-btn')?.addEventListener('click', () => {
        currentViewingsMonthOffset -= 1;
        renderViewingsCalendar();
    });
    document.getElementById('next-viewings-month-btn')?.addEventListener('click', () => {
        currentViewingsMonthOffset += 1;
        renderViewingsCalendar();
    });
    document.getElementById('today-availability-btn')?.addEventListener('click', () => {
        currentMonthOffset = 0;
        renderMonthlyCalendar();
    });

    const monthYearPickerEl = document.getElementById('availability-month-year');
    if (monthYearPickerEl && typeof flatpickr === 'function' && typeof monthSelectPlugin === 'function') {
        flatpickr(monthYearPickerEl, {
            plugins: [
                new monthSelectPlugin({
                    shorthand: true,
                    dateFormat: 'F Y',
                    altFormat: 'F Y'
                })
            ],
            onChange(selectedDates) {
                const selectedDate = selectedDates[0];
                if (!selectedDate) {
                    return;
                }
                const base = new Date();
                const diff = (selectedDate.getFullYear() - base.getFullYear()) * 12 + (selectedDate.getMonth() - base.getMonth());
                currentMonthOffset = diff;
                renderMonthlyCalendar();
            }
        });
    }

    document.getElementById('prev-month-btn')?.addEventListener('click', () => {
        currentMonthOffset -= 1;
        renderMonthlyCalendar();
    });
    document.getElementById('next-month-btn')?.addEventListener('click', () => {
        currentMonthOffset += 1;
        renderMonthlyCalendar();
    });

    document.addEventListener('click', (event) => {
        if (activeAvailabilityMenu) {
            const { menu, dayCell } = activeAvailabilityMenu;
            if (!menu.contains(event.target) && !dayCell.contains(event.target)) {
                hideAvailabilityQuickMenu();
            }
        }
        if (activeActionsMenu) {
            const { container } = activeActionsMenu;
            const isWithinActiveMenu = container && container.contains(event.target);
            if (!isWithinActiveMenu) {
                event.preventDefault();
                event.stopPropagation();
                closeActiveActionsMenu();
            }
        }
    }, true);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeActiveActionsMenu();
            hideAvailabilityQuickMenu();
        }
    });

    const bookingsTableBody = document.getElementById('bookings-table-body');
    bookingsTableBody?.addEventListener('click', (event) => {
        const actionBtn = event.target.closest('button[data-action]');
        if (!actionBtn) {
            return;
        }
        const row = actionBtn.closest('tr');
        if (!row) {
            return;
        }
        const bookingId = Number(row.dataset.identifier);
        if (!bookingId) {
            return;
        }
        handleBookingAction(bookingId, actionBtn.dataset.action);
    });

    const viewingsTableBody = document.getElementById('viewings-table-body');
    viewingsTableBody?.addEventListener('click', (event) => {
        const actionBtn = event.target.closest('button[data-action]');
        if (!actionBtn) {
            return;
        }
        const row = actionBtn.closest('tr');
        if (!row) {
            return;
        }
        const viewingId = Number(row.dataset.identifier);
        if (!viewingId) {
            return;
        }
        handleViewingAction(viewingId, actionBtn.dataset.action);
    });

    const autoOfferToggle = document.getElementById('auto-offer-toggle');
    if (autoOfferToggle) {
        autoOfferEnabled = autoOfferToggle.checked;
        autoOfferToggle.addEventListener('change', (event) => {
            autoOfferEnabled = event.target.checked;
            const message = autoOfferEnabled
                ? 'Trimiterea automată de ofertă este activă. Confirmările vor trimite instant oferta standard.'
                : 'Trimiterea automată de ofertă este dezactivată. Clientul va primi doar confirmarea disponibilității.';
            showAutomationToast(message);
        });
    }

    function handleViewingAction(viewingId, action, triggerEvent) {
        const viewing = viewings.find(item => item.id === viewingId);
        if (!viewing) {
            return;
        }
        const now = new Date();
        switch (action) {
            case 'confirm-slot': {
                const tableRow = document.querySelector(`#viewings-table-body tr[data-identifier="${viewingId}"]`);
                const selectedInput = tableRow?.querySelector(`input[name="viewing-${viewingId}-slot"]:checked`);
                if (!selectedInput) {
                    window.alert('Selectează un interval înainte de a confirma vizionarea.');
                    return;
                }
                const slotIso = selectedInput.value;
                const source = selectedInput.dataset.source || 'owner';
                const allSlots = [
                    ...(Array.isArray(viewing.clientSlots) ? viewing.clientSlots : []),
                    ...(Array.isArray(viewing.rescheduleSuggestions) ? viewing.rescheduleSuggestions : [])
                ];
                const matchedSlot = allSlots.find(slot => slot?.iso === slotIso);
                if (!matchedSlot) {
                    window.alert('Intervalul selectat nu mai este disponibil.');
                    return;
                }
                const normalizedSlot = createSlotObject(matchedSlot.date || matchedSlot.iso);
                if (!normalizedSlot) {
                    window.alert('Intervalul selectat nu este valid.');
                    return;
                }
                viewing.status = 'viewing_scheduled';
                viewing.lastUpdate = now;
                viewing.confirmedSlot = normalizedSlot;
                viewing.date = formatDate(normalizedSlot.date);
                viewing.hour = formatTime(normalizedSlot.date);
                viewing.rescheduleSuggestions = [];
                viewing.ownerSlotsUpdatedAt = null;
                const noteSource = source === 'client'
                    ? 'Vizionarea a fost confirmată pe unul dintre intervalele propuse de client.'
                    : 'Vizionarea a fost confirmată pe intervalul propus de locație.';
                viewing.notes = noteSource;
                showAutomationToast(`Vizionarea pentru ${viewing.client} a fost confirmată pe ${viewing.date} la ${viewing.hour}.`);
                break;
            }
            case 'reschedule': {
                if (typeof showRescheduleModal === 'function') {
                    const relatedBooking = bookings.find(item =>
                        item.client === viewing.client && item.venue === viewing.venue) || null;
                    showRescheduleModal({ type: 'viewing', record: viewing, relatedBooking });
                    return;
                }
                viewing.status = 'viewing_rescheduled';
                viewing.lastUpdate = now;
                viewing.notes = 'Ai inițiat o reprogramare pentru această vizionare.';
                showAutomationToast(`Propune o nouă dată pentru ${viewing.client}.`);
                break;
            }
            case 'reject':
                viewing.status = 'viewing_rejected';
                viewing.lastUpdate = now;
                viewing.confirmedSlot = null;
                viewing.notes = 'Cererea a fost respinsă. Informează clientul despre motiv.';
                showAutomationToast(`Cererea de vizionare pentru ${viewing.client} a fost marcată ca respinsă.`);
                break;
            case 'cancel-viewing':
                viewing.status = 'viewing_cancelled';
                viewing.lastUpdate = now;
                viewing.confirmedSlot = null;
                viewing.notes = 'Vizionarea a fost anulată.';
                showAutomationToast(`Vizionarea pentru ${viewing.client} a fost anulată.`);
                break;
            default:
                break;
        }
        renderViewingsTable();
        renderViewingsStatusChart();
        renderViewingsCalendar();
        renderOverviewLists();
        selectedViewingId = viewingId;
        highlightViewingRow(viewingId, { scroll: true });
        if (triggerEvent === 'detail') {
            const updatedViewing = viewings.find(item => item.id === viewingId) || viewing;
            if (recordDetailState.type === 'viewing' && recordDetailState.id === viewingId && updatedViewing) {
                showRecordDetailPage('viewing', updatedViewing, recordDetailState.sourcePage);
            } else if (recordDetailState.type === 'booking' && recordDetailState.id) {
                const bookingRecord = bookings.find(item => item.id === recordDetailState.id);
                if (bookingRecord) {
                    showRecordDetailPage('booking', bookingRecord, recordDetailState.sourcePage);
                }
            }
        }
    }

    recordDetailBackBtn?.addEventListener('click', () => returnToListPage({ scroll: true }));
    recordDetailSaveBtn?.addEventListener('click', saveRecordDetailNote);
    recordDetailQuickActions.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.detailAction;
            const { type, id } = recordDetailState;
            if (type !== 'booking' || !id) {
                showAutomationToast('Selectează o rezervare pentru a folosi acțiunile rapide.');
                return;
            }
            const record = bookings.find(item => item.id === id);
            if (!record) {
                return;
            }
            const currentVenue = recordDetailCurrentVenue || record.venue || null;
            const dateISO = buildIsoDateFromBooking(record.date);
            const previousStatus = record.status;
            const hadManualStatus = dateISO ? Boolean(getManualStatusForVenue(dateISO, currentVenue)) : false;
            let statusMutated = false;
            let actionHandled = false;

            switch (action) {
                case 'reserve':
                    if (record.status !== 'confirmed') {
                        record.status = 'confirmed';
                        statusMutated = true;
                    }
                    if (dateISO) {
                        setAvailabilityStatus(dateISO, 'manual_reserved', currentVenue);
                    }
                    actionHandled = true;
                    break;
                case 'pre-reserve':
                    if (record.status !== 'pre_booked') {
                        record.status = 'pre_booked';
                        statusMutated = true;
                    }
                    if (dateISO) {
                        setAvailabilityStatus(dateISO, 'manual_pre_reserved', currentVenue);
                    }
                    actionHandled = true;
                    break;
                case 'reject':
                    if (record.status !== 'rejected') {
                        record.status = 'rejected';
                        statusMutated = true;
                    }
                    if (dateISO) {
                        setAvailabilityStatus(dateISO, 'manual_free', currentVenue);
                    }
                    {
                        const friendlyDate = dateISO ? formatFriendlyDateFromISO(dateISO) : null;
                        const releaseNote = hadManualStatus && friendlyDate ? ` Data ${friendlyDate} este marcată liberă.` : '';
                        const clientSegment = record.client ? `pentru ${record.client}` : 'selectată';
                        showAutomationToast(`Rezervarea ${clientSegment} a fost marcată ca respinsă.${releaseNote}`);
                    }
                    actionHandled = true;
                    break;
                default:
                    break;
            }
            if (!actionHandled) {
                return;
            }
            record.lastUpdate = new Date();
            if (statusMutated) {
                record.clientStatus = getClientStatusLabel(record.status);
                logBookingStatusChange(record, {
                    status: record.status,
                    user: 'Owner CRM',
                    previousStatus,
                    manual: true
                });
            }
            selectedBookingId = record.id;
            renderBookingsTable();
            renderOverviewLists();
            renderMonthlyCalendar();
            showRecordDetailPage('booking', record, recordDetailState.sourcePage);
            highlightBookingRow(record.id, { scroll: true });
        });
    });

    teamAccessListEl?.addEventListener('click', (event) => {
        const actionBtn = event.target.closest('button[data-team-action]');
        if (!actionBtn) {
            return;
        }
        const memberEl = actionBtn.closest('[data-member-id]');
        if (!memberEl) {
            return;
        }
        const memberId = Number(memberEl.dataset.memberId);
        if (!memberId) {
            return;
        }
        const member = teamMembers.find(item => item.id === memberId);
        if (!member) {
            return;
        }
        const action = actionBtn.dataset.teamAction;
        switch (action) {
            case 'edit':
                setTeamMemberEditing(memberId, true);
                renderTeamAccessList();
                break;
            case 'cancel-edit':
                setTeamMemberEditing(memberId, false);
                renderTeamAccessList();
                break;
            case 'delete':
                {
                    const confirmed = window.confirm(`Ștergi accesul pentru ${member.name}?`);
                    if (!confirmed) {
                        return;
                    }
                    teamMembers = teamMembers.filter(item => item.id !== memberId);
                    renderTeamAccessList();
                    showAutomationToast(`${member.name} a fost eliminat din echipă.`);
                }
                break;
            case 'resend':
                member.status = 'pending';
                member.invitedAt = new Date();
                showAutomationToast(`Invitația a fost retrimisă către ${member.name}.`);
                renderTeamAccessList();
                break;
            default:
                break;
        }
    });

    teamAccessListEl?.addEventListener('submit', (event) => {
        const form = event.target.closest('.team-member-edit-form');
        if (!form) {
            return;
        }
        event.preventDefault();
        const memberId = Number(form.dataset.memberId);
        if (!memberId) {
            return;
        }
        const member = teamMembers.find(item => item.id === memberId);
        if (!member) {
            return;
        }
        const nameInput = form.querySelector('input[name="name"]');
        const emailInput = form.querySelector('input[name="email"]');
        const nameValue = nameInput?.value.trim() || '';
        const emailValue = emailInput?.value.trim() || '';
        if (!nameValue) {
            nameInput?.focus();
            return;
        }
        if (!isValidEmail(emailValue)) {
            showAutomationToast('Introdu un email valid pentru colaborator.');
            emailInput?.focus();
            return;
        }
        const duplicate = teamMembers.some(item =>
            item.id !== memberId && item.email?.toLowerCase() === emailValue.toLowerCase());
        if (duplicate) {
            showAutomationToast('Există deja un colaborator cu acest email.');
            emailInput?.focus();
            return;
        }
        member.name = nameValue;
        member.email = emailValue;
        member.editing = false;
        renderTeamAccessList();
        showAutomationToast(`Detaliile pentru ${member.name} au fost actualizate.`);
    });

    teamInviteForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const nameValue = teamInviteNameInput?.value.trim() || '';
        const emailValue = teamInviteEmailInput?.value.trim() || '';
        if (!nameValue) {
            teamInviteNameInput?.focus();
            return;
        }
        if (!isValidEmail(emailValue)) {
            showAutomationToast('Introdu un email valid pentru invitație.');
            teamInviteEmailInput?.focus();
            return;
        }
        const duplicate = teamMembers.some(member => member.email?.toLowerCase() === emailValue.toLowerCase());
        if (duplicate) {
            showAutomationToast('Există deja un colaborator cu acest email.');
            teamInviteEmailInput?.focus();
            return;
        }
        teamMemberIdCounter += 1;
        const newMember = {
            id: teamMemberIdCounter,
            name: nameValue,
            email: emailValue,
            status: 'pending',
            invitedAt: new Date()
        };
        teamMembers.push(newMember);
        renderTeamAccessList();
        teamInviteForm.reset();
        teamInviteNameInput?.focus();
        showAutomationToast(`Invitația a fost trimisă către ${newMember.name}.`);
    });

    renderTeamAccessList();
});
