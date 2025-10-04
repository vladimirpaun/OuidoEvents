function initGallery() {
  const mainImage = document.getElementById('main-venue-image');
  const thumbnails = document.querySelectorAll('.thumbnail-gallery img');
  if (!mainImage || thumbnails.length === 0) {
    return;
  }

  thumbnails.forEach((thumbnail, index) => {
    thumbnail.addEventListener('click', () => {
      thumbnails.forEach(image => image.classList.remove('active'));
      thumbnail.classList.add('active');
      const highResSrc = thumbnail.src.includes('w=400') ? thumbnail.src.replace('w=400', 'w=1200') : thumbnail.src;
      mainImage.src = highResSrc;
      mainImage.alt = thumbnail.alt;
    });

    if (index === 0) {
      thumbnail.classList.add('active');
      const highResSrc = thumbnail.src.includes('w=400') ? thumbnail.src.replace('w=400', 'w=1200') : thumbnail.src;
      mainImage.src = highResSrc;
    }
  });
}

function initLightbox() {
  const mainImage = document.getElementById('main-venue-image');
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const closeLightbox = document.querySelector('.close-lightbox');

  if (!mainImage || !lightbox || !lightboxImage || !closeLightbox) {
    return;
  }

  mainImage.addEventListener('click', () => {
    lightbox.style.display = 'flex';
    lightboxImage.src = mainImage.src;
    lightboxImage.alt = mainImage.alt;
  });

  closeLightbox.addEventListener('click', () => {
    lightbox.style.display = 'none';
  });

  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) {
      lightbox.style.display = 'none';
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && lightbox.style.display === 'flex') {
      lightbox.style.display = 'none';
    }
  });
}

function initSearchRedirect() {
  const searchButton = document.querySelector('.search-button');
  if (searchButton) {
    searchButton.addEventListener('click', event => {
      event.preventDefault();
      window.location.href = 'locations.html';
    });
  }
}

function initFavoriteButton() {
  const favoriteButton = document.querySelector('.hero-section .favorite-btn');
  if (!favoriteButton) {
    return;
  }

  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  let favoriteIds = JSON.parse(localStorage.getItem('favoriteIds')) || [];
  const locationId = parseInt(favoriteButton.dataset.id, 10);

  if (favoriteIds.includes(locationId)) {
    favoriteButton.classList.add('is-favorite');
  }

  favoriteButton.addEventListener('click', () => {
    if (!isLoggedIn) {
      window.location.href = 'login.html';
      return;
    }

    if (favoriteIds.includes(locationId)) {
      favoriteIds = favoriteIds.filter(id => id !== locationId);
      favoriteButton.classList.remove('is-favorite');
    } else {
      favoriteIds.push(locationId);
      favoriteButton.classList.add('is-favorite');
    }

    localStorage.setItem('favoriteIds', JSON.stringify(favoriteIds));
  });
}

function initDatePicker() {
  if (typeof flatpickr === 'function') {
    flatpickr('#event-date', {
      dateFormat: 'd/m/Y',
      monthSelectorType: 'dropdown'
    });
  }
}

export function initVenueDetailsPage() {
  initGallery();
  initLightbox();
  initSearchRedirect();
  initFavoriteButton();
  initDatePicker();
}
