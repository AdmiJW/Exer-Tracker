import { showBalloon } from '/public/script/_balloon.js';

// Make navigation visible
document.querySelector('nav').classList.add('bg-visible');


const form = document.getElementById('registration-form');
const membercard_username = document.getElementById('form__membercard__username__value');
const membercard_id = document.getElementById('form__membercard__id__value');
const membercard_status = document.getElementById('form__membercard__status__value');


form.addEventListener('submit', async (e)=> {
    e.preventDefault();

    const formData = new FormData(form);
    if (!formData.get('username'))
        return showBalloon(`Invalid username`, 'danger');

    const urlParams = new URLSearchParams(formData);

    // Fetch from /api/users
    let response;
    try {
        response = await fetch('/api/users', {
            method: 'POST',
            body: urlParams
        });
        response = await response.json();
    } catch (err) {
        return showBalloon(`Error: ${err}`, 'danger');
    }
    
    if (response.error)
        return showBalloon(`Error: ${response.error}`, 'danger');

    // Successful Registration. Show the username and _id to the user
    const { username, _id } = response;
    showBalloon('Registration Successful. Please take note of your credentials in the membership card below for future login!', 'success');

    membercard_username.innerText = username;
    membercard_id.innerText = _id;
    membercard_status.classList.add('text-success');
    membercard_status.innerText = "Registered";

    setTimeout(()=>{
        showBalloon('Proceed to login page to log in!', 'warning');
    }, 9500);
});