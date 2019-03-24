import { Chart } from './js/chart';
import style from "./styles/main.css";

let theme = '';
const main = document.createElement('div');
main.classList.add('main');
const charts = document.createElement('div');
charts.classList.add('chartContainer');
document.body.appendChild(main);
main.appendChild(charts);
const darkButton = document.createElement('button');
main.appendChild(darkButton);
themeHandler();

async function getChartData() {
    const url = './data/data.json';
    let unParsed = await fetch(url);
    return await unParsed.json();
};

async function initCharts(data) {
    for (let i = 0, len = data.length; i < len; i++) {
        new Chart(charts, data[i], { height: 500, title: 'Followers ' + (i + 1) });
    }
}

function setTheme(theme) {
    localStorage.setItem("chartTheme", theme);
}

function getTheme() {
    return localStorage.getItem("chartTheme");
}

function themeHandler() {
    theme = getTheme();

    if (theme == null) {
        theme = 'light';
        setTheme('light');
    } else if (theme == 'dark') {
        document.body.classList.toggle('dark');
    }

    darkButton.innerText = theme === 'light' ? 'Switch to Night Mode' : 'Switch to Day Mode';
    darkButton.classList.add('dark-button');
    darkButton.addEventListener('click', () => {
        document.body.classList.toggle('dark');

        if (document.body.classList.contains('dark')) {
            darkButton.innerText = 'Switch to Day Mode';
            setTheme('dark');
        } else {
            darkButton.innerText = 'Switch to Night Mode';
            setTheme('light');
        }
    });
}

window.onload = async function () {
    let chartData = await getChartData();
    initCharts(chartData);
}