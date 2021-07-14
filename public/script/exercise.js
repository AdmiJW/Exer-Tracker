import { showBalloon } from '/public/script/_balloon.js';

const form = document.getElementById('exercise-form');

// Make navigation visible
document.querySelector('nav').classList.add('bg-visible');

form.addEventListener('submit', async (e)=> {
    e.preventDefault();

    const formData = new FormData(form);

    // Validation
    if (!formData.get('exercise-type'))
        return showBalloon('You must select a exercise type!', 'danger');
    if (formData.get('exercise-duration') < 0)
        return showBalloon('Invalid duration value!', 'danger');
    if (!formData.get('exercise-description'))
        return showBalloon('Please fill in exercise description', 'danger');

    // Form the actual object that will be POSTed
    const body = {
        type: formData.get('exercise-type'),
        date: formData.get('exercise-date')? formData.get('exercise-date'): new Date().toDateString(),
        duration: formData.get('exercise-duration'),
        description: formData.get('exercise-description')
    };

    const formBody = new URLSearchParams(body);

    // Fetch at /api/users/exercises, which return a json consisting of the user ID. Then, fetch from the real api
    // /api/users/:id/exercises
    let response;
    try {
        // /api/users/exercises to get the 
        response = await fetch('/api/users/getID');
        response = await response.json();

        if (response.error)
            throw response.error;
        
        response = await fetch( `/api/users/${response.user_id}/exercises`, {
            method: 'POST',
            body: formBody
        });
        response = await response.json();
    } catch (err) {
        return showBalloon(err, 'danger');
    }

    if (response.error)
        return showBalloon(response.error, 'danger');

    showBalloon("Exercise successfully recorded", 'success');

    setTimeout(() => {
        window.location.reload();
    }, 3000);
});