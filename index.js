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
const $coursesWrapper = '[data-section-id="products"]'
const $courseWrapper = '.col-md-12'
const $thumbEl = '.panel--inline .panel__cell:first-of-type img'
const $titleEl = '.panel--inline .panel__cell:nth-child(2) h4 a'
const $descriptionEl = '.panel--inline .panel__cell:nth-child(2) p'
const $courseWrapperSelector = '.panel.syllabus, .col-md-8.main-col, .category-listings.listings-2'
const $courseItemsSelector = '.syllabus__item, .panel-body.post-listing, .category-listing'
const $mediaSelector = ''

const videos = []
let collections = []

/**
 * Launch config
 */
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0 Win64 x64)',
  'AppleWebKit/537.36 (KHTML, like Gecko)',
  'Chrome/63.0.3239.132',
  'Safari/537.36',
]
const fullURL = `http://www.${DOMAIN}`
const launchConfig = {
  // devtools: true,
  headless: true,
  args: [
    `--user-agent=${userAgents.join(' ')}`,
    `--window-size=${WINDOW_WIDTH},${WINDOW_HEIGHT}`,
  ],
  // slowMo: 10, // slow down by 250ms
}

/**
 * The mapper method for the collection of a courses
 *
 * @param {ElementHandle} courseEl
 * @return {{ thumb:string, title:string, link:string, description:string }}
 */
const coursesMapper = async (courseEl) => {
  // console.log(`[COURSES MAPPER]: ${Object.keys(courseEl)}`)

  const thumbEl = await courseEl.$($thumbEl)
  const titleEl = await courseEl.$($titleEl)
  const descriptionEl = await courseEl.$($descriptionEl)

  const thumb = thumbEl && await thumbEl.getProperty('src')
  const title = titleEl && await titleEl.getProperty('innerHTML')
  const link = titleEl && await titleEl.getProperty('href')
  const description = descriptionEl && await descriptionEl.getProperty('innerHTML')

  return {
    thumb: await thumb.jsonValue(),
    title: await title.jsonValue(),
    link: await link.jsonValue(),
    description: await description.jsonValue(),
    children: [],
  }
}

/**
 * The mapper method for the items of a course
 *
 * @param {ElementHandle} itemEl
 */
const collectionsMapper = async (itemEl) => {
  // console.log('[COLLECTIONS MAPPER]')

  try {
    const linkEl = await itemEl.$('a,[href]')
    const link = await linkEl.getProperty('href')

    return { link: await link.jsonValue() }
  }
  catch (error) {
    console.log(itemEl)
    console.log(error)
  }

  return false
}

/**
 * Determines if the given link is post page
 *
 * @param {string} link
 * @return {boolean}
 */
const isPostPage = (link = '') => link.match(/\/posts\//)

/**
 * Process a post page
 *
 * @param {Page} page The page instance
 * @param {string} link The next page URL
 */
const parseMedia = async (page, link, { courseIdx }) => {
  const parentLink = await page.url()

  console.log(`{{${courseIdx}}} [MEDIA PAGE]: ${link}`)

  await page.goto(link)

  try {
    const titleEl = await page.$('h1,h2')

    const title = await titleEl.getProperty('innerHTML')

    videos.push({
      title: await title.jsonValue(),
    })
  }
  catch (error) {
    console.log(error)
  }
}

/**
 * Process a list page
 *
 * @param {Page} page
 * @param {string} link
 * @param {{courseIdx:number, level:number, childIdx:number}}
 */
const parseCollection = async (page, link, { courseIdx, level = 0, childIdx = 0 }) => {
  console.log(`{{${courseIdx}}} [COLLECTION PAGE]: ${{ courseIdx, level, childIdx }}`)

  await page.goto(link)
  const items = await page.$$($courseItemsSelector)
  const urls = await Promise.all(items.map(collectionsMapper).filter(Boolean))

  collections.push(urls)

  for (const url of urls) {
    if (isPostPage(url.link)) {
      await parseMedia(page, url.link, { courseIdx })
    }
    else {
      await parseCollection(page, url.link, { courseIdx, level: level + 1 })
    }
  }
}

const courseWorker = async (browser, { link }, idx) => {
  const page = await browser.newPage()

  await parseCollection(page, link, { courseIdx: idx })

  console.log(videos)
}

/**
 * Browser start
 *
 * @param {Browser}
 */
puppeteer.launch(launchConfig).then(async (browser) => {
  const pages = await browser.pages()
  const initPage = pages[0]

  await initPage.goto(`${fullURL}/login`)
  await initPage.type($username, USERNAME, { delay: 2 })
  await initPage.type($password, PASSWORD, { delay: 2 })

  const [el] = await Promise.all([
    initPage.waitForSelector($coursesWrapper),
    initPage.click($loginButton),
  ])

  const coursesEls = await el.$$($courseWrapper)

  collections = await Promise.all(coursesEls.map(coursesMapper))

  let idx = 0

  for (const course of collections) {
    courseWorker(browser, course, idx)
    idx++
  }
})
