const puppeteer = require('puppeteer');
const credentials = require('modules/credentials-fr.js');
const teams = require('modules/teams-fr.js');
const date = {
    day: '05',
    month: '01',
    year: '2021'
};


(async () => {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    await page.goto(`https://cssnew.synology.com/statistics/ticket/supAgentStatsByLevel?group=FR+Level+1&groupid=1000013&level=1&fromdate=${date.month}%2F${date.day}%2F${date.year}&todate=${date.month}%2F${date.day}%2F${date.year}`, {
        timeout: 0
    });

    // get login button and click it
    const loginButton = await page.$('#sso > button');
    
    if (loginButton) {
        console.log('Login button found');
        await page.click('#sso > button');
    }else{
        console.log('Login button not found');
    }

    // wait for popup
    const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page()))); 
    const loginPopup = await newPagePromise;

    // get username field and click it, then write
    await loginPopup.waitForSelector('#dsm-user-fieldset > div > div.input-container > input[type=text]')
    const usernameInput = await loginPopup.$('#dsm-user-fieldset > div > div.input-container > input[type=text]');
    
    if (usernameInput) {
        console.log('Username input found');
        await loginPopup.focus('#dsm-user-fieldset > div > div.input-container > input[type=text]');
        await loginPopup.click('#dsm-user-fieldset > div > div.input-container > input[type=text]');
        loginPopup.waitForTimeout(1000);
        // console.log(credentials.username);
        await loginPopup.keyboard.type(credentials.username);
    }else{
        console.log('Username input not found');
    }


    // get next button and click it
    const nextButton = await loginPopup.$('#sds-login-vue-inst > div > div.login-container > div.login-tab-panel > div > div.tab-wrapper > div.tab-content-ct > div > div.login-content-section > div.login-btn > div.login-btn-spinner-wrapper > svg');
    
    if (nextButton) {
        console.log('Next button found');
        await loginPopup.click('#sds-login-vue-inst > div > div.login-container > div.login-tab-panel > div > div.tab-wrapper > div.tab-content-ct > div > div.login-content-section > div.login-btn > div.login-btn-spinner-wrapper > svg');
    }else{
        console.log('Next button not found');
    }
    

    // get username field and click it, then write
    await loginPopup.waitForSelector('#dsm-pass-fieldset > div.login-textfield.password-field.field > div.input-container > input[type=password]')
    const passwordInput = await loginPopup.$('#dsm-pass-fieldset > div.login-textfield.password-field.field > div.input-container > input[type=password]');
    
    if (passwordInput) {
        console.log('Password input found');
        await loginPopup.focus('#dsm-pass-fieldset > div.login-textfield.password-field.field > div.input-container > input[type=password]');
        await loginPopup.click('#dsm-pass-fieldset > div.login-textfield.password-field.field > div.input-container > input[type=password]');
        // console.log(credentials.username);
        loginPopup.waitForTimeout(1000);
        await loginPopup.keyboard.type(credentials.password);
        // click enter
        loginPopup.waitForTimeout(500);
        await loginPopup.keyboard.press('Enter');
    }else{
        console.log('Password input not found');
    }

    // wait for main page redirection after login
    await page.waitForNavigation({'waitUntil':'domcontentloaded'});

    let responseString = await page.$eval('body > pre', el => el.innerText).catch(e => {
        console.log('error getting response selector',e);
        return null
    });
    
    let response = await JSON.parse(responseString);
    let users = [];
    let formatResponse = response.agentdata.email_and_replycount;

    for (let i = 0; i < formatResponse.length; i++) { 
        let user =  {
            name: formatResponse[i].username,
            mailSent: formatResponse[i].sentemail,
            firstReply: formatResponse[i].replycount,
            target: '',
            team: ''
        }; 

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

    for (let i = 0; i < users.length; i++) {
        document.getElementById('render').innerHTML += `
            <p>${users[i].name}</p>
            <p>${users[i].mailSent}</p>
            <p>${users[i].firstReply}</p>
            <p>${users[i].team}</p>
            <hr>
        `;
    }

    
    
    // await browser.close();

  })();