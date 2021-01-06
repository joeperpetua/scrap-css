const puppeteer = require('puppeteer');
const credentials = require('./credentials.js');
const date = {
    day: '05',
    month: '01',
    year: '2021'
};


(async () => {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await page.goto('https://cssnew.synology.com/');

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
    await loginPopup.waitForSelector('#username')
    const usernameInput = await loginPopup.$('#username');
    
    if (usernameInput) {
        console.log('Username input found');
        await loginPopup.focus('#username');
        await loginPopup.click('#username');
        loginPopup.waitForTimeout(1000);
        // console.log(credentials.username);
        await loginPopup.keyboard.type(credentials.username);
    }else{
        console.log('Username input not found');
    }

    // get username field and click it, then write
    await loginPopup.waitForSelector('#password')
    const passwordInput = await loginPopup.$('#password');
    
    if (passwordInput) {
        console.log('Password input found');
        await loginPopup.focus('#password');
        await loginPopup.click('#password');
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
    await page.goto(`https://cssnew.synology.com/statistics/ticket/supAgentStatsByLevel?group=FR+Level+1&groupid=1000013&level=1&fromdate=${date.month}%2F${date.day}%2F${date.year}&todate=${date.month}%2F${date.day}%2F${date.year}`)
    // await page.$eval('a.btn:nth-child(5)', async () => await page.click('a.btn:nth-child(5)'));
    //await page.$('a.btn:nth-child(5)').then(() => page.click('a.btn:nth-child(5)'))


    // await page.waitForSelector('#agent_fromdate')
    // const calendarFrom = await page.$('#agent_fromdate');




    
    // await browser.close();
  })();