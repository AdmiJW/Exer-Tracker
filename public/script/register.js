import { showBalloon } from '/public/script/_balloon.js';

// Make navigation visible
document.querySelector('nav').classList.add('bg-visible');


const form = document.getElementById('registration-form');
const submitButton = document.querySelector('.form__submit');
const membercard_username = document.getElementById('form__membercard__username__value');
const membercard_id = document.getElementById('form__membercard__id__value');
const membercard_status = document.getElementById('form__membercard__status__value');

const showBalloonEnableButton = (message, type)=> {
    showBalloon(message, type);
    submitButton.removeAttribute('disabled');
    submitButton.textContent = 'Register';
};


form.addEventListener('submit', async (e)=> {
    e.preventDefault();
    submitButton.setAttribute('disabled', true);
    submitButton.textContent = 'Registering...';

    const formData = new FormData(form);
    if (!formData.get('username'))
        return showBalloonEnableButton(`Invalid username`, 'danger');

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
        return showBalloonEnableButton(`Error: ${err}`, 'danger');
    }
    
    if (response.error)
        return showBalloonEnableButton(`Error: ${response.error}`, 'danger');

    // Successful Registration. Show the username and _id to the user
    const { username, _id } = response;
    showBalloon('Registration Successful. Please take note of your credentials in the membership card below for future login!', 'success');
    submitButton.textContent = 'Successful';
    submitButton.classList.add('btn-success');
    submitButton.classList.remove('btn-primary');

    membercard_username.innerText = username;
    membercard_id.innerText = _id;
    membercard_status.classList.add('text-success');
    membercard_status.innerText = "Registered";

    setTimeout(()=>{
        showBalloon('Proceed to login page to log in!', 'warning');
    }, 9500);
});