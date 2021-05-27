let apiurl = sessionStorage.getItem('apiurl')
if (apiurl == null || apiurl === '') {
    apiurl = "http://localhost:25560"
}
function start(server, token) {
    UIkit.notification({message: '<span uk-icon=\'icon: check\'></span> Sent Start Signal.', status: 'info'});
    axios.post(`${apiurl}/api/server/execute/action`, { "Guid": server, "Action": "1" }, {
        headers: { "Authorization": `Bearer ${token}` }
    }).then(() => console.log("It worked")).catch((err) => console.error(err))
}
function stop(server, token) {
    UIkit.notification({message: '<span uk-icon=\'icon: check\'></span> Sent Stop Signal.', status: 'info'});
    axios.post(`${apiurl}/api/server/execute/action`, { "Guid": server, "Action": "2" }, {
        headers: { "Authorization": `Bearer ${token}` }
    }).then(() => console.log("It worked")).catch((err) => console.error(err))
}
function restart(server, token) {
    UIkit.notification({message: '<span uk-icon=\'icon: check\'></span> Sent Restart Signal.', status: 'info'});
    axios.post(`${apiurl}/api/server/execute/action`, { "Guid": server, "Action": "3" }, {
        headers: { "Authorization": `Bearer ${token}` }
    }).then(() => console.log("It worked")).catch((err) => console.error(err))
}
function kill(server, token) {
    UIkit.notification({message: '<span uk-icon=\'icon: check\'></span> Sent kill Signal.', status: 'info'});
    axios.post(`${apiurl}/api/server/execute/action`, { "Guid": server, "Action": "4" }, {
        headers: { "Authorization": `Bearer ${token}` }
    }).then(() => console.log("It worked")).catch((err) => console.error(err))
}
function sendcommand(server, token) {
    UIkit.notification({message: '<span uk-icon=\'icon: check\'></span> Command Sent.', status: 'info'});
    axios.post(`${apiurl}/api/server/execute/command`, { "Guid": server, "Command": document.getElementById(server + 'abc123').value }, {
        headers: { "Authorization": `Bearer ${token}` }
    }).then(() => console.log("It worked")).catch((err) => console.error(err))
    document.getElementById(server + 'abc123').value=''
}
function updateapiurl() {
    sessionStorage.setItem("apiurl", document.getElementById("apiurlinput").value)
    window.location.reload()
}
function updatestatus() {
    let token = sessionStorage.getItem('token')
    axios.get(`${apiurl}/api/servers`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    }).then((data) => {     
    data.data.forEach(server => {
        
        if (server.Status === 0) {
            server.rStatus = "Offline";
            server.rColor = `style="color: #d65554;"`
        } else if (server.Status === 1) {
            server.rStatus = "Online";
            server.rColor = `style="color: #71b280;"`
        } else if (server.Status === 2) {
            server.rStatus = "Placeholder";
        } else if (server.Status === 3) {
            server.rStatus = "Starting";
            server.rColor = `style="color: #eda60e;"`
        } else if (server.Status === 4) {
            server.rStatus = "Stopping";
            server.rColor = `style="color: #eda60e;"`
        } else {
            server.rStatus = "Unknown";
        }
        console.log(server.Guid ,server.rStatus)
        $(`#${server.Guid}`).replaceWith(`
            <button ${server.rColor} class="uk-button uk-button-default" id="${server.Guid}">${server.rStatus}</button>
        `);
      })
    }).catch(err => {
        UIkit.notification({message: '<span uk-icon=\'icon: ban\'></span> Failed to fetch server status.', status: 'danger'});
    });
}