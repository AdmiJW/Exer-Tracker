
//===========================================
//  Navigation Intersection Observer
//===========================================
const header = document.querySelector('nav');
const jumbotron = document.querySelector('.jumbotron-fluid');
const options = {
    threshold: 0.2
};

const navIntersectionObserver = new IntersectionObserver((entries)=> {
    if (entries[0].isIntersecting) 
        header.classList.remove('bg-visible');
    else
        header.classList.add('bg-visible');
}, options);

navIntersectionObserver.observe(jumbotron);


//==========================================
//  Fade in Effect of Features
//==========================================
const images = document.querySelectorAll('.feature__img');
const texts = document.querySelectorAll('.feature__text');
[...images, ...texts].forEach((e)=> e.classList.add('hidden'));

const imgIntersectionObserver = new IntersectionObserver((entries, observer)=> {
    entries.forEach((e)=> {
        if (e.isIntersecting) {
            e.target.classList.remove('hidden');
            observer.unobserve(e.target);
        }
    });
}, options);

const txtIntersectionObserver = new IntersectionObserver((entries, observer)=> {
    entries.forEach((e)=> {
        if (e.isIntersecting)
            setTimeout(() => {
                e.target.classList.remove('hidden');
                observer.unobserve(e.target);
            }, 250);
    });
}, options);

images.forEach((e)=> imgIntersectionObserver.observe(e) );
texts.forEach((e)=> txtIntersectionObserver.observe(e));
