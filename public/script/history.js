import { showBalloon } from '/public/script/_balloon.js';
import { appendRecords, plotGraph } from '/public/script/d3_charting.js';

// filter_type: aerobic/anaerobic/all
// filter_days

const loadingScreen = document.querySelector('.loading');
const svg = document.getElementById('graph__svg');
const filterForm = document.getElementById('record__filter');
const recordDiv = document.getElementById('record__div');

// Records store the original response from database. Logs store the deep copy of the logs, which may change
// based on filter condition
let records, logs;

// Make navigation visible
document.querySelector('nav').classList.add('bg-visible');

// If apply filter, filter the logs first then call the d3 functions
filterForm.addEventListener('submit', (e)=> {
    e.preventDefault();
    applyFilterAndFillLogs();
    appendRecords(logs);
});


// The function that will be ran when user first visit the website
(async ()=> {
    await fetchRecords();
    appendRecords(logs);
    plotGraph(logs);
})();

//=================================================
// FUNCTIONS
//=================================================
// Checks the filter condition, and fill the logs with deep copy of the logs from database
// Note that the date is also converted to Date object for easier manipulation
function applyFilterAndFillLogs() {
    const filterCondition = new FormData(filterForm);
    const type = filterCondition.get('filter_type');
    const pastDays = filterCondition.get('filter_days');
    const lowerDate = new Date( new Date() - (pastDays * 24 * 60 * 60 * 1000) );   

    logs = records.log.filter( (l)=> {
        // Check type and date
        return (type === 'all' || l.type === type) && (!pastDays || new Date(l.date) >= lowerDate);
    }).map((e)=> {
        return {
            id: e._id,
            date: new Date(e.date),
            description: e.description,
            duration: e.duration,
            type: e.type
        }
    }).sort((x,y)=> y - x);     // Sort descending by date
}


// The function that will be called when first visit, to retrieve full user record through API call.
async function fetchRecords() {
    let response;
    try {
        // First, obtain the logged in user's ID via API
        response = await fetch('/api/users/getID');
        response = await response.json();

        if (response.error) return showBalloon(response.error, 'danger');

        // Then, use that ID to fetch logs of user
        response = await fetch(`/api/users/${response.user_id}/logs`);
        response = await response.json();

        if (response.error) return showBalloon(response.error, 'danger');
    } catch (err) {
        return showBalloon(err, 'danger');
    }

    loadingScreen.classList.remove('active');

    records = response;
    applyFilterAndFillLogs();
}

