const puppeteer = require('puppeteer')


const $username = '#member_email'
const $password = '#member_password'
const $loginButton = '.new_member_session input[type="submit"]'
const username = 'rory@vidapp.com'
const password = 'Victor1234'
const domain = 'nakmuaynation.com'
const fullURL = `http://www.${domain}`
// const appid = 'NakMuay'
const loginWithCookie = false
// const collections = []
// const videos = []

const launchParams = {
  headless: false,
  args: [
    '--user-agent=Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
    '--window-size=1600,900',
  ],
  slowMo: 10, // slow down by 250ms
}

puppeteer.launch(launchParams).then(async (browser) => {
  const pages = await browser.pages()

  // await pages[0].goto(`${fullURL}/library`)
  await pages[0].goto(`${fullURL}/login`)
  await pages[0].type($username, username, {delay: 2})
  await pages[0].type($password, password, {delay: 2})
  await pages[0].click($loginButton)
  await pages[0].waitForNavigation()
})
// // login by cookies disabled for now
// if (!loginWithCookie) {
//   // login by entering login details
//   console.log('logging in by entering login details')
// }
// else {
//   console.log('logging in by setting cookies')
//   // login with cookie
//   page.setCookie({
//     name: 'cfduid',
//     value: 'd3efed6f31efa53af6ce7fd89d7399dca1517129585',
//     domain: `.${domain}`,
//   })

//   page.setCookie({
//     name: 'distillery',
//     value: 'efedf10_a405f072-f85f-4bb5-930f-ecd94b47b566-d7d5ad3da-6d31483bfcd5-dd1e',
//     domain: `www.${domain}`,
//   })

//   page.setCookie({
//     name: '_kjb_session',
//     value: 'c858bbf764670fef23753dab9f05d6c4',
//     domain: `www.${domain}`,
//   })
// }

// // process main tabs from library page
// page.goto(`${fullURL}/library`)

// const elements = page.$$('.panel') // <Array<ElementHandle>>

// console.log(`found ${elements.length} main tabs to process`)
