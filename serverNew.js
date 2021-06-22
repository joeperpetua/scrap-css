const puppeteer = require('puppeteer');
const teams = require('modules/teams-fr.js');

let date = {day: '', month: '', year: ''};
let url = `https://cssnew.synology.com/statistics/ticket/supAgentStatsByLevel?group=FR+Level+1&groupid=1000013&level=1&fromdate=06%2F22%2F2021&todate=06%2F22%2F2021`;

let loadTooltip = document.getElementById('loading-text');
let spinner = document.getElementById('login-spinner');
let loginFormButton = document.getElementById('loginButton');
let reloadFormButton = document.getElementById('reloadButton');
let loginForm = document.getElementById('login');

(async () => {

    spinner.hidden = true;
    loadTooltip.hidden = true;
    loginFormButton.hidden = false;
    
})();


// start login
let start = async () => {
    console.log('run');
    spinner.hidden = false;
    loadTooltip.innerText = `Loging into SSO...`;
    loadTooltip.hidden = false;
    loginFormButton.hidden = true;
    
    await getData();
    
    if(await validateData() === false){
        return null
    }

    loadTooltip.innerText = `Waiting for API response for ${date.day}/${date.month}/${date.year}...`;

    browser = await puppeteer.launch({headless: false});
    page = await browser.newPage();
    await page.goto(`https://cssnew.synology.com/statistics/ticket/supAgentStatsByLevel?group=FR+Level+1&groupid=1000013&level=1&fromdate=${date.month}%2F${date.day}%2F${date.year}&todate=${date.month}%2F${date.day}%2F${date.year}`, {timeout: 0}).catch((e) => {
        console.log('Page Goto error handler: ', e.message);
        if(e.message === 'Navigation timeout of 30000 ms exceeded'){
            loadTooltip.innerHTML = 'Timeout error. <br>Check network or try again later.';
            spinner.hidden = true;
            reloadFormButton.hidden = false;
        }
    });

    await page.waitForNavigation({'waitUntil': 'networkidle0', timeout: 0}).catch(e => console.log(e));
    const element = await page.$("body");
    const text = await page.evaluate(element => element.textContent, element); 
    const response = JSON.parse(text);
    console.log(response);
    await browser.close();
    

    let users = [];
    let formatResponse = response.agentdata.email_and_replycount;
    let workingCount = 0;

    // initialize users 
    for (let i = 0; i < formatResponse.length; i++) { 
        let user =  {
            name: formatResponse[i].username,
            mailSent: formatResponse[i].sentemail,
            firstReply: formatResponse[i].replycount,
            target: '',
            team: ''
        }; 

        if(formatResponse[i].username != 'FR Level 1' && formatResponse[i].replycount > 3){
            workingCount++;
        }

        // iterate all groups and assign corresponding team
        for (let team = 0; team < teams.length; team++) {

            for (let member = 0; member < teams[team].length; member++) {

                // console.log(`comparing -- ${user.name} --> ${teams[team][member]}`);

                if (teams[team][member] == user.name) {

                    // console.log('matched');

                    switch (team) {
                        case 0:
                            user.team = 'backup';
                            break;

                        case 1:
                            user.team = 'dr';
                            break;

                        case 2:
                            user.team = 'media';
                            break;

                        case 3:
                            user.team = 'network';
                            break;

                        case 4:
                            user.team = 'manager';
                            break;

                        default:
                            console.log('unknown team', team);
                            break;
                    }

                }
                
            }

        }

        users.push(user);
        console.log(user);
    }

    // set suggested target, start from 1 to ignore FR Team user
    for (let i = 1; i < users.length; i++) {
        if(users[i].firstReply > 3){
            users[i].target = (users[0].firstReply / workingCount).toFixed(2);
        }else{
            users[i].target = 0;
        }
    }


    spinner.hidden = true;
    loadTooltip.innerText = '';
    loadTooltip.hidden = true;
    loginForm.hidden = true;

    render(users);
    
    // await browser.close();
}

let getData = async () => {
    // credentials.username = document.getElementById('username').value;
    // credentials.password = document.getElementById('password').value;

    let dateArray = document.getElementById('date').value.split('-');

    date.year = dateArray[0];
    date.month = dateArray[1];
    date.day = dateArray[2];
    
    console.log('data initialized');
}

let validateData = async () => {
    if(date.day === undefined || date.month === undefined || date.year === undefined){
        loadTooltip.innerText = 'Please choose a valid date to continue.';
        spinner.hidden = true;
        loginFormButton.hidden = false;
        return false;
    }

    // if(credentials.username === '' || credentials.password === ''){
    //     loadTooltip.innerText = 'Please enter a valid username/password to continue.';
    //     spinner.hidden = true;
    //     loginFormButton.hidden = false;
    //     return false;
    // }

    return true;
}

let refresh = () => {
    useCache = true;
    loginForm.hidden = false;
    loginFormButton.hidden = false;
    document.getElementById('render').innerHTML = '';
}

let copyCode = () => {
    let tableCopy = document.getElementById('table-code');
    var clipboard = nw.Clipboard.get();
    clipboard.set(tableCopy.value, 'text');
    alert("Copied!");
}

let render = (users) => {
    let content = document.getElementById('render');

    content.innerHTML = `
        <button type="button" onclick="refresh()" class="uk-button uk-button-primary" style="margin-top: 20px">Change date</button>
    `;

    let tableTemplate = `
        <table style="border: 2px solid lightgray; border-collapse: collapse; overflow-wrap: break-word; width: 1005px; height: 470px; table-layout: fixed;">
            <colgroup class="" syno-mc-class="mce-col-group">
                <col style="width: 174px;">
                <col style="width: 125px;">
                <col style="width: 179px;">
                <col style="width: 161px;">
                <col style="width: 366px;">
            </colgroup>
            <tbody>
                <tr style="height: 29px;">
                    <td style="border: 2px solid lightgray; overflow: hidden; width: 174px; height: 29px; text-align: center;">
                        <div><span style="background-color: #ffffff;">Name</span></div>
                    </td>
                    <td style="border: 2px solid lightgray; overflow: hidden; width: 125px; height: 29px; text-align: center;">
                        <div><span style="background-color: #ffffff;">Mail Sent</span></div>
                    </td>
                    <td style="border: 2px solid lightgray; overflow: hidden; width: 179px; height: 29px; text-align: center;">
                        <div><span style="background-color: #ffffff;">First answers</span></div>
                    </td>
                    <td style="border: 2px solid lightgray; overflow: hidden; width: 161px; height: 29px; text-align: center;">
                        <div><span style="background-color: #ffffff;">Suggested Target</span></div>
                    </td>
                    <td style="border: 2px solid lightgray; overflow: hidden; width: 366px; height: 29px; text-align: center;">
                        <div><span style="background-color: #ffffff;">Reason of difficulties</span></div>
                    </td>
                </tr>
    `;

    let tableCode = ``;

    // render response
    for (let i = 0; i < users.length; i++) {

        tableTemplate += `
            <tr style="height: 25px;">
                <td style="border: 2px solid lightgray; overflow: hidden; width: 174px; height: 25px; text-align: center;">
                    <div><span style="background-color: #ffffff;">${users[i].name}</span></div>
                </td>
                <td style="border: 2px solid lightgray; overflow: hidden; width: 125px; height: 25px; text-align: center;">${users[i].mailSent}</td>
                <td style="border: 2px solid lightgray; overflow: hidden; width: 179px; height: 25px; text-align: center;">${users[i].firstReply}</td>
                <td style="border: 2px solid lightgray; overflow: hidden; width: 161px; height: 25px; text-align: center;">${users[i].target}</td>
                <td style="border: 2px solid lightgray; overflow: hidden; width: 366px; height: 25px; text-align: center;"><span style="background-color: #ffffff;">Home Office</span></td>
            </tr>
        `;
    }

    tableTemplate += `
            </tbody>
        </table>
    `;

    tableCode = tableTemplate;

    tableCode = tableCode.replace(/\</g, '&lt');
    tableCode = tableCode.replace(/\>/g, '&gt');

    tableCode = `document.querySelector('#mceu_30').firstElementChild.contentDocument.querySelector('#tinymce').innerHTML = \`${tableCode}\`;`;

    content.innerHTML += `
        <h1>Daily report preview for ${date.day}/${date.month}/${date.year}</h1>
        <div class="margin-center">${tableTemplate}</div>

        <h1>Table code</h1>
        <button type="button" onclick="copyCode()" class="uk-button uk-button-primary">Copy code</button>
        <ul uk-accordion>
            <li>
                <a class="uk-accordion-title" href="#">See code</a>
                <div class="uk-accordion-content">
                    <pre>
                        <code>${tableCode}</code>
                    </pre>
                </div>
            </li>
        </ul>


        <textarea id='table-code' hidden>${tableCode}</textarea>
    `;

    
}