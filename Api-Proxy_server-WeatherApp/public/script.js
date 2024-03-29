const weatherDisplay = document.querySelector('.weather');
const weatherForm = document.querySelector('#weather-form');
const cityInput = document.querySelector('#city-input');

//convert temp to Celcius
const kelvinToCelsius = (temp) => {
	return Math.floor(temp - 273.15);
};
//fetch weather from API + utility functions
const fetchWeather = async (city) => {
	const url = `/api?q=${city}`;

	const res = await fetch(url);
	const data = await res.json();

	if (data.cod === 404) {
		alert('City not found');
		return;
	}
	if (data.cod === 401) {
		alert('Invalid API key');
		return;
	}
	const displayData = {
		city: data.name,
		temp: kelvinToCelsius(data.main.temp),
	};
	addWeatherToDOM(displayData);
};
//UTILIITY FUNCTIONS
//add display data to DOM function
const addWeatherToDOM = (data) => {
	weatherDisplay.innerHTML = `<h1>Weather in ${data.city}</h1><h2>${data.temp} &deg;C</h2>`;
	cityInput.value = '';
};
//EVENT LISTENER for form submission
weatherForm.addEventListener('submit', (e) => {
	e.preventDefault();
	if (cityInput.value === '') {
		alert('Please enter a city');
	} else {
		fetchWeather(cityInput.value);
	}
});
