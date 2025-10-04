function initSearchRedirect() {
  const searchButton = document.querySelector('.search-button');
  if (searchButton) {
    searchButton.addEventListener('click', event => {
      event.preventDefault();
      window.location.href = 'locations.html';
    });
  }
}

function initTestimonialSlider() {
  const slider = document.querySelector('.testimonial-slider');
  const slides = slider ? slider.querySelectorAll('.testimonial-card') : [];
  const prevButton = document.querySelector('.slider-nav.prev');
  const nextButton = document.querySelector('.slider-nav.next');

  if (!slider || slides.length === 0 || !prevButton || !nextButton) {
    return;
  }

  if (slides.length <= 3) {
    prevButton.style.display = 'none';
    nextButton.style.display = 'none';
    return;
  }

  let currentIndex = 0;
  let itemsToShow = calculateItemsToShow();

  function calculateItemsToShow() {
    if (window.innerWidth >= 1200) {
      return 3;
    }
    if (window.innerWidth >= 768) {
      return 2;
    }
    return 1;
  }

  function updateSliderPosition() {
    const cardWidth = slides[0].offsetWidth;
    const gap = 30;
    const offset = -currentIndex * (cardWidth + gap);
    slider.style.transform = `translateX(${offset}px)`;

    prevButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex >= slides.length - itemsToShow;
  }

  function handleResize() {
    const previousItemsToShow = itemsToShow;
    itemsToShow = calculateItemsToShow();
    if (itemsToShow !== previousItemsToShow) {
      currentIndex = Math.min(currentIndex, Math.max(0, slides.length - itemsToShow));
      updateSliderPosition();
    }
  }

  nextButton.addEventListener('click', () => {
    if (currentIndex < slides.length - itemsToShow) {
      currentIndex += 1;
      updateSliderPosition();
    }
  });

  prevButton.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex -= 1;
      updateSliderPosition();
    }
  });

  window.addEventListener('resize', handleResize);

  updateSliderPosition();
}

function initDatePicker() {
  if (typeof flatpickr === 'function') {
    flatpickr('#event-date', {
      dateFormat: 'd/m/Y',
      monthSelectorType: 'dropdown'
    });
  }
}

export function initHomePage() {
  initSearchRedirect();
  initTestimonialSlider();
  initDatePicker();
}
