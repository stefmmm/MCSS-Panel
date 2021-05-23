document.addEventListener("DOMContentLoaded", function() {
    let token = sessionStorage.getItem('token')
    var apiurl = sessionStorage.getItem('apiurl')
    if (apiurl == null || apiurl == '') {
        apiurl = "http://localhost:25560"
    }
    axios.get(`${apiurl}/mcss`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    }).then(function (response) {
        if (response.status == 200 && token != null) {
            console.log("Conditions Met")
            window.location.href = "/panel.html";
        } else {
            console.log("Conditions Not Met")}
    });
});