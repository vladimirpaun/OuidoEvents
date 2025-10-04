const LOCATION_DATA = [
  { id: 1, name: 'The Grand Ballroom', city: 'București', price: 120, capacity_min: 150, capacity_max: 400, tags: ['Exclusivist', 'Panoramic'], facilities: ['Parcare', 'Wi-Fi gratuit', 'Sistem de sunet și lumini profesional', 'Event planner'], rating: 9.4, imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDE0fHxiYWxscm9vbXxlbnwwfHx8fDE2NTg0MjU5MjU&ixlib=rb-1.2.1&q=80&w=400' },
  { id: 2, name: 'Forest Retreat & Spa', city: 'Brașov', price: 95, capacity_min: 80, capacity_max: 200, tags: ['Natură', 'Piscină'], facilities: ['Parcare', 'Piscină', 'Cazare', 'Vedere la Munte', 'Wi-Fi gratuit'], rating: 9.8, imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDR8fHJlc29ydCUyMHN3aW1taW5nJTIwcG9vbHxlbnwwfHx8fDE2NTg0MjYwMTA&ixlib=rb-1.2.1&q=80&w=400' },
  { id: 3, name: 'Cluj SkyView', city: 'Cluj-Napoca', price: 110, capacity_min: 50, capacity_max: 150, tags: ['Modern', 'Rooftop'], facilities: ['Parcare', 'Wi-Fi gratuit', 'Sistem de sunet și lumini profesional'], rating: 9.1, imageUrl: 'https://images.unsplash.com/photo-1590073242678-70ee3fc2f8b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDEyfHxyb29mdG9wJTIwYmFyfGVufDB8fHx8MTY1ODQyNjA1Mw&ixlib=rb-1.2.1&q=80&w=400' },
  { id: 4, name: 'Palatul Noblesse', city: 'Iași', price: 105, capacity_min: 100, capacity_max: 250, tags: ['Istoric', 'Elegant'], facilities: ['Parcare', 'Event planner', 'Wi-Fi gratuit'], rating: 8.9, imageUrl: 'https://images.unsplash.com/photo-1596941240485-b38822695b36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDEwfHxoZXJpdGFnZSUyMGJ1aWxkaW5nfGVufDB8fHx8MTY1ODQyNjEwMg&ixlib=rb-1.2.1&q=80&w=400' },
  { id: 5, name: 'Laguna Albastră', city: 'Constanța', price: 130, capacity_min: 100, capacity_max: 300, tags: ['Plajă', 'Vedere la mare'], facilities: ['Parcare', 'Piscină', 'Ceremonii în aer liber', 'Vedere la Lac'], rating: 9.5, imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDEyfHxiZWFjaCUyMHJlc29ydHxlbnwwfHx8fDE2NTg0MjYxNDQ&ixlib=rb-1.2.1&q=80&w=400' },
  { id: 6, name: 'Conacul din Vii', city: 'Prahova', price: 85, capacity_min: 40, capacity_max: 120, tags: ['Rustic', 'Tradițional'], facilities: ['Parcare', 'Cazare', 'Ceremonii în aer liber', 'Kids Corner'], rating: 8.5, imageUrl: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDEyfHxydXN0aWMlMjBob3VzZXxlbnwwfHx8fDE2NTg0MjYxODU&ixlib=rb-1.2.1&q=80&w=400' },
  { id: 7, name: 'Ambiance Lake', city: 'Snagov', price: 150, capacity_min: 100, capacity_max: 250, tags: ['Lac', 'Natură'], facilities: ['Parcare', 'Vedere la Lac', 'Ceremonii în aer liber', 'Event planner'], rating: 9.6, imageUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDEyfHxsYWtlJTIwcmVzb3J0fGVufDB8fHx8MTY1ODQyNjIyOA&ixlib=rb-1.2.1&q=80&w=400' },
  { id: 8, name: 'Mountain Peak', city: 'Sinaia', price: 100, capacity_min: 60, capacity_max: 180, tags: ['Munte', 'Panoramic'], facilities: ['Parcare', 'Cazare', 'Vedere la Munte', 'Wi-Fi gratuit'], rating: 9.2, imageUrl: 'https://images.unsplash.com/photo-1559538739-998a8116a533?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDEyfHxtb3VudGFpbiUyMGNoYWxldHxlbnwwfHx8fDE2NTg0MjYyNjk&ixlib=rb-1.2.1&q=80&w=400' },
  { id: 9, name: 'Urban Loft', city: 'Timișoara', price: 75, capacity_min: 30, capacity_max: 80, tags: ['Industrial', 'Modern'], facilities: ['Wi-Fi gratuit', 'Sistem de sunet și lumini profesional', 'Kids Corner'], rating: 8.2, imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDE0fHxiYWxscm9vbXxlbnwwfHx8fDE2NTg0MjU5MjU&ixlib=rb-1.2.1&q=80&w=400' },
  { id: 10, name: 'Grădina cu Lavandă', city: 'Sibiu', price: 90, capacity_min: 50, capacity_max: 150, tags: ['Grădină', 'Romantic'], facilities: ['Parcare', 'Ceremonii în aer liber', 'Kids Corner'], rating: 9.0, imageUrl: 'https://images.unsplash.com/photo-1596941240485-b38822695b36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDEwfHxoZXJpdGFnZSUyMGJ1aWxkaW5nfGVufDB8fHx8MTY1ODQyNjEwMg&ixlib=rb-1.2.1&q=80&w=400' },
  { id: 11, name: 'Delta Paradise', city: 'Tulcea', price: 70, capacity_min: 40, capacity_max: 100, tags: ['Natură', 'Delta'], facilities: ['Parcare', 'Cazare', 'Vedere la Lac'], rating: 7.8, imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6164a83639?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDEyfHxsdXh1cnklMjBob3VzZXxlbnwwfHx8fDE2NTg0MjYyNjk&ixlib=rb-1.2.1&q=80&w=400' },
  { id: 12, name: 'Centrul de Conferințe Oradea', city: 'Oradea', price: 65, capacity_min: 20, capacity_max: 500, tags: ['Business', 'Modern'], facilities: ['Parcare', 'Wi-Fi gratuit', 'Sistem de sunet și lumini profesional'], rating: 6.9, imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwzNjUyOXwwfDF8c2VhcmNofDEyfHxhdWRpdG9yaXVtfGVufDB8fHx8MTY1ODQyNjEwMg&ixlib=rb-1.2.1&q=80&w=400' }
];

function formatRatingText(rating) {
  if (rating >= 9.5) {
    return 'Excepțional';
  }
  if (rating >= 9) {
    return 'Superb';
  }
  if (rating >= 8.5) {
    return 'Foarte bine';
  }
  return 'Bine';
}

export function initLocationsPage() {
  const locationsListContainer = document.getElementById('locations-list');
  const priceSlider = document.getElementById('price-slider');
  const priceValue = document.getElementById('price-value');
  const capacityInput = document.getElementById('capacity-input');
  const facilitiesCheckboxes = document.querySelectorAll('#facilities-filter input[type="checkbox"]');
  const ratingRadios = document.querySelectorAll('input[name="rating"]');
  const sortOptions = document.getElementById('sort-options');
  const searchButton = document.querySelector('.search-button');

  if (!locationsListContainer) {
    return;
  }

  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  let favoriteIds = JSON.parse(localStorage.getItem('favoriteIds')) || [];

  function renderLocations(locationsArray) {
    locationsListContainer.innerHTML = '';

    if (locationsArray.length === 0) {
      locationsListContainer.innerHTML = '<p>Nicio locație nu corespunde filtrelor selectate.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();

    locationsArray.forEach(location => {
      const ratingText = formatRatingText(location.rating);
      const card = document.createElement('article');
      card.className = 'result-card';
      card.innerHTML = `
        <button class="favorite-btn ${favoriteIds.includes(location.id) ? 'is-favorite' : ''}" data-id="${location.id}" title="Adaugă la favorite">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
        <div class="result-image" style="background-image: url('${location.imageUrl}')"></div>
        <div class="result-details">
          <h3 class="result-name">${location.name}</h3>
          <p class="result-location">${location.city}, România</p>
          <div class="result-rating">
            <span class="rating-badge">${location.rating}</span>
            <span class="rating-text">${ratingText}</span>
            <span class="rating-reviews">• ${Math.floor(location.rating * 25)} recenzii</span>
          </div>
          <div class="result-meta">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            <span>${location.capacity_min} - ${location.capacity_max} invitați</span>
          </div>
          <div class="result-info">
            <span class="result-price">de la <strong>${location.price}€</strong>/pers</span>
            <a href="venue-details.html?id=${location.id}" class="view-details-btn">Vezi disponibilitatea</a>
          </div>
        </div>
      `;
      fragment.appendChild(card);
    });

    locationsListContainer.appendChild(fragment);
    attachFavoriteListeners();
  }

  function attachFavoriteListeners() {
    const favoriteButtons = locationsListContainer.querySelectorAll('.favorite-btn');
    favoriteButtons.forEach(button => {
      button.addEventListener('click', () => {
        const locationId = parseInt(button.dataset.id, 10);
        if (!isLoggedIn) {
          window.location.href = 'login.html';
          return;
        }

        if (favoriteIds.includes(locationId)) {
          favoriteIds = favoriteIds.filter(id => id !== locationId);
          button.classList.remove('is-favorite');
        } else {
          favoriteIds.push(locationId);
          button.classList.add('is-favorite');
        }

        localStorage.setItem('favoriteIds', JSON.stringify(favoriteIds));
      });
    });
  }

  function applyFiltersAndSort() {
    const maxPrice = priceSlider ? parseInt(priceSlider.value, 10) : Infinity;
    const requiredCapacity = capacityInput ? parseInt(capacityInput.value, 10) || 0 : 0;
    const selectedFacilities = Array.from(facilitiesCheckboxes)
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.value);
    const ratingRadio = document.querySelector('input[name="rating"]:checked');
    const minRating = ratingRadio ? parseFloat(ratingRadio.value) : 0;

    let filtered = LOCATION_DATA.filter(location => {
      const priceMatch = location.price <= maxPrice;
      const capacityMatch = requiredCapacity === 0 || (requiredCapacity >= location.capacity_min && requiredCapacity <= location.capacity_max);
      const facilitiesMatch = selectedFacilities.every(facility => location.facilities.includes(facility));
      const ratingMatch = location.rating >= minRating;
      return priceMatch && capacityMatch && facilitiesMatch && ratingMatch;
    });

    const sortValue = sortOptions ? sortOptions.value : 'recommended';

    switch (sortValue) {
      case 'price_asc':
        filtered = filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        filtered = filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating_desc':
        filtered = filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'capacity_desc':
        filtered = filtered.sort((a, b) => b.capacity_max - a.capacity_max);
        break;
      default:
        break;
    }

    renderLocations(filtered);
  }

  if (priceSlider && priceValue) {
    priceValue.textContent = priceSlider.value;
    priceSlider.addEventListener('input', () => {
      priceValue.textContent = priceSlider.value;
    });
    priceSlider.addEventListener('change', applyFiltersAndSort);
  }

  if (capacityInput) {
    capacityInput.addEventListener('input', applyFiltersAndSort);
  }

  facilitiesCheckboxes.forEach(checkbox => checkbox.addEventListener('change', applyFiltersAndSort));
  ratingRadios.forEach(radio => radio.addEventListener('change', applyFiltersAndSort));
  if (sortOptions) {
    sortOptions.addEventListener('change', applyFiltersAndSort);
  }

  if (searchButton) {
    searchButton.addEventListener('click', event => {
      event.preventDefault();
      applyFiltersAndSort();
    });
  }

  renderLocations(LOCATION_DATA);
  applyDatePicker();
}

function applyDatePicker() {
  if (typeof flatpickr === 'function') {
    flatpickr('#event-date', {
      dateFormat: 'd/m/Y',
      monthSelectorType: 'dropdown'
    });
  }
}
