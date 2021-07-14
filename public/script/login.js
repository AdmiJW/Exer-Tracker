import { showBalloon } from '/public/script/_balloon.js';



// Make navigation visible
document.querySelector('nav').classList.add('bg-visible');

const form = document.getElementById('login-form');
const submitButton = document.querySelector('.form__submit');


// Decorate the showBalloon function to enable the submit button again after disabled
const showBalloonEnableButton = (message, type)=> {
    showBalloon(message, type);
    submitButton.removeAttribute('disabled');
    submitButton.textContent = 'Login';
};



form.addEventListener('submit', async (e)=> {
    e.preventDefault();
    submitButton.setAttribute('disabled', true);
    submitButton.textContent = 'Logging in...';

    const formData = new FormData(form);
    if (!formData.get('login-credential'))
        return showBalloonEnableButton('Invalid username/ID', 'danger');
    const formBody = new URLSearchParams(formData);

    // Fetch from /api/users
    let response;
    try {
        response = await fetch('/api/login', {
            method: 'POST',
            body: formBody
        });
        response = await response.json();
    } catch (err) {
        return showBalloonEnableButton(err, 'danger');
    }

    if (response.error)
        return showBalloonEnableButton(response.error, 'danger');

    showBalloon(`Successfully logged in with ${formData.get('login-credential')}`, 'success');

    setTimeout(() => {
        window.location.replace('/');
    }, 2000);
});
