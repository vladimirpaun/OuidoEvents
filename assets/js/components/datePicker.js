export function initDatePickers() {
  // Initialize all date pickers with a common class
  flatpickr(".date-picker", {
    locale: {
      firstDayOfWeek: 1 // Monday
    },
    dateFormat: "d/m/Y",
    altInput: true,
    altFormat: "d/m/Y",
  });
}