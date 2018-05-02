const https = require('https')
const { parseString } = require('xml2js')

const START_DATE = '2018-04-01'
const END_DATE = '2018-04-30'
const USERNAME = 'bootleby'

const URI_BASE = 'https://www.boardgamegeek.com/xmlapi2'
const PLAYS_URI = `${URI_BASE}/plays?username=${USERNAME}&mindate=${START_DATE}&maxdate=${END_DATE}`
const THING_URI = (ids) => `${URI_BASE}/thing?id=${ids}&stats=1`

/**
 * - Grabs monthly plays for user from BGG
 * - TODO: pull this out just incase totalsessions > 100 thereby requiring more API calls
 * - TODO: Don't forget to add a throttle to that if there's more calls (bgg rate limits)
 * - Reduces play objects to a list of unique game IDs
 * - Grabs number of rating votes per game (this is used as my measure of 'obscurity')
 * - Displays order in console
 * - TODO: line break at levels of obsurity (1000 votes, 5000, 10000)
 */
async function main() {
  const { plays } = await getBgg(PLAYS_URI)
  const totalSessions = +plays.$.total

  if (totalSessions > 100) console.warn('Sessions greater than 100, see TODO')

  const gameIds = gameIdsFromPlaysObject(plays)
  const { items } = await getBgg(THING_URI(gameIds))

  displayGames(gamesAndVotesFromItemsObject(items))
}

/**
 * Helper function to pull XML results from BGG's API and parse them
 * @param {string} URI 
 */
function getBgg(URI) {
  return new Promise(resolve => {
    https.get(URI, bggres => {
      let b = ''

      bggres.on('data', d => b += d)
      bggres.on('end', () => {
        parseString(b, (err, result) => {
          if (err) throw err

          resolve(result)
        })
      })
    })
  })
}

/**
 * @param {object} plays expecting plays object from parsed bgg api result
 * @returns {string} A comma separated list of unique ids
 */
function gameIdsFromPlaysObject(plays) {
  return Array.from(
    new Set(
      plays.play.map(p => p.item[0].$.objectid)
    )
  ).join(',')
}

/**
 * @param {object} items expecting items object from parsed bgg api result
 * @returns {{id: string, game: string, votes: number}[]} sorted array of games by votes
 */
function gamesAndVotesFromItemsObject(items) {
  return items.item.map(i => ({
    id: i.$.id,
    game: i.name[0].$.value,
    votes: +i.statistics[0].ratings[0].usersrated[0].$.value
  })).sort((a, b) => a.votes - b.votes)
}

/**
 * @param {{id: string, game: string, votes: number}[]} gamesAndVotes
 * @returns {void}
 */
function displayGames(gamesAndVotes) {
  console.log(`${USERNAME}'s plays for ${START_DATE} - ${END_DATE}`)

  gamesAndVotes.forEach(({ id, game, votes }) => {
    console.log(`[thing=${id}]${game}[/thing] [size=6](${votes} votes)[/size]`)
  })
}

// Sort of aping a real language I guess
if (require.main === module) {
  main()
}
