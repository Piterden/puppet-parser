require('dotenv').load()
const puppeteer = require('puppeteer')


/**
 * The .env vars
 */
const { USERNAME, PASSWORD, DOMAIN, WINDOW_HEIGHT, WINDOW_WIDTH } = process.env

/**
 * Selectors
 */
const $username = '#member_email'
const $password = '#member_password'
const $loginButton = '.new_member_session input[type="submit"]'
const $thumbEl = '.panel--inline .panel__cell:first-of-type img'
const $titleEl = '.panel--inline .panel__cell:nth-child(2) h4 a'
const $descriptionEl = '.panel--inline .panel__cell:nth-child(2) p'

/**
 * Launch config
 */
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0 Win64 x64)',
  'AppleWebKit/537.36 (KHTML, like Gecko)',
  'Chrome/63.0.3239.132',
  'Safari/537.36',
]
const windowSize = [WINDOW_WIDTH, WINDOW_HEIGHT]
const fullURL = `http://www.${DOMAIN}`
const launchParams = {
  headless: false,
  args: [
    `--user-agent=${userAgents.join(' ')}`,
    `--window-size=${windowSize.join(',')}`,
  ],
  slowMo: 10, // slow down by 250ms
}

/**
 * The mapper method for a collection of collections
 *
 * @param {ElementHandle} courseEl
 * @return {{ thumb:string, title:string, link:string, description:string }}
 */
const collectionsMapper = async (courseEl) => {
  const thumbEl = await courseEl.$($thumbEl)
  const titleEl = await courseEl.$($titleEl)
  const descriptionEl = await courseEl.$($descriptionEl)

  const thumb = await thumbEl.getProperty('src')
  const title = await titleEl.getProperty('innerHTML')
  const link = await titleEl.getProperty('href')
  const description = await descriptionEl.getProperty('innerHTML')

  return {
    thumb: await thumb.jsonValue(),
    title: await title.jsonValue(),
    link: await link.jsonValue(),
    description: await description.jsonValue(),
  }
}

puppeteer
  .launch(launchParams)
  /**
   * Browser start
   *
   * @param {Browser}
   */
  .then(async (browser) => {
    const pages = await browser.pages()
    const page = pages[0]

    await page.goto(`${fullURL}/login`)
    await page.type($username, USERNAME, { delay: 2 })
    await page.type($password, PASSWORD, { delay: 2 })

    const [el] = await Promise.all([
      page.waitForSelector('[data-section-id="products"]'),
      page.click($loginButton),
    ])

    const courses = await el.$$('.col-md-12')
    const collections = await Promise.all(courses.map(collectionsMapper))

    console.log(collections)
  })
