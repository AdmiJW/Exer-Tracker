import { showBalloon } from '/public/script/_balloon.js';

// Make navigation visible
document.querySelector('nav').classList.add('bg-visible');

const form = document.getElementById('login-form');


form.addEventListener('submit', async (e)=> {
    e.preventDefault();

    const formData = new FormData(form);
    if (!formData.get('login-credential'))
        return showBalloon('Invalid username/ID', 'danger');
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
        return showBalloon(err, 'danger');
    }

    if (response.error)
        return showBalloon(response.error, 'danger');

    showBalloon(`Successfully logged in with ${formData.get('login-credential')}`, 'success');

    setTimeout(() => {
        window.location.replace('/');
    }, 2000);
});
