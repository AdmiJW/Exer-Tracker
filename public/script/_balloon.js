// Functions to manipulate the balloon.
// Set this script as defer to avoid problems on searching DOM elements
let balloonTimeout = null;
const balloon = document.getElementById('alert-balloon');


async function showBalloon(message, type) {
    if (["success", "warning", "danger"].indexOf(type) === -1)
        throw "Invalid message type provided";

    // Previous popup havent done yet. Immediately retract it
    if (balloonTimeout) {
        clearTimeout(balloonTimeout);
        balloon.classList.remove('show');

        //  Wait 500ms for it to fully retract
        await new Promise((resolve, reject)=> setTimeout(() => {
            resolve();
        }, 500));
    }

    // Set class
    balloon.classList.remove("alert-success", "alert-warning", "alert-danger");
    balloon.classList.add(`alert-${type}`);

    // Set text
    balloon.innerText = message;

    // Show
    balloon.classList.add('show');

    // Timeout of 10 seconds
    balloonTimeout = setTimeout(() => {
        balloon.classList.remove('show');
        balloonTimeout = null;
    }, 10000);       
}


export { showBalloon };