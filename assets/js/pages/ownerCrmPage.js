import { initLayout } from '../components/layout.js';

const EVENT_STATUS_VARIANTS = {
  confirmed: 'booked',
  'pre-booked': 'prebooked',
  pending: 'request',
  declined: 'unavailable'
};

const CALENDAR_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function initOwnerCrmPage() {
  const crmApp = document.querySelector('.crm-app');
  if (!crmApp) {
    return;
  }

  initLayout({ pageKey: 'owner-crm', withFooter: false });

  const venues = [
    {
      id: 1,
      name: 'The Grand Ballroom',
      location: 'București, România',
      status: 'Published',
      imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 2,
      name: 'Lakeside Manor',
      location: 'Cluj-Napoca, România',
      status: 'Pending',
      imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
    }
  ];

  const eventRequests = [
    {
      id: 1,
      venueId: 2,
      client: 'Andrei Popescu',
      email: 'a.popescu@example.com',
      phone: '0722123456',
      eventType: 'Nuntă',
      date: '2025-10-25',
      guests: 150,
      status: 'pending'
    },
    {
      id: 2,
      venueId: 1,
      client: 'Tech Solutions Inc.',
      email: 'contact@techsolutions.ro',
      phone: '0733987654',
      eventType: 'Eveniment Corporate',
      date: '2025-11-12',
      guests: 200,
      status: 'pre-booked'
    },
    {
      id: 3,
      venueId: 1,
      client: 'Elena Ionescu',
      email: 'e.ionescu@email.com',
      phone: '0744112233',
      eventType: 'Petrecere Privată',
      date: '2025-10-18',
      guests: 80,
      status: 'confirmed'
    }
  ];

  const visitRequests = [
    {
      id: 1,
      venueId: 1,
      client: 'Maria Stan',
      email: 'm.stan@example.ro',
      phone: '0755654321',
      date: '2025-10-10',
      time: '14:00',
      status: 'pending'
    },
    {
      id: 2,
      venueId: 1,
      client: 'George Dobre',
      email: 'g.dobre@email.com',
      phone: '0766778899',
      date: '2025-10-09',
      time: '11:00',
      status: 'confirmed'
    },
    {
      id: 3,
      venueId: 2,
      client: 'Ana Diaconu',
      email: 'a.diaconu@example.com',
      phone: '0721998877',
      date: '2025-10-11',
      time: '16:30',
      status: 'pending'
    }
  ];

  const monthlyVisitTrend = [
    { label: 'Ian', value: 12 },
    { label: 'Feb', value: 15 },
    { label: 'Mar', value: 18 },
    { label: 'Apr', value: 16 },
    { label: 'Mai', value: 19 },
    { label: 'Iun', value: 21 },
    { label: 'Iul', value: 24 },
    { label: 'Aug', value: 26 },
    { label: 'Sep', value: 28 },
    { label: 'Oct', value: 30 },
    { label: 'Nov', value: 27 },
    { label: 'Dec', value: 32 }
  ];

  const occupancyForecast = [
    { month: 'Octombrie', occupiedDays: 18, totalDays: 31 },
    { month: 'Noiembrie', occupiedDays: 20, totalDays: 30 },
    { month: 'Decembrie', occupiedDays: 16, totalDays: 31 }
  ];

  const occupancyColors = ['var(--primary-color)', 'var(--secondary-color)', '#28a745'];

  const availabilityData = {
    1: {
      blockedDates: ['2025-11-15'],
      visitSlots: {
        Monday: [
          { start: '10:00', end: '12:00' },
          { start: '14:00', end: '17:00' }
        ],
        Wednesday: [{ start: '10:00', end: '17:00' }]
      }
    },
    2: {
      blockedDates: ['2025-12-24', '2025-12-25'],
      visitSlots: {
        Tuesday: [{ start: '09:00', end: '13:00' }]
      }
    }
  };

  let activeAvailabilityVenueId = venues[0]?.id ?? null;
  let availabilitySelection = 'all';

  const navLinks = Array.from(document.querySelectorAll('.crm-nav-link'));
  const crmPages = Array.from(document.querySelectorAll('.crm-page'));
  const schedulerContainer = document.querySelector('.crm-availability-scheduler');
  const availabilityDialog = document.getElementById('availability-dialog');
  const availabilityDialogClose = availabilityDialog?.querySelector('[data-dialog-close]');

  function ensureVenueAvailability(venueId) {
    if (!availabilityData[venueId]) {
      availabilityData[venueId] = { blockedDates: [], visitSlots: {} };
    }
  }

  function showPage(pageId, { updateHash = true } = {}) {
    crmPages.forEach(page => {
      if (page.dataset.pageSection === pageId) {
        page.classList.add('is-active');
      } else {
        page.classList.remove('is-active');
      }
    });

    navLinks.forEach(link => {
      if (link.dataset.pageTarget === pageId) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });

    if (updateHash) {
      window.location.hash = pageId;
    }

    if (pageId === 'availability') {
      updateAvailabilityPage();
    }
  }

  function populateVenueSelector(selectorId, { includeAllOption = false } = {}) {
    const selector = document.getElementById(selectorId);
    if (!selector) {
      return;
    }

    selector.innerHTML = '';
    if (includeAllOption) {
      selector.insertAdjacentHTML('beforeend', '<option value="all">Toate locațiile</option>');
    }

    venues.forEach(venue => {
      selector.insertAdjacentHTML(
        'beforeend',
        `<option value="${venue.id}">${venue.name}</option>`
      );
    });

    if (selectorId === 'availability-venue-selector') {
      selector.value = availabilitySelection === 'all'
        ? 'all'
        : String(activeAvailabilityVenueId);
    }
  }

  function getLatestVisitMonthKey(requests) {
    if (!requests.length) {
      return null;
    }

    const sorted = [...requests].sort((a, b) => b.date.localeCompare(a.date));
    const latestDate = sorted[0]?.date;
    return latestDate ? latestDate.slice(0, 7) : null;
  }

  function renderDashboardStats() {
    const totalVenuesEl = document.getElementById('total-venues-stat');
    const activeVenuesEl = document.getElementById('active-venues-stat');
    const eventRequestsEl = document.getElementById('event-requests-stat');
    const visitRequestsEl = document.getElementById('visit-requests-stat');
    const totalVisitsEl = document.getElementById('total-visits-stat');
    const monthlyVisitsEl = document.getElementById('monthly-visits-stat');

    if (totalVenuesEl) {
      totalVenuesEl.textContent = String(venues.length);
    }

    if (activeVenuesEl) {
      const activeCount = venues.filter(venue => venue.status === 'Published').length;
      activeVenuesEl.textContent = String(activeCount);
    }

    if (eventRequestsEl) {
      const pendingEvents = eventRequests.filter(request => request.status === 'pending').length;
      eventRequestsEl.textContent = String(pendingEvents);
    }

    if (visitRequestsEl) {
      const pendingVisits = visitRequests.filter(request => request.status === 'pending').length;
      visitRequestsEl.textContent = String(pendingVisits);
    }

    if (totalVisitsEl) {
      totalVisitsEl.textContent = String(visitRequests.length);
    }

    if (monthlyVisitsEl) {
      const latestMonthKey = getLatestVisitMonthKey(visitRequests);
      const visitsInMonth = latestMonthKey
        ? visitRequests.filter(request => request.date.startsWith(latestMonthKey)).length
        : 0;
      monthlyVisitsEl.textContent = String(visitsInMonth);
    }
  }

  function renderVenuesPage() {
    const listContainer = document.getElementById('venues-list');
    if (!listContainer) {
      return;
    }

    listContainer.innerHTML = '';

    venues.forEach(venue => {
      const badgeStatus = venue.status === 'Published' ? 'published' : 'pending';
      const badgeLabel = venue.status === 'Published' ? 'Publicată' : 'În așteptare';

      const cardMarkup = `
        <article class="result-card crm-venue-card">
          <div class="result-image" style="background-image: url('${venue.imageUrl}');"></div>
          <div class="result-details">
            <div class="crm-venue-meta">
              <span class="crm-status-badge" data-status="${badgeStatus}">${badgeLabel}</span>
              <span class="result-location">${venue.location}</span>
            </div>
            <h3 class="result-name">${venue.name}</h3>
            <div class="crm-venue-actions">
              <a href="#availability" class="cta-button" data-crm-nav data-page-target="availability" data-venue-id="${venue.id}">Gestionează disponibilitatea</a>
              <button type="button" class="secondary-cta-button" data-venue-id="${venue.id}" aria-label="Editează locația">Editează</button>
              <button type="button" class="crm-ghost-button" data-venue-id="${venue.id}" aria-label="Pune locația în pauză">Pauză</button>
            </div>
          </div>
        </article>
      `;

      listContainer.insertAdjacentHTML('beforeend', cardMarkup);
    });
  }

  function renderVisitsTrendChart() {
    const container = document.getElementById('visits-trend-chart');
    if (!container) {
      return;
    }

    container.innerHTML = '';

    if (!monthlyVisitTrend.length) {
      container.textContent = 'Nu există suficiente date pentru a genera graficul.';
      return;
    }

    const width = 600;
    const height = 260;
    const paddingX = 50;
    const paddingY = 40;
    const chartHeight = height - paddingY * 1.5;
    const chartBottom = height - paddingY;
    const maxValue = Math.max(...monthlyVisitTrend.map(item => item.value), 1);
    const stepX = monthlyVisitTrend.length > 1
      ? (width - paddingX * 2) / (monthlyVisitTrend.length - 1)
      : 0;

    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const desc = document.createElementNS(svgNs, 'desc');
    desc.textContent = 'Evoluția numărului de vizite în ultimele 12 luni.';
    svg.appendChild(desc);

    const baseline = document.createElementNS(svgNs, 'line');
    baseline.setAttribute('x1', String(paddingX));
    baseline.setAttribute('y1', String(chartBottom));
    baseline.setAttribute('x2', String(width - paddingX + 10));
    baseline.setAttribute('y2', String(chartBottom));
    baseline.setAttribute('stroke', '#e5eaf1');
    baseline.setAttribute('stroke-width', '2');
    svg.appendChild(baseline);

    const points = monthlyVisitTrend.map((item, index) => {
      const x = paddingX + stepX * index;
      const valueRatio = item.value / maxValue;
      const y = chartBottom - valueRatio * chartHeight;
      return { x, y, label: item.label, value: item.value };
    });

    const polyline = document.createElementNS(svgNs, 'polyline');
    polyline.setAttribute('points', points.map(point => `${point.x},${point.y}`).join(' '));
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', '#0052d4');
    polyline.setAttribute('stroke-width', '3');
    polyline.setAttribute('stroke-linejoin', 'round');
    polyline.setAttribute('stroke-linecap', 'round');
    svg.appendChild(polyline);

    points.forEach(point => {
      const circle = document.createElementNS(svgNs, 'circle');
      circle.setAttribute('cx', String(point.x));
      circle.setAttribute('cy', String(point.y));
      circle.setAttribute('r', '5');
      circle.setAttribute('fill', '#ffffff');
      circle.setAttribute('stroke', '#0052d4');
      circle.setAttribute('stroke-width', '2');
      svg.appendChild(circle);

      const label = document.createElementNS(svgNs, 'text');
      label.setAttribute('x', String(point.x));
      label.setAttribute('y', String(chartBottom + 18));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '12');
      label.setAttribute('fill', '#7a7f87');
      label.textContent = point.label;
      svg.appendChild(label);
    });

    container.appendChild(svg);
  }

  function renderOccupancyChart() {
    const container = document.getElementById('occupancy-pie-chart');
    if (!container) {
      return;
    }

    container.innerHTML = '';

    if (!occupancyForecast.length) {
      container.textContent = 'Nu există date despre rata de ocupare pentru următoarele luni.';
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'crm-occupancy-chart';

    occupancyForecast.forEach((entry, index) => {
      const ratio = entry.totalDays > 0 ? entry.occupiedDays / entry.totalDays : 0;
      const percentage = Math.round(ratio * 100);
      const color = occupancyColors[index % occupancyColors.length];

      const donutCard = document.createElement('div');
      donutCard.className = 'crm-donut-card';

      const donut = document.createElement('div');
      donut.className = 'crm-donut';
      donut.dataset.percentage = String(percentage);
      donut.style.setProperty('--occupied-color', color);
      donut.style.setProperty('--occupied-deg', `${Math.min(360, Math.max(0, ratio * 360)).toFixed(2)}deg`);

      const label = document.createElement('p');
      label.className = 'crm-donut-label';
      label.textContent = `${entry.month} · ${entry.occupiedDays}/${entry.totalDays} zile ocupate`;

      donutCard.append(donut, label);
      wrapper.appendChild(donutCard);
    });

    container.appendChild(wrapper);
  }

  function getTableColumnCount(tableBody) {
    const table = tableBody.closest('table');
    if (!table) {
      return 1;
    }

    const headers = table.querySelectorAll('thead th');
    return headers.length || 1;
  }

  function formatStatusBadge(status) {
    const normalized = status.toLowerCase();
    let label = status.replace('-', ' ');

    if (normalized === 'pending') {
      label = 'În așteptare';
    } else if (normalized === 'pre-booked') {
      label = 'Pre-rezervat';
    } else if (normalized === 'confirmed') {
      label = 'Confirmat';
    } else if (normalized === 'declined') {
      label = 'Respins';
    }

    return `<span class="crm-status-badge" data-status="${normalized}">${label}</span>`;
  }

  function renderRequestsTable(tableBodyId, requests, venueFilterId) {
    const tableBody = document.getElementById(tableBodyId);
    const filterSelect = document.getElementById(venueFilterId);
    if (!tableBody || !filterSelect) {
      return;
    }

    const filterValue = filterSelect.value;
    tableBody.innerHTML = '';

    const filteredRequests = requests.filter(request => {
      return filterValue === 'all' || String(request.venueId) === filterValue;
    });

    if (filteredRequests.length === 0) {
      const colspan = getTableColumnCount(tableBody);
      tableBody.innerHTML = `<tr class="crm-empty-row"><td colspan="${colspan}">Nu există solicitări pentru filtrul selectat.</td></tr>`;
      return;
    }

    filteredRequests.forEach(request => {
      const venueName = venues.find(venue => venue.id === request.venueId)?.name ?? 'N/A';

      let cellsMarkup = '';
      if (tableBodyId === 'bookings-table-body') {
        cellsMarkup = `
          <td>${request.client}</td>
          <td>${venueName}</td>
          <td>${request.eventType}</td>
          <td>${request.date}</td>
          <td>${request.guests}</td>
          <td><a href="mailto:${request.email}">${request.email}</a></td>
          <td><a href="tel:${request.phone}">${request.phone}</a></td>
          <td>${formatStatusBadge(request.status)}</td>
        `;
      } else {
        const status = request.status === 'pending' ? 'visit-pending' : request.status;
        let visitLabel = 'Confirmată';
        if (status === 'visit-pending') {
          visitLabel = 'În așteptare';
        } else if (status === 'declined') {
          visitLabel = 'Respinsă';
        }

        cellsMarkup = `
          <td>${request.client}</td>
          <td>${venueName}</td>
          <td>${request.date}</td>
          <td>${request.time}</td>
          <td><a href="mailto:${request.email}">${request.email}</a></td>
          <td><a href="tel:${request.phone}">${request.phone}</a></td>
          <td><span class="crm-status-badge" data-status="${status}">${visitLabel}</span></td>
        `;
      }

      const actionsMarkup = request.status === 'pending'
        ? `<div class="crm-action-buttons">
            <button class="crm-action-button" type="button" data-action="confirm" data-request-type="${tableBodyId}" data-request-id="${request.id}" title="Confirmă">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
            <button class="crm-action-button" type="button" data-action="decline" data-request-type="${tableBodyId}" data-request-id="${request.id}" title="Respinge">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>`
        : '';

      tableBody.insertAdjacentHTML('beforeend', `<tr>${cellsMarkup}<td>${actionsMarkup}</td></tr>`);
    });
  }

  function buildCalendarHeader(container) {
    container.innerHTML = `
      <div class="crm-calendar-header">
        <button class="crm-calendar-nav-button" type="button" data-direction="prev" aria-label="Luna anterioară">&lt;</button>
        <h2 class="crm-calendar-current"></h2>
        <button class="crm-calendar-nav-button" type="button" data-direction="next" aria-label="Luna următoare">&gt;</button>
      </div>
      <div class="crm-calendar-grid"></div>
    `;
  }

  function renderCalendarGrid(calendarGrid, currentDate, events, blockedDates, { interactive = false, onToggleDate } = {}) {
    calendarGrid.innerHTML = '';

    CALENDAR_DAY_NAMES.forEach(dayName => {
      calendarGrid.insertAdjacentHTML('beforeend', `<div class="crm-calendar-day-name">${dayName}</div>`);
    });

    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let index = 0; index < firstDayOfMonth; index += 1) {
      calendarGrid.insertAdjacentHTML('beforeend', '<div class="crm-calendar-date" data-outside="true"></div>');
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dateElement = document.createElement('div');
      dateElement.className = 'crm-calendar-date';
      dateElement.dataset.date = dateString;
      dateElement.innerHTML = `<div class="crm-day-number">${day}</div>`;

      const dayEvents = events.filter(event => event.date === dateString);
      dayEvents.forEach(event => {
        const variant = EVENT_STATUS_VARIANTS[event.status] ?? 'request';
        const eventElement = document.createElement('div');
        eventElement.className = 'crm-calendar-event';
        eventElement.dataset.variant = variant;
        const venueName = venues.find(venue => venue.id === event.venueId)?.name ?? '';
        const truncatedVenue = venueName.length > 18 ? `${venueName.slice(0, 15)}…` : venueName;
        eventElement.textContent = `${event.eventType} · ${truncatedVenue}`;
        dateElement.appendChild(eventElement);
      });

      if (blockedDates.includes(dateString)) {
        const blockedElement = document.createElement('div');
        blockedElement.className = 'crm-calendar-event';
        blockedElement.dataset.variant = 'unavailable';
        blockedElement.textContent = 'Indisponibil';
        dateElement.appendChild(blockedElement);
        dateElement.classList.add('is-unavailable');
      }

      if (interactive) {
        dateElement.addEventListener('click', () => {
          if (dayEvents.length > 0) {
            return;
          }

          const willBlock = !dateElement.classList.contains('is-unavailable');
          dateElement.classList.toggle('is-unavailable', willBlock);

          if (typeof onToggleDate === 'function') {
            onToggleDate(dateString, willBlock);
          }
        });
      }

      calendarGrid.appendChild(dateElement);
    }
  }

  function createCalendar(containerId, venueFilter, { interactive = false, activeVenueId = null } = {}) {
    const calendarContainer = document.getElementById(containerId);
    if (!calendarContainer) {
      return;
    }

    buildCalendarHeader(calendarContainer);

    const currentMonthLabel = calendarContainer.querySelector('.crm-calendar-current');
    const calendarGrid = calendarContainer.querySelector('.crm-calendar-grid');

    const currentDate = new Date();
    currentDate.setDate(1);

    const navigate = direction => {
      if (direction === 'prev') {
        currentDate.setMonth(currentDate.getMonth() - 1);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      updateGrid();
    };

    function updateGrid() {
      const monthLabel = currentDate.toLocaleString('ro-RO', { month: 'long', year: 'numeric' });
      if (currentMonthLabel) {
        currentMonthLabel.textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
      }

      const visibleEvents = venueFilter === 'all'
        ? eventRequests
        : eventRequests.filter(event => String(event.venueId) === String(venueFilter));

      const blockedDates = interactive && activeVenueId && availabilityData[activeVenueId]
        ? availabilityData[activeVenueId].blockedDates
        : [];

      renderCalendarGrid(calendarGrid, currentDate, visibleEvents, blockedDates, {
        interactive,
        onToggleDate(dateString, shouldBlock) {
          if (!activeVenueId) {
            return;
          }

          ensureVenueAvailability(activeVenueId);
          const blocked = availabilityData[activeVenueId].blockedDates;
          if (shouldBlock) {
            if (!blocked.includes(dateString)) {
              blocked.push(dateString);
            }
          } else {
            availabilityData[activeVenueId].blockedDates = blocked.filter(date => date !== dateString);
          }
        }
      });
    }

    calendarContainer.addEventListener('click', event => {
      const button = event.target.closest('.crm-calendar-nav-button');
      if (!button) {
        return;
      }

      const direction = button.dataset.direction === 'prev' ? 'prev' : 'next';
      navigate(direction);
    });

    updateGrid();
  }

  function renderVisitScheduler() {
    if (!schedulerContainer) {
      return;
    }

    if (availabilitySelection === 'all') {
      schedulerContainer.innerHTML = '<p class="crm-scheduler-placeholder">Selectează o locație din listă pentru a stabili intervalele de vizită.</p>';
      return;
    }

    ensureVenueAvailability(activeAvailabilityVenueId);
    const venueSlots = availabilityData[activeAvailabilityVenueId].visitSlots;
    schedulerContainer.innerHTML = '';

    WEEK_DAYS.forEach(day => {
      const slots = venueSlots[day] ?? [];
      const slotsMarkup = slots.map(slot => `
        <div class="crm-time-slot" data-start="${slot.start}" data-end="${slot.end}">
          <span>${slot.start} - ${slot.end}</span>
          <button class="crm-remove-slot-btn" type="button" aria-label="Elimină intervalul">✕</button>
        </div>
      `).join('');

      schedulerContainer.insertAdjacentHTML('beforeend', `
        <section class="crm-day-schedule" data-day="${day}">
          <h4>${day}</h4>
          <div class="crm-time-slots">${slotsMarkup}</div>
          <form class="crm-add-slot-form">
            <input type="time" class="crm-start-time" required>
            <input type="time" class="crm-end-time" required>
            <button type="submit" class="crm-add-slot-btn" aria-label="Adaugă interval">+</button>
          </form>
        </section>
      `);
    });
  }

  function updateAvailabilityPage() {
    const title = document.getElementById('availability-page-title');
    const availabilitySelector = document.getElementById('availability-venue-selector');

    if (availabilitySelector) {
      availabilitySelector.value = availabilitySelection === 'all'
        ? 'all'
        : String(activeAvailabilityVenueId);
    }

    if (availabilitySelection === 'all') {
      if (title) {
        title.textContent = 'Disponibilitate pentru toate locațiile';
      }
      createCalendar('availability-calendar-container', 'all', { interactive: false });
      const availabilityPage = document.getElementById('availability');
      if (availabilityPage?.classList.contains('is-active') && availabilityDialog?.classList.contains('is-hidden')) {
        availabilityDialog.classList.remove('is-hidden');
      }
      renderVisitScheduler();
      return;
    }

    ensureVenueAvailability(activeAvailabilityVenueId);
    const venue = venues.find(item => item.id === activeAvailabilityVenueId);
    if (title && venue) {
      title.textContent = `Disponibilitate pentru ${venue.name}`;
    }

    createCalendar('availability-calendar-container', activeAvailabilityVenueId, {
      interactive: true,
      activeVenueId: activeAvailabilityVenueId
    });
    renderVisitScheduler();
  }

  function handleRequestAction(requestCollection, requestId, action) {
    const request = requestCollection.find(item => item.id === requestId);
    if (!request) {
      return;
    }

    if (action === 'confirm') {
      request.status = 'confirmed';
    } else if (action === 'decline') {
      request.status = 'declined';
    }
  }

  function handleActionButtonClick(event) {
    const actionButton = event.target.closest('.crm-action-button');
    if (!actionButton) {
      return;
    }

    const { action, requestType, requestId } = actionButton.dataset;
    if (!action || !requestType || !requestId) {
      return;
    }

    const id = Number.parseInt(requestId, 10);
    if (Number.isNaN(id)) {
      return;
    }

    if (requestType === 'bookings-table-body') {
      handleRequestAction(eventRequests, id, action);
      renderRequestsTable('bookings-table-body', eventRequests, 'bookings-venue-filter');
    } else if (requestType === 'visits-table-body') {
      handleRequestAction(visitRequests, id, action);
      renderRequestsTable('visits-table-body', visitRequests, 'visits-venue-filter');
    }

    renderDashboardStats();
  }

  function initializeFilters() {
    populateVenueSelector('bookings-venue-filter', { includeAllOption: true });
    populateVenueSelector('visits-venue-filter', { includeAllOption: true });
    populateVenueSelector('availability-venue-selector', { includeAllOption: true });

    const bookingsFilter = document.getElementById('bookings-venue-filter');
    if (bookingsFilter) {
      bookingsFilter.addEventListener('change', () => {
        renderRequestsTable('bookings-table-body', eventRequests, 'bookings-venue-filter');
      });
    }

    const visitsFilter = document.getElementById('visits-venue-filter');
    if (visitsFilter) {
      visitsFilter.addEventListener('change', () => {
        renderRequestsTable('visits-table-body', visitRequests, 'visits-venue-filter');
      });
    }

    const availabilitySelector = document.getElementById('availability-venue-selector');
    if (availabilitySelector) {
      availabilitySelector.addEventListener('change', event => {
        const { value } = event.target;
        if (value === 'all') {
          availabilitySelection = 'all';
          availabilityDialog?.classList.remove('is-hidden');
          updateAvailabilityPage();
          return;
        }

        const selectedId = Number.parseInt(value, 10);
        if (!Number.isNaN(selectedId)) {
          availabilitySelection = String(selectedId);
          activeAvailabilityVenueId = selectedId;
          updateAvailabilityPage();
        }
      });
    }
  }

  document.addEventListener('click', handleActionButtonClick);

  crmApp.addEventListener('click', event => {
    const navTrigger = event.target.closest('[data-crm-nav]');
    if (!navTrigger) {
      return;
    }

    event.preventDefault();
    const pageId = navTrigger.dataset.pageTarget;
    if (!pageId) {
      return;
    }

    const venueId = navTrigger.dataset.venueId;
    if (pageId === 'availability' && venueId) {
      const parsedVenueId = Number.parseInt(venueId, 10);
      if (!Number.isNaN(parsedVenueId)) {
        availabilitySelection = String(parsedVenueId);
        activeAvailabilityVenueId = parsedVenueId;
      }
    }

    showPage(pageId);
  });

  schedulerContainer?.addEventListener('submit', event => {
    if (!event.target.classList.contains('crm-add-slot-form')) {
      return;
    }

    event.preventDefault();
    const form = event.target;
    const startInput = form.querySelector('.crm-start-time');
    const endInput = form.querySelector('.crm-end-time');

    if (!startInput || !endInput) {
      return;
    }

    const start = startInput.value;
    const end = endInput.value;
    if (!start || !end || start >= end) {
      alert('Introduceți un interval orar valid.');
      return;
    }

    if (availabilitySelection === 'all' || !activeAvailabilityVenueId) {
      alert('Selectează o locație pentru a adăuga intervale de vizită.');
      return;
    }

    ensureVenueAvailability(activeAvailabilityVenueId);
    const day = form.closest('.crm-day-schedule')?.dataset.day;
    if (!day) {
      return;
    }

    const slots = availabilityData[activeAvailabilityVenueId].visitSlots;
    if (!slots[day]) {
      slots[day] = [];
    }

    slots[day].push({ start, end });
    renderVisitScheduler();
  });

  schedulerContainer?.addEventListener('click', event => {
    if (!event.target.classList.contains('crm-remove-slot-btn')) {
      return;
    }

    const slotElement = event.target.closest('.crm-time-slot');
    const day = event.target.closest('.crm-day-schedule')?.dataset.day;
    if (!slotElement || !day) {
      return;
    }

    const { start, end } = slotElement.dataset;
    if (!start || !end) {
      return;
    }

    if (availabilitySelection === 'all' || !activeAvailabilityVenueId) {
      return;
    }

    const slots = availabilityData[activeAvailabilityVenueId].visitSlots[day] ?? [];
    availabilityData[activeAvailabilityVenueId].visitSlots[day] = slots.filter(slot => !(slot.start === start && slot.end === end));
    slotElement.remove();
  });

  availabilityDialogClose?.addEventListener('click', () => {
    availabilityDialog?.classList.add('is-hidden');
  });

  availabilityDialog?.addEventListener('click', event => {
    if (event.target === availabilityDialog) {
      availabilityDialog.classList.add('is-hidden');
    }
  });

  function initializePages() {
    renderDashboardStats();
    renderVenuesPage();
    renderRequestsTable('bookings-table-body', eventRequests, 'bookings-venue-filter');
    renderRequestsTable('visits-table-body', visitRequests, 'visits-venue-filter');
    renderVisitsTrendChart();
    renderOccupancyChart();
    updateAvailabilityPage();

    const initialHash = window.location.hash.replace('#', '') || 'dashboard';
    const validPage = crmPages.some(page => page.dataset.pageSection === initialHash);
    showPage(validPage ? initialHash : 'dashboard', { updateHash: false });
  }

  initializeFilters();
  initializePages();
}

document.addEventListener('DOMContentLoaded', initOwnerCrmPage);
