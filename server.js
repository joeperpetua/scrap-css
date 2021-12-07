const puppeteer = require('puppeteer');
const open = require('open');
const teams = require('modules/teams-fr.js');
let users = [];

let credentials = {username: '', password: ''};
let date = {day: '', month: '', year: ''};

// lazy load puppeteer
let browser;
let page;
let loginButton;
let newPagePromise;
let loginPopup;
let useCache = false;
let loadTooltip = document.getElementById('loading-text');
let spinner = document.getElementById('login-spinner');
let loginFormButton = document.getElementById('loginButton');
let reloadFormButton = document.getElementById('reloadButton');
let loginForm = document.getElementById('login');

(async () => {
    loadTooltip.innerText = 'Connecting to server...'
    browser = await puppeteer.launch({headless: true});
    page = await browser.newPage();

    await page.goto(`https://cssnew.synology.com/`).catch((e) => {
        console.log('Page Goto error handler: ', e.message);
        if(e.message === 'Navigation timeout of 30000 ms exceeded'){
            loadTooltip.innerHTML = 'Timeout error. <br>Check network or try again later.';
            spinner.hidden = true;
            reloadFormButton.hidden = false;
        }
    });

    // get login button and click it
    loginButton = await page.$('#sso > button');
    
    if (loginButton) {
        console.log('Login button found');
        await page.click('#sso > button');
    }else{
        console.log('Login button not found');
    }

    // wait for popup
    newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page()))); 
    loginPopup = await newPagePromise;
    

    spinner.hidden = true;
    loadTooltip.hidden = true;
    loginFormButton.hidden = false;
})();


// start login
let start = async () => {
    console.log('run');

    await getData();
    
    if(await validateData() === false){
        console.log('not validated')
        return null
    }

    spinner.hidden = false;
    loadTooltip.innerText = `Loging in with credentials for ${credentials.username}...`;
    loadTooltip.hidden = false;
    loginFormButton.hidden = true;
    

    if(!useCache){
        // await automateLogin();
        // get username field and click it, then write
        await loginPopup.waitForSelector('#dsm-user-fieldset > div > div > div.input-container > input[type=text]')
        const usernameInput = await loginPopup.$('#dsm-user-fieldset > div > div > div.input-container > input[type=text]');
        
        if (usernameInput) {
            console.log('Username input found');
            loadTooltip.innerText = 'Username input found...';
            await loginPopup.focus('#dsm-user-fieldset > div > div > div.input-container > input[type=text]');
            await loginPopup.click('#dsm-user-fieldset > div > div > div.input-container > input[type=text]');
            loginPopup.waitForTimeout(1000);
            // console.log(credentials.username);
            await loginPopup.keyboard.type(credentials.username);
        }else{
            console.log('Username input not found');
            loadTooltip.innerText = 'Username input not found...';
        }


        // get next button and click it
        const nextButton = await loginPopup.$('#sds-login-vue-inst > div > span > div > div.login-body-section > div.login-tab-panel > div > div.tab-wrapper > div.tab-content-ct > div > div.login-content-section > div.login-btn > div.login-btn-spinner-wrapper > svg');
        
        if (nextButton) {
            console.log('Next button found');
            await loginPopup.click('#sds-login-vue-inst > div > span > div > div.login-body-section > div.login-tab-panel > div > div.tab-wrapper > div.tab-content-ct > div > div.login-content-section > div.login-btn > div.login-btn-spinner-wrapper > svg');
        }else{
            console.log('Next button not found');
            loadTooltip.innerText = 'Next button not found...';
        }
        

        // get username field and click it, then write
        await loginPopup.waitForSelector('#dsm-pass-fieldset > div.login-textfield-wrapper.password-field.field > div > div.input-container > input[type=password]');
        const passwordInput = await loginPopup.$('#dsm-pass-fieldset > div.login-textfield-wrapper.password-field.field > div > div.input-container > input[type=password]');
        
        if (passwordInput) {
            console.log('Password input found');
            loadTooltip.innerText = 'Password input found...';
            await loginPopup.focus('#dsm-pass-fieldset > div.login-textfield-wrapper.password-field.field > div > div.input-container > input[type=password]');
            await loginPopup.click('#dsm-pass-fieldset > div.login-textfield-wrapper.password-field.field > div > div.input-container > input[type=password]');
            // console.log(credentials.username);
            loginPopup.waitForTimeout(1000);
            await loginPopup.keyboard.type(credentials.password);
            // click enter
            loginPopup.waitForTimeout(500);
            await loginPopup.keyboard.press('Enter');

            loadTooltip.innerText = 'Authenticating...';

            // check for the incorrect password element, if the window closes then return true (good credentials)
            let goodCredentials = await loginPopup.waitForSelector(
                '#sds-login-vue-inst > div > span > div > div.login-body-section > div.login-tab-panel > div > div.tab-wrapper > div.tab-content-ct > div > div.login-content-section > div.login-remain-section > div',
                {visible: true, timeout: 8000}
            ).then(
                () => {return false}
            ).catch((e)=>{
                console.log(typeof e.message);
                if(e.message.includes('Target closed')){
                    return true;
                }
            });

            console.log(goodCredentials);

            if(goodCredentials === false){
                console.log('waiting for reload')
                await loginPopup.reload();
                console.log('reload done, setting messages')
                loadTooltip.innerText = 'Username or password incorrect. Please try again.';
                loadTooltip.hidden = false;
                spinner.hidden = true;
                loginFormButton.hidden = false;
                return null
            }

        }else{
            console.log('Password input not found');
            loadTooltip.innerText = 'Password input not found...';
        }

        // wait for main page redirection after login
        loadTooltip.innerText = 'Redirecting to CSS portal...';
        await page.waitForNavigation({'waitUntil':'domcontentloaded'});
    }


    loadTooltip.innerText = `Waiting for API response for ${date.day}/${date.month}/${date.year}...`;
    await page.goto(`https://cssnew.synology.com/statistics/ticket/supAgentStatsByLevel?group=FR+Level+1&groupid=1000013&level=1&fromdate=${date.month}%2F${date.day}%2F${date.year}&todate=${date.month}%2F${date.day}%2F${date.year}`, {
        timeout: 0
    });

    let responseString = await page.$eval('body > pre', el => el.innerText).catch(e => {
        console.log('error getting response selector',e);
        return null
    });
    
    let response = await JSON.parse(responseString);

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
    let avg = (users[0].firstReply / workingCount).toFixed(2);
    for (let i = 1; i < users.length; i++) {
        if(users[i].firstReply > 3){
            users[i].target =  avg > 15 ? 15 : avg;
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
    credentials.username = document.getElementById('username').value;
    credentials.password = document.getElementById('password').value;

    let dateArray = document.getElementById('date').value.split('-');

    date.year = dateArray[0];
    date.month = dateArray[1];
    date.day = dateArray[2];
    
    console.log('data initialized', credentials.username);
}

let validateData = async () => {
    if(date.day === undefined || date.month === undefined || date.year === undefined){
        loadTooltip.innerText = 'Please choose a valid date to continue.';
        loadTooltip.hidden = false;
        spinner.hidden = true;
        loginFormButton.hidden = false;
        return false;
    }

    if(credentials.username === '' || credentials.password === ''){
        loadTooltip.innerText = 'Please enter a valid username/password to continue.';
        loadTooltip.hidden = false;
        spinner.hidden = true;
        loginFormButton.hidden = false;
        return false;
    }

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

// const automateLogin = async () => {
//     // get username field and click it, then write
//     await loginPopup.waitForSelector('#dsm-user-fieldset > div > div > div.input-container > input[type=text]')
//     const usernameInput = await loginPopup.$('#dsm-user-fieldset > div > div > div.input-container > input[type=text]');
    
//     if (usernameInput) {
//         console.log('Username input found');
//         loadTooltip.innerText = 'Username input found...';
//         await loginPopup.focus('#dsm-user-fieldset > div > div > div.input-container > input[type=text]');
//         await loginPopup.click('#dsm-user-fieldset > div > div > div.input-container > input[type=text]');
//         loginPopup.waitForTimeout(1000);
//         // console.log(credentials.username);
//         await loginPopup.keyboard.type(credentials.username);
//     }else{
//         console.log('Username input not found');
//         loadTooltip.innerText = 'Username input not found...';
//     }


//     // get next button and click it
//     const nextButton = await loginPopup.$('#sds-login-vue-inst > div > span > div > div.login-body-section > div.login-tab-panel > div > div.tab-wrapper > div.tab-content-ct > div > div.login-content-section > div.login-btn > div.login-btn-spinner-wrapper > svg');
    
//     if (nextButton) {
//         console.log('Next button found');
//         await loginPopup.click('#sds-login-vue-inst > div > span > div > div.login-body-section > div.login-tab-panel > div > div.tab-wrapper > div.tab-content-ct > div > div.login-content-section > div.login-btn > div.login-btn-spinner-wrapper > svg');
//     }else{
//         console.log('Next button not found');
//         loadTooltip.innerText = 'Next button not found...';
//     }
    

//     // get username field and click it, then write
//     await loginPopup.waitForSelector('#dsm-pass-fieldset > div.login-textfield-wrapper.password-field.field > div > div.input-container > input[type=password]');
//     const passwordInput = await loginPopup.$('#dsm-pass-fieldset > div.login-textfield-wrapper.password-field.field > div > div.input-container > input[type=password]');
    
//     if (passwordInput) {
//         console.log('Password input found');
//         loadTooltip.innerText = 'Password input found...';
//         await loginPopup.focus('#dsm-pass-fieldset > div.login-textfield-wrapper.password-field.field > div > div.input-container > input[type=password]');
//         await loginPopup.click('#dsm-pass-fieldset > div.login-textfield-wrapper.password-field.field > div > div.input-container > input[type=password]');
//         // console.log(credentials.username);
//         loginPopup.waitForTimeout(1000);
//         await loginPopup.keyboard.type(credentials.password);
//         // click enter
//         loginPopup.waitForTimeout(500);
//         await loginPopup.keyboard.press('Enter');

//         loadTooltip.innerText = 'Authenticating...';

//         // check for the incorrect password element, if the window closes then return true (good credentials)
//         let goodCredentials = await loginPopup.waitForSelector(
//             '#sds-login-vue-inst > div > span > div > div.login-body-section > div.login-tab-panel > div > div.tab-wrapper > div.tab-content-ct > div > div.login-content-section > div.login-remain-section > div',
//             {visible: true, timeout: 8000}
//         ).then(
//             () => {return false}
//         ).catch((e)=>{
//             console.log(typeof e.message);
//             if(e.message.includes('Target closed')){
//                 return true;
//             }
//         });

//         console.log(goodCredentials);

//         if(goodCredentials === false){
//             console.log('waiting for reload')
//             await loginPopup.reload();
//             console.log('reload done, setting messages')
//             loadTooltip.innerText = 'Username or password incorrect. Please try again.';
//             loadTooltip.hidden = false;
//             spinner.hidden = true;
//             loginFormButton.hidden = false;
//             return null
//         }

//     }else{
//         console.log('Password input not found');
//         loadTooltip.innerText = 'Password input not found...';
//     }

//     // wait for main page redirection after login
//     loadTooltip.innerText = 'Redirecting to CSS portal...';
//     await page.waitForNavigation({'waitUntil':'domcontentloaded'});
// };

const openMail = async () => {
    // copy then add window with mailplus
    let tableCopy = document.getElementById('table-code');
    var clipboard = nw.Clipboard.get();
    clipboard.set(tableCopy.value, 'text');

    // open('https://mailplus.synology.com/');
    open('https://mailplus.synology.com/', {app: {name: 'firefox'}});
};

const generateTableCode = () => {
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

    return {tableCode, tableTemplate};

};


let render = (users) => {
    let content = document.getElementById('render');

    content.innerHTML = `
        <button type="button" onclick="refresh()" class="uk-button uk-button-primary" style="margin-top: 20px">Change date</button>
    `;

    let table = generateTableCode();
    
    
    let code = `
        <div><br data-mce-bogus="1"></div>

        <b>[Target adjustment]</b>

        <p>GB Cleaned at 4PM</p>
        <p>Tickets received : ...</p>
        <p>Members : ...</p>
        <p>Adjustment : ...</p>
        
        <p>Members that didn't adjust the PB at 4PM : ...</p>


        <p>Individual work -</p>
        ${table.tableCode}

        <p>Extra notes: ...</p>

        <p>Team work  - GB Remains this morning - </p>

        $///{teamTableCode}

        [Staff]
        ... are Off today
        Manual dispatch in real time all day

        <div><br data-mce-bogus="1"></div>
        <div><br data-mce-bogus="1"></div>
        <div><br data-mce-bogus="1"></div>
    `;

    let mailTemplate = `
        if(document.querySelector('#mceu_30')){
            document.querySelector('#mceu_30').firstElementChild.contentDocument.querySelector('#tinymce').innerHTML = \` 
            ${code}
            \`;
        }else{
            document.querySelector('#mceu_62').firstElementChild.contentDocument.querySelector('#tinymce').innerHTML = \` 
            ${code}
            \`;
        }
    `;
    
    content.innerHTML += `
        <h1>Daily report preview for ${date.day}/${date.month}/${date.year}</h1>
        <div class="margin-center" id="table">${table.tableTemplate}</div>

        <h1>Table code</h1>
        <button type="button" onclick="copyCode()" class="uk-button uk-button-primary">Copy code</button>
        <br>
        <button type="button" onclick="openMail()" class="uk-button uk-button-primary">Copy and open mail</button>
        <ul uk-accordion>
            <li>
                <a class="uk-accordion-title" href="#">See code</a>
                <div class="uk-accordion-content">
                    <pre>
                        <code>${table.tableCode}</code>
                    </pre>
                </div>
            </li>
        </ul>


        <textarea id='table-code' hidden>${mailTemplate}</textarea>
    `;

    
}