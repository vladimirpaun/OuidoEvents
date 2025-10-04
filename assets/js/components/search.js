function handleSearch(pageKey) {
    const eventType = document.getElementById('event-type').value;
    const location = document.getElementById('location').value;
    const eventDate = document.getElementById('event-date').value;
    const guests = document.getElementById('guests').value;

    const params = new URLSearchParams();
    if (eventType) params.set('eventType', eventType);
    if (location) params.set('location', location);
    if (eventDate) params.set('date', eventDate);
    if (guests) params.set('guests', guests);

    if (pageKey === 'home') {
        window.location.href = `locations.html?${params.toString()}`;
    } else {
        // On other pages, just update the URL for now
        // Later, this will trigger filtering
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({ path: newUrl }, '', newUrl);
        // Here you would call a function to filter results on the page
    }
}

function applyUrlParamsToFilters() {
    const params = new URLSearchParams(window.location.search);

    const eventType = params.get('eventType');
    if (eventType) document.getElementById('event-type').value = eventType;

    const location = params.get('location');
    if (location) document.getElementById('location').value = location;

    const date = params.get('date');
    if (date) document.getElementById('event-date')._flatpickr.setDate(date);

    const guests = params.get('guests');
    if (guests) {
        document.getElementById('guests').value = guests;
        // Also update the sidebar filter if it exists
        const capacityRadio = document.querySelector(`input[name="capacity"][value="${guests}"]`);
        if (capacityRadio) capacityRadio.checked = true;
    }
}

export function initSearch() {
    document.querySelector('.search-button')?.addEventListener('click', () => handleSearch(document.body.dataset.page));
    applyUrlParamsToFilters();
}