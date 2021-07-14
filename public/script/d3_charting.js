
function plotGraph(logs) {
    const mapper = {};
    const data = [];

    // Construct the data from logs
    for (const l of logs) {
        const date = l.date.toISOString().substr(0,10);

        // Never seen before date. Append.
        if (!mapper[date]) {
            mapper[date] = {
                "date": date,
                "total": 0,
                "details": []
            };
            data.push(mapper[date]);
        }

        const day = mapper[date];
        day.total += l.duration * 60;
    }

    // Initialize calendar heatmap
    calendarHeatmap.init(data, 'graph', '#27ae60', 'year');
    const svg = document.querySelector('.svg')
    const width = svg.getAttribute('width');
    const height = svg.getAttribute('height');
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
}


function appendRecords(logs) {
    //==============================
    // Summary Plotting
    //==============================
    let [ totalSession,totalDuration, totalAerobic, totalAnaerobic ] = [0,0,0,0];
    totalSession = logs.length;
    for (const l of logs) {
        totalDuration += l.duration;
        if (l.type === 'aerobic') 
            totalAerobic += 1;
        else 
            totalAnaerobic += 1;
    }
    d3.select('#record__summary--sessions--val').text(totalSession);
    d3.select('#record__summary--duration--val').text(`${totalDuration} minutes`);
    d3.select('#record__summary--aerobic--val').text(totalAerobic);
    d3.select('#record__summary--anaerobic--val').text(totalAnaerobic);

    //================================
    // Individual Records
    //================================
    const recordDiv = d3.select('#record__div');
    if (!logs.length)
        return recordDiv.text('No Record Found!');
    recordDiv.text('');

    const log = d3.select('#record__div').selectAll('.record').data(logs, (d)=> d.id);

    // Remove logs that don't exist anymore
    log.exit().remove();

    // The new logs that haven't get added to the data
    const newLogs = log.enter()
        .append('div')
        .attr('class', (d)=> `record record--${d.type}`);

    // Type Field
    newLogs.append('p')
        .attr('class', 'record__type')
        .text('Type: ')
        .append('span')
        .attr('class', 'record--val record__type--val')
        .text((d)=> d.type[0].toUpperCase() + d.type.substr(1));
    
    // // Date Field
    newLogs.append('p')
        .attr('class', 'record__date')
        .text('Date: ')
        .append('span')
        .attr('class', 'record--val record__date--val')
        .text((d)=> d.date.toDateString());
    
    // Duration Field
    newLogs.append('p')
        .attr('class', 'record__duration')
        .text('Duration: ')
        .append('span')
        .attr('class', 'record--val record__duration--val')
        .text((d)=> `${d.duration} minute${d.duration === 1? '':'s'}`);

    // Description Field
    newLogs.append('p')
        .attr('class', 'record__description')
        .text('Description: ')
        .append('span')
        .attr('class', 'record--val record__description--val')
        .text((d)=> d.description);
}


export { appendRecords, plotGraph };